/**
 * Pubblica su GitHub una build già presente in release-build/ (senza ricompilare).
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')

if (existsSync(envPath)) {
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

if (!process.env.GH_TOKEN) {
  console.error('Errore: GH_TOKEN mancante in .env')
  process.exit(1)
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const srcDir = join(root, 'release-build')
const destDir = join(root, 'release')

for (const f of [`FixLab-Setup-${version}.exe`, `FixLab-Setup-${version}.exe.blockmap`]) {
  const src = join(srcDir, f)
  if (!existsSync(src)) {
    console.error(`Build mancante: ${src}`)
    process.exit(1)
  }
  mkdirSync(destDir, { recursive: true })
  copyFileSync(src, join(destDir, f))
  console.log(`→ copiato ${f}`)
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
console.log(`\n→ Pubblicazione release v${version} su GitHub…`)

const result = spawnSync(
  npxCmd,
  ['electron-builder', '--win', '--publish', 'always', '--prepackaged', join(srcDir, 'win-unpacked')],
  { cwd: root, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' },
)

if (result.status !== 0) process.exit(result.status ?? 1)
console.log(`\n✓ Release desktop v${version} pubblicata.`)
