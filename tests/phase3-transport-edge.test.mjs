import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  validateWebhookSignature,
  evaluateOriginForCors,
  getSecurityHeadersList,
} from '../lib/security-transport.mjs'

test('Phase 3 - HSTS and Security Headers', () => {
  const headers = getSecurityHeadersList()
  const headerMap = Object.fromEntries(headers.map((h) => [h.key.toLowerCase(), h.value]))

  // HSTS must be configured with max-age >= 1 year, includeSubDomains and preload
  assert.ok(headerMap['strict-transport-security'])
  assert.ok(headerMap['strict-transport-security'].includes('max-age=63072000'))
  assert.ok(headerMap['strict-transport-security'].includes('includeSubDomains'))
  assert.ok(headerMap['strict-transport-security'].includes('preload'))

  // Clickjacking prevention
  assert.equal(headerMap['x-frame-options'], 'DENY')

  // CSP must restrict object-src and frame-ancestors
  assert.ok(headerMap['content-security-policy'])
  assert.ok(headerMap['content-security-policy'].includes("frame-ancestors 'none'"))
  assert.ok(headerMap['content-security-policy'].includes("object-src 'none'"))
})

test('Phase 3 - CORS Origin Restriction (PoLP)', () => {
  const allowedHosts = ['https://batatatop.com.br', 'https://www.batatatop.com.br', 'http://localhost:3000']

  // Trusted origins
  assert.equal(evaluateOriginForCors('https://batatatop.com.br', allowedHosts).isAllowed, true)
  assert.equal(evaluateOriginForCors('http://localhost:3000', allowedHosts).isAllowed, true)

  // Untrusted / Attacker origins
  assert.equal(evaluateOriginForCors('https://malicious-site.com', allowedHosts).isAllowed, false)
  assert.equal(evaluateOriginForCors('https://batatatop.com.br.attacker.com', allowedHosts).isAllowed, false)
  assert.equal(evaluateOriginForCors('*', allowedHosts).isAllowed, false)
  assert.equal(evaluateOriginForCors('null', allowedHosts).isAllowed, false)
})

test('Phase 3 - Webhook HMAC Signature & Replay Protection', () => {
  const secret = 'test-webhook-secret-key-12345'
  const dataId = 'payment-999'
  const requestId = 'req-123'
  const nowTs = Math.floor(Date.now() / 1000)

  const manifest = `id:${dataId};request-id:${requestId};ts:${nowTs};`
  const validV1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  const validHeader = `ts=${nowTs},v1=${validV1}`

  // Legitimate signature passes
  assert.equal(
    validateWebhookSignature({
      secret,
      signatureHeader: validHeader,
      requestId,
      dataId,
    }).isValid,
    true
  )

  // Tampered signature fails
  const forgedHeader = `ts=${nowTs},v1=deadbeef00000000000000000000000000000000000000000000000000000000`
  assert.equal(
    validateWebhookSignature({
      secret,
      signatureHeader: forgedHeader,
      requestId,
      dataId,
    }).isValid,
    false
  )

  // Expired timestamp (replay attack attempt, > 10 minutes)
  const expiredTs = nowTs - 700
  const expiredManifest = `id:${dataId};request-id:${requestId};ts:${expiredTs};`
  const expiredV1 = crypto.createHmac('sha256', secret).update(expiredManifest).digest('hex')
  const replayHeader = `ts=${expiredTs},v1=${expiredV1}`
  assert.equal(
    validateWebhookSignature({
      secret,
      signatureHeader: replayHeader,
      requestId,
      dataId,
    }).isValid,
    false
  )
})
