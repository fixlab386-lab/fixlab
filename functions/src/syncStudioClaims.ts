/**
 * Sincronizza custom claim `studioIds` da memberships/ (database fixlab).
 * Usato dalle Storage rules — non possono leggere Firestore su DB non-default.
 */
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

const db = getFirestore('fixlab')

/** Firebase Auth: max ~1000 byte per l'intero payload JSON dei custom claims. */
const CLAIM_MAX_BYTES = 1000
/** Margine per evitare edge case di serializzazione. */
const CLAIM_SAFE_BYTES = 900

export type StudioClaimsPayload = {
  studioIds: string[]
}

function membershipDocId(userId: string, studioId: string): string {
  return `${userId}_${studioId}`
}

function estimateClaimsPayloadBytes(studioIds: string[]): number {
  const payload: StudioClaimsPayload = { studioIds: [...studioIds].sort() }
  return Buffer.byteLength(JSON.stringify(payload), 'utf8')
}

/**
 * Legge memberships/ e costruisce studioIds SOLO da doc verificati.
 * Non accetta input dal client su quali studi includere.
 */
export async function collectVerifiedStudioIds(uid: string): Promise<string[]> {
  const snap = await db.collection('memberships').where('userId', '==', uid).get()
  const studioIds = new Set<string>()

  for (const doc of snap.docs) {
    const data = doc.data() as { userId?: string; studioId?: string }
    const studioId = data.studioId
    const docUserId = data.userId

    if (typeof studioId !== 'string' || !studioId.trim()) continue
    if (docUserId !== uid) continue
    if (doc.id !== membershipDocId(uid, studioId)) continue

    studioIds.add(studioId)
  }

  return Array.from(studioIds).sort()
}

/** Scrive { studioIds } nei custom claims dell'utente, preservando claim esistenti (es. superAdmin). */
export async function applyStudioClaimsForUser(uid: string): Promise<StudioClaimsPayload> {
  const studioIds = await collectVerifiedStudioIds(uid)
  const bytes = estimateClaimsPayloadBytes(studioIds)

  if (bytes > CLAIM_SAFE_BYTES) {
    throw new HttpsError(
      'resource-exhausted',
      `Troppi archivi per i custom claims (${studioIds.length} studi, ~${bytes} byte). ` +
        `Limite sicuro ~${CLAIM_SAFE_BYTES} byte (max Firebase ${CLAIM_MAX_BYTES}). ` +
        'Contatta il supporto FIXLab.',
    )
  }

  const userRecord = await getAuth().getUser(uid)
  const existing = (userRecord.customClaims ?? {}) as Record<string, unknown>
  await getAuth().setCustomUserClaims(uid, { ...existing, studioIds })
  return { studioIds }
}

/** Callable: sincronizza i claims dell'utente autenticato (mai di un altro uid). */
export const syncStudioClaims = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const payload = await applyStudioClaimsForUser(request.auth.uid)
  return payload
})

/**
 * Trigger: ogni scrittura su memberships/ risincronizza i claims dell'utente interessato.
 * Rete di sicurezza per backfill admin, script, future Functions.
 */
export const onMembershipClaimsSync = onDocumentWritten(
  {
    document: 'memberships/{membershipId}',
    database: 'fixlab',
    region: 'europe-west1',
  },
  async event => {
    const before = event.data?.before
    const after = event.data?.after
    const userId =
      (after?.exists ? (after.data()?.userId as string | undefined) : undefined) ??
      (before?.exists ? (before.data()?.userId as string | undefined) : undefined)

    if (!userId || typeof userId !== 'string') return

    await applyStudioClaimsForUser(userId)
  },
)
