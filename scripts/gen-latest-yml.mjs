import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2] || JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const exeName = `FixLab-Setup-${version}.exe`
const exePath = join(root, 'release', exeName)
const data = readFileSync(exePath)
const sha512 = createHash('sha512').update(data).digest('base64')
const yml = `version: ${version}
files:
  - url: ${exeName}
    sha512: ${sha512}
    size: ${data.length}
path: ${exeName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`
writeFileSync(join(root, 'release', 'latest.yml'), yml)
console.log(`latest.yml → ${version} (${data.length} bytes)`)
