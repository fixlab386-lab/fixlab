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

const tag = process.argv[2] || `v${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version}`
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

const asset = (rel.assets || []).find(a => a.name === 'latest.yml')
if (asset) {
  const del = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/assets/${asset.id}`, {
    method: 'DELETE',
    headers,
  })
  console.log('delete latest.yml:', del.status)
}

const data = readFileSync(join(root, 'release', 'latest.yml'))
const uploadUrl = `https://uploads.github.com/repos/fixlab386-lab/fixlab/releases/${rel.id}/assets?name=latest.yml`
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
  console.error('upload fallito', body)
  process.exit(1)
}
console.log('upload ok:', body.name)

const verify = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/${tag}`, { headers })
const final = await verify.json()
console.log(JSON.stringify({
  tag: final.tag_name,
  draft: final.draft,
  url: final.html_url,
  assets: (final.assets || []).map(a => a.name),
}))
