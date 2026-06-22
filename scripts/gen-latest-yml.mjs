import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const exeName = `FixLab-Setup-${version}.exe`
const exePath = join(root, 'release', exeName)
const buf = readFileSync(exePath)
const sha512 = createHash('sha512').update(buf).digest('base64')
const size = buf.length
const yml = `version: ${version}
files:
  - url: ${exeName}
    sha512: ${sha512}
    size: ${size}
path: ${exeName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`
writeFileSync(join(root, 'release', 'latest.yml'), yml)
console.log(yml)
