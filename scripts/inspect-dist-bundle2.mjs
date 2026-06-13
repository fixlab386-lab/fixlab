import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const bundle = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets', 'index-DhPdCcvl.js'),
  'utf8',
)

// Find logo upload path pattern
const logoIdx = bundle.indexOf('/logo')
const hits = []
let pos = 0
while (true) {
  const i = bundle.indexOf('/logo', pos)
  if (i < 0) break
  hits.push(bundle.slice(Math.max(0, i - 80), i + 20))
  pos = i + 5
  if (hits.length > 15) break
}
console.log('=== /logo contexts ===')
hits.forEach((h, n) => console.log(`\n[${n}]`, h))

// resolve function near legacyStudioId - search sw/tw pattern
const legacyIdx = bundle.indexOf('legacyStudioId')
console.log('\n=== legacyStudioId occurrences ===', legacyIdx)

// Find minified resolve: allowed Set + readActiveStudioFromStorage
const rwIdx = bundle.indexOf('function rw(') // readActiveStudioFromStorage minified as rw?
const nwIdx = bundle.indexOf('function nw(')
console.log('nw idx', nwIdx, bundle.slice(nwIdx, nwIdx + 200))

// search for tw( pattern after memberships map
const pattern = 'allowed'
console.log('\nSearch allowed:', bundle.indexOf('allowed'))

// Extract sw function - likely resolveInitialActiveStudioId  
const match = bundle.match(/function \w+\(\{userId:\w+,legacyStudioId:\w+,defaultStudioId:\w+,memberships:\w+\}\)\{[^}]+\}/)
console.log('\nresolve-like:', match?.[0]?.slice(0, 500))
