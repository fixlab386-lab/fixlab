import { ref, uploadBytes, deleteObject } from 'firebase/storage'
import { doc, onSnapshot } from 'firebase/firestore'
import { storage, db } from '../../firebase'
import { callCallableWithAuth, formatCallableError } from '../cloudFunctions'
import { functions } from '../../firebase'
import type { DaneaImportOptions, DaneaImportProgress, DaneaImportResult } from './types'

export type DaneaBefImportJob = {
  status: 'pending' | 'running' | 'done' | 'error'
  phase?: DaneaImportProgress['phase']
  done?: number
  total?: number
  message?: string
  result?: DaneaImportResult
  error?: string
}

type ImportDaneaBefRequest = {
  studioId: string
  storagePath: string
  options: DaneaImportOptions
}

type ImportDaneaBefResponse = {
  importId: string
}

export async function uploadBefForImport(studioId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_')
  const storagePath = `studios/${studioId}/danea-imports/${Date.now()}_${safeName}`
  const sref = ref(storage, storagePath)
  await uploadBytes(sref, file, {
    contentType: 'application/octet-stream',
    customMetadata: { source: 'danea-bef' },
  })
  return storagePath
}

export async function deleteBefUpload(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    /* ignore cleanup errors */
  }
}

export function listenDaneaBefImportJob(
  studioId: string,
  importId: string,
  onUpdate: (job: DaneaBefImportJob) => void,
): () => void {
  const jobRef = doc(db, 'studios', studioId, 'daneaImports', importId)
  return onSnapshot(jobRef, snap => {
    if (!snap.exists()) return
    onUpdate(snap.data() as DaneaBefImportJob)
  })
}

export async function startDaneaBefCloudImport(
  studioId: string,
  storagePath: string,
  options: DaneaImportOptions,
): Promise<string> {
  const res = await callCallableWithAuth<ImportDaneaBefRequest, ImportDaneaBefResponse>(
    functions,
    'importDaneaBef',
    { studioId, storagePath, options },
  )
  return res.importId
}

export function formatBefImportError(error: unknown): string {
  const raw = formatCallableError(error, 'Importazione .bef non riuscita.')
  if (raw.includes('copia di sicurezza compressa') || raw.includes('Documenti\\Danea Easyfatt\\Archivi')) {
    return raw
  }
  if (raw.includes('Impossibile leggere il database Danea')) {
    return (
      'Il file .bef è una copia di sicurezza compressa di Danea Easyfatt e non si può aprire direttamente.\n\n' +
      'Per importare i dati:\n' +
      '1. Esporta da Danea gli elenchi in Excel (Clienti, Fornitori, Prodotti, Documenti) e caricali qui, oppure\n' +
      '2. Carica il file .eft dalla cartella Documenti\\Danea Easyfatt\\Archivi (non il .bef).'
    )
  }
  return raw
}
