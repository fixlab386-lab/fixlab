import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2] || JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const dmgName = `FixLab-${version}-mac.dmg`
const dmgPath = join(root, 'release', dmgName)
const data = readFileSync(dmgPath)
const sha512 = createHash('sha512').update(data).digest('base64')
const yml = `version: ${version}
files:
  - url: ${dmgName}
    sha512: ${sha512}
    size: ${data.length}
path: ${dmgName}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`
writeFileSync(join(root, 'release', 'latest-mac.yml'), yml)
console.log(`latest-mac.yml → ${version} (${data.length} bytes)`)
