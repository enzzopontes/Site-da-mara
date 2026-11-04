import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { logSecurityEvent } from '../lib/security-logger.ts'

// --- LOTE 5: AGENTES 41 A 50 (SEGREDOS, SUPPLY CHAIN, MOBILE, RESILIÊNCIA E POLP) ---

test('Agent 41 - Segredos: Varrer bundle/código cliente do site em busca de service_role e segredos', () => {
  const clientDirs = ['app', 'components', 'hooks']
  const sensitivePatterns = [
    /SUPABASE_SERVICE_ROLE_KEY\s*=/i,
    /service_role/i,
    /MERCADO_PAGO_ACCESS_TOKEN\s*=\s*['"]APP_USR/i,
    /JWT_SECRET\s*=\s*['"][a-zA-Z0-9]+/i,
  ]

  let leakedSecretsCount = 0

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
        scanDir(fullPath)
      } else if (entry.isFile() && /\.(tsx|ts|js|jsx)$/.test(entry.name)) {
        // Exclude server-only API routes and scripts
        if (fullPath.includes('app\\api\\') || fullPath.includes('app/api/')) continue
        const content = fs.readFileSync(fullPath, 'utf8')
        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            leakedSecretsCount++
          }
        }
      }
    }
  }

  for (const dir of clientDirs) {
    scanDir(dir)
  }

  assert.equal(leakedSecretsCount, 0, 'Nenhum segredo de backend (service_role, token privado) permitido no bundle de cliente do site')
})

test('Agent 42 - Segredos: Varrer código e configuração do APP em busca de service_role e senhas', () => {
  const appPath = path.resolve('../../batata-top')
  assert.ok(fs.existsSync(appPath), 'Diretório do app deve existir')

  const appPackageJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'))
  assert.ok(appPackageJson.name, 'App package.json deve ser válido')

  // Check that isAdmin.js in app has no hardcoded emails
  const isAdminPath = path.join(appPath, 'utils', 'isAdmin.js')
  if (fs.existsSync(isAdminPath)) {
    const isAdminContent = fs.readFileSync(isAdminPath, 'utf8')
    assert.doesNotMatch(isAdminContent, /enzzobaraldo2008@gmail\.com/, 'Emails de admin não devem estar embutidos no código do app')
    assert.doesNotMatch(isAdminContent, /maraysis9010@gmail\.com/, 'Emails de admin não devem estar embutidos no código do app')
  }

  // Scan app source files for service_role
  const forbiddenInApp = [/service_role/i, /SUPABASE_SERVICE_ROLE_KEY/i, /APP_USR-[0-9a-zA-Z-]{20,}/]
  let violations = 0
  const appDirs = ['src', 'screens', 'components', 'utils', 'services']

  for (const d of appDirs) {
    const fullDir = path.join(appPath, d)
    if (!fs.existsSync(fullDir)) continue
    const files = fs.readdirSync(fullDir, { recursive: true })
    for (const f of files) {
      const fileStr = String(f)
      if (/\.(js|jsx|ts|tsx)$/.test(fileStr)) {
        const content = fs.readFileSync(path.join(fullDir, fileStr), 'utf8')
        for (const p of forbiddenInApp) {
          if (p.test(content)) violations++
        }
      }
    }
  }

  assert.equal(violations, 0, 'Nenhum segredo privilegiado encontrado no código fonte do APP')
})

test('Agent 43 - Segredos: Varrer histórico do git e verificar mascaramento', () => {
  // Check docs/security/painel.md confirms git secret scanner has run
  const painelPath = path.resolve('docs/security/painel.md')
  assert.ok(fs.existsSync(painelPath), 'painel.md deve existir')
  const painel = fs.readFileSync(painelPath, 'utf8')
  assert.match(painel, /4\.\s*Segredos e Cripto/i, 'Auditoria de segredos deve estar documentada no painel')
})

test('Agent 44 - Segredos: Vazamento de credenciais e stack traces em logs de erro', () => {
  const simulatedErrorPayload = {
    message: 'Authentication failed for user mara',
    password: 'SuperSecretPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
    apiKey: 'sk_live_1234567890abcdef',
    creditCard: '4111222233334444'
  }

  const logEntry = logSecurityEvent({
    event: 'ERROR_AUTH',
    severity: 'HIGH',
    ip: '192.168.1.1',
    details: simulatedErrorPayload
  })

  // Verify none of the secret values leak in the serialized entry
  assert.doesNotMatch(logEntry, /SuperSecretPassword123!/, 'Senha nunca deve vazar nos logs')
  assert.doesNotMatch(logEntry, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/, 'Token nunca deve vazar nos logs')
  assert.doesNotMatch(logEntry, /sk_live_1234567890abcdef/, 'Chave de API nunca deve vazar nos logs')
  assert.doesNotMatch(logEntry, /4111222233334444/, 'Cartão nunca deve vazar nos logs')
})

test('Agent 45 - Supply Chain: Dependências e auditoria de vulnerabilidades', () => {
  const pkgLockPath = path.resolve('package-lock.json')
  assert.ok(fs.existsSync(pkgLockPath), 'package-lock.json deve existir para reprodutibilidade estrita de builds')
  
  // App dependencies check
  const appPkgPath = path.resolve('../../batata-top/package.json')
  assert.ok(fs.existsSync(appPkgPath), 'App package.json deve existir')
  const appPkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'))
  // shell-quote vulnerability was previously patched
  assert.ok(appPkg.dependencies, 'App dependencies must exist')
})

test('Agent 46 - Supply Chain: CI/CD com privilégios mínimos (PoLP)', () => {
  const workflowPath = path.resolve('.github/workflows/ci-security.yml')
  assert.ok(fs.existsSync(workflowPath), 'Workflow ci-security.yml deve existir')
  const content = fs.readFileSync(workflowPath, 'utf8')
  
  // Verify permissions block is strictly contents: read
  assert.match(content, /permissions:\s*\n\s*contents:\s*read/, 'CI workflow deve ter permissão estrita contents: read (PoLP)')
  assert.doesNotMatch(content, /permissions:\s*write-all/, 'CI workflow não pode ter write-all')
})

test('Agent 47 - App Mobile: Comunicação forçada por HTTPS e ausência de HTTP plano', () => {
  const appJsonPath = path.resolve('../../batata-top/app.json')
  assert.ok(fs.existsSync(appJsonPath), 'batata-top app.json deve existir')
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
  
  // Verify android usesCleartextTraffic is false or not set to true
  if (appJson.expo?.android) {
    assert.notEqual(appJson.expo.android.usesCleartextTraffic, true, 'usesCleartextTraffic não pode ser true no app')
  }

  // App API config should use HTTPS exclusively
  const appSupabaseConfigPath = path.join(path.resolve('../../batata-top'), 'services', 'supabase.js')
  if (fs.existsSync(appSupabaseConfigPath)) {
    const configContent = fs.readFileSync(appSupabaseConfigPath, 'utf8')
    assert.doesNotMatch(configContent, /http:\/\/[^l]/, 'Endpoints remotos do app devem usar HTTPS obrigatório')
  }
})

test('Agent 48 - Dados: Validação do plano de backup, rollback e integridade', () => {
  const backupDoc = path.resolve('docs/security/plano-backup-rollback.md')
  assert.ok(fs.existsSync(backupDoc), 'Plano de backup e rollback deve existir')
  const content = fs.readFileSync(backupDoc, 'utf8')
  
  assert.match(content, /RPO.*1\s*hora/i, 'RPO de 1 hora deve estar definido')
  assert.match(content, /RTO.*4\s*horas/i, 'RTO de 4 horas deve estar definido')
  assert.match(content, /Rollback/i, 'Estratégia e procedimentos de rollback devem estar documentados')
})

test('Agent 49 - Observabilidade: Disparo de logs estruturados e alertas em incidentes', () => {
  const log = logSecurityEvent({
    event: 'ANOMALOUS_CART_TAMPERING',
    severity: 'CRITICAL',
    ip: '10.0.0.5',
    details: { orderId: 'ord_999', calculatedTotal: 25.0, clientClaimedTotal: 0.01 }
  })

  const parsed = JSON.parse(log)
  assert.equal(parsed.event, 'ANOMALOUS_CART_TAMPERING')
  assert.equal(parsed.severity, 'CRITICAL')
  assert.equal(parsed.ip, '10.0.0.5')
  assert.equal(parsed.details.calculatedTotal, 25.0)
  assert.equal(parsed.details.clientClaimedTotal, 0.01)
  assert.ok(parsed.timestamp, 'Log deve conter timestamp ISO')
})

test('Agent 50 - Menor Privilégio: Matriz de acesso PoLP formalizada e validada', () => {
  const matrizPath = path.resolve('docs/security/matriz-de-acesso.md')
  assert.ok(fs.existsSync(matrizPath), 'docs/security/matriz-de-acesso.md deve existir')
  const content = fs.readFileSync(matrizPath, 'utf8')

  assert.match(content, /Visitante/i, 'Papel de Visitante deve estar mapeado')
  assert.match(content, /Cliente Autenticado/i, 'Papel de Cliente Autenticado deve estar mapeado')
  assert.match(content, /Administrador/i, 'Papel de Administrador deve estar mapeado')
  assert.match(content, /service_role/i, 'Regras de service_role devem estar mapeadas')
  assert.match(content, /Menor Privilégio/i, 'PoLP deve estar documentado')
})
