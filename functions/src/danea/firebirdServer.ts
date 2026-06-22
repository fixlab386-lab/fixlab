import { execSync, spawn } from 'node:child_process'
import { chmodSync, constants } from 'node:fs'
import { createConnection } from 'node:net'

let serverReady: Promise<void> | null = null

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise(resolve => {
    const socket = createConnection({ port, host })
    socket.setTimeout(500)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

/** Rende il database leggibile dal demone Firebird nel container. */
export function prepareDatabaseFile(dbPath: string): void {
  try {
    chmodSync(
      dbPath,
      constants.S_IRUSR |
        constants.S_IWUSR |
        constants.S_IRGRP |
        constants.S_IWGRP |
        constants.S_IROTH |
        constants.S_IWOTH,
    )
  } catch {
    /* ignore permission errors */
  }
  if (process.platform === 'linux' && process.getuid?.() === 0) {
    try {
      execSync(`chown firebird:firebird "${dbPath}"`, { stdio: 'ignore' })
    } catch {
      /* ignore */
    }
  }
}

export function ensureFirebirdServer(): Promise<void> {
  if (!serverReady) serverReady = startFirebirdServer()
  return serverReady
}

async function startFirebirdServer(): Promise<void> {
  if (await isPortOpen(3050)) return

  if (process.platform === 'linux') {
    try {
      execSync('service firebird3.0 start', { stdio: 'pipe', timeout: 20000 })
    } catch {
      try {
        spawn('/usr/sbin/fbguard', ['-daemon'], { detached: true, stdio: 'ignore' }).unref()
      } catch {
        /* ignore */
      }
    }
  }

  for (let i = 0; i < 40; i++) {
    if (await isPortOpen(3050)) return
    await sleep(500)
  }

  throw new Error('FIREBIRD_SERVER_UNAVAILABLE')
}
