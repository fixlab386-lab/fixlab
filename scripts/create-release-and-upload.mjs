/**
 * Crea tag + release GitHub e carica asset desktop.
 * Uso: node scripts/create-release-and-upload.mjs [tag]
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

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
  console.error('GH_TOKEN mancante')
  process.exit(1)
}

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const tag = process.argv[2] || `v${version}`
const headers = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
}

const repo = 'fixlab386-lab/fixlab'

async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, { ...options, headers: { ...headers, ...options.headers } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('GitHub API error', path, res.status, body)
    process.exit(1)
  }
  return body
}

// Crea tag se non esiste
const tagCheck = await fetch(`https://api.github.com/repos/${repo}/git/ref/tags/${tag}`, { headers })
if (tagCheck.status === 404) {
  const mainRef = await gh('/git/ref/heads/main')
  await gh('/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/tags/${tag}`, sha: mainRef.object.sha }),
  })
  console.log('→ tag creato:', tag)
} else {
  console.log('→ tag già presente:', tag)
}

// Crea release draft se non esiste
let release
const relRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers })
if (relRes.status === 404) {
  release = await gh('/releases', {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      name: `FixLab ${tag.replace(/^v/, '')}`,
      body: 'Aggiornamento FixLab — collegamenti Start, bancomat/scontrino RT, miglioramenti gestionale.',
      draft: false,
    }),
  })
  console.log('→ release creata:', release.html_url)
} else {
  release = await relRes.json()
  console.log('→ release esistente:', release.html_url)
}

// Copia artifact da cartella build alternativa
const srcDir = join(root, `release-v${version.replace(/\./g, '-')}`)
const destDir = join(root, 'release')
mkdirSync(destDir, { recursive: true })
for (const f of [`FixLab-Setup-${version}.exe`, `FixLab-Setup-${version}.exe.blockmap`, 'latest.yml']) {
  const src = join(srcDir, f)
  if (!existsSync(src)) {
    console.error('File mancante:', src)
    process.exit(1)
  }
  copyFileSync(src, join(destDir, f))
}

const upload = spawnSync(process.execPath, ['scripts/upload-release-assets.mjs', tag], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
process.exit(upload.status ?? 1)
