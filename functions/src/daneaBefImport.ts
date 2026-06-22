import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { assertStudioAccess } from './auth'
import { europeWest1Callable } from './callableOptions'
import { copyDatabaseForRead, extractDaneaArchiveFile } from './danea/befExtract'
import {
  BEF_PROPRIETARY_MESSAGE,
  EFT_READ_ERROR_MESSAGE,
  FIREBIRD_UNAVAILABLE_MESSAGE,
} from './danea/importErrors'
import { readEasyfattDatabase, testFirebirdConnection } from './danea/firebirdClient'
import {
  countExtract,
  importEasyfattExtract,
  isExtractEmpty,
  type DaneaImportOptions,
} from './danea/importRunner'

const db = getFirestore('fixlab')

type ImportRequest = {
  studioId: string
  storagePath: string
  options: DaneaImportOptions
}

export const importDaneaBef = onCall(
  {
    ...europeWest1Callable,
    timeoutSeconds: 3600,
    memory: '4GiB',
  },
  async (request: CallableRequest<ImportRequest>) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
    }

    const { studioId, storagePath, options } = request.data ?? {}
    if (!studioId || !storagePath) {
      throw new HttpsError('invalid-argument', 'studioId e storagePath sono obbligatori.')
    }
    if (!storagePath.startsWith(`studios/${studioId}/danea-imports/`)) {
      throw new HttpsError('invalid-argument', 'Percorso file non valido.')
    }

    await assertStudioAccess(request.auth.uid, studioId)

    const importId = randomUUID()
    const jobRef = db.collection('studios').doc(studioId).collection('daneaImports').doc(importId)

    const updateJob = async (patch: Record<string, unknown>) => {
      await jobRef.set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    }

    await updateJob({
      status: 'pending',
      message: 'Download file in corso…',
      done: 0,
      total: 0,
    })

    void processImport(studioId, storagePath, options, updateJob).catch(async err => {
      await updateJob({
        status: 'error',
        error:
          err instanceof Error
            ? err.message
            : 'Importazione .bef non riuscita. Esporta gli Excel da Danea oppure carica il file .eft dall’archivio.',
      })
    })

    return { importId }
  },
)

async function processImport(
  studioId: string,
  storagePath: string,
  options: DaneaImportOptions,
  updateJob: (patch: Record<string, unknown>) => Promise<void>,
): Promise<void> {
  let workDir: string | null = null
  try {
    const bucket = getStorage().bucket()
    const file = bucket.file(storagePath)
    const [buffer] = await file.download()
    const originalName = storagePath.split('/').pop() ?? 'archive.bef'

    await updateJob({ status: 'running', message: 'Analisi archivio Danea…', phase: 'clients' })

    const extracted = extractDaneaArchiveFile(buffer, originalName)
    workDir = extracted.workDir

    if (extracted.spreadsheets.length && !extracted.databasePath) {
      throw new Error(
        'Il .bef contiene file Excel: trascinali separatamente nell’import oppure usa l’archivio .eft da Danea.',
      )
    }

    if (extracted.befProprietary || (!extracted.databasePath && originalName.toLowerCase().endsWith('.bef'))) {
      throw new Error(BEF_PROPRIETARY_MESSAGE)
    }

    if (!extracted.databasePath) {
      throw new Error(BEF_PROPRIETARY_MESSAGE)
    }

    const dbPath = copyDatabaseForRead(extracted.databasePath, extracted.workDir)
    let canConnect = false
    try {
      canConnect = await testFirebirdConnection(dbPath)
    } catch (err) {
      if (err instanceof Error && err.message === 'FIREBIRD_SERVER_UNAVAILABLE') {
        throw new Error(FIREBIRD_UNAVAILABLE_MESSAGE)
      }
      throw err
    }
    if (!canConnect) {
      throw new Error(
        originalName.toLowerCase().endsWith('.bef') ? BEF_PROPRIETARY_MESSAGE : EFT_READ_ERROR_MESSAGE,
      )
    }

    await updateJob({ message: 'Lettura database Easyfatt…' })
    const data = await readEasyfattDatabase(dbPath)

    if (isExtractEmpty(data)) {
      throw new Error('Nessun dato trovato nel database Danea. Verifica che il .bef non sia corrotto.')
    }

    const totals = countExtract(data)
    await updateJob({
      message: `Trovati: ${totals.clients} clienti, ${totals.suppliers} fornitori, ${totals.products} prodotti, ${totals.documents} documenti`,
      total:
        (options.importClients ? totals.clients : 0) +
        (options.importSuppliers ? totals.suppliers : 0) +
        (options.importProducts ? totals.products : 0) +
        (options.importDocuments ? totals.documents : 0),
    })

    const result = await importEasyfattExtract(studioId, data, options, updateJob)

    await updateJob({
      status: 'done',
      phase: 'done',
      message: 'Importazione completata.',
      result,
    })

    try {
      await file.delete()
    } catch {
      /* ignore */
    }
  } finally {
    if (workDir) {
      try {
        rmSync(workDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
  }
}
