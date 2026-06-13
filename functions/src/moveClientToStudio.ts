/**
 * Sposta un cliente e tutto il suo storico da un archivio a un altro (Admin SDK).
 * Il client non può cambiare studioId (tenantStudioIdUnchanged nelle Firestore rules).
 */
import { getStorage } from 'firebase-admin/storage'
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { assertStudioAccess } from './auth'

const db = getFirestore('fixlab')

/** Firestore: max 500 operazioni per transazione (letture + scritture). */
const MAX_TRANSACTION_OPS = 450
const CONFIRM_TEXT = 'SPOSTA CLIENTE'

type MoveMode = 'preview' | 'execute'

type MoveClientRequest = {
  clientId: string
  sourceStudioId: string
  targetStudioId: string
  mode: MoveMode
  confirmText?: string
}

type MoveCounts = {
  repairs: number
  devices: number
  documents: number
  payments: number
  repairPhotos: number
  stockMovementsStayingInSource: number
}

type RepairPhoto = {
  url: string
  path: string
  name: string
  type: 'before' | 'after'
  timestamp: number
}

type CollectedClientBundle = {
  clientRef: DocumentReference
  clientName: string
  repairs: DocumentReference[]
  devices: DocumentReference[]
  documents: DocumentReference[]
  payments: DocumentReference[]
  stockMovementsStaying: DocumentReference[]
  repairPhotoCount: number
  repairPhotoPaths: Array<{ repairId: string; photos: RepairPhoto[] }>
}

type PreparedPhotoMigration = {
  urlByRepairId: Map<string, RepairPhoto[]>
  copiedDestPaths: string[]
  sourcePathsToDelete: string[]
}

function isClientSubject(data: Record<string, unknown>, clientId: string): boolean {
  return data.subjectType === 'client' && data.subjectId === clientId
}

/**
 * Documenti/pagamenti in FIXLab usano subjectType + subjectId (mai clientId diretto).
 * Vedi NuovoDocumento, Cassa, commitDocument. Includiamo anche:
 * - documenti collegati (linkedDocumentId) nella chiusura del grafo
 * - pagamenti collegati a documenti spostati anche senza subjectId
 */
function collectClientDocuments(
  clientId: string,
  documentsSnap: DocumentSnapshot[],
): DocumentReference[] {
  const byId = new Map(documentsSnap.map(s => [s.id, s]))
  const selected = new Set<string>()

  for (const snap of documentsSnap) {
    const data = snap.data()
    if (!data) continue
    if (isClientSubject(data, clientId)) {
      selected.add(snap.id)
    }
  }

  let expanded = true
  while (expanded) {
    expanded = false
    for (const snap of documentsSnap) {
      if (selected.has(snap.id)) continue
      const data = snap.data()
      if (!data) continue
      const linked = data.linkedDocumentId as string | undefined
      if (linked && selected.has(linked)) {
        selected.add(snap.id)
        expanded = true
      }
    }
  }

  return Array.from(selected)
    .map(id => byId.get(id))
    .filter((snap): snap is DocumentSnapshot => !!snap)
    .map(snap => snap.ref)
}

function collectClientPayments(
  clientId: string,
  movedDocumentIds: Set<string>,
  paymentsSnap: DocumentSnapshot[],
): DocumentReference[] {
  const selected = new Map<string, DocumentReference>()

  for (const snap of paymentsSnap) {
    const data = snap.data()
    if (!data) continue
    if (isClientSubject(data, clientId)) {
      selected.set(snap.id, snap.ref)
      continue
    }
    const linked = data.linkedDocumentId as string | undefined
    if (linked && movedDocumentIds.has(linked)) {
      selected.set(snap.id, snap.ref)
    }
  }

  return Array.from(selected.values())
}

async function allocateClientCode(tx: Transaction, targetStudioId: string): Promise<string> {
  const q = db.collection('clients').where('studioId', '==', targetStudioId).orderBy('code', 'desc').limit(1)
  const snap = await tx.get(q)
  if (snap.empty) return '0001'
  const lastCode = String(snap.docs[0].data().code ?? '0000')
  const next = Number(lastCode)
  if (!Number.isFinite(next)) return '0001'
  return String(next + 1).padStart(4, '0')
}

async function collectClientBundle(clientId: string, sourceStudioId: string): Promise<CollectedClientBundle> {
  const clientRef = db.collection('clients').doc(clientId)
  const clientSnap = await clientRef.get()
  if (!clientSnap.exists) {
    throw new HttpsError('not-found', 'Cliente non trovato.')
  }
  const clientData = clientSnap.data() as { studioId?: string; name?: string }
  if (clientData.studioId !== sourceStudioId) {
    throw new HttpsError('failed-precondition', 'Il cliente non appartiene all\'archivio di origine indicato.')
  }

  const [repairsSnap, devicesSnap, documentsSnap, paymentsSnap, stockSnap] = await Promise.all([
    db.collection('repairs').where('studioId', '==', sourceStudioId).get(),
    db.collection('devices').where('studioId', '==', sourceStudioId).get(),
    db.collection('documents').where('studioId', '==', sourceStudioId).get(),
    db.collection('payments').where('studioId', '==', sourceStudioId).get(),
    db.collection('stockMovements').where('studioId', '==', sourceStudioId).get(),
  ])

  const repairs = repairsSnap.docs.filter(d => d.data().clientId === clientId)
  const devices = devicesSnap.docs.filter(d => d.data().clientId === clientId)
  const documents = collectClientDocuments(clientId, documentsSnap.docs)
  const movedDocumentIds = new Set(documents.map(ref => ref.id))
  const payments = collectClientPayments(clientId, movedDocumentIds, paymentsSnap.docs)
  const stockMovementsStaying = stockSnap.docs.filter(d => isClientSubject(d.data(), clientId))

  let repairPhotoCount = 0
  const repairPhotoPaths: CollectedClientBundle['repairPhotoPaths'] = []
  for (const repair of repairs) {
    const photos = repair.data().photos as RepairPhoto[] | undefined
    if (!photos?.length) continue
    repairPhotoCount += photos.length
    repairPhotoPaths.push({ repairId: repair.id, photos })
  }

  return {
    clientRef,
    clientName: String(clientData.name ?? clientId),
    repairs: repairs.map(d => d.ref),
    devices: devices.map(d => d.ref),
    documents,
    payments,
    stockMovementsStaying: stockMovementsStaying.map(d => d.ref),
    repairPhotoCount,
    repairPhotoPaths,
  }
}

function buildCounts(bundle: CollectedClientBundle): MoveCounts {
  return {
    repairs: bundle.repairs.length,
    devices: bundle.devices.length,
    documents: bundle.documents.length,
    payments: bundle.payments.length,
    repairPhotos: bundle.repairPhotoCount,
    stockMovementsStayingInSource: bundle.stockMovementsStaying.length,
  }
}

function estimateTransactionOps(bundle: CollectedClientBundle): number {
  const docsToMove =
    1 + bundle.repairs.length + bundle.devices.length + bundle.documents.length + bundle.payments.length
  return docsToMove * 2 + 2
}

function buildDownloadUrl(bucketName: string, storagePath: string, token?: string): string {
  const encoded = encodeURIComponent(storagePath)
  if (token) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`
  }
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media`
}

async function cleanupCopiedPhotos(paths: string[]): Promise<void> {
  if (!paths.length) return
  const bucket = getStorage().bucket()
  await Promise.all(paths.map(path => bucket.file(path).delete({ ignoreNotFound: true })))
}

async function deleteSourceRepairPhotos(paths: string[]): Promise<void> {
  await cleanupCopiedPhotos(paths)
}

/**
 * Copia TUTTE le foto in destinazione prima della transazione Firestore.
 * Se una copia fallisce, abortisce e ripulisce le copie parziali.
 */
async function copyRepairPhotosToDestination(
  bundle: CollectedClientBundle,
  sourceStudioId: string,
  targetStudioId: string,
): Promise<{ ok: true; prepared: PreparedPhotoMigration } | { ok: false; errors: string[]; copiedDestPaths: string[] }> {
  if (!bundle.repairPhotoPaths.length) {
    return {
      ok: true,
      prepared: {
        urlByRepairId: new Map(),
        copiedDestPaths: [],
        sourcePathsToDelete: [],
      },
    }
  }

  const bucket = getStorage().bucket()
  const bucketName = bucket.name
  const errors: string[] = []
  const copiedDestPaths: string[] = []
  const sourcePathsToDelete: string[] = []
  const urlByRepairId = new Map<string, RepairPhoto[]>()

  for (const entry of bundle.repairPhotoPaths) {
    const updatedPhotos: RepairPhoto[] = []

    for (const photo of entry.photos) {
      const newPath = photo.path.replace(`studios/${sourceStudioId}/`, `studios/${targetStudioId}/`)

      try {
        const srcFile = bucket.file(photo.path)
        const [exists] = await srcFile.exists()
        if (!exists) {
          errors.push(`Foto assente in Storage: ${photo.path}`)
          continue
        }

        const destFile = bucket.file(newPath)
        const [destExists] = await destFile.exists()
        if (destExists) {
          errors.push(`Destinazione già occupata: ${newPath}`)
          continue
        }

        await srcFile.copy(destFile)
        copiedDestPaths.push(newPath)
        sourcePathsToDelete.push(photo.path)

        const [meta] = await destFile.getMetadata()
        const token = meta.metadata?.firebaseStorageDownloadTokens as string | undefined
        updatedPhotos.push({
          ...photo,
          path: newPath,
          url: buildDownloadUrl(bucketName, newPath, token),
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Errore copia foto ${photo.path}: ${msg}`)
      }
    }

    urlByRepairId.set(entry.repairId, updatedPhotos)
  }

  if (errors.length > 0) {
    await cleanupCopiedPhotos(copiedDestPaths)
    return { ok: false, errors, copiedDestPaths: [] }
  }

  return {
    ok: true,
    prepared: {
      urlByRepairId,
      copiedDestPaths,
      sourcePathsToDelete,
    },
  }
}

async function writeTransferAuditLog(params: {
  clientId: string
  clientName: string
  sourceStudioId: string
  targetStudioId: string
  movedBy: string
  newClientCode: string
  counts: MoveCounts
  repairPhotosMigrated: number
}): Promise<string> {
  const ref = db.collection('clientTransfers').doc()
  await ref.set({
    clientId: params.clientId,
    clientName: params.clientName,
    sourceStudioId: params.sourceStudioId,
    targetStudioId: params.targetStudioId,
    movedBy: params.movedBy,
    newClientCode: params.newClientCode,
    report: {
      ...params.counts,
      repairPhotosMigrated: params.repairPhotosMigrated,
      repairPhotoErrors: [],
    },
    createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

async function executeClientMove(params: {
  uid: string
  clientId: string
  sourceStudioId: string
  targetStudioId: string
}): Promise<{
  clientName: string
  newClientCode: string
  counts: MoveCounts
  repairPhotosMigrated: number
  repairPhotoErrors: string[]
  transferLogId: string
}> {
  const bundle = await collectClientBundle(params.clientId, params.sourceStudioId)
  const counts = buildCounts(bundle)
  const txOps = estimateTransactionOps(bundle)

  if (txOps > MAX_TRANSACTION_OPS) {
    throw new HttpsError(
      'failed-precondition',
      `Cliente con troppi collegamenti (${txOps} operazioni stimate, limite ${MAX_TRANSACTION_OPS}). ` +
        `Riparazioni: ${counts.repairs}, documenti: ${counts.documents}, pagamenti: ${counts.payments}, dispositivi: ${counts.devices}. ` +
        'Contatta il supporto FIXLab per uno spostamento assistito.',
    )
  }

  const photoCopy = await copyRepairPhotosToDestination(bundle, params.sourceStudioId, params.targetStudioId)
  if (!photoCopy.ok) {
    throw new HttpsError(
      'failed-precondition',
      `Copia foto non riuscita. Nessun dato Firestore modificato. Dettagli: ${photoCopy.errors.join(' | ')}`,
    )
  }

  const preparedPhotos = photoCopy.prepared
  let newClientCode = ''

  try {
    await db.runTransaction(async tx => {
      const clientSnap = await tx.get(bundle.clientRef)
      if (!clientSnap.exists) {
        throw new HttpsError('not-found', 'Cliente non trovato.')
      }
      const clientData = clientSnap.data() as { studioId?: string }
      if (clientData.studioId !== params.sourceStudioId) {
        throw new HttpsError('failed-precondition', 'Il cliente non è più nell\'archivio di origine. Ricarica e riprova.')
      }

      newClientCode = await allocateClientCode(tx, params.targetStudioId)

      const allRefs = [...bundle.repairs, ...bundle.devices, ...bundle.documents, ...bundle.payments]
      const snapshots = await Promise.all(allRefs.map(ref => tx.get(ref)))

      for (const snap of snapshots) {
        if (!snap.exists) {
          throw new HttpsError('aborted', 'Dati collegati modificati durante lo spostamento. Nessuna modifica applicata.')
        }
        if (snap.data()?.studioId !== params.sourceStudioId) {
          throw new HttpsError('aborted', 'Inconsistenza archivio su un documento collegato. Operazione annullata.')
        }
      }

      tx.update(bundle.clientRef, {
        studioId: params.targetStudioId,
        code: newClientCode,
        updatedAt: FieldValue.serverTimestamp(),
      })

      for (const repairRef of bundle.repairs) {
        const prepared = preparedPhotos.urlByRepairId.get(repairRef.id)
        const repairSnap = snapshots.find(s => s.ref.path === repairRef.path)
        const existingPhotos = repairSnap?.data()?.photos as RepairPhoto[] | undefined
        tx.update(repairRef, {
          studioId: params.targetStudioId,
          ...(prepared?.length ? { photos: prepared } : existingPhotos?.length ? { photos: existingPhotos } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      for (const deviceRef of bundle.devices) {
        tx.update(deviceRef, {
          studioId: params.targetStudioId,
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      for (const documentRef of bundle.documents) {
        tx.update(documentRef, {
          studioId: params.targetStudioId,
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      for (const paymentRef of bundle.payments) {
        tx.update(paymentRef, {
          studioId: params.targetStudioId,
          updatedAt: FieldValue.serverTimestamp(),
        })
      }
    })
  } catch (err) {
    await cleanupCopiedPhotos(preparedPhotos.copiedDestPaths)
    throw err
  }

  await deleteSourceRepairPhotos(preparedPhotos.sourcePathsToDelete)

  const transferLogId = await writeTransferAuditLog({
    clientId: params.clientId,
    clientName: bundle.clientName,
    sourceStudioId: params.sourceStudioId,
    targetStudioId: params.targetStudioId,
    movedBy: params.uid,
    newClientCode,
    counts,
    repairPhotosMigrated: preparedPhotos.copiedDestPaths.length,
  })

  return {
    clientName: bundle.clientName,
    newClientCode,
    counts,
    repairPhotosMigrated: preparedPhotos.copiedDestPaths.length,
    repairPhotoErrors: [],
    transferLogId,
  }
}

export const moveClientToStudio = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const data = request.data as MoveClientRequest
  const clientId = String(data?.clientId ?? '').trim()
  const sourceStudioId = String(data?.sourceStudioId ?? '').trim()
  const targetStudioId = String(data?.targetStudioId ?? '').trim()
  const mode: MoveMode = data?.mode === 'execute' ? 'execute' : 'preview'

  if (!clientId || !sourceStudioId || !targetStudioId) {
    throw new HttpsError('invalid-argument', 'clientId, sourceStudioId e targetStudioId sono obbligatori.')
  }
  if (sourceStudioId === targetStudioId) {
    throw new HttpsError('invalid-argument', 'Archivio di origine e destinazione devono essere diversi.')
  }

  const uid = request.auth.uid
  await assertStudioAccess(uid, sourceStudioId)
  await assertStudioAccess(uid, targetStudioId)

  if (mode === 'preview') {
    const bundle = await collectClientBundle(clientId, sourceStudioId)
    const counts = buildCounts(bundle)
    const txOps = estimateTransactionOps(bundle)
    const withinLimits = txOps <= MAX_TRANSACTION_OPS
    return {
      mode: 'preview' as const,
      clientId,
      clientName: bundle.clientName,
      sourceStudioId,
      targetStudioId,
      counts,
      withinLimits,
      transactionOperationsEstimate: txOps,
      limitMessage: withinLimits
        ? undefined
        : `Troppi collegamenti (${txOps} operazioni). Limite transazione: ${MAX_TRANSACTION_OPS}.`,
    }
  }

  if (data.confirmText !== CONFIRM_TEXT) {
    throw new HttpsError('invalid-argument', `Conferma non valida. Digita esattamente: ${CONFIRM_TEXT}`)
  }

  const result = await executeClientMove({ uid, clientId, sourceStudioId, targetStudioId })
  return {
    mode: 'execute' as const,
    clientId,
    sourceStudioId,
    targetStudioId,
    ...result,
  }
})

export { collectClientBundle, buildCounts, MAX_TRANSACTION_OPS, CONFIRM_TEXT, isClientSubject, collectClientDocuments, collectClientPayments }
