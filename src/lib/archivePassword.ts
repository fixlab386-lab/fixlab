const UNLOCK_PREFIX = 'fixlab-archive-unlock:'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashArchivePassword(password: string): Promise<string> {
  return sha256(password.trim())
}

export async function verifyArchivePassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return true
  const hash = await hashArchivePassword(password)
  return hash === storedHash
}

export function isArchiveUnlocked(studioId: string): boolean {
  try {
    return sessionStorage.getItem(`${UNLOCK_PREFIX}${studioId}`) === '1'
  } catch {
    return false
  }
}

export function unlockArchiveSession(studioId: string): void {
  try {
    sessionStorage.setItem(`${UNLOCK_PREFIX}${studioId}`, '1')
  } catch {
    /* ignore */
  }
}

export function lockArchiveSession(studioId: string): void {
  try {
    sessionStorage.removeItem(`${UNLOCK_PREFIX}${studioId}`)
  } catch {
    /* ignore */
  }
}
