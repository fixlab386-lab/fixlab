/**
 * Legge GH_TOKEN da git credential helper (Windows) senza stampare il segreto.
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
})

if (result.status !== 0) {
  console.error('git credential fill fallito')
  process.exit(1)
}

const password = result.stdout
  .split('\n')
  .map((line) => line.trim())
  .find((line) => line.startsWith('password='))
  ?.slice('password='.length)

if (!password) {
  console.error('Nessun token/password GitHub in git credential')
  process.exit(1)
}

process.stdout.write(password)
