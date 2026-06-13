/**
 * Genera src/data/comuni.json e src/data/cap.json da fonti pubbliche.
 * Esegui: node scripts/build-geo-datasets.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'src', 'data')

const source = JSON.parse(readFileSync(join(__dirname, 'comuni-source.json'), 'utf8'))

/** @type {{ n: string; p: string; c: string; t: 'comune' }[]} */
const comuni = []
/** @type {{ cap: string; citta: string; provincia: string }[]} */
const capEntries = []
const capSeen = new Set()

for (const item of source) {
  const nome = item.nome?.trim()
  const provincia = item.sigla?.trim() || ''
  const codice = item.codiceCatastale?.trim()
  if (!nome || !codice) continue

  comuni.push({ n: nome, p: provincia, c: codice, t: 'comune' })

  const caps = Array.isArray(item.cap) ? item.cap : item.cap ? [item.cap] : []
  for (const cap of caps) {
    const capStr = String(cap).padStart(5, '0')
    const key = `${capStr}|${nome}|${provincia}`
    if (capSeen.has(key)) continue
    capSeen.add(key)
    capEntries.push({ cap: capStr, citta: nome, provincia })
  }
}

comuni.sort((a, b) => a.n.localeCompare(b.n, 'it'))
capEntries.sort((a, b) => a.cap.localeCompare(b.cap) || a.citta.localeCompare(b.citta, 'it'))

// Stati esteri (codici Belfiore AE) — subset da belfiore-code regions.json se presente
const regionsPath = join(__dirname, 'regions-source.json')
let statiEsteri = []
try {
  const regions = JSON.parse(readFileSync(regionsPath, 'utf8'))
  statiEsteri = regions
    .filter(r => r.registry_code && r.name_it)
    .map(r => ({
      n: r.name_it.trim(),
      p: '',
      c: r.registry_code.trim().toUpperCase(),
      t: 'stato',
    }))
} catch {
  statiEsteri = [
    { n: 'Germania', p: '', c: 'Z112', t: 'stato' },
    { n: 'Francia', p: '', c: 'Z110', t: 'stato' },
    { n: 'Svizzera', p: '', c: 'Z133', t: 'stato' },
    { n: 'Regno Unito', p: '', c: 'Z114', t: 'stato' },
    { n: 'Stati Uniti', p: '', c: 'Z404', t: 'stato' },
    { n: 'Romania', p: '', c: 'Z129', t: 'stato' },
    { n: 'Albania', p: '', c: 'Z100', t: 'stato' },
    { n: 'Marocco', p: '', c: 'Z330', t: 'stato' },
    { n: 'Cina', p: '', c: 'Z210', t: 'stato' },
    { n: 'India', p: '', c: 'Z222', t: 'stato' },
  ]
}

statiEsteri.sort((a, b) => a.n.localeCompare(b.n, 'it'))
const allComuni = [...comuni, ...statiEsteri]

writeFileSync(join(outDir, 'comuni.json'), JSON.stringify(allComuni))
writeFileSync(join(outDir, 'cap.json'), JSON.stringify(capEntries))

console.log(`comuni.json: ${allComuni.length} luoghi (${comuni.length} comuni + ${statiEsteri.length} stati)`)
console.log(`cap.json: ${capEntries.length} voci CAP`)
