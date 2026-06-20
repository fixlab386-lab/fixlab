/**
 * Genera build/icon.png (512×512) e build/icon.ico per electron-builder / NSIS.
 * Sorgente: build/icon-source.png (priorità) oppure public/favicon.svg.
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
const sourcePng = join(buildDir, 'icon-source.png')
const svgPath = join(root, 'public', 'favicon.svg')
const pngPath = join(buildDir, 'icon.png')
const icoPath = join(buildDir, 'icon.ico')
const publicDir = join(root, 'public')

if (!existsSync(buildDir)) mkdirSync(buildDir, { recursive: true })
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true })

if (existsSync(sourcePng)) {
  await sharp(sourcePng)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(pngPath)
  console.log(`Icona PNG da ${sourcePng}`)
} else {
  const svg = readFileSync(svgPath)
  await sharp(svg, { density: 300 })
    .resize(512, 512, { fit: 'contain', background: { r: 20, g: 16, b: 40, alpha: 1 } })
    .png()
    .toFile(pngPath)
  console.log('Icona PNG da favicon.svg — salva il logo in build/icon-source.png per personalizzarla.')
}

const sizes = [16, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  sizes.map(async (size) => {
    const buffer = await sharp(pngPath).resize(size, size).png().toBuffer()
    return buffer
  }),
)

const icoBuffer = await pngToIco(pngBuffers)
writeFileSync(icoPath, icoBuffer)
console.log(`Icona generata: ${pngPath}`)
console.log(`Icona ICO: ${icoPath}`)

const webSizes = [
  { size: 32, name: 'favicon-32.png' },
  { size: 192, name: 'favicon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

for (const { size, name } of webSizes) {
  const out = join(publicDir, name)
  await sharp(pngPath).resize(size, size, { fit: 'cover' }).png().toFile(out)
  console.log(`Web icon: ${out}`)
}

writeFileSync(join(publicDir, 'favicon.ico'), icoBuffer)
console.log(`Web favicon: ${join(publicDir, 'favicon.ico')}`)
