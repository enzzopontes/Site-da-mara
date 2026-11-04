import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePassword, sanitizeAuthErrorMessage, isSecureAdminCheck } from '../lib/security-auth.mjs'

test('Phase 1 - Password Policy Enforcement', () => {
  // Reject passwords shorter than 8 characters
  assert.equal(validatePassword('123456').isValid, false)
  assert.equal(validatePassword('short').isValid, false)
  
  // Reject passwords without digits or letters
  assert.equal(validatePassword('onlyletters').isValid, false)
  assert.equal(validatePassword('12345678').isValid, false)

  // Reject excessively long passwords (DoS prevention)
  assert.equal(validatePassword('a'.repeat(129) + '1').isValid, false)

  // Accept compliant passwords
  assert.equal(validatePassword('BatataTop2026!').isValid, true)
  assert.equal(validatePassword('segura123').isValid, true)
})

test('Phase 1 - User Enumeration Prevention', () => {
  // Database messages revealing user existence must be sanitized to generic messages
  const errorAlreadyExists = 'User already registered'
  const errorInvalidCreds = 'Invalid login credentials'
  const errorUserNotFound = 'User not found'

  const genericAuthError = sanitizeAuthErrorMessage(errorAlreadyExists)
  assert.equal(
    genericAuthError,
    'Não foi possível concluir a operação com os dados informados. Verifique e tente novamente.'
  )

  const sanitizedCreds = sanitizeAuthErrorMessage(errorInvalidCreds)
  assert.equal(sanitizedCreds, 'E-mail ou senha incorretos.')

  const sanitizedNotFound = sanitizeAuthErrorMessage(errorUserNotFound)
  assert.equal(
    sanitizedNotFound,
    'Não foi possível concluir a operação com os dados informados. Verifique e tente novamente.'
  )
})

test('Phase 1 - Admin Authority PoLP & Email Confirmation', () => {
  // Unconfirmed emails must NEVER be granted admin access even if email matches
  const unconfirmedAdminUser = {
    id: 'user-123',
    email: 'admin@batatatop.com.br',
    email_confirmed_at: null,
    app_metadata: {},
  }
  assert.equal(isSecureAdminCheck(unconfirmedAdminUser, 'admin@batatatop.com.br'), false)

  // Confirmed admin user with app_metadata role
  const metadataAdmin = {
    id: 'user-456',
    email: 'confirmed@batatatop.com.br',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { role: 'admin' },
  }
  assert.equal(isSecureAdminCheck(metadataAdmin), true)

  // Confirmed admin user with verified email match against secure list
  const confirmedEmailAdmin = {
    id: 'user-789',
    email: 'admin@batatatop.com.br',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
  }
  assert.equal(isSecureAdminCheck(confirmedEmailAdmin, 'admin@batatatop.com.br'), true)
})
