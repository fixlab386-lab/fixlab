import { ref, uploadBytes, deleteObject } from 'firebase/storage'
import { storage } from '../../firebase'
import { callCallableWithAuth, formatCallableError } from '../cloudFunctions'
import { functions } from '../../firebase'

type RepairRequest = {
  studioId: string
  storagePath?: string
}

type RepairResponse = {
  message: string
  result: {
    subjectsLinked: number
    documentLinks: number
    statusesUpdated: number
    documentsUpdated: number
    errors: string[]
  }
}

export async function uploadEftForRepair(studioId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_')
  const storagePath = `studios/${studioId}/danea-imports/repair_${Date.now()}_${safeName}`
  await uploadBytes(ref(storage, storagePath), file, {
    contentType: 'application/octet-stream',
    customMetadata: { source: 'danea-repair' },
  })
  return storagePath
}

export async function deleteRepairUpload(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    /* ignore */
  }
}

export async function repairDaneaDocumentsInStudio(
  studioId: string,
  storagePath?: string,
): Promise<RepairResponse> {
  return callCallableWithAuth<RepairRequest, RepairResponse>(functions, 'repairDaneaDocuments', {
    studioId,
    storagePath,
  })
}

export function formatRepairError(error: unknown): string {
  return formatCallableError(error, 'Riparazione documenti non riuscita.')
}
