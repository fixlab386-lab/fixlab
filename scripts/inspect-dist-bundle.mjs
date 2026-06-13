import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const bundle = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets', 'index-DhPdCcvl.js'),
  'utf8',
)

const needles = [
  'fixlab-active-studio',
  'resolveInitialActiveStudioId',
  'activeStudioId',
  'legacyStudioId',
  'uploadStudioLogo',
  'studios/${',
  'studios/`',
  'slice(1)',
  'substring(1)',
  '.slice(1)',
]

for (const n of needles) {
  const idx = bundle.indexOf(n)
  console.log(`\n=== ${n} === idx=${idx}`)
  if (idx >= 0) console.log(bundle.slice(Math.max(0, idx - 60), idx + n.length + 80))
}
