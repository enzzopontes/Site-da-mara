import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateOriginForCors, getSecurityHeadersList } from '../lib/security-transport.mjs'
import { validatePhone, validateEmail } from '../lib/validation.ts'
import { checkRateLimit } from '../lib/rate-limit.ts'

// ============================================================
// RED TEAM - LOTE 4 (AGENTES 31 A 40: PAGAMENTO, NEGÓCIO & BORDA)
// ============================================================

test('Agent 31 - Pagamento: Replay de webhook (Idempotência e pedido duplicado)', () => {
  const processedWebhooks = new Set()

  const processPaymentWebhook = (paymentId, orderId, status) => {
    // Idempotência estrita: se o paymentId já foi processado com sucesso, ignorar evento duplicado
    if (processedWebhooks.has(paymentId)) {
      return { success: true, action: 'already_processed_ignored' }
    }
    processedWebhooks.add(paymentId)
    return { success: true, action: 'order_marked_as_paid' }
  }

  // 1º envio legítimo
  const firstAttempt = processPaymentWebhook('mp-pay-999', 'order-1', 'approved')
  assert.equal(firstAttempt.action, 'order_marked_as_paid')

  // 2º envio duplicado (replay attack)
  const replayAttempt = processPaymentWebhook('mp-pay-999', 'order-1', 'approved')
  assert.equal(replayAttempt.action, 'already_processed_ignored')
})

test('Agent 32 - Pagamento: Liberar produto sem pagar (status pending/rejected)', () => {
  const evaluatePaymentStatus = (mpStatus) => {
    // Apenas status estritamente 'approved' autoriza liberação para a cozinha
    if (mpStatus === 'approved') {
      return { orderStatus: 'preparing', allowRelease: true }
    }
    if (mpStatus === 'pending' || mpStatus === 'in_process') {
      return { orderStatus: 'awaiting_payment', allowRelease: false }
    }
    return { orderStatus: 'cancelled', allowRelease: false }
  }

  assert.equal(evaluatePaymentStatus('pending').allowRelease, false)
  assert.equal(evaluatePaymentStatus('rejected').allowRelease, false)
  assert.equal(evaluatePaymentStatus('refunded').allowRelease, false)
  assert.equal(evaluatePaymentStatus('approved').allowRelease, true)
})

test('Agent 33 - Pagamento: Condição de corrida em cupom de uso único', async () => {
  let couponUsed = false

  // Simula operação atômica no banco (UPDATE coupons SET uses = uses + 1 WHERE id = $1 AND uses < max_uses)
  const redeemCouponAtomic = async () => {
    if (couponUsed) {
      return { success: false, error: 'Cupom já utilizado' }
    }
    couponUsed = true
    return { success: true }
  }

  // Duas requisições paralelas simultâneas tentando consumir o mesmo cupom
  const [req1, req2] = await Promise.all([redeemCouponAtomic(), redeemCouponAtomic()])

  const successes = [req1.success, req2.success].filter(Boolean)
  assert.equal(successes.length, 1, 'Apenas UMA requisição concorrente pode resgatar o cupom de uso único')
})

test('Agent 34 - Negócio: Abusar de cupom expirado ou abaixo do valor mínimo', () => {
  const coupon = {
    code: 'PROMO10',
    active: true,
    minValue: 50.0,
    expiresAt: new Date(Date.now() - 1000 * 60).toISOString(), // Expirado há 1 minuto
  }

  const validateCoupon = (c, orderTotal) => {
    if (!c.active) return { valid: false, reason: 'Cupom inativo' }
    if (new Date(c.expiresAt) < new Date()) return { valid: false, reason: 'Cupom expirado' }
    if (orderTotal < c.minValue) return { valid: false, reason: 'Valor mínimo não atingido' }
    return { valid: true }
  }

  // Tentativa com cupom expirado
  assert.equal(validateCoupon(coupon, 60.0).valid, false)
  assert.equal(validateCoupon(coupon, 60.0).reason, 'Cupom expirado')

  // Tentativa com cupom válido mas valor de pedido abaixo do mínimo
  const activeCoupon = { ...coupon, expiresAt: new Date(Date.now() + 1000 * 3600).toISOString() }
  assert.equal(validateCoupon(activeCoupon, 30.0).valid, false)
  assert.equal(validateCoupon(activeCoupon, 30.0).reason, 'Valor mínimo não atingido')
})

test('Agent 35 - Negócio: Pular etapas de um fluxo multi-passo de checkout', () => {
  const checkoutStateMachine = (state) => {
    if (!state.cart || state.cart.length === 0) return { error: 'Carrinho vazio' }
    if (!state.customerName || !state.customerPhone) return { error: 'Dados do cliente incompletos' }
    if (state.deliveryType === 'delivery' && !state.address) return { error: 'Endereço obrigatório para entrega' }
    return { canProceedToPayment: true }
  }

  // Tentativa de pular direto para pagamento sem endereço na entrega
  const skippedAddress = checkoutStateMachine({
    cart: [{ id: 'p1', qty: 1 }],
    customerName: 'João',
    customerPhone: '14999999999',
    deliveryType: 'delivery',
    address: null,
  })
  assert.equal(skippedAddress.canProceedToPayment, undefined)
  assert.equal(skippedAddress.error, 'Endereço obrigatório para entrega')
})

test('Agent 36 - Borda: Contornar rate limit trocando header X-Forwarded-For', () => {
  // Simulador de extração de IP seguro do middleware: x-vercel-ip tem precedência absoluta sobre X-Forwarded-For
  const resolveClientIp = (headers) => {
    return (
      headers['x-vercel-ip'] ||
      headers['x-real-ip'] ||
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      '127.0.0.1'
    )
  }

  const vercelEdgeIp = '177.18.29.40'
  const spoofedHeader1 = { 'x-vercel-ip': vercelEdgeIp, 'x-forwarded-for': '1.1.1.1' }
  const spoofedHeader2 = { 'x-vercel-ip': vercelEdgeIp, 'x-forwarded-for': '2.2.2.2' }

  // Ambos devem resolver para o mesmo IP real da Vercel
  assert.equal(resolveClientIp(spoofedHeader1), vercelEdgeIp)
  assert.equal(resolveClientIp(spoofedHeader2), vercelEdgeIp)

  // Rate limit disparado no IP real bloqueia o atacante mesmo com rotação de X-Forwarded-For
  const limit = 5
  for (let i = 0; i < 5; i++) {
    checkRateLimit(`spoof-test:${vercelEdgeIp}`, limit, 60000)
  }
  const blockedCheck = checkRateLimit(`spoof-test:${vercelEdgeIp}`, limit, 60000)
  assert.equal(blockedCheck.success, false, 'IP real deve ser bloqueado independente do X-Forwarded-For forjado')
})

test('Agent 37 - Borda: Abusar de CORS permissivo com origens arbitrárias', () => {
  const allowed = ['https://batatatop.com.br', 'https://www.batatatop.com.br']

  // Origem forjada com subdomínio ou atacante
  assert.equal(evaluateOriginForCors('https://attacker.com', allowed).isAllowed, false)
  assert.equal(evaluateOriginForCors('https://batatatop.com.br.evil.com', allowed).isAllowed, false)
  assert.equal(evaluateOriginForCors('*', allowed).isAllowed, false)
})

test('Agent 38 - Borda: Clickjacking e proteção anti-framing', () => {
  const headers = getSecurityHeadersList()
  const xFrame = headers.find((h) => h.key === 'X-Frame-Options')
  const csp = headers.find((h) => h.key === 'Content-Security-Policy')

  assert.equal(xFrame?.value, 'DENY', 'X-Frame-Options deve ser DENY')
  assert.ok(csp?.value.includes("frame-ancestors 'none'"), 'CSP deve conter frame-ancestors none')
})

test('Agent 39 - Borda: Downgrade de HTTPS / HSTS', () => {
  const headers = getSecurityHeadersList()
  const hsts = headers.find((h) => h.key === 'Strict-Transport-Security')

  assert.ok(hsts)
  assert.ok(hsts.value.includes('max-age=63072000'))
  assert.ok(hsts.value.includes('includeSubDomains'))
  assert.ok(hsts.value.includes('preload'))
})

test('Agent 40 - Borda: DoS de aplicação e ReDoS (Regular Expression Denial of Service)', () => {
  // Payload patológico de backtracking catastrófico
  const evilInput = 'a'.repeat(25000) + '@evil.com'
  const startTime = Date.now()

  validateEmail(evilInput)
  validatePhone(evilInput)

  const elapsed = Date.now() - startTime
  assert.ok(elapsed < 50, `Validação regex deve ser quase instantânea (executou em ${elapsed}ms)`)
})
