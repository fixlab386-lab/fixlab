import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { MembershipRole, Studio, UserStudioMembershipRef } from '../types'

/** ID documento membership: lookup O(1) in Fase 2 rules. */
export function membershipDocId(userId: string, studioId: string): string {
  return `${userId}_${studioId}`
}

export type StudioArchive = {
  studioId: string
  name: string
  role: MembershipRole
  /** true se coincide con users.studioId (accesso dati garantito con regole attuali). */
  isPrimary: boolean
  hasPassword?: boolean
  lastAccessAt?: string | null
}

const DEFAULT_MEMBERSHIP_ROLE: MembershipRole = 'owner'

export function normalizeMemberships(
  refs: UserStudioMembershipRef[] | undefined,
  legacyStudioId: string,
): UserStudioMembershipRef[] {
  const map = new Map<string, UserStudioMembershipRef>()
  for (const m of refs ?? []) {
    if (m?.studioId) map.set(m.studioId, { studioId: m.studioId, role: m.role ?? DEFAULT_MEMBERSHIP_ROLE })
  }
  if (legacyStudioId && !map.has(legacyStudioId)) {
    map.set(legacyStudioId, { studioId: legacyStudioId, role: 'owner' })
  }
  return Array.from(map.values())
}

/** Crea il doc canonico memberships/{userId}_{studioId} se assente (idempotente). */
export async function upsertCanonicalMembershipDoc(
  userId: string,
  membership: UserStudioMembershipRef,
): Promise<void> {
  const membershipRef = doc(db, 'memberships', membershipDocId(userId, membership.studioId))
  const existing = await getDoc(membershipRef)
  if (existing.exists()) return

  if (membership.studioId !== userId) {
    const studioSnap = await getDoc(doc(db, 'studios', membership.studioId))
    if (!studioSnap.exists()) {
      throw new Error(`Studio ${membership.studioId} non trovato: impossibile creare la membership.`)
    }
    const ownerId = studioSnap.data()?.ownerId as string | undefined
    if (ownerId !== userId) {
      throw new Error(
        `Non puoi assegnarti la membership per lo studio ${membership.studioId} (ownerId diverso).`,
      )
    }
  }

  await setDoc(membershipRef, {
    userId,
    studioId: membership.studioId,
    role: membership.role,
    createdAt: serverTimestamp(),
  })
}

/** Allinea memberships/{uid}_{studioId} per ogni voce in users.memberships[]. */
export async function syncCanonicalMembershipDocs(
  userId: string,
  memberships: UserStudioMembershipRef[],
): Promise<void> {
  for (const m of memberships) {
    await upsertCanonicalMembershipDoc(userId, m)
  }
}

/** Garantisce memberships[] sul profilo + doc canonici memberships (Fase 2). */
export async function ensureLegacyMembership(params: {
  userId: string
  legacyStudioId: string
  currentMemberships?: UserStudioMembershipRef[]
}): Promise<UserStudioMembershipRef[]> {
  const { userId, legacyStudioId, currentMemberships } = params
  const normalized = normalizeMemberships(currentMemberships, legacyStudioId)
  const needsPersist =
    !currentMemberships?.length ||
    normalized.length !== currentMemberships.length ||
    !currentMemberships.some(m => m.studioId === legacyStudioId)

  if (needsPersist) {
    await updateDoc(doc(db, 'users', userId), { memberships: normalized })
  }

  await syncCanonicalMembershipDocs(userId, normalized)

  return normalized
}

export async function fetchStudioArchives(params: {
  userId: string
  legacyStudioId: string
  memberships: UserStudioMembershipRef[]
}): Promise<StudioArchive[]> {
  const { userId, legacyStudioId, memberships } = params
  const archives: StudioArchive[] = []

  for (const m of memberships) {
    let name = m.studioId
    try {
      const snap = await getDoc(doc(db, 'studios', m.studioId))
      if (snap.exists()) {
        const data = snap.data()
        name = String(data.name ?? name)
        const lastAccessAt =
          data.lastAccessAt?.toDate?.()?.toISOString?.() ??
          (typeof data.lastAccessAt === 'string' ? data.lastAccessAt : null)
        archives.push({
          studioId: m.studioId,
          name,
          role: m.role,
          isPrimary: m.studioId === legacyStudioId,
          hasPassword: Boolean(data.archivePasswordHash),
          lastAccessAt,
        })
        continue
      }
    } catch {
      /* studio non leggibile finché rules Fase 2 non mappano tutte le membership */
    }
    archives.push({
      studioId: m.studioId,
      name,
      role: m.role,
      isPrimary: m.studioId === legacyStudioId,
    })
  }

  return archives.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.name.localeCompare(b.name, 'it')
  })
}

export async function createStudioArchive(params: {
  userId: string
  userEmail: string
  name: string
  memberships: UserStudioMembershipRef[]
}): Promise<{ studioId: string; memberships: UserStudioMembershipRef[] }> {
  const { userId, userEmail, name, memberships } = params
  const studioRef = doc(collection(db, 'studios'))
  const studioId = studioRef.id
  const nextMemberships: UserStudioMembershipRef[] = [
    ...memberships,
    { studioId, role: 'owner' },
  ]
  const membershipRef = doc(db, 'memberships', membershipDocId(userId, studioId))

  // 1) Studio prima del commit: le rules membership richiedono exists(studios/{id}).
  await setDoc(studioRef, {
    name: name.trim(),
    email: userEmail,
    ownerId: userId,
    createdAt: serverTimestamp(),
    onboardingCompleted: false,
  })

  try {
    // 2) Membership + profilo utente in un unico batch.
    const batch = writeBatch(db)
    batch.set(membershipRef, {
      userId,
      studioId,
      role: 'owner',
      createdAt: serverTimestamp(),
    })
    batch.update(doc(db, 'users', userId), { memberships: nextMemberships })
    await batch.commit()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Creazione membership non riuscita'
    throw new Error(
      `Archivio creato (${studioId}) ma accesso non attivato: ${msg}. ` +
        'Ricarica l\'app: la sincronizzazione membership verrà ritentata all\'avvio.',
    )
  }

  return { studioId, memberships: nextMemberships }
}

export async function renameStudioArchive(studioId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'studios', studioId), { name: name.trim() })
}

export async function removeStudioFromUser(params: {
  userId: string
  studioId: string
  memberships: UserStudioMembershipRef[]
  legacyStudioId: string
}): Promise<UserStudioMembershipRef[]> {
  const { userId, studioId, memberships, legacyStudioId } = params
  if (studioId === legacyStudioId) {
    throw new Error('Non puoi rimuovere l\'archivio principale del tuo account.')
  }
  const next = memberships.filter(m => m.studioId !== studioId)
  await updateDoc(doc(db, 'users', userId), { memberships: next })
  const batch = writeBatch(db)
  batch.delete(doc(db, 'memberships', membershipDocId(userId, studioId)))
  await batch.commit()
  return next
}

export async function duplicateStudioArchive(params: {
  sourceStudioId: string
  userId: string
  userEmail: string
  newName: string
  memberships: UserStudioMembershipRef[]
}): Promise<{ studioId: string; memberships: UserStudioMembershipRef[] }> {
  const { duplicateStudioArchiveClient } = await import('./archiveOperations')
  return duplicateStudioArchiveClient(params)
}

export function activeStudioStorageKey(userId: string): string {
  return `fixlab-active-studio:${userId}`
}

export function readActiveStudioFromStorage(userId: string): string | null {
  try {
    return localStorage.getItem(activeStudioStorageKey(userId))
  } catch {
    return null
  }
}

export function writeActiveStudioToStorage(userId: string, studioId: string): void {
  try {
    localStorage.setItem(activeStudioStorageKey(userId), studioId)
  } catch {
    /* ignore */
  }
}

export async function persistDefaultStudioId(userId: string, studioId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { defaultStudioId: studioId })
}

export function resolveInitialActiveStudioId(params: {
  userId: string
  legacyStudioId: string
  defaultStudioId?: string
  memberships: UserStudioMembershipRef[]
}): string {
  const allowed = new Set(params.memberships.map(m => m.studioId))
  const fromStorage = readActiveStudioFromStorage(params.userId)
  if (fromStorage && allowed.has(fromStorage)) return fromStorage
  if (params.defaultStudioId && allowed.has(params.defaultStudioId)) return params.defaultStudioId
  if (allowed.has(params.legacyStudioId)) return params.legacyStudioId
  return params.memberships[0]?.studioId ?? params.legacyStudioId
}

export type StudioDoc = Pick<Studio, 'id' | 'name'>
