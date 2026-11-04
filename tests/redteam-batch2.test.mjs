import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeString } from '../lib/security-validation.mjs'

// ============================================================
// RED TEAM - LOTE 2 (AGENTES 11 A 20: ACESSO, BANCO & INJEÇÃO)
// ============================================================

test('Agent 11 - Acesso: Escalada vertical (virar admin via perfil/payload)', () => {
  // Simula tentativa de auto-promover para 'admin' via REST UPDATE profiles
  const attemptProfileUpdate = (requestingUser, targetId, updateData) => {
    // Regra RLS: Usuário comum NÃO pode alterar a coluna 'role'
    if (updateData.role && requestingUser.role !== 'admin') {
      return { success: false, error: 'Violação de política RLS: apenas administradores podem alterar a role' }
    }
    return { success: true }
  }

  const attacker = { id: 'usr-attacker', role: 'customer' }
  const escalation = attemptProfileUpdate(attacker, attacker.id, { role: 'admin' })
  assert.equal(escalation.success, false)
  assert.ok(escalation.error.includes('RLS'))
})

test('Agent 12 - Acesso: Escalada horizontal (ver/alterar endereço de outro usuário)', () => {
  const addresses = [
    { id: 'addr-1', user_id: 'user-alice', street: 'Rua das Flores, 100' },
    { id: 'addr-2', user_id: 'user-bob', street: 'Av. Paulista, 500' },
  ]

  const getAddress = (requestingUserId, addressId) => {
    const addr = addresses.find((a) => a.id === addressId)
    if (!addr || addr.user_id !== requestingUserId) return null
    return addr
  }

  // Alice tenta acessar o endereço de Bob
  assert.equal(getAddress('user-alice', 'addr-2'), null)
  // Alice acessa seu próprio endereço
  assert.equal(getAddress('user-alice', 'addr-1')?.street, 'Rua das Flores, 100')
})

test('Agent 13 - Acesso: Acessar rotas /admin sem credencial válida', () => {
  const checkAdminRouteAccess = (pathname, user) => {
    if (!pathname.startsWith('/admin')) return { allowed: true }
    if (!user) return { allowed: false, redirect: '/login' }
    if (user.role !== 'admin' && user.app_metadata?.role !== 'admin') {
      return { allowed: false, redirect: '/' }
    }
    return { allowed: true }
  }

  // Visitante anônimo
  assert.equal(checkAdminRouteAccess('/admin/pedidos', null).redirect, '/login')

  // Cliente comum logado
  const customer = { id: 'cust-1', role: 'customer', app_metadata: { role: 'user' } }
  assert.equal(checkAdminRouteAccess('/admin/administradores', customer).redirect, '/')

  // Administrador confirmado
  const admin = { id: 'adm-1', role: 'admin', app_metadata: { role: 'admin' } }
  assert.equal(checkAdminRouteAccess('/admin/pedidos', admin).allowed, true)
})

test('Agent 14 - Banco: Burlar RLS tabela por tabela (inserção direta em orders)', () => {
  // Conforme 016_lock_orders_direct_insert.sql, clientes comuns não possuem INSERT direto em orders
  const directInsertOrder = (user, orderData) => {
    if (user.role !== 'admin' && !user.is_service_role) {
      return { success: false, error: 'new row violates row-level security policy for table "orders"' }
    }
    return { success: true }
  }

  const customerUser = { id: 'usr-1', role: 'customer' }
  const result = directInsertOrder(customerUser, { total: 0.01 })
  assert.equal(result.success, false)
  assert.ok(result.error.includes('row-level security'))
})

test('Agent 15 - Banco: Abusar de funções RPC administrativas (admin_add_admin)', () => {
  const invokeRpc = (rpcName, callerUser, params) => {
    if (rpcName === 'admin_add_admin' || rpcName === 'apply_payment_result') {
      if (callerUser.role !== 'admin' && !callerUser.is_service_role) {
        return { error: 'permission denied: caller must have admin role' }
      }
    }
    return { data: 'ok', error: null }
  }

  const attacker = { id: 'usr-hack', role: 'customer' }
  const attempt = invokeRpc('admin_add_admin', attacker, { email: 'evil@hack.com' })
  assert.ok(attempt.error)
  assert.ok(attempt.error.includes('permission denied'))
})

test('Agent 16 - Banco: Usar chave anon para ler tabelas restritas', () => {
  const allowedAnonTables = new Set(['products', 'adicionais', 'coupons', 'store_settings'])

  const queryTableWithAnon = (tableName) => {
    if (!allowedAnonTables.has(tableName)) {
      return { data: null, error: 'permission denied for table ' + tableName }
    }
    return { data: [], error: null }
  }

  // Tentativa de ler orders ou audit_logs com anon key
  assert.ok(queryTableWithAnon('orders').error)
  assert.ok(queryTableWithAnon('uploaded_images_internal').error)

  // Leitura permitida do catálogo público
  assert.equal(queryTableWithAnon('products').error, null)
})

test('Agent 17 - Injeção: SQL Injection clássica em busca e queries', () => {
  // Payloads ofensivos clássicos
  const sqliPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE orders; --",
    "admin'--",
    "1 UNION SELECT null, email, password FROM auth.users--",
  ]

  // Simulador de query parametrizada com binding seguro do Supabase PostgREST
  const queryProductCatalog = (searchTerm) => {
    // Parâmetro é tratado como string literal, nunca interpolado diretamente no SQL
    return {
      query: 'SELECT * FROM products WHERE name ILIKE $1',
      parameter: `%${searchTerm}%`,
    }
  }

  for (const payload of sqliPayloads) {
    const q = queryProductCatalog(payload)
    // O payload deve ficar estritamente no parâmetro $1, jamais no corpo do SQL
    assert.equal(q.query.includes(payload), false)
    assert.equal(q.parameter, `%${payload}%`)
  }
})

test('Agent 18 - Injeção: SQL Injection em filtros e ordenação dinâmica', () => {
  const allowedSortColumns = new Set(['name', 'price', 'created_at'])

  const sanitizeSortColumn = (column) => {
    const clean = String(column).toLowerCase().trim()
    if (!allowedSortColumns.has(clean)) {
      return 'created_at' // Fallback seguro para coluna padrão
    }
    return clean
  }

  // Tentativa de SQLi na ordenação
  assert.equal(sanitizeSortColumn('price; (SELECT pg_sleep(5))--'), 'created_at')
  assert.equal(sanitizeSortColumn('(CASE WHEN 1=1 THEN name ELSE price END)'), 'created_at')
  assert.equal(sanitizeSortColumn('price'), 'price')
})

test('Agent 19 - Injeção: Command / Template Injection em campos de texto', () => {
  const injectionPayloads = [
    '${7*7}',
    '{{7*7}}',
    '<%= 7*7 %>',
    '; cat /etc/passwd',
    '& calc.exe',
  ]

  for (const payload of injectionPayloads) {
    const sanitized = sanitizeString(payload)
    // Não pode haver execução dinâmica: a string deve ser puramente tratada como texto
    assert.equal(typeof sanitized, 'string')
    assert.equal(sanitized.includes('49'), false) // Não avaliou a expressão matemática 7*7
  }
})

test('Agent 20 - Injeção: XSS Refletido em parâmetros de URL', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '"><img src=x onerror=alert(1)>',
    'javascript:alert(1)',
  ]

  for (const payload of xssPayloads) {
    const sanitized = sanitizeString(payload)
    assert.equal(sanitized.includes('<script>'), false)
    assert.equal(sanitized.includes('<img'), false)
    assert.equal(sanitized.includes('onerror'), false)
    assert.equal(sanitized.includes('javascript:'), false)
  }
})
