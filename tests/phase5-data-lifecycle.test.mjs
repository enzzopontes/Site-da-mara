import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Phase 5 - SQL Migration Sequential Order and Idempotency', () => {
  const scriptsDir = path.resolve('scripts')
  assert.ok(fs.existsSync(scriptsDir), 'Diretório scripts/ deve existir')

  const files = fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.sql')).sort()
  assert.ok(files.length >= 10, 'Deve haver migrations versionadas')

  // Verificar que os scripts contêm cláusulas de idempotência (IF NOT EXISTS, OR REPLACE, DROP IF EXISTS)
  for (const file of files) {
    const content = fs.readFileSync(path.join(scriptsDir, file), 'utf8')
    const hasIdempotency =
      content.includes('IF NOT EXISTS') ||
      content.includes('OR REPLACE') ||
      content.includes('DROP POLICY IF EXISTS') ||
      content.includes('DROP FUNCTION IF EXISTS') ||
      content.includes('ON CONFLICT')
    assert.ok(hasIdempotency, `Migration ${file} deve conter cláusula de idempotência`)
  }
})

test('Phase 5 - Backup, Rollback and LGPD Runbooks Existence', () => {
  const rollbackPlan = path.resolve('docs/security/plano-backup-rollback.md')
  const lgpdPolicy = path.resolve('docs/security/politica-retencao-lgpd.md')

  assert.ok(fs.existsSync(rollbackPlan), 'Plano de backup e rollback deve existir')
  assert.ok(fs.existsSync(lgpdPolicy), 'Política de retenção e LGPD deve existir')

  const rollbackContent = fs.readFileSync(rollbackPlan, 'utf8')
  assert.ok(rollbackContent.includes('RTO'), 'Plano deve definir RTO')
  assert.ok(rollbackContent.includes('RPO'), 'Plano deve definir RPO')
  assert.ok(rollbackContent.includes('vercel rollback'), 'Plano deve documentar rollback de deploy')
})
