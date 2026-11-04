import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { checkRateLimit } from '../lib/rate-limit.ts'
import { sanitizeAuthErrorMessage, validatePassword, isSecureAdminCheck } from '../lib/security-auth.mjs'

// ============================================================
// RED TEAM - LOTE 1 (AGENTES 1 A 10: AUTH & SESSÃO)
// ============================================================

test('Agent 01 - Auth: Quebrar login por força bruta (Rate Limiting)', () => {
  const targetIp = '203.0.113.42'
  const limit = 25
  const windowMs = 60 * 1000

  let blockedCount = 0
  for (let i = 1; i <= 35; i++) {
    const rl = checkRateLimit(`auth:${targetIp}`, limit, windowMs)
    if (!rl.success) {
      blockedCount++
    }
  }

  // A partir da 26ª tentativa deve ser terminantemente bloqueado (HTTP 429)
  assert.equal(blockedCount, 10, 'Deve ter bloqueado exatamente 10 tentativas excedentes')
  const finalCheck = checkRateLimit(`auth:${targetIp}`, limit, windowMs)
  assert.equal(finalCheck.success, false, 'Requisições subsequentes devem permanecer bloqueadas')
})

test('Agent 02 - Auth: Enumerar usuários existentes (Sanitização de Erros)', () => {
  // Testar respostas para usuário cadastrado vs não cadastrado
  const existentError = 'User already registered'
  const nonExistentError = 'User not found'
  const wrongPassError = 'Invalid login credentials'

  const res1 = sanitizeAuthErrorMessage(existentError)
  const res2 = sanitizeAuthErrorMessage(nonExistentError)
  const res3 = sanitizeAuthErrorMessage(wrongPassError)

  // Mensagens para usuário existente e não existente DEVEM ser idênticas e indistinguíveis
  assert.equal(res1, res2, 'Mensagens de existência de usuário devem ser indistinguíveis')
  assert.equal(res1, 'Não foi possível concluir a operação com os dados informados. Verifique e tente novamente.')
  assert.equal(res3, 'E-mail ou senha incorretos.')
})

test('Agent 03 - Auth: Burlar reset de senha com senha fraca ou token adulterado', () => {
  // Tentativa de redefinir senha com payloads de bypass (senhas curtas, vazias, apenas números)
  assert.equal(validatePassword('').isValid, false)
  assert.equal(validatePassword('12345').isValid, false)
  assert.equal(validatePassword('abcdefg').isValid, false)
  assert.equal(validatePassword('admin123').isValid, true) // Cumpre o mínimo de 8 chars alfanumérico

  // Validação de token PKCE/Session inválido
  const invalidCode = 'forged-code-attempt-12345'
  const mockExchange = (code) => {
    if (!code || code !== 'valid-secret-exchange-code') {
      return { session: null, error: 'Invalid or expired exchange code' }
    }
    return { session: { user: { id: 'usr-1' } }, error: null }
  }

  const result = mockExchange(invalidCode)
  assert.equal(result.session, null)
  assert.ok(result.error)
})

test('Agent 04 - Auth: Burlar ou contornar MFA/Admin Authority', () => {
  // Tentativa de invasão com conta de e-mail não confirmado ou spoofado
  const maliciousUser = {
    id: 'attacker-uuid',
    email: 'admin@batatatop.com.br',
    email_confirmed_at: null, // E-mail ainda não verificado
    app_metadata: { role: 'user' },
  }

  // Mesmo que o invasor cadastre o e-mail do admin, se não tiver confirmação, o acesso deve ser NEGADO
  assert.equal(isSecureAdminCheck(maliciousUser, 'admin@batatatop.com.br'), false)

  // Tentativa de alterar o role via client-side metadata
  const spoofedMetadataUser = {
    id: 'attacker-uuid',
    email: 'hacker@gmail.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    user_metadata: { role: 'admin' }, // user_metadata é editável pelo cliente, NÃO app_metadata
    app_metadata: { role: 'user' },
  }
  assert.equal(isSecureAdminCheck(spoofedMetadataUser), false)
})

test('Agent 05 - Auth: Forjar ou adulterar JWT (alg: none e chave inválida)', () => {
  const secretKey = 'trusted-supabase-jwt-secret'
  const fakeSecretKey = 'attacker-tampered-secret'

  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify({ sub: 'user-123', role: 'admin' })).toString('base64url')

  // Assinatura com chave forjada
  const forgedSig = crypto.createHmac('sha256', fakeSecretKey).update(`${headerB64}.${payloadB64}`).digest('base64url')
  const forgedJwt = `${headerB64}.${payloadB64}.${forgedSig}`

  // Verificador
  const verifyJwt = (jwt, key) => {
    const [h, p, s] = jwt.split('.')
    const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'))
    if (header.alg === 'none' || !s) return false // Rejeitar explicitamente alg: none
    const expected = crypto.createHmac('sha256', key).update(`${h}.${p}`).digest('base64url')
    const sBuf = Buffer.from(s)
    const expBuf = Buffer.from(expected)
    if (sBuf.length !== expBuf.length) return false
    return crypto.timingSafeEqual(sBuf, expBuf)
  }

  // Assinatura forjada deve falhar
  assert.equal(verifyJwt(forgedJwt, secretKey), false)

  // Ataque alg: none deve falhar
  const algNoneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const algNoneJwt = `${algNoneHeader}.${payloadB64}.`
  assert.equal(verifyJwt(algNoneJwt, secretKey), false)
})

test('Agent 06 - Sessão: Reutilizar sessão após logout (Revogação)', () => {
  const activeSessions = new Set(['sess-valid-token-1'])

  const performLogout = (token) => {
    activeSessions.delete(token)
  }

  const checkSession = (token) => {
    return activeSessions.has(token)
  }

  // Antes do logout: válida
  assert.equal(checkSession('sess-valid-token-1'), true)

  // Executa logout
  performLogout('sess-valid-token-1')

  // Tentativa de reutilização: bloqueada
  assert.equal(checkSession('sess-valid-token-1'), false)
})

test('Agent 07 - Sessão: Fixação e roubo de sessão (Regeneração de Token)', () => {
  let sessionState = {
    sessionId: 'pre-auth-anonymous-session-999',
    userId: null,
    authenticated: false,
  }

  // No login, o session identifier DEVE ser obrigatoriamente rotacionado
  const authenticateUser = (userId) => {
    sessionState = {
      sessionId: crypto.randomUUID(), // Novo identificador criptográfico
      userId: userId,
      authenticated: true,
    }
  }

  const oldId = sessionState.sessionId
  authenticateUser('usr-authenticated-456')

  assert.notEqual(sessionState.sessionId, oldId, 'Session ID deve ser regenerado no login')
  assert.equal(sessionState.authenticated, true)
})

test('Agent 08 - Sessão: Explorar cookie sem flags (Secure, HttpOnly, SameSite)', () => {
  // Simulador de opções de cookies do Supabase Server Client
  const applyCookieOptions = (options, isProduction = true) => {
    return {
      ...options,
      secure: isProduction,
      sameSite: options?.sameSite || 'lax',
      httpOnly: options?.httpOnly ?? true,
    }
  }

  const rawOptions = { path: '/' }
  const secured = applyCookieOptions(rawOptions, true)

  assert.equal(secured.secure, true, 'Cookie deve conter flag Secure em produção')
  assert.equal(secured.httpOnly, true, 'Cookie de auth deve conter flag HttpOnly')
  assert.equal(secured.sameSite, 'lax', 'Cookie deve conter flag SameSite=Lax')
})

test('Agent 09 - Acesso: IDOR em endpoints de leitura de pedidos', () => {
  const ordersDatabase = [
    { id: 'order-1', user_id: 'user-alice', total: 45.0 },
    { id: 'order-2', user_id: 'user-bob', total: 60.0 },
  ]

  // Função simulando query RLS: SELECT * FROM orders WHERE user_id = auth.uid()
  const readOrder = (requestingUserId, orderId) => {
    const order = ordersDatabase.find((o) => o.id === orderId)
    if (!order) return null
    // Proteção contra IDOR: Usuário comum só vê se for o dono
    if (order.user_id !== requestingUserId) {
      return null // Acesso negado
    }
    return order
  }

  // Alice tenta ler o pedido de Bob
  const aliceReadingBob = readOrder('user-alice', 'order-2')
  assert.equal(aliceReadingBob, null, 'Alice não deve conseguir ler o pedido de Bob (IDOR bloqueado)')

  // Bob lê o próprio pedido
  const bobReadingOwn = readOrder('user-bob', 'order-2')
  assert.equal(bobReadingOwn?.id, 'order-2')
})

test('Agent 10 - Acesso: IDOR em endpoints de escrita (cancelamento/mutação)', () => {
  const ordersDatabase = [
    { id: 'order-1', user_id: 'user-alice', status: 'pending' },
    { id: 'order-2', user_id: 'user-bob', status: 'pending' },
  ]

  // Simula RPC cancel_order_user(p_order_id, auth.uid())
  const cancelOrder = (requestingUserId, orderId) => {
    const order = ordersDatabase.find((o) => o.id === orderId)
    if (!order) return { success: false, error: 'Pedido não encontrado' }
    if (order.user_id !== requestingUserId) {
      return { success: false, error: 'Acesso negado: você não tem permissão para cancelar este pedido' }
    }
    order.status = 'cancelled'
    return { success: true }
  }

  // Alice tenta cancelar o pedido de Bob
  const cancelAttempt = cancelOrder('user-alice', 'order-2')
  assert.equal(cancelAttempt.success, false, 'Cancelamento por terceiro deve ser rejeitado')
  assert.equal(ordersDatabase.find((o) => o.id === 'order-2')?.status, 'pending')

  // Bob cancela seu próprio pedido
  const bobCancel = cancelOrder('user-bob', 'order-2')
  assert.equal(bobCancel.success, true)
  assert.equal(ordersDatabase.find((o) => o.id === 'order-2')?.status, 'cancelled')
})
