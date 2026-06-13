/**
 * One-shot: crea memberships/{userId}_{studioId} mancanti per archivi già presenti.
 * NON cancella studi né modifica users.memberships[] (solo aggiunge doc canonici assenti).
 *
 * Uso:
 *   node scripts/backfill-missing-memberships.mjs <serviceAccount.json>
 *   node scripts/backfill-missing-memberships.mjs <serviceAccount.json> <userId>
 *
 * Esempio "Negozio di test":
 *   node scripts/backfill-missing-memberships.mjs C:/Users/samue/Downloads/fixlab-app-firebase-adminsdk-fbsvc-90685931b8.json <uid>
 */
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const functionsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'node_modules')
const { Firestore, FieldPath } = require(join(functionsDir, '@google-cloud', 'firestore'))

const PROJECT_ID = 'fixlab-app'
const DATABASE_ID = 'fixlab'

function membershipDocId(userId, studioId) {
  return `${userId}_${studioId}`
}

async function listAllUsers(db) {
  /** @type {{ id: string; memberships: { studioId: string; role: string }[] }[]} */
  const users = []
  let last = null
  while (true) {
    let q = db.collection('users').orderBy(FieldPath.documentId()).limit(200)
    if (last) q = q.startAfter(last)
    const snap = await q.get()
    if (snap.empty) break
    for (const doc of snap.docs) {
      const data = doc.data()
      const memberships = Array.isArray(data.memberships) ? data.memberships : []
      users.push({
        id: doc.id,
        memberships: memberships
          .filter(m => m && typeof m.studioId === 'string')
          .map(m => ({ studioId: m.studioId, role: m.role || 'owner' })),
      })
    }
    last = snap.docs[snap.docs.length - 1]
    if (snap.size < 200) break
  }
  return users
}

async function backfillUser(db, userId, memberships, dryRun = false) {
  let created = 0
  let skipped = 0
  /** @type {string[]} */
  const details = []

  for (const m of memberships) {
    const mid = membershipDocId(userId, m.studioId)
    const membershipRef = db.collection('memberships').doc(mid)
    const existing = await membershipRef.get()
    if (existing.exists) {
      skipped++
      continue
    }

    if (m.studioId !== userId) {
      const studioSnap = await db.collection('studios').doc(m.studioId).get()
      if (!studioSnap.exists) {
        details.push(`SKIP ${mid}: studio ${m.studioId} assente`)
        skipped++
        continue
      }
      const ownerId = studioSnap.data()?.ownerId
      if (ownerId !== userId) {
        details.push(`SKIP ${mid}: ownerId=${ownerId ?? 'n/a'} != ${userId}`)
        skipped++
        continue
      }
    }

    if (!dryRun) {
      await membershipRef.set({
        userId,
        studioId: m.studioId,
        role: m.role,
        createdAt: Firestore.FieldValue.serverTimestamp(),
      })
    }
    created++
    details.push(`${dryRun ? 'WOULD CREATE' : 'CREATED'} ${mid} (role=${m.role})`)
  }

  return { created, skipped, details }
}

async function main() {
  const saPath = process.argv[2]
  const targetUserId = process.argv[3]
  if (!saPath) {
    console.error('Uso: node scripts/backfill-missing-memberships.mjs <serviceAccount.json> [userId]')
    process.exit(1)
  }

  process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath
  const db = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID })

  console.log(`Progetto: ${PROJECT_ID} | Database: ${DATABASE_ID}`)
  console.log(`Service account: ${saPath}`)
  if (targetUserId) console.log(`Utente target: ${targetUserId}`)
  console.log('')

  let users
  if (targetUserId) {
    const snap = await db.collection('users').doc(targetUserId).get()
    if (!snap.exists) throw new Error(`Utente ${targetUserId} non trovato`)
    users = [{ id: targetUserId, memberships: snap.data()?.memberships ?? [] }]
  } else {
    users = await listAllUsers(db)
  }

  let totalCreated = 0
  for (const user of users) {
    if (!user.id) continue
    const memberships = (user.memberships || [])
      .filter(m => m && m.studioId)
      .map(m => ({ studioId: m.studioId, role: m.role || 'owner' }))

    console.log(`--- users/${user.id} (${memberships.length} membership in profilo)`)
    const result = await backfillUser(db, user.id, memberships, false)
    totalCreated += result.created
    for (const line of result.details) console.log(`  ${line}`)
    if (result.created === 0 && result.skipped === memberships.length) {
      console.log('  (nessuna membership da creare)')
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Membership create: ${totalCreated}`)
  console.log('Fatto. Gli archivi esistenti non sono stati cancellati.')
}

main().catch(err => {
  console.error('Errore:', err.message || err)
  process.exit(1)
})
