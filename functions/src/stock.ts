import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore'

export type StockMovementKind = 'load' | 'unload' | 'committed' | 'incoming' | 'adjust'

export type MovementQuantities = {
  type: StockMovementKind
  loaded?: number
  unloaded?: number
  committed?: number
  incoming?: number
  adjustTo?: number
  adjustDelta?: number
}

export type ProductStockData = {
  studioId?: string
  typology?: string
  stock?: number
  code?: string
  name?: string
}

export type ApplyStockOptions = {
  allowNegative?: boolean
  /** Solo articoli con magazzino (come commitDocument). Default true per movimenti manuali su load/unload/adjust. */
  requireWithStock?: boolean
}

export function movementQuantityLabel(m: MovementQuantities): string {
  if (m.type === 'load') return `+${m.loaded ?? 0}`
  if (m.type === 'unload') return `−${m.unloaded ?? 0}`
  if (m.type === 'committed') return `${m.committed ?? 0} imp.`
  if (m.type === 'incoming') return `${m.incoming ?? 0} arr.`
  if (m.adjustTo != null) return `→ ${m.adjustTo}`
  if (m.adjustDelta != null) return `${m.adjustDelta >= 0 ? '+' : ''}${m.adjustDelta}`
  return '—'
}

/** Calcola la nuova giacenza fisica senza side-effect. */
export function computeNewStock(currentStock: number, m: MovementQuantities): number | null {
  switch (m.type) {
    case 'load':
      return currentStock + (m.loaded ?? 0)
    case 'unload':
      return currentStock - (m.unloaded ?? 0)
    case 'adjust':
      if (m.adjustTo != null) return m.adjustTo
      return currentStock + (m.adjustDelta ?? 0)
    case 'committed':
    case 'incoming':
      return null
    default:
      return currentStock
  }
}

/** Applica il movimento alla giacenza fisica del prodotto (non tocca impegnato/in arrivo). */
export function applyStockDelta(
  tx: Transaction,
  productRef: DocumentReference,
  product: ProductStockData,
  movement: MovementQuantities,
  options: ApplyStockOptions = {},
): { previousStock: number; newStock: number; changed: boolean } {
  const { allowNegative = false, requireWithStock = false } = options
  const currentStock = product.stock ?? 0

  if (movement.type === 'committed' || movement.type === 'incoming') {
    return { previousStock: currentStock, newStock: currentStock, changed: false }
  }

  if (requireWithStock && product.typology && product.typology !== 'with_stock') {
    return { previousStock: currentStock, newStock: currentStock, changed: false }
  }

  const computed = computeNewStock(currentStock, movement)
  if (computed === null) {
    return { previousStock: currentStock, newStock: currentStock, changed: false }
  }

  if (computed < 0 && !allowNegative) {
    throw new HttpsError(
      'failed-precondition',
      `Giacenza insufficiente per ${product.name || 'prodotto'} (disp. ${currentStock}, risultato ${computed}).`,
    )
  }

  tx.update(productRef, {
    stock: computed,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { previousStock: currentStock, newStock: computed, changed: true }
}

/** Storno di un movimento già applicato (inverso). */
export function revertStockDelta(
  tx: Transaction,
  productRef: DocumentReference,
  product: ProductStockData,
  movement: MovementQuantities & { previousStock?: number },
  options: ApplyStockOptions = {},
): void {
  const { allowNegative = false } = options
  const currentStock = product.stock ?? 0

  if (movement.type === 'committed' || movement.type === 'incoming') {
    return
  }

  let restored: number
  if (movement.previousStock != null) {
    restored = movement.previousStock
  } else {
    switch (movement.type) {
      case 'load':
        restored = currentStock - (movement.loaded ?? 0)
        break
      case 'unload':
        restored = currentStock + (movement.unloaded ?? 0)
        break
      case 'adjust':
        if (movement.previousStock != null) restored = movement.previousStock
        else throw new HttpsError('failed-precondition', 'Impossibile stornare rettifica senza previousStock.')
        break
      default:
        return
    }
  }

  if (restored < 0 && !allowNegative) {
    throw new HttpsError('failed-precondition', `Storno impossibile: giacenza risultante negativa (${restored}).`)
  }

  tx.update(productRef, {
    stock: restored,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function getStudioAllowNegative(db: Firestore, studioId: string): Promise<boolean> {
  const snap = await db.collection('studios').doc(studioId).get()
  return Boolean(snap.data()?.allowNegativeStock)
}

export function buildMovementFields(
  movement: MovementQuantities,
): Pick<MovementQuantities, 'loaded' | 'unloaded' | 'committed' | 'incoming' | 'adjustTo' | 'adjustDelta'> {
  return {
    loaded: movement.type === 'load' ? movement.loaded : undefined,
    unloaded: movement.type === 'unload' ? movement.unloaded : undefined,
    committed: movement.type === 'committed' ? movement.committed : undefined,
    incoming: movement.type === 'incoming' ? movement.incoming : undefined,
    adjustTo: movement.type === 'adjust' ? movement.adjustTo : undefined,
    adjustDelta: movement.type === 'adjust' ? movement.adjustDelta : undefined,
  }
}
