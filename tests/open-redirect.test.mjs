import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sanitizeReturnUrl } from '../lib/security-auth.ts'

const FALLBACK = '/cardapio'

const MALICIOUS_PAYLOADS = [
  '//evil.com',
  '///evil.com',
  ' //evil.com',
  '/\\evil.com',
  '\\\\evil.com',
  '\\/evil.com',
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'https://evil.com',
  'http://evil.com',
  'HtTpS://evil.com',
  'ftp://evil.com',
  '/redirect?next=https://evil.com',
  '/\t/evil.com',
  '/\n/evil.com',
  '/\r/evil.com',
  '/\u0000/evil.com',
  '/\u007f/evil.com',
  '%2F%2Fevil.com',
  'evil.com',
  'cardapio',
  '',
  '   ',
]

test('sanitizeReturnUrl: payloads maliciosos caem no fallback', () => {
  for (const payload of MALICIOUS_PAYLOADS) {
    assert.equal(sanitizeReturnUrl(payload, FALLBACK), FALLBACK, `payload aceito: ${JSON.stringify(payload)}`)
  }
})

test('sanitizeReturnUrl: valores nulos ou nao-string caem no fallback', () => {
  for (const value of [null, undefined, 123, {}, [], true]) {
    assert.equal(sanitizeReturnUrl(value, FALLBACK), FALLBACK)
  }
})

test('sanitizeReturnUrl: caminhos internos legitimos sao preservados', () => {
  for (const path of ['/cardapio', '/checkout', '/checkout?step=2', '/pedidos/123', '/perfil/seguranca#topo']) {
    assert.equal(sanitizeReturnUrl(path, FALLBACK), path)
  }
  assert.equal(sanitizeReturnUrl('  /cardapio  ', FALLBACK), '/cardapio')
})

test('sanitizeReturnUrl: fallback padrao e /cardapio', () => {
  assert.equal(sanitizeReturnUrl('//evil.com'), '/cardapio')
})

test('selecionar-endereco: parametro redirect passa por sanitizeReturnUrl antes do AddressFlow', () => {
  const source = readFileSync(new URL('../app/selecionar-endereco/page.tsx', import.meta.url), 'utf8')
  assert.match(source, /import \{ sanitizeReturnUrl \} from "@\/lib\/security-auth"/)
  assert.match(source, /const redirectTo = sanitizeReturnUrl\(searchParams\.get\("redirect"\)/)
  assert.doesNotMatch(source, /searchParams\.get\("redirect"\) \|\|/)
  assert.match(source, /<AddressFlow redirectUrl=\{redirectTo\}/)
})
