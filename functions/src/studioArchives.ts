/**
 * Cloud Functions multi-archivio — PREDISPOSTE, NON ESPORTATE in index.ts.
 * Deploy solo dopo OK esplicito e test su progetto fixlab-app.
 *
 * - createStudioWithMembership: creazione atomica studio + membership owner
 * - duplicateStudioArchive: copia dati tenant (pesante; Fase 2+)
 * - deleteStudioCascade: eliminazione archivio + dati collegati (zona pericolosa)
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { assertStudioAccess } from './auth'

const db = getFirestore('fixlab')

const TENANT_COLLECTIONS = [
  'categories',
  'products',
  'repairs',
  'clients',
  'suppliers',
  'documents',
  'payments',
  'paymentResources',
  'stockMovements',
  'devices',
] as const

function membershipDocId(uid: string, studioId: string): string {
  return `${uid}_${studioId}`
}

type CreateStudioRequest = {
  name: string
  email?: string
}

/** Crea studio con ID auto + membership owner in un'unica transazione (Admin). */
export const createStudioWithMembership = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const uid = request.auth.uid
  const data = request.data as CreateStudioRequest
  const name = String(data?.name ?? '').trim()
  if (!name) {
    throw new HttpsError('invalid-argument', 'Nome archivio obbligatorio.')
  }

  const userSnap = await db.collection('users').doc(uid).get()
  if (!userSnap.exists) {
    throw new HttpsError('permission-denied', 'Profilo utente non trovato.')
  }
  const userEmail = String(data.email ?? userSnap.data()?.email ?? '')

  let studioId = ''

  await db.runTransaction(async tx => {
    const studioRef = db.collection('studios').doc()
    studioId = studioRef.id
    const membershipRef = db.collection('memberships').doc(membershipDocId(uid, studioId))

    tx.set(studioRef, {
      name,
      email: userEmail,
      ownerId: uid,
      onboardingCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
    })
    tx.set(membershipRef, {
      userId: uid,
      studioId,
      role: 'owner',
      createdAt: FieldValue.serverTimestamp(),
    })

    const existingMemberships = (userSnap.data()?.memberships as { studioId: string; role: string }[] | undefined) ?? []
    const nextMemberships = [...existingMemberships, { studioId, role: 'owner' }]
    tx.update(db.collection('users').doc(uid), {
      memberships: nextMemberships,
      defaultStudioId: studioId,
    })
  })

  return { studioId }
})

type DuplicateStudioRequest = {
  sourceStudioId: string
  newName: string
}

/**
 * Duplica un archivio (tenant collections). Operazione costosa — da usare con limiti e job async.
 * NON deployata: richiede batching, quote Firestore e copia Storage.
 */
export const duplicateStudioArchive = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const data = request.data as DuplicateStudioRequest
  if (!data?.sourceStudioId || !data?.newName?.trim()) {
    throw new HttpsError('invalid-argument', 'sourceStudioId e newName richiesti.')
  }

  await assertStudioAccess(request.auth.uid, data.sourceStudioId)

  throw new HttpsError(
    'unimplemented',
    'Duplicazione archivio non ancora implementata. Usare export/import manuale.',
  )
})

type DeleteStudioRequest = {
  studioId: string
  confirmText: string
}

/**
 * Elimina archivio e dati tenant (NON l'account utente).
 * NON deployata: richiede conferma forte, esclusione archivio primario, purge Storage.
 */
export const deleteStudioCascade = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const data = request.data as DeleteStudioRequest
  if (!data?.studioId || data.confirmText !== 'ELIMINA ARCHIVIO') {
    throw new HttpsError('invalid-argument', 'Conferma non valida.')
  }

  const uid = request.auth.uid
  const userSnap = await db.collection('users').doc(uid).get()
  const legacyStudioId = userSnap.data()?.studioId as string | undefined
  if (data.studioId === legacyStudioId) {
    throw new HttpsError('failed-precondition', 'Non puoi eliminare l\'archivio primario da qui. Usa eliminazione account.')
  }

  await assertStudioAccess(uid, data.studioId)

  const membershipSnap = await db.collection('memberships').doc(membershipDocId(uid, data.studioId)).get()
  if (!membershipSnap.exists || membershipSnap.data()?.role !== 'owner') {
    throw new HttpsError('permission-denied', 'Solo il proprietario può eliminare l\'archivio.')
  }

  throw new HttpsError(
    'unimplemented',
    'Delete cascade non ancora implementata. Rimuovere membership manualmente da console.',
  )
})

// Esportato per test unitari futuri
export { TENANT_COLLECTIONS }
