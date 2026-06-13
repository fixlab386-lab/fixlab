import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { assertStudioAccess } from './auth'
import {
  applyStockDelta,
  buildMovementFields,
  getStudioAllowNegative,
  revertStockDelta,
  type MovementQuantities,
  type StockMovementKind,
} from './stock'

const db = getFirestore('fixlab')

export type CommitStockMovementRequest = {
  movement: {
    studioId: string
    date: string
    productId: string
    productCode?: string
    productName?: string
    subjectType?: 'client' | 'supplier'
    subjectId?: string
    subjectName?: string
    type: StockMovementKind
    quantity?: number
    adjustTo?: number
    adjustMode?: 'delta' | 'absolute'
    cause?: string
    notes?: string
    linkedDocumentId?: string
    linkedDocumentType?: string
    operatorId?: string
    operatorName?: string
  }
}

function toMovementQuantities(req: CommitStockMovementRequest['movement']): MovementQuantities {
  const qty = req.quantity ?? 0
  switch (req.type) {
    case 'load':
      return { type: 'load', loaded: qty }
    case 'unload':
      return { type: 'unload', unloaded: qty }
    case 'committed':
      return { type: 'committed', committed: qty }
    case 'incoming':
      return { type: 'incoming', incoming: qty }
    case 'adjust':
      if (req.adjustMode === 'absolute' || req.adjustTo != null) {
        return { type: 'adjust', adjustTo: req.adjustTo ?? qty }
      }
      return { type: 'adjust', adjustDelta: qty }
    default:
      throw new HttpsError('invalid-argument', 'Tipo movimento non valido.')
  }
}

export const commitStockMovement = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const data = request.data as CommitStockMovementRequest
  const m = data?.movement
  if (!m?.studioId || !m.productId || !m.type) {
    throw new HttpsError('invalid-argument', 'Payload movimento non valido.')
  }

  await assertStudioAccess(request.auth.uid, m.studioId)
  const allowNegative = await getStudioAllowNegative(db, m.studioId)
  const quantities = toMovementQuantities(m)

  let movementId = ''
  let previousStock = 0
  let newStock = 0
  let stockUpdated = false

  await db.runTransaction(async tx => {
    const productRef = db.collection('products').doc(m.productId)
    const productSnap = await tx.get(productRef)
    if (!productSnap.exists) {
      throw new HttpsError('not-found', 'Prodotto non trovato.')
    }
    const product = productSnap.data() as { studioId?: string; typology?: string; stock?: number; code?: string; name?: string }
    if (product.studioId !== m.studioId) {
      throw new HttpsError('permission-denied', 'Prodotto non appartiene allo studio.')
    }

    const result = applyStockDelta(tx, productRef, product, quantities, { allowNegative })
    previousStock = result.previousStock
    newStock = result.newStock
    stockUpdated = result.changed

    const movementRef = db.collection('stockMovements').doc()
    movementId = movementRef.id
    tx.set(movementRef, {
      studioId: m.studioId,
      date: m.date,
      productId: m.productId,
      productCode: m.productCode || product.code || '',
      productName: m.productName || product.name || '',
      subjectType: m.subjectType || null,
      subjectId: m.subjectId || null,
      subjectName: m.subjectName || null,
      type: m.type,
      ...buildMovementFields(quantities),
      previousStock: result.changed ? previousStock : undefined,
      cause: m.cause || null,
      notes: m.notes || null,
      linkedDocumentId: m.linkedDocumentId || null,
      linkedDocumentType: m.linkedDocumentType || null,
      operatorId: m.operatorId || request.auth!.uid,
      operatorName: m.operatorName || null,
      stockUpdated,
      createdAt: FieldValue.serverTimestamp(),
    })
  })

  return { movementId, previousStock, newStock, stockUpdated }
})

export const revertStockMovement = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const { movementId, studioId } = request.data as { movementId: string; studioId: string }
  if (!movementId || !studioId) {
    throw new HttpsError('invalid-argument', 'movementId e studioId richiesti.')
  }

  await assertStudioAccess(request.auth.uid, studioId)
  const allowNegative = await getStudioAllowNegative(db, studioId)

  await db.runTransaction(async tx => {
    const movementRef = db.collection('stockMovements').doc(movementId)
    const movementSnap = await tx.get(movementRef)
    if (!movementSnap.exists) {
      throw new HttpsError('not-found', 'Movimento non trovato.')
    }
    const movement = movementSnap.data() as {
      studioId: string
      productId: string
      type: StockMovementKind
      loaded?: number
      unloaded?: number
      committed?: number
      incoming?: number
      adjustTo?: number
      adjustDelta?: number
      previousStock?: number
      linkedDocumentId?: string
      stockUpdated?: boolean
    }

    if (movement.studioId !== studioId) {
      throw new HttpsError('permission-denied', 'Movimento non appartiene allo studio.')
    }

    if (movement.linkedDocumentId) {
      throw new HttpsError(
        'failed-precondition',
        'Movimento collegato a un documento: elimina o storna dal documento.',
      )
    }

    if (movement.stockUpdated !== false) {
      const productRef = db.collection('products').doc(movement.productId)
      const productSnap = await tx.get(productRef)
      if (productSnap.exists) {
        revertStockDelta(
          tx,
          productRef,
          productSnap.data() as { stock?: number; name?: string },
          {
            type: movement.type,
            loaded: movement.loaded,
            unloaded: movement.unloaded,
            adjustTo: movement.adjustTo,
            adjustDelta: movement.adjustDelta,
            previousStock: movement.previousStock,
          },
          { allowNegative },
        )
      }
    }

    tx.delete(movementRef)
  })

  return { ok: true }
})
