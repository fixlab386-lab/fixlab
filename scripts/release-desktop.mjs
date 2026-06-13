/**
 * Rilascio desktop: verifica GH_TOKEN e avvia bump + build + publish.
 * Uso: node scripts/release-desktop.mjs patch|minor|major
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const bump = process.argv[2]
const valid = new Set(['patch', 'minor', 'major'])

if (!valid.has(bump)) {
  console.error('Uso: node scripts/release-desktop.mjs patch|minor|major')
  process.exit(1)
}

if (!process.env.GH_TOKEN) {
  console.error('Errore: imposta GH_TOKEN prima di pubblicare (vedi docs/RELEASE.md).')
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function run(command, args, label) {
  console.log(`\n→ ${label}`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(npmCmd, ['version', bump], `npm version ${bump}`)
run(npmCmd, ['run', 'build:desktop'], 'build desktop')
run(npxCmd, ['electron-builder', '--win', '--publish', 'always'], 'electron-builder publish')

console.log('\n✓ Release desktop completata.')
