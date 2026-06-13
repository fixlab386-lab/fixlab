/**
 * Genera build/icon.png (256×256) da public/favicon.svg per electron-builder.
 * Esegui: node scripts/generate-icon.mjs
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
const svgPath = join(root, 'public', 'favicon.svg')
const pngPath = join(buildDir, 'icon.png')

if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true })

const svg = readFileSync(svgPath)
await sharp(svg, { density: 300 })
  .resize(256, 256, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 0 } })
  .png()
  .toFile(pngPath)

console.log(`Icona generata: ${pngPath}`)
