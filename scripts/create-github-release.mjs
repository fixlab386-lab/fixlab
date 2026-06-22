/**
 * Crea una GitHub Release per un tag (se non esiste).
 * Uso: node scripts/create-github-release.mjs v1.0.90 "Note release"
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const tag = process.argv[2]
const body = process.argv[3] ?? ''
if (!tag) {
  console.error('Uso: node scripts/create-github-release.mjs v1.0.90 "Note"')
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

const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
})

if (existing.ok) {
  const rel = await existing.json()
  console.log(`Release ${tag} già presente: ${rel.html_url}`)
  process.exit(0)
}

const rel = await gh(`https://api.github.com/repos/${owner}/${repo}/releases`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tag_name: tag,
    name: `FixLab ${version}`,
    body,
    draft: false,
  }),
})

console.log(`✓ Release creata: ${rel.html_url}`)
