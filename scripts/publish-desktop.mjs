/**
 * Pubblica su GitHub Releases la versione corrente in package.json (senza bump).
 * Uso: node scripts/publish-desktop.mjs
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile()

if (!process.env.GH_TOKEN) {
  console.error('Errore: imposta GH_TOKEN (env o .env) prima di pubblicare.')
  process.exit(1)
}

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
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const tag = `v${version}`
console.log(`Pubblicazione desktop FixLab ${tag}…`)

function runGit(args, label) {
  console.log(`\n→ ${label}`)
  const result = spawnSync('git', args, { cwd: root, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

runGit(['tag', '-f', tag], `git tag ${tag}`)
runGit(['push', 'origin', tag, '--force'], `git push ${tag}`)

run(npmCmd, ['run', 'build:desktop'], 'build desktop')

console.log('\n→ electron-builder publish')
const publish = spawnSync(npxCmd, ['electron-builder', '--win', '--publish', 'always'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

if (publish.status !== 0) {
  console.warn('\n⚠ electron-builder publish fallito — carico asset manualmente (exe + latest.yml)…')
} else {
  console.log('\n→ Verifica asset release (latest.yml per auto-update)…')
}

const uploadAssets = spawnSync(process.execPath, ['scripts/upload-release-assets.mjs', tag], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
if (uploadAssets.status !== 0) process.exit(uploadAssets.status ?? 1)

console.log(`\n✓ Release desktop ${tag} pubblicata.`)
