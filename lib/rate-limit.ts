/**
 * In-memory sliding-window Rate Limiter para Next.js / Edge / Serverless
 * Protege contra força bruta, flooding e raspagem de dados.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

const MAX_ENTRIES = 5000;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 3 * 60 * 1000; // Limpeza a cada 3 minutos

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}

function enforceCap(now: number) {
  if (store.size < MAX_ENTRIES) return;

  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }

  while (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetTime) {
    if (record) {
      store.delete(key);
    }
    enforceCap(now);
    store.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

export interface DistributedRateLimitOptions {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface DistributedRateLimitResult extends RateLimitResult {
  source: "distributed" | "memory-fallback";
}

export async function checkRateLimitDistributed(
  key: string,
  limit: number = 60,
  windowMs: number = 60 * 1000,
  options?: DistributedRateLimitOptions
): Promise<DistributedRateLimitResult> {
  const supabaseUrl = (
    options?.supabaseUrl ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ""
  ).trim();
  const serviceRoleKey = (
    options?.serviceRoleKey ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ""
  ).trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ...checkRateLimit(key, limit, windowMs),
      source: "memory-fallback",
    };
  }

  const timeoutMs = Math.min(Math.max(100, options?.timeoutMs ?? 600), 800);
  const fetchFn = options?.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/check_rate_limit`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_key: key,
          p_limit: limit,
          p_window_ms: windowMs,
        }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      return {
        ...checkRateLimit(key, limit, windowMs),
        source: "memory-fallback",
      };
    }

    const payload: unknown = await response.json();
    const row = Array.isArray(payload) ? payload[0] : payload;

    if (
      !row ||
      typeof row !== "object" ||
      typeof (row as { allowed?: unknown }).allowed !== "boolean"
    ) {
      return {
        ...checkRateLimit(key, limit, windowMs),
        source: "memory-fallback",
      };
    }

    const parsed = row as {
      allowed: boolean;
      remaining?: unknown;
      reset_at_ms?: unknown;
    };

    const remaining =
      parsed.remaining != null && Number.isFinite(Number(parsed.remaining))
        ? Math.max(0, Number(parsed.remaining))
        : 0;
    const resetTime =
      parsed.reset_at_ms != null && Number.isFinite(Number(parsed.reset_at_ms))
        ? Number(parsed.reset_at_ms)
        : Date.now() + windowMs;

    return {
      success: parsed.allowed,
      limit,
      remaining,
      resetTime,
      source: "distributed",
    };
  } catch {
    return {
      ...checkRateLimit(key, limit, windowMs),
      source: "memory-fallback",
    };
  } finally {
    clearTimeout(timer);
  }
}
