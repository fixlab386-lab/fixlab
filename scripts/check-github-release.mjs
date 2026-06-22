import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '')
  }
}

const tag = process.argv[2] || 'v1.0.86'
const headers = process.env.GH_TOKEN
  ? { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' }
  : { Accept: 'application/vnd.github+json' }

const rel = await fetch(`https://api.github.com/repos/fixlab386-lab/fixlab/releases/tags/${tag}`, { headers })
console.log('release status', rel.status)
const data = await rel.json()
console.log('draft', data.draft, 'prerelease', data.prerelease)
console.log('assets', (data.assets || []).map(a => a.name))

const yml = (data.assets || []).find(a => a.name === 'latest.yml')
if (yml) {
  const raw = await fetch(yml.browser_download_url, { headers })
  console.log('\nlatest.yml:\n', await raw.text())
}
