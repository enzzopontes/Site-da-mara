import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Phase 6 - GitHub Actions CI Hardening & PoLP Permissions', () => {
  const ciWorkflowPath = path.resolve('.github/workflows/ci-security.yml')
  assert.ok(fs.existsSync(ciWorkflowPath), 'Workflow de CI deve existir')

  const content = fs.readFileSync(ciWorkflowPath, 'utf8')

  // PoLP: Permissão do token de CI deve ser explicitamente read-only
  assert.ok(content.includes('permissions:'), 'CI deve declarar permissões explícitas')
  assert.ok(content.includes('contents: read'), 'CI deve restringir permissão para read-only')

  // Uso de lockfile estrito
  assert.ok(content.includes('npm ci'), 'CI deve utilizar npm ci para garantir integridade do lockfile')
  assert.ok(content.includes('npm audit'), 'CI deve auditar dependências contra vulnerabilidades')
  assert.ok(content.includes('npm test'), 'CI deve executar a suíte de testes de segurança')
})

test('Phase 6 - Dependabot Security Automation', () => {
  const dependabotPath = path.resolve('.github/dependabot.yml')
  assert.ok(fs.existsSync(dependabotPath), 'Configuração do Dependabot deve existir')

  const content = fs.readFileSync(dependabotPath, 'utf8')
  assert.ok(content.includes('package-ecosystem: "npm"'))
})
