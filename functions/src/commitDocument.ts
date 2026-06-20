import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore'
import { assertStudioAccess } from './auth'
import { applyStockDelta, buildMovementFields } from './stock'

const db = getFirestore('fixlab')

const STOCK_DEDUCT_TYPES = new Set(['vendita_banco', 'ddt'])
const COMMITTABLE_STATUSES = new Set(['confirmed', 'sent', 'completed'])

type DocumentRow = {
  productId?: string
  productCode?: string
  description: string
  quantity: number
}

type DocPayload = {
  studioId: string
  type: string
  number?: number
  numbering?: string
  fullNumber?: string
  date: string
  documentYear?: number
  subjectType: 'client' | 'supplier'
  subjectId?: string
  subjectName: string
  rows: DocumentRow[]
  status: string
  stockCommitted?: boolean
  [key: string]: unknown
}

type CommitRequest = {
  documentId?: string
  document: DocPayload
  assignNumber?: boolean
}

function documentYearFromDate(date: string): number {
  const y = parseInt(date.slice(0, 4), 10)
  return Number.isNaN(y) ? new Date().getFullYear() : y
}

function buildFullNumber(number: number, year: number, numbering?: string): string {
  if (numbering?.trim()) return `${number}/${numbering.trim()}`
  return `${number}/${year}`
}

function counterDocId(studioId: string, type: string, year: number): string {
  return `${studioId}_${type}_${year}`
}

function shouldDeductStock(type: string, status: string, stockCommitted?: boolean): boolean {
  return STOCK_DEDUCT_TYPES.has(type) && COMMITTABLE_STATUSES.has(status) && !stockCommitted
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    preventivo: 'Preventivo',
    vendita_banco: 'Ricevuta',
    ddt: 'DDT',
  }
  return labels[type] || type
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item =>
      item !== null && typeof item === 'object' ? stripUndefined(item) : item,
    ) as T
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue
    out[key] = stripUndefined(val)
  }
  return out as T
}

export const commitDocument = onCall({ region: 'europe-west1' }, async request => {
  try {
    return await commitDocumentHandler(request)
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('commitDocument unexpected error', err)
    const detail = err instanceof Error ? err.message : String(err)
    throw new HttpsError('internal', detail || 'Errore commit documento.')
  }
})

async function commitDocumentHandler(request: CallableRequest<CommitRequest>) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const data = request.data as CommitRequest
  if (!data?.document?.studioId) {
    throw new HttpsError('invalid-argument', 'Payload documento non valido.')
  }

  const { documentId, document, assignNumber = !documentId } = data
  await assertStudioAccess(request.auth.uid, document.studioId)

  const allowNegative = await db.collection('studios').doc(document.studioId).get().then(s => Boolean(s.data()?.allowNegativeStock))

  const year = document.documentYear ?? documentYearFromDate(document.date)
  const counterRef = db.collection('documentCounters').doc(counterDocId(document.studioId, document.type, year))

  let resultDocId = documentId || ''
  let assignedNumber = document.number || 0
  let assignedFullNumber = document.fullNumber || ''
  let stockCommitted = Boolean(document.stockCommitted)
  const stockWarning: string | undefined = undefined

  await db.runTransaction(async tx => {
    const docRef = documentId ? db.collection('documents').doc(documentId) : db.collection('documents').doc()

    // --- Fase letture (Firestore: tutte le read prima delle write) ---
    let existingStockCommitted = false
    if (documentId) {
      const existingSnap = await tx.get(docRef)
      if (!existingSnap.exists) {
        throw new HttpsError('not-found', 'Documento non trovato.')
      }
      existingStockCommitted = Boolean((existingSnap.data() as DocPayload).stockCommitted)
      resultDocId = documentId
    } else {
      resultDocId = docRef.id
    }

    let counterLast = 0
    if (assignNumber) {
      const counterSnap = await tx.get(counterRef)
      counterLast = counterSnap.exists ? Number(counterSnap.data()?.lastNumber || 0) : 0
    }

    const nextStockCommitted = existingStockCommitted || stockCommitted
    const deduct = shouldDeductStock(document.type, document.status, nextStockCommitted)
    const stockRows = deduct ? (document.rows || []).filter(r => r.productId && r.quantity > 0) : []

    type ProductRead = {
      row: DocumentRow
      productRef: DocumentReference
      product: { studioId?: string; typology?: string; stock?: number; code?: string; name?: string }
    }
    const productReads: ProductRead[] = []

    for (const row of stockRows) {
      const productRef = db.collection('products').doc(row.productId!)
      const productSnap = await tx.get(productRef)
      if (!productSnap.exists) continue
      const product = productSnap.data() as ProductRead['product']
      if (product.studioId !== document.studioId) continue
      productReads.push({ row, productRef, product })
    }

    // --- Calcolo numerazione e payload ---
    if (assignNumber) {
      assignedNumber = counterLast + 1
      assignedFullNumber = buildFullNumber(assignedNumber, year, document.numbering)
    } else {
      assignedNumber = document.number || assignedNumber
      assignedFullNumber = document.fullNumber || buildFullNumber(assignedNumber, year, document.numbering)
    }

    const savePayload: Record<string, unknown> = {
      ...stripUndefined(document),
      number: assignedNumber,
      fullNumber: assignedFullNumber,
      documentYear: year,
      stockCommitted: nextStockCommitted,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (!documentId) {
      savePayload.createdAt = FieldValue.serverTimestamp()
    }

    // --- Fase scritture ---
    if (assignNumber) {
      tx.set(
        counterRef,
        { lastNumber: assignedNumber, studioId: document.studioId, type: document.type, year, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      )
    }

    if (deduct) {
      for (const { row, productRef, product } of productReads) {
        applyStockDelta(
          tx,
          productRef,
          product,
          { type: 'unload', unloaded: row.quantity },
          { allowNegative, requireWithStock: true },
        )

        const movementRef = db.collection('stockMovements').doc()
        const cause = `${typeLabel(document.type)} ${assignedFullNumber} del ${document.date}`
        tx.set(movementRef, stripUndefined({
          studioId: document.studioId,
          date: document.date,
          productId: row.productId,
          productCode: row.productCode || product.code || '',
          productName: row.description || product.name || '',
          subjectType: document.subjectType,
          subjectId: document.subjectId || null,
          subjectName: document.subjectName,
          type: 'unload',
          ...buildMovementFields({ type: 'unload', unloaded: row.quantity }),
          cause,
          linkedDocumentId: resultDocId,
          linkedDocumentType: document.type,
          operatorId: request.auth!.uid,
          createdAt: FieldValue.serverTimestamp(),
        }))
      }
      savePayload.stockCommitted = true
      stockCommitted = true
    }

    if (documentId) {
      tx.set(docRef, savePayload, { merge: true })
    } else {
      tx.set(docRef, savePayload)
    }
  })

  return {
    documentId: resultDocId,
    number: assignedNumber,
    fullNumber: assignedFullNumber,
    documentYear: year,
    stockCommitted,
    stockWarning,
  }
}
