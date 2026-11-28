import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { assertSameOriginForCookieAuth } from "../lib/security-csrf.ts"
import { checkRateLimitDistributed } from "../lib/rate-limit.ts"
import {
  buildContentSecurityPolicy,
  getStaticSecurityHeadersList,
} from "../lib/security-transport.mjs"

function makeReq(headersObj = {}, host = "batatatop.com.br") {
  const lower = Object.fromEntries(
    Object.entries(headersObj).map(([k, v]) => [k.toLowerCase(), v])
  )
  return {
    headers: {
      get(name) {
        return lower[name.toLowerCase()] ?? null
      },
    },
    nextUrl: { host },
  }
}

test("CSRF: bloqueia cross-origin autenticado por cookie e libera same-origin ou Bearer mobile", () => {
  assert.equal(
    assertSameOriginForCookieAuth(
      makeReq({
        cookie: "sb-auth=1",
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      })
    ),
    false
  )

  assert.equal(
    assertSameOriginForCookieAuth(
      makeReq({
        cookie: "sb-auth=1",
        referer: "https://attacker.test/page",
      })
    ),
    false
  )

  assert.equal(
    assertSameOriginForCookieAuth(
      makeReq({
        cookie: "sb-auth=1",
        origin: "https://batatatop.com.br",
        "sec-fetch-site": "same-origin",
      })
    ),
    true
  )

  assert.equal(
    assertSameOriginForCookieAuth(
      makeReq({
        authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.mobile.token",
        origin: "capacitor://localhost",
      })
    ),
    true
  )

  const routePath = path.join(
    process.cwd(),
    "app/api/admin/images/migrate-webp-refs/route.ts"
  )
  const routeSource = fs.readFileSync(routePath, "utf8")
  assert.match(routeSource, /assertSameOriginForCookieAuth/)
  assert.match(routeSource, /status:\s*403/)
})

test("Rate Limit Distribuído: usa RPC quando disponível, retorna bloqueio 429 e faz fallback in-memory em erro/timeout", async () => {
  const futureReset = Date.now() + 60_000
  const okRes = await checkRateLimitDistributed("test:dist:ok", 60, 60_000, {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-key",
    fetchImpl: async () =>
      new Response(
        JSON.stringify([{ allowed: true, remaining: 59, reset_at_ms: futureReset }]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
  })
  assert.equal(okRes.success, true)
  assert.equal(okRes.remaining, 59)
  assert.equal(okRes.source, "distributed")

  const blockedRes = await checkRateLimitDistributed("test:dist:block", 60, 60_000, {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-key",
    fetchImpl: async () =>
      new Response(
        JSON.stringify([{ allowed: false, remaining: 0, reset_at_ms: futureReset }]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
  })
  assert.equal(blockedRes.success, false)
  assert.equal(blockedRes.remaining, 0)
  assert.equal(blockedRes.source, "distributed")

  const fallbackKey = `test:fallback:${Date.now()}`
  const errFallback = await checkRateLimitDistributed(fallbackKey, 2, 60_000, {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-key",
    fetchImpl: async () => new Response("Internal error", { status: 500 }),
  })
  assert.equal(errFallback.success, true)
  assert.equal(errFallback.source, "memory-fallback")

  const abortFallback = await checkRateLimitDistributed(fallbackKey, 2, 60_000, {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-service-key",
    timeoutMs: 100,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        )
      }),
  })
  assert.equal(abortFallback.success, true)
  assert.equal(abortFallback.source, "memory-fallback")

  const thirdBlocked = await checkRateLimitDistributed(fallbackKey, 2, 60_000, {
    supabaseUrl: "",
    serviceRoleKey: "",
  })
  assert.equal(thirdBlocked.success, false)
  assert.equal(thirdBlocked.source, "memory-fallback")
})

test("CSP Produção: usa nonce + strict-dynamic sem unsafe-inline/unsafe-eval em script-src e evita duplicação no next.config", () => {
  const sampleNonce = "dGVzdC1ub25jZS0xMjM0NTY="
  const prodCsp = buildContentSecurityPolicy({ nonce: sampleNonce, isDev: false })

  const scriptDirective = prodCsp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src "))

  assert.ok(scriptDirective, "script-src deve existir na CSP")
  assert.ok(scriptDirective.includes(`'nonce-${sampleNonce}'`), "script-src deve conter nonce")
  assert.ok(scriptDirective.includes("'strict-dynamic'"), "script-src deve conter strict-dynamic")
  assert.equal(scriptDirective.includes("'unsafe-inline'"), false, "produção não pode ter unsafe-inline em script-src")
  assert.equal(scriptDirective.includes("'unsafe-eval'"), false, "produção não pode ter unsafe-eval em script-src")

  assert.ok(
    prodCsp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"),
    "style-src deve manter compatibilidade com Radix/Maps/inline styles"
  )
  assert.ok(prodCsp.includes("frame-ancestors 'none'"))
  assert.ok(prodCsp.includes("object-src 'none'"))

  const devCsp = buildContentSecurityPolicy({ nonce: sampleNonce, isDev: true })
  assert.ok(devCsp.includes("'unsafe-eval'"), "dev pode permitir unsafe-eval para HMR")

  const staticHeaders = getStaticSecurityHeadersList()
  assert.equal(
    staticHeaders.some((h) => h.key.toLowerCase() === "content-security-policy"),
    false,
    "next.config.mjs não deve duplicar Content-Security-Policy com proxy.ts"
  )

  const layoutSource = fs.readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8")
  assert.match(layoutSource, /x-nonce/)
  assert.match(layoutSource, /MetaPixel\s+nonce=\{nonce\}/)
})
