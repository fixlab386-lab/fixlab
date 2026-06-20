/**
 * Pubblica (draft=false) una release GitHub esistente per tag.
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

const tag = process.argv[2] || 'v1.0.32'
const headers = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
}

const list = await fetch('https://api.github.com/repos/fixlab386-lab/fixlab/releases?per_page=100', { headers })
const releases = await list.json()
const matches = releases.filter((r) => r.tag_name === tag)
if (!matches.length) {
  console.error(`Nessuna release per ${tag}`)
  process.exit(1)
}

const best = matches.sort((a, b) => (b.assets?.length || 0) - (a.assets?.length || 0))[0]
const patch = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/${best.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    draft: false,
    name: `FixLab ${tag.replace(/^v/, '')}`,
    body: 'Release desktop FixLab — login ridisegnato, favicon allineata al logo desktop.',
  }),
})
const updated = await patch.json()
console.log(JSON.stringify({
  tag: updated.tag_name,
  draft: updated.draft,
  url: updated.html_url,
  assets: (updated.assets || []).map((a) => a.name),
}))
