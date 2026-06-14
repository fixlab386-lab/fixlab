import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { createStudioArchive, type StudioArchive } from './studioMemberships'
import { hashArchivePassword } from './archivePassword'
import type { UserStudioMembershipRef } from '../types'

const TENANT_COLLECTIONS = [
  'categories',
  'products',
  'clients',
  'suppliers',
  'documents',
  'payments',
  'paymentResources',
  'stockMovements',
  'devices',
  'repairs',
  'agents',
  'warehouses',
  'priceLists',
] as const

export type ArchiveStats = {
  docCount: number
  sizeKb: number
  lastAccessAt: string | null
  hasPassword: boolean
}

export async function fetchArchiveStats(studioId: string): Promise<ArchiveStats> {
  let docCount = 0
  let sizeKb = 0

  const studioSnap = await getDoc(doc(db, 'studios', studioId))
  const studioData = studioSnap.data()
  const lastAccessAt =
    studioData?.lastAccessAt?.toDate?.()?.toISOString?.() ??
    (typeof studioData?.lastAccessAt === 'string' ? studioData.lastAccessAt : null)

  for (const name of TENANT_COLLECTIONS) {
    try {
      const snap = await getDocs(query(collection(db, name), where('studioId', '==', studioId)))
      docCount += snap.size
      for (const d of snap.docs) {
        sizeKb += Math.ceil(JSON.stringify(d.data()).length / 1024)
      }
    } catch {
      /* collection may be empty or unreadable */
    }
  }

  return {
    docCount,
    sizeKb: Math.max(sizeKb, 1),
    lastAccessAt,
    hasPassword: Boolean(studioData?.archivePasswordHash),
  }
}

export async function touchArchiveLastAccess(studioId: string): Promise<void> {
  await updateDoc(doc(db, 'studios', studioId), { lastAccessAt: serverTimestamp() })
}

export async function setArchivePassword(studioId: string, password: string | null): Promise<void> {
  if (!password?.trim()) {
    await updateDoc(doc(db, 'studios', studioId), { archivePasswordHash: null })
    return
  }
  const archivePasswordHash = await hashArchivePassword(password)
  await updateDoc(doc(db, 'studios', studioId), { archivePasswordHash })
}

export async function duplicateStudioArchiveClient(params: {
  sourceStudioId: string
  userId: string
  userEmail: string
  newName: string
  memberships: UserStudioMembershipRef[]
}): Promise<{ studioId: string; memberships: UserStudioMembershipRef[] }> {
  const { sourceStudioId, userId, userEmail, newName, memberships } = params
  const { studioId: newStudioId, memberships: nextMemberships } = await createStudioArchive({
    userId,
    userEmail,
    name: newName,
    memberships,
  })

  for (const collName of TENANT_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, collName), where('studioId', '==', sourceStudioId)))
    if (snap.empty) continue

    let batch = writeBatch(db)
    let ops = 0
    for (const d of snap.docs) {
      const data = { ...d.data(), studioId: newStudioId }
      delete (data as { id?: string }).id
      const newRef = doc(collection(db, collName))
      batch.set(newRef, data)
      ops++
      if (ops >= 400) {
        await batch.commit()
        batch = writeBatch(db)
        ops = 0
      }
    }
    if (ops > 0) await batch.commit()
  }

  return { studioId: newStudioId, memberships: nextMemberships }
}

export async function repairArchiveAccess(userId: string, memberships: UserStudioMembershipRef[]): Promise<number> {
  const { syncCanonicalMembershipDocs } = await import('./studioMemberships')
  await syncCanonicalMembershipDocs(userId, memberships)
  const { syncStudioClaimsAndRefreshToken } = await import('./syncStudioClaims')
  await syncStudioClaimsAndRefreshToken()
  return memberships.length
}

export function formatArchiveAccess(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatSizeKb(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`
  return `${kb.toLocaleString('it-IT')} KB`
}

export type ArchiveGridItem = StudioArchive & ArchiveStats
