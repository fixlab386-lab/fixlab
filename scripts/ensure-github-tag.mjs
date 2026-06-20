/**
 * Crea tag GitHub se mancante (senza upload).
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

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const tag = process.argv[2] || `v${version}`
const headers = {
  Authorization: `Bearer ${process.env.GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
}
const repo = 'fixlab386-lab/fixlab'

async function gh(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { ok: res.ok, status: res.status, body }
}

const tagCheck = await gh(`/git/ref/tags/${tag}`)
if (tagCheck.status === 404) {
  const main = await gh('/git/ref/heads/main')
  if (!main.ok) {
    console.error('main ref error', main.body)
    process.exit(1)
  }
  const created = await gh('/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/tags/${tag}`, sha: main.body.object.sha }),
  })
  console.log('tag:', created.ok ? 'creato' : 'errore', tag, created.body)
} else {
  console.log('tag già presente:', tag)
}

const relCheck = await gh(`/releases/tags/${tag}`)
if (relCheck.status === 404) {
  const created = await gh('/releases', {
    method: 'POST',
    body: JSON.stringify({
      tag_name: tag,
      name: `FixLab ${tag.replace(/^v/, '')}`,
      body: 'Aggiornamento FixLab — collegamenti Start, bancomat/scontrino RT.',
      draft: false,
    }),
  })
  console.log('release:', created.ok ? created.body.html_url : created.body)
} else {
  console.log('release esistente:', relCheck.body.html_url)
}
