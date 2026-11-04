import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { sanitizeLogData, createSecurityLogEntry } from '../lib/security-logger.mjs'

test('Phase 7 - PII and Secrets Redaction in Security Logs', () => {
  const sensitivePayload = {
    user: 'cliente@gmail.com',
    password: 'SuperSecretPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    card_number: '4111 2222 3333 4444',
    cvv: '123',
    cpf: '12345678901',
    message: 'Cartão 5555-4444-3333-2222 aprovado',
  }

  const sanitized = sanitizeLogData(sensitivePayload)

  assert.equal(sanitized.password, '[REDACTED]')
  assert.equal(sanitized.token, '[REDACTED]')
  assert.equal(sanitized.cvv, '[REDACTED]')
  assert.equal(sanitized.card_number, '[REDACTED]')
  assert.ok(sanitized.cpf.includes('.***.***-'), 'CPF deve estar mascarado')
  assert.equal(sanitized.message.includes('5555-4444-3333-2222'), false, 'Número de cartão no texto deve ser mascarado')
  assert.ok(sanitized.message.includes('[REDACTED_CARD]'))
})

test('Phase 7 - Security Log Entry Structure', () => {
  const entry = createSecurityLogEntry('AUTH_FAILURE', {
    ip: '192.168.1.1',
    attemptedUser: 'attacker@evil.com',
    password: 'failedPassword',
  })

  assert.equal(entry.event_type, 'AUTH_FAILURE')
  assert.ok(entry.timestamp)
  assert.equal(entry.payload.password, '[REDACTED]')
})

test('Phase 7 - Runbook, PMP and SECURITY.md Documentation', () => {
  const runbookPath = path.resolve('docs/security/runbook-incidente.md')
  const pmpPath = path.resolve('docs/security/pmp-plano-manutencao.md')
  const securityMdPath = path.resolve('SECURITY.md')

  assert.ok(fs.existsSync(runbookPath), 'Runbook de incidente deve existir')
  assert.ok(fs.existsSync(pmpPath), 'Plano de manutenção PMP deve existir')
  assert.ok(fs.existsSync(securityMdPath), 'SECURITY.md deve existir na raiz')

  const runbookContent = fs.readFileSync(runbookPath, 'utf8')
  assert.ok(runbookContent.includes('RTO'), 'Runbook deve definir RTO')
  assert.ok(runbookContent.includes('RPO'), 'Runbook deve definir RPO')
  assert.ok(runbookContent.includes('Contenção'), 'Runbook deve prever fase de contenção')

  const securityMdContent = fs.readFileSync(securityMdPath, 'utf8')
  assert.ok(securityMdContent.includes('seguranca@batatatop.com.br'), 'SECURITY.md deve indicar canal de contato')
})
