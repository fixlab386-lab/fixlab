import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  DocumentReference,
} from 'firebase/firestore'
import { db } from '../firebase'

const BACKUP_COLLECTIONS = [
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
  'agents',
  'warehouses',
  'priceLists',
] as const

function serializeForExport(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Timestamp) return { _firestoreTimestamp: value.toDate().toISOString() }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof DocumentReference) return { _firestoreDocumentPath: value.path }
  if (Array.isArray(value)) return value.map(serializeForExport)
  if (typeof value === 'object') {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      o[k] = serializeForExport(v)
    }
    return o
  }
  return value
}

export async function exportArchiveBackupJson(studioId: string, userId: string): Promise<void> {
  const [userSnap, studioSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId)),
    getDoc(doc(db, 'studios', studioId)),
  ])
  const collections: Record<string, Array<{ id: string } & Record<string, unknown>>> = {}
  for (const name of BACKUP_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, name), where('studioId', '==', studioId)))
    collections[name] = snap.docs.map(d => ({
      id: d.id,
      ...(serializeForExport(d.data()) as Record<string, unknown>),
    }))
  }
  const payload = {
    meta: {
      app: 'FIXLab',
      formatVersion: 1,
      exportedAtISO: new Date().toISOString(),
      studioId,
    },
    user: userSnap.exists()
      ? { id: userSnap.id, ...(serializeForExport(userSnap.data()) as Record<string, unknown>) }
      : null,
    studio: studioSnap.exists()
      ? { id: studioSnap.id, ...(serializeForExport(studioSnap.data()) as Record<string, unknown>) }
      : null,
    collections,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const studioName = String(studioSnap.data()?.name ?? studioId).replace(/[^\w\-]+/g, '_')
  a.href = url
  a.download = `fixlab-backup-${studioName}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
