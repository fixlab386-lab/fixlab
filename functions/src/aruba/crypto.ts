import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const SALT = 'fixlab-aruba-secrets-v1'

function secretKey(raw?: string): Buffer {
  const key = raw || process.env.ARUBA_SECRETS_KEY
  if (!key || key.length < 16) {
    throw new Error('ARUBA_SECRETS_KEY non configurata sul server.')
  }
  return scryptSync(key, SALT, 32)
}

export function encryptSecret(plain: string, keyRaw?: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', secretKey(keyRaw), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptSecret(payload: string, keyRaw?: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Credenziale Aruba non valida.')
  const decipher = createDecipheriv('aes-256-gcm', secretKey(keyRaw), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
  return plain.toString('utf8')
}
