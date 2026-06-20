/**
 * Copia di sicurezza archivio (Strumenti → Esegui copia di sicurezza archivio).
 * Esporta in un unico file JSON tutti i dati dell'archivio (studio) corrente:
 * anagrafiche, prodotti, documenti, pagamenti, movimenti, impostazioni e tabelle.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

const STUDIO_COLLECTIONS = [
  'categories',
  'products',
  'repairs',
  'clients',
  'suppliers',
  'documents',
  'paymentResources',
  'payments',
  'stockMovements',
  'agents',
  'warehouses',
  'priceLists',
] as const

export type BackupSummary = {
  fileName: string
  totalDocs: number
  counts: Record<string, number>
}

/** Converte i Timestamp Firestore in valori JSON serializzabili. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
    const ts = value as { seconds: number; nanoseconds: number }
    return { __type: 'timestamp', seconds: ts.seconds, nanoseconds: ts.nanoseconds }
  }
  return value
}

async function fetchCollection(name: string, studioId: string) {
  const snap = await getDocs(query(collection(db, name), where('studioId', '==', studioId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

function downloadJson(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, jsonReplacer, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoca ritardata: alcuni browser annullano il download se revocato subito.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function runStudioBackup(studioId: string, studioName?: string): Promise<BackupSummary> {
  if (!studioId) throw new Error('Archivio non valido.')

  const studioSnap = await getDoc(doc(db, 'studios', studioId))
  const studioData = studioSnap.exists() ? { id: studioSnap.id, ...studioSnap.data() } : null

  const counts: Record<string, number> = {}
  const data: Record<string, unknown[]> = {}
  let totalDocs = 0

  for (const name of STUDIO_COLLECTIONS) {
    try {
      const rows = await fetchCollection(name, studioId)
      data[name] = rows
      counts[name] = rows.length
      totalDocs += rows.length
    } catch (err) {
      console.warn(`FIXLab backup: impossibile leggere la collezione "${name}".`, err)
      data[name] = []
      counts[name] = 0
    }
  }

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const safeName = (studioName || 'archivio').replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40)
  const fileName = `FixLab-Backup-${safeName}-${stamp}.json`

  const payload = {
    meta: {
      app: 'FixLab',
      type: 'studio-backup',
      version: 1,
      studioId,
      studioName: studioName ?? null,
      createdAt: now.toISOString(),
    },
    studio: studioData,
    collections: data,
  }

  downloadJson(fileName, payload)

  return { fileName, totalDocs, counts }
}
