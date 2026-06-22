/**
 * Carica asset su una GitHub Release esistente (usa GH_TOKEN da .env).
 * Include latest.yml richiesto da electron-updater per gli aggiornamenti automatici.
 * Uso: node scripts/upload-release-assets.mjs v1.0.86
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const tag = process.argv[2]
if (!tag) {
  console.error('Uso: node scripts/upload-release-assets.mjs v1.0.86')
  process.exit(1)
}

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

const token = process.env.GH_TOKEN
if (!token) {
  console.error('Errore: imposta GH_TOKEN')
  process.exit(1)
}

const owner = 'fixlab386-lab'
const repo = 'fixlab'
const version = tag.replace(/^v/, '')

const gen = spawnSync(process.execPath, ['scripts/generate-latest-yml.mjs', version], {
  cwd: root,
  stdio: 'inherit',
})
if (gen.status !== 0) process.exit(gen.status ?? 1)

async function gh(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${url}\n${text}`)
  return text ? JSON.parse(text) : null
}

const files = [
  `FixLab-Setup-${version}.exe`,
  `FixLab-Setup-${version}.exe.blockmap`,
  'latest.yml',
]

const rel = await gh(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`)
console.log(`Release ${tag} (id ${rel.id}), asset attuali: ${rel.assets?.length ?? 0}`)

for (const name of files) {
  const filePath = join(root, 'release', name)
  if (!existsSync(filePath)) {
    console.error(`File mancante: ${filePath}`)
    process.exit(1)
  }
  const buf = readFileSync(filePath)
  const existing = (rel.assets ?? []).find(a => a.name === name)
  if (existing) {
    console.log(`Rimuovo asset esistente: ${name}`)
    await gh(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existing.id}`, { method: 'DELETE' })
  }
  const contentType = name.endsWith('.yml') ? 'text/yaml' : 'application/octet-stream'
  console.log(`Carico ${name} (${buf.length} byte)…`)
  const up = await fetch(
    `https://uploads.github.com/repos/${owner}/${repo}/releases/${rel.id}/assets?name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': contentType,
        'Content-Length': String(buf.length),
      },
      body: buf,
    },
  )
  const upText = await up.text()
  if (!up.ok) throw new Error(`Upload fallito ${up.status}: ${upText}`)
  console.log(`✓ ${name}`)
}

console.log(`\n✓ Release pronta (con latest.yml per auto-update): https://github.com/${owner}/${repo}/releases/tag/${tag}`)
