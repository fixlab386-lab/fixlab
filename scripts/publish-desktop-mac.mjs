/**
 * Build e pubblica su GitHub la versione macOS (senza bump).
 * Richiede macOS — in locale o via GitHub Actions (workflow desktop-mac.yml).
 * Uso: node scripts/publish-desktop-mac.mjs
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

if (process.platform !== 'darwin') {
  console.error('Errore: la build macOS va eseguita su macOS (o tramite GitHub Actions → Desktop Mac).')
  process.exit(1)
}

if (!process.env.GH_TOKEN) {
  console.error('Errore: imposta GH_TOKEN (env o .env) prima di pubblicare.')
  process.exit(1)
}

const npmCmd = 'npm'
const npxCmd = 'npx'

function run(command, args, label) {
  console.log(`\n→ ${label}`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
console.log(`Pubblicazione desktop macOS FixLab v${version} (non firmata)…`)

run(npmCmd, ['run', 'build:desktop'], 'build desktop')
run(npxCmd, ['electron-builder', '--mac', '--publish', 'always'], 'electron-builder publish mac')

console.log(`\n✓ Release macOS v${version} pubblicata.`)
