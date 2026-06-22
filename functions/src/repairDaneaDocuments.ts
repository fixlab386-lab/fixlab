import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { rmSync } from 'node:fs'
import { assertStudioAccess } from './auth'
import { europeWest1Callable } from './callableOptions'
import { AdminBatchWriter } from './danea/batchWriter'
import { copyDatabaseForRead, extractDaneaArchiveFile } from './danea/befExtract'
import { EFT_READ_ERROR_MESSAGE, FIREBIRD_UNAVAILABLE_MESSAGE } from './danea/importErrors'
import { readEasyfattDatabase, testFirebirdConnection } from './danea/firebirdClient'
import {
  mapFirestoreDoc,
  repairDocumentsFromExtract,
  repairDocumentsInFirestore,
  type DocumentRepairResult,
} from './danea/documentRepair'
import { loadClientDupIndex, loadSupplierDupIndex } from './danea/importRunner'

const db = getFirestore('fixlab')
const DOC_PAGE = 400

type RepairRequest = {
  studioId: string
  /** Opzionale: stesso .eft/.bef Danea per collegamenti precisi da database. */
  storagePath?: string
}

async function loadStudioDocuments(studioId: string) {
  const docs: ReturnType<typeof mapFirestoreDoc>[] = []
  let lastDoc: QueryDocumentSnapshot | undefined
  for (;;) {
    let q = db.collection('documents').where('studioId', '==', studioId).orderBy('createdAt', 'desc').limit(DOC_PAGE)
    if (lastDoc) q = q.startAfter(lastDoc)
    const snap = await q.get()
    if (snap.empty) break
    for (const d of snap.docs) {
      docs.push(mapFirestoreDoc(d.id, d.data()))
    }
    if (snap.docs.length < DOC_PAGE) break
    lastDoc = snap.docs[snap.docs.length - 1]
  }
  return docs
}

async function repairFromArchive(
  studioId: string,
  storagePath: string,
  existingDocs: ReturnType<typeof mapFirestoreDoc>[],
  clientIndex: Awaited<ReturnType<typeof loadClientDupIndex>>,
  supplierIndex: Awaited<ReturnType<typeof loadSupplierDupIndex>>,
): Promise<DocumentRepairResult> {
  if (!storagePath.startsWith(`studios/${studioId}/danea-imports/`)) {
    throw new HttpsError('invalid-argument', 'Percorso file non valido.')
  }

  let workDir: string | null = null
  try {
    const bucket = getStorage().bucket()
    const file = bucket.file(storagePath)
    const [buffer] = await file.download()
    const originalName = storagePath.split('/').pop() ?? 'archive.eft'

    const extracted = extractDaneaArchiveFile(buffer, originalName)
    workDir = extracted.workDir
    if (!extracted.databasePath) {
      throw new HttpsError(
        'failed-precondition',
        'Carica il file .eft dall’archivio Danea (Documenti → Danea Easyfatt → Archivi) per una riparazione precisa.',
      )
    }

    const dbPath = copyDatabaseForRead(extracted.databasePath, extracted.workDir)
    const canConnect = await testFirebirdConnection(dbPath).catch(err => {
      if (err instanceof Error && err.message === 'FIREBIRD_SERVER_UNAVAILABLE') {
        throw new HttpsError('unavailable', FIREBIRD_UNAVAILABLE_MESSAGE)
      }
      throw err
    })
    if (!canConnect) {
      throw new HttpsError('failed-precondition', EFT_READ_ERROR_MESSAGE)
    }

    const data = await readEasyfattDatabase(dbPath)
    const writer = new AdminBatchWriter()
    const result = await repairDocumentsFromExtract(data, existingDocs, clientIndex, supplierIndex, writer)

    try {
      await file.delete()
    } catch {
      /* ignore */
    }

    return result
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

export const repairDaneaDocuments = onCall(
  {
    ...europeWest1Callable,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request: CallableRequest<RepairRequest>) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
    }

    const { studioId, storagePath } = request.data ?? {}
    if (!studioId) {
      throw new HttpsError('invalid-argument', 'studioId obbligatorio.')
    }

    await assertStudioAccess(request.auth.uid, studioId)

    const [existingDocs, clientIndex, supplierIndex] = await Promise.all([
      loadStudioDocuments(studioId),
      loadClientDupIndex(studioId),
      loadSupplierDupIndex(studioId),
    ])

    const writer = new AdminBatchWriter()
    const heuristicResult = await repairDocumentsInFirestore(existingDocs, clientIndex, supplierIndex, writer)

    let archiveResult: DocumentRepairResult = {
      subjectsLinked: 0,
      documentLinks: 0,
      statusesUpdated: 0,
      documentsUpdated: 0,
      errors: [],
    }

    if (storagePath) {
      archiveResult = await repairFromArchive(studioId, storagePath, existingDocs, clientIndex, supplierIndex)
    }

    const result: DocumentRepairResult = {
      subjectsLinked: heuristicResult.subjectsLinked + archiveResult.subjectsLinked,
      documentLinks: heuristicResult.documentLinks + archiveResult.documentLinks,
      statusesUpdated: heuristicResult.statusesUpdated + archiveResult.statusesUpdated,
      documentsUpdated: heuristicResult.documentsUpdated + archiveResult.documentsUpdated,
      errors: [...heuristicResult.errors, ...archiveResult.errors].slice(0, 20),
    }

    return {
      message: formatRepairMessage(result, Boolean(storagePath)),
      result,
    }
  },
)

function formatRepairMessage(result: DocumentRepairResult, usedArchive: boolean): string {
  const parts: string[] = []
  if (result.subjectsLinked) parts.push(`${result.subjectsLinked} clienti/fornitori collegati`)
  if (result.documentLinks) parts.push(`${result.documentLinks} collegamenti documento creati`)
  if (result.statusesUpdated) parts.push(`${result.statusesUpdated} stati aggiornati`)
  if (!parts.length) {
    return usedArchive
      ? 'Riparazione completata. Nessuna modifica necessaria.'
      : 'Riparazione automatica completata. Per collegamenti precisi al 100%, carica anche il file .eft Danea.'
  }
  return `Riparazione completata: ${parts.join(', ')}.`
}
