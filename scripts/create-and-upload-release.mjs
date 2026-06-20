/**
 * Crea release GitHub (se assente) e carica asset da release/.
 * Uso: node scripts/create-and-upload-release.mjs [tag]
 */
import { readFileSync, existsSync } from 'node:fs'
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

let release
const create = await fetch('https://api.github.com/repos/fixlab386-lab/fixlab/releases', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    tag_name: tag,
    name: `FixLab ${tag}`,
    body: `Release desktop ${tag}.`,
    draft: false,
    generate_release_notes: false,
  }),
})
const created = await create.json()
if (create.ok) {
  release = created
  console.log('release creata:', release.html_url)
} else if (create.status === 422) {
  const get = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/${tag}`, { headers })
  release = await get.json()
  if (!release.id) {
    console.error('Release non trovata dopo 422:', created)
    process.exit(1)
  }
  console.log('release esistente:', release.html_url)
} else {
  console.error('create failed', create.status, created)
  process.exit(1)
}

const ver = tag.replace(/^v/, '')
const files = [
  join(root, 'release', `FixLab-Setup-${ver}.exe`),
  join(root, 'release', `FixLab-Setup-${ver}.exe.blockmap`),
  join(root, 'release', 'latest.yml'),
]

const existing = new Set((release.assets || []).map(a => a.name))
for (const filePath of files) {
  const name = filePath.split(/[/\\]/).pop()
  if (existing.has(name)) {
    console.log('skip (già presente):', name)
    continue
  }
  if (!existsSync(filePath)) {
    console.error('file mancante:', filePath)
    process.exit(1)
  }
  const data = readFileSync(filePath)
  const uploadUrl = `https://uploads.github.com/repos/fixlab386-lab/fixlab/releases/${release.id}/assets?name=${encodeURIComponent(name)}`
  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(data.length),
    },
    body: data,
  })
  const body = await up.json()
  if (!up.ok) {
    console.error('upload fallito', name, body)
    process.exit(1)
  }
  console.log('upload ok:', name)
}

const verify = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/${tag}`, { headers })
const final = await verify.json()
console.log(JSON.stringify({
  tag: final.tag_name,
  draft: final.draft,
  url: final.html_url,
  assets: (final.assets || []).map(a => a.name),
}))
