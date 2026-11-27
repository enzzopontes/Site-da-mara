/**
 * Módulo de Segurança de Identidade, Autenticação e Controle de Acesso
 * Atualizado com Proteção Anti-Brute Force, Rate Limit e OTP Sanitization
 */
import { z } from "zod"

// Schema estrito de validação de e-mail com Zod
export const emailSchema = z
  .string()
  .trim()
  .min(5, "O e-mail deve ter no mínimo 5 caracteres")
  .max(120, "O e-mail não pode exceder 120 caracteres")
  .email("Formato de e-mail inválido")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
    "Formato de e-mail inválido"
  )

export function validateEmail(email: string): { isValid: boolean; error?: string; cleanEmail?: string } {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    const firstIssue = result.error.issues?.[0]?.message || "E-mail inválido"
    return { isValid: false, error: firstIssue }
  }
  return { isValid: true, cleanEmail: result.data.toLowerCase() }
}

export const OTP_CODE_REGEX = /^\d{6}$/

export function validateOtpToken(token: string): { isValid: boolean; error?: string } {
  if (typeof token !== "string" || !OTP_CODE_REGEX.test(token.trim())) {
    return { isValid: false, error: "O código deve conter exatamente 6 dígitos numéricos" }
  }
  return { isValid: true }
}

// ─── Sanitização de Mensagens de Erro (Anti-Enumeration) ─────────────────────
export function sanitizeAuthErrorMessage(rawMessage?: string): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    return "Ocorreu um erro no processamento. Tente novamente."
  }

  const msg = rawMessage.toLowerCase()

  // 1. Rate Limit e Status 429 do Supabase
  if (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("over_request_rate_limit")
  ) {
    return "Muitas solicitações em pouco tempo. Por segurança, aguarde alguns minutos antes de tentar novamente."
  }

  // 2. Erros de código OTP (expirado, inválido, já utilizado)
  if (
    msg.includes("token has expired") ||
    msg.includes("otp expired") ||
    msg.includes("expired")
  ) {
    return "O código de verificação expirou. Por favor, solicite um novo código."
  }

  if (
    msg.includes("invalid token") ||
    msg.includes("token is invalid") ||
    msg.includes("token has already been used") ||
    msg.includes("invalid_grant") ||
    msg.includes("verification failed")
  ) {
    return "Código de verificação incorreto ou já utilizado. Verifique os dígitos."
  }

  // 3. Prevenção de enumeração de usuário: respostas genéricas
  if (
    msg.includes("user already registered") ||
    msg.includes("user not found") ||
    msg.includes("email already in use") ||
    msg.includes("already exists")
  ) {
    return "Não foi possível concluir a operação com os dados informados. Verifique e tente novamente."
  }

  // 4. Credenciais antigas
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou dados de acesso inválidos."
  }

  if (msg.includes("email not confirmed")) {
    return "Por favor, confirme seu e-mail antes de entrar."
  }

  return "Ocorreu uma instabilidade na autenticação. Tente novamente em instantes."
}

// ─── Proteção Anti-Brute Force Local (Client Rate-Limiting) ────────────────
const MAX_VERIFY_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutos de bloqueio após 5 erros seguidos

interface OtpAttemptState {
  attempts: number
  lockoutUntil: number | null
}

const attemptStorageKey = "bt_otp_security_state"

function getSecurityState(): OtpAttemptState {
  if (typeof window === "undefined") return { attempts: 0, lockoutUntil: null }
  try {
    const raw = sessionStorage.getItem(attemptStorageKey)
    if (!raw) return { attempts: 0, lockoutUntil: null }
    const parsed = JSON.parse(raw) as Partial<OtpAttemptState> | null
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.attempts === "number" &&
      Number.isFinite(parsed.attempts) &&
      parsed.attempts >= 0 &&
      (parsed.lockoutUntil === null ||
        (typeof parsed.lockoutUntil === "number" && Number.isFinite(parsed.lockoutUntil)))
    ) {
      if (parsed.lockoutUntil && Date.now() > parsed.lockoutUntil) {
        sessionStorage.removeItem(attemptStorageKey)
        return { attempts: 0, lockoutUntil: null }
      }
      return { attempts: parsed.attempts, lockoutUntil: parsed.lockoutUntil }
    }
    sessionStorage.removeItem(attemptStorageKey)
    return { attempts: 0, lockoutUntil: null }
  } catch {
    try {
      sessionStorage.removeItem(attemptStorageKey)
    } catch {}
    return { attempts: 0, lockoutUntil: null }
  }
}

function saveSecurityState(state: OtpAttemptState) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(attemptStorageKey, JSON.stringify(state))
  } catch {}
}

export function checkOtpRateLimit(): { isBlocked: boolean; remainingMinutes?: number; attemptsLeft: number } {
  const state = getSecurityState()
  if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
    const diffMs = state.lockoutUntil - Date.now()
    const remainingMinutes = Math.ceil(diffMs / 60000)
    return { isBlocked: true, remainingMinutes, attemptsLeft: 0 }
  }
  const attemptsLeft = Math.max(0, MAX_VERIFY_ATTEMPTS - state.attempts)
  return { isBlocked: false, attemptsLeft }
}

export function recordFailedOtpAttempt(): { isBlocked: boolean; attemptsLeft: number; remainingMinutes?: number } {
  const state = getSecurityState()
  const newAttempts = state.attempts + 1

  if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
    saveSecurityState({ attempts: newAttempts, lockoutUntil })
    return { isBlocked: true, attemptsLeft: 0, remainingMinutes: 5 }
  }

  saveSecurityState({ attempts: newAttempts, lockoutUntil: null })
  return { isBlocked: false, attemptsLeft: MAX_VERIFY_ATTEMPTS - newAttempts }
}

export function resetOtpAttempts() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(attemptStorageKey)
  } catch {}
}

// ─── Cooldown Persistente de Envio de OTP (60s por e-mail) ────────────────
export const OTP_SEND_COOLDOWN_SECONDS = 60
export const OTP_SEND_COOLDOWN_MS = OTP_SEND_COOLDOWN_SECONDS * 1000
const OTP_SEND_COOLDOWN_STORAGE_KEY = "bt_otp_send_cooldowns"

const memoryOtpCooldowns = new Map<string, number>()
const inFlightOtpRequests = new Set<string>()

function normalizeCooldownEmail(rawEmail: string): string {
  return String(rawEmail || "").trim().toLowerCase()
}

function readCooldownState(): { map: Record<string, number>; hadExpired: boolean } {
  const merged: Record<string, number> = {}
  const now = Date.now()
  let hadExpired = false

  memoryOtpCooldowns.forEach((expiresAt, key) => {
    if (typeof expiresAt === "number" && Number.isFinite(expiresAt) && expiresAt > now) {
      merged[key] = expiresAt
    } else {
      memoryOtpCooldowns.delete(key)
      hadExpired = true
    }
  })

  if (typeof window === "undefined") return { map: merged, hadExpired }

  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const raw = storage.getItem(OTP_SEND_COOLDOWN_STORAGE_KEY)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Record<string, unknown>
      if (!parsed || typeof parsed !== "object") continue
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof val === "number" && Number.isFinite(val) && val > now) {
          merged[key] = Math.max(merged[key] || 0, val)
        } else {
          hadExpired = true
        }
      }
    } catch {}
  }

  return { map: merged, hadExpired }
}

function writeCooldownMapToStorage(map: Record<string, number>) {
  const now = Date.now()
  const cleaned: Record<string, number> = {}

  for (const [key, val] of Object.entries(map)) {
    if (typeof val === "number" && Number.isFinite(val) && val > now) {
      cleaned[key] = val
      memoryOtpCooldowns.set(key, val)
    }
  }

  if (typeof window === "undefined") return

  const serialized = JSON.stringify(cleaned)
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      if (Object.keys(cleaned).length === 0) {
        storage.removeItem(OTP_SEND_COOLDOWN_STORAGE_KEY)
      } else {
        storage.setItem(OTP_SEND_COOLDOWN_STORAGE_KEY, serialized)
      }
    } catch {}
  }
}

/** Retorna quantos segundos restam na janela de cooldown de 60s para o e-mail. */
export function getOtpCooldownRemaining(rawEmail: string): number {
  const email = normalizeCooldownEmail(rawEmail)
  if (!email) return 0

  const { map, hadExpired } = readCooldownState()
  if (hadExpired) {
    writeCooldownMapToStorage(map)
  }

  const expiresAt = map[email]
  if (!expiresAt) return 0

  const diffMs = expiresAt - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / 1000)
}

/** Registra o timestamp de envio do OTP para travar reenvios durante 60s. */
export function recordOtpSentCooldown(
  rawEmail: string,
  durationSeconds = OTP_SEND_COOLDOWN_SECONDS
): number {
  const email = normalizeCooldownEmail(rawEmail)
  if (!email) return 0

  const safeSeconds = Math.max(1, Math.floor(durationSeconds))
  const expiresAt = Date.now() + safeSeconds * 1000
  const { map } = readCooldownState()
  map[email] = expiresAt
  writeCooldownMapToStorage(map)

  return safeSeconds
}

/** Adquire trava síncrona em memória para evitar chamadas concorrentes por e-mail. */
export function acquireOtpSendLock(rawEmail: string): boolean {
  const email = normalizeCooldownEmail(rawEmail)
  if (!email || inFlightOtpRequests.has(email)) {
    return false
  }
  inFlightOtpRequests.add(email)
  return true
}

/** Libera a trava síncrona em memória para o e-mail após o envio. */
export function releaseOtpSendLock(rawEmail: string): void {
  const email = normalizeCooldownEmail(rawEmail)
  if (email) {
    inFlightOtpRequests.delete(email)
  }
}

// ─── Sanitização de Conta Salva (Paridade LGPD com App Mobile) ─────────────
export const SAVED_USER_STORAGE_KEY = "@batatatop:savedUser"
export const LAST_LOGIN_EMAIL_STORAGE_KEY = "batata_last_login_email"

export interface SavedUserProfile {
  name: string
  email: string
  provider: string
}

/** Lê e sanitiza o perfil salvo localmente, removendo qualquer campo de telefone legado. */
export function readSavedUserProfile(): SavedUserProfile | null {
  if (typeof window === "undefined") return null

  try {
    const rawSaved = localStorage.getItem(SAVED_USER_STORAGE_KEY)
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved) as Record<string, unknown>
      if (parsed && typeof parsed === "object") {
        const hadPhone = "phone" in parsed
        const rawEmail = typeof parsed.email === "string" ? parsed.email.trim() : ""
        if (rawEmail && rawEmail.includes("@")) {
          const sanitized: SavedUserProfile = {
            name:
              typeof parsed.name === "string" && parsed.name.trim()
                ? parsed.name.trim()
                : rawEmail.split("@")[0],
            email: rawEmail,
            provider:
              typeof parsed.provider === "string" && parsed.provider.trim() && parsed.provider !== "phone"
                ? parsed.provider
                : "email",
          }
          if (hadPhone || parsed.provider === "phone") {
            localStorage.setItem(SAVED_USER_STORAGE_KEY, JSON.stringify(sanitized))
          }
          return sanitized
        }
      }
    }

    const legacyEmail = localStorage.getItem(LAST_LOGIN_EMAIL_STORAGE_KEY)
    if (legacyEmail && legacyEmail.includes("@")) {
      const cleanEmail = legacyEmail.trim()
      return {
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        provider: "email",
      }
    }
  } catch {}

  return null
}

/** Persiste a conta reconhecida localmente sem dados de telefone. */
export function writeSavedUserProfile(profile: SavedUserProfile): void {
  if (typeof window === "undefined") return
  const cleanEmail = profile.email.trim()
  if (!cleanEmail || !cleanEmail.includes("@")) return

  try {
    const sanitized: SavedUserProfile = {
      name: profile.name?.trim() || cleanEmail.split("@")[0],
      email: cleanEmail,
      provider: profile.provider && profile.provider !== "phone" ? profile.provider : "email",
    }
    localStorage.setItem(SAVED_USER_STORAGE_KEY, JSON.stringify(sanitized))
    localStorage.setItem(LAST_LOGIN_EMAIL_STORAGE_KEY, cleanEmail)
  } catch {}
}

/** Remove todos os rastros da conta salva localmente. */
export function clearSavedUserProfile(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(SAVED_USER_STORAGE_KEY)
    localStorage.removeItem(LAST_LOGIN_EMAIL_STORAGE_KEY)
  } catch {}
}

/** Consome eventual item pendente salvo antes do login e adiciona na sacola. */
export function consumePendingCartItem(addItem: (item: any) => void): boolean {
  if (typeof window === "undefined") return false
  try {
    const stored = sessionStorage.getItem("batata_pending_cart_item")
    if (!stored) return false
    sessionStorage.removeItem("batata_pending_cart_item")
    const parsed = JSON.parse(stored)
    let added = false
    if (parsed?.product) {
      addItem(parsed.product)
      added = true
    }
    if (Array.isArray(parsed?.bebidas)) {
      parsed.bebidas.forEach((b: any) => {
        addItem(b)
        added = true
      })
    }
    return added
  } catch {
    return false
  }
}

// ─── Verificação de Admin Seguro ───────────────────────────────────────────
export function isSecureAdminCheck(user: any, allowedEmailsCsv?: string): boolean {
  if (!user || typeof user !== "object") return false

  if (user.app_metadata?.role === "admin") {
    return true
  }

  if (user.email && allowedEmailsCsv) {
    const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at)
    if (!isEmailConfirmed) {
      return false
    }

    const email = String(user.email).trim().toLowerCase()
    const allowedList = allowedEmailsCsv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (allowedList.includes(email)) {
      return true
    }
  }

  return false
}

// ─── Sanitização de URL de Retorno ─────────────────────────────────────────
export function sanitizeReturnUrl(rawUrl: string | null | undefined, fallback = "/cardapio"): string {
  if (!rawUrl || typeof rawUrl !== "string") return fallback
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\") && !trimmed.includes(":") && !/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return trimmed
  }
  return fallback
}

// Validação de senha legada mantida para retrocompatibilidade sem breaking change
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (typeof password !== "string") {
    return { isValid: false, error: "Senha inválida" }
  }
  if (password.length < 8) {
    return { isValid: false, error: "A senha deve ter no mínimo 8 caracteres" }
  }
  if (password.length > 128) {
    return { isValid: false, error: "A senha não pode ultrapassar 128 caracteres" }
  }
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  if (!hasLetter || !hasDigit) {
    return { isValid: false, error: "A senha deve conter pelo menos uma letra e um número" }
  }
  return { isValid: true }
}
