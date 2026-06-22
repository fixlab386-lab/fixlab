import { deleteRepairUpload, formatRepairError, repairDaneaDocumentsInStudio, uploadEftForRepair } from '../../lib/daneaImport/repairDaneaDocuments'

export async function runDaneaDocumentRepair(opts: {
  studioId: string
  onProgress: (message: string) => void
  archiveFile?: File | null
}): Promise<string> {
  let storagePath: string | undefined

  try {
    if (opts.archiveFile) {
      opts.onProgress('Caricamento archivio Danea…')
      storagePath = await uploadEftForRepair(opts.studioId, opts.archiveFile)
    } else {
      opts.onProgress('Riparazione collegamenti e stati in corso…')
    }

    const res = await repairDaneaDocumentsInStudio(opts.studioId, storagePath)
    return res.message
  } finally {
    if (storagePath) await deleteRepairUpload(storagePath)
  }
}

export { formatRepairError }
