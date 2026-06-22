/**
 * Sostituisce asset su una release GitHub (elimina se presenti, ricarica).
 * Uso: node scripts/replace-release-assets.mjs [tag] [file1] [file2...]
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

const tag = process.argv[2] || `v${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version}`
const files = process.argv.slice(3)
if (files.length === 0) {
  console.error('Specificare almeno un file da sostituire')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
}

const relRes = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/${tag}`, { headers })
const rel = await relRes.json()
if (!rel.id) {
  console.error('Release non trovata:', tag, rel)
  process.exit(1)
}

for (const name of files) {
  const asset = (rel.assets || []).find(a => a.name === name)
  if (asset) {
    const del = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/assets/${asset.id}`, {
      method: 'DELETE',
      headers,
    })
    console.log('delete', name, del.status)
  }
  const filePath = join(root, 'release', name)
  if (!existsSync(filePath)) {
    console.error('file mancante:', filePath)
    process.exit(1)
  }
  const data = readFileSync(filePath)
  const uploadUrl = `https://uploads.github.com/repos/fixlab386-lab/fixlab/releases/${rel.id}/assets?name=${encodeURIComponent(name)}`
  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...headers,
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
  console.log('upload ok', name, body.size)
}

const verify = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/${tag}`, { headers })
const final = await verify.json()
console.log(JSON.stringify(final.assets.map(a => ({ name: a.name, size: a.size })), null, 2))
