import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeString,
  sanitizeFileName,
  validateOrderPayload,
  validateImagePayload,
} from '../lib/security-validation.mjs'

test('Phase 2 - XSS and String Sanitization', () => {
  // Classic script injection
  const scriptPayload = '<script>alert("xss")</script>'
  assert.equal(sanitizeString(scriptPayload).includes('<script>'), false)

  // Nested tag bypass attempt
  const nestedPayload = '<<SCRIPT>script>alert(1)<</SCRIPT>/script>'
  assert.equal(sanitizeString(nestedPayload).includes('<'), false)
  assert.equal(sanitizeString(nestedPayload).includes('>'), false)

  // Event handler injection
  const imgPayload = '<img src=x onerror=alert(1)>'
  assert.equal(sanitizeString(imgPayload).includes('<img'), false)

  // Escaping dangerous characters
  assert.equal(sanitizeString('Batata & Cia <Top> "Delícia"'), 'Batata &amp; Cia &lt;Top&gt; &quot;Delícia&quot;')

  // Null byte injection removal
  assert.equal(sanitizeString('safe\0text'), 'safetext')
})

test('Phase 2 - Filename Sanitization & Path Traversal', () => {
  assert.equal(sanitizeFileName('../../../etc/passwd'), 'passwd')
  assert.equal(sanitizeFileName('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe')
  assert.equal(sanitizeFileName('valid-photo.png'), 'valid-photo.png')
  assert.equal(sanitizeFileName('malicious*name?.jpg'), 'maliciousname.jpg')
})

test('Phase 2 - Order Payload Boundary & Business Rules', () => {
  // Reject negative quantities
  const orderWithNegativeQty = {
    customerName: 'Cliente Teste',
    customerPhone: '14999999999',
    deliveryType: 'retirada',
    items: [{ id: 'prod-1', quantity: -2 }],
  }
  assert.equal(validateOrderPayload(orderWithNegativeQty).isValid, false)

  // Reject zero quantity
  const orderWithZeroQty = {
    customerName: 'Cliente Teste',
    customerPhone: '14999999999',
    deliveryType: 'retirada',
    items: [{ id: 'prod-1', quantity: 0 }],
  }
  assert.equal(validateOrderPayload(orderWithZeroQty).isValid, false)

  // Reject excessive quantity (> 99)
  const orderWithExcessiveQty = {
    customerName: 'Cliente Teste',
    customerPhone: '14999999999',
    deliveryType: 'retirada',
    items: [{ id: 'prod-1', quantity: 150 }],
  }
  assert.equal(validateOrderPayload(orderWithExcessiveQty).isValid, false)

  // Reject missing or incomplete address on delivery
  const deliveryWithoutAddress = {
    customerName: 'Cliente Teste',
    customerPhone: '14999999999',
    deliveryType: 'delivery',
    customerAddress: 'Rua',
    items: [{ id: 'prod-1', quantity: 1 }],
  }
  assert.equal(validateOrderPayload(deliveryWithoutAddress).isValid, false)

  // Accept valid payload
  const validOrder = {
    customerName: 'Maria Silva',
    customerPhone: '14999999999',
    deliveryType: 'delivery',
    customerAddress: 'Rua Principal, 123 - Centro',
    items: [{ id: 'prod-1', quantity: 2, adicionais: [{ id: 'add-1', quantity: 1 }] }],
  }
  assert.equal(validateOrderPayload(validOrder).isValid, true)
})

test('Phase 2 - File Upload Magic Bytes and SVG XSS Blocking', () => {
  // Block SVG to prevent Stored XSS via XML/SVG script tags
  assert.equal(validateImagePayload('image/svg+xml', 'PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+').isValid, false)

  // Block fake executable disguised as image
  assert.equal(validateImagePayload('image/jpeg', 'TVpQAAIAAAA==').isValid, false) // MZ header

  // Accept valid JPEG (starts with /9j/ in base64)
  const validJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
  assert.equal(validateImagePayload('image/jpeg', validJpegBase64).isValid, true)

  // Accept valid PNG (starts with iVBORw0KGgo in base64)
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  assert.equal(validateImagePayload('image/png', validPngBase64).isValid, true)
})
