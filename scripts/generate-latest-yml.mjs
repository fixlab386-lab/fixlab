/**
 * Genera release/latest.yml per electron-updater (Windows).
 * Uso: node scripts/generate-latest-yml.mjs [version]
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const version = process.argv[2]?.replace(/^v/, '') || pkgVersion
const exeName = `FixLab-Setup-${version}.exe`
const exePath = join(root, 'release', exeName)

if (!existsSync(exePath)) {
  console.error(`File mancante: ${exePath}`)
  process.exit(1)
}

const buf = readFileSync(exePath)
const sha512 = createHash('sha512').update(buf).digest('base64')
const size = buf.length
const releaseDate = statSync(exePath).mtime.toISOString()

const yml = `version: ${version}
files:
  - url: ${exeName}
    sha512: ${sha512}
    size: ${size}
path: ${exeName}
sha512: ${sha512}
releaseDate: '${releaseDate}'
`

const outPath = join(root, 'release', 'latest.yml')
writeFileSync(outPath, yml, 'utf8')
console.log(`Scritto ${outPath} (v${version}, ${size} byte)`)
