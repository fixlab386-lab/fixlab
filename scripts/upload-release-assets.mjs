/**
 * Carica asset mancanti su una release GitHub esistente.
 */
import { readFileSync, existsSync, createReadStream } from 'node:fs'
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

const tag = process.argv[2] || `v${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version}`
const version = tag.replace(/^v/, '')
const headers = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
}

const list = await fetch('https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/' + tag, { headers })
const release = await list.json()
if (!release.id) {
  console.error('Release non trovata:', tag)
  process.exit(1)
}

const existing = new Set((release.assets || []).map((a) => a.name))
const files = [
  join(root, 'release', `FixLab-Setup-${version}.exe`),
  join(root, 'release', `FixLab-Setup-${version}.exe.blockmap`),
  join(root, 'release', 'latest.yml'),
]

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
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(data.length),
    },
    body: data,
  })
  const body = await res.json()
  if (!res.ok) {
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
  assets: (final.assets || []).map((a) => a.name),
}))
