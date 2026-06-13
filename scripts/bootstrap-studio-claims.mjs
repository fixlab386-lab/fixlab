/**
 * Bootstrap one-shot: imposta custom claim studioIds da memberships/ (database fixlab).
 * Usare PRIMA del primo upload Storage dopo deploy rules, senza attendere un nuovo login.
 *
 * Uso:
 *   node scripts/bootstrap-studio-claims.mjs <serviceAccount.json>
 *   node scripts/bootstrap-studio-claims.mjs <serviceAccount.json> <userId>
 *
 * Esempio utente attuale:
 *   node scripts/bootstrap-studio-claims.mjs C:/Users/samue/Downloads/fixlab-app-firebase-adminsdk-fbsvc-90685931b8.json trJMfTgRvbOXmkTZOtNTi79bKa63
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const functionsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'node_modules')
const admin = require(join(functionsDir, 'firebase-admin'))
const { Firestore } = require(join(functionsDir, '@google-cloud', 'firestore'))

const PROJECT_ID = 'fixlab-app'
const DATABASE_ID = 'fixlab'
const CLAIM_SAFE_BYTES = 900

function membershipDocId(userId, studioId) {
  return `${userId}_${studioId}`
}

function estimateBytes(studioIds) {
  return Buffer.byteLength(JSON.stringify({ studioIds: [...studioIds].sort() }), 'utf8')
}

async function collectVerifiedStudioIds(db, uid) {
  const snap = await db.collection('memberships').where('userId', '==', uid).get()
  const studioIds = new Set()

  for (const doc of snap.docs) {
    const data = doc.data()
    const studioId = data.studioId
    const docUserId = data.userId
    if (typeof studioId !== 'string' || !studioId.trim()) continue
    if (docUserId !== uid) continue
    if (doc.id !== membershipDocId(uid, studioId)) continue
    studioIds.add(studioId)
  }

  return Array.from(studioIds).sort()
}

async function bootstrapUser(auth, db, uid, dryRun = false) {
  const studioIds = await collectVerifiedStudioIds(db, uid)
  const bytes = estimateBytes(studioIds)

  console.log(`\nUtente: ${uid}`)
  console.log(`  memberships verificate: ${studioIds.length}`)
  console.log(`  studioIds: ${JSON.stringify(studioIds)}`)
  console.log(`  payload stimato: ~${bytes} byte (limite sicuro ${CLAIM_SAFE_BYTES})`)

  if (bytes > CLAIM_SAFE_BYTES) {
    throw new Error(`Payload troppo grande (~${bytes} byte). Ridurre il numero di archivi.`)
  }

  if (dryRun) {
    console.log('  [dry-run] claims NON scritti')
    return
  }

  await auth.setCustomUserClaims(uid, { studioIds })
  console.log('  OK: custom claims aggiornati')
  console.log('  → L\'utente deve fare getIdToken(true) o un nuovo login per usare il claim in Storage.')
}

async function main() {
  const saPath = process.argv[2]
  const singleUserId = process.argv[3]
  const dryRun = process.argv.includes('--dry-run')

  if (!saPath) {
    console.error('Uso: node scripts/bootstrap-studio-claims.mjs <serviceAccount.json> [userId] [--dry-run]')
    process.exit(1)
  }

  const sa = JSON.parse(readFileSync(saPath, 'utf8'))
  process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID })
  const auth = admin.auth()
  const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID })

  if (singleUserId) {
    await bootstrapUser(auth, db, singleUserId, dryRun)
    return
  }

  console.log('Nessun userId: elenca tutti gli utenti con almeno una membership…')
  const membershipsSnap = await db.collection('memberships').get()
  const userIds = new Set()
  for (const doc of membershipsSnap.docs) {
    const uid = doc.data()?.userId
    if (typeof uid === 'string') userIds.add(uid)
  }

  for (const uid of [...userIds].sort()) {
    await bootstrapUser(auth, db, uid, dryRun)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
