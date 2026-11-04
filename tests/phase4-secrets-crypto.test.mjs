import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Phase 4 - Environment Template Security (.env.example)', () => {
  const envExamplePath = path.resolve('.env.example')
  assert.ok(fs.existsSync(envExamplePath), '.env.example deve existir')

  const content = fs.readFileSync(envExamplePath, 'utf8')

  // Garantir que nenhum segredo real de produção conste no .env.example
  assert.equal(/APP_USR-[0-9]{10,}/.test(content), false, 'Nenhum token real do Mercado Pago no template')
  assert.equal(/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(content), false, 'Nenhum JWT real no template')
})

test('Phase 4 - Gitignore Coverage for Secrets', () => {
  const gitignorePath = path.resolve('.gitignore')
  const content = fs.readFileSync(gitignorePath, 'utf8')

  // Deve ignorar .env, .env.local, .env.production.local, etc.
  assert.ok(content.includes('.env'))
  assert.ok(content.includes('.env.local') || content.includes('.env*.local'))
  assert.ok(content.includes('.env.production'))
})

test('Phase 4 - Client Bundle Isolation (PoLP)', () => {
  // Verificar se o cliente público do browser jamais lê SUPABASE_SERVICE_ROLE_KEY
  const clientTsPath = path.resolve('lib/supabase/client.ts')
  const clientContent = fs.readFileSync(clientTsPath, 'utf8')

  assert.equal(
    clientContent.includes('SUPABASE_SERVICE_ROLE_KEY'),
    false,
    'Client do Supabase NUNCA deve importar ou referenciar SUPABASE_SERVICE_ROLE_KEY'
  )
})
