import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'

const db = getFirestore('fixlab')

function membershipDocId(uid: string, studioId: string): string {
  return `${uid}_${studioId}`
}

/**
 * Verifica che l'utente possa operare sullo studioId richiesto.
 * Fase 2: membership memberships/{uid}_{studioId}.
 * Retrocompat: users/{uid}.studioId (archivio primario legacy).
 */
export async function assertStudioAccess(uid: string, studioId: string): Promise<void> {
  const membershipSnap = await db.collection('memberships').doc(membershipDocId(uid, studioId)).get()
  if (membershipSnap.exists) {
    return
  }

  const userSnap = await db.collection('users').doc(uid).get()
  if (!userSnap.exists) {
    throw new HttpsError('permission-denied', 'Profilo utente non trovato.')
  }

  const profile = userSnap.data() as { studioId?: string }
  if (profile.studioId === studioId) {
    return
  }

  throw new HttpsError('permission-denied', 'Non autorizzato per questo studio.')
}
