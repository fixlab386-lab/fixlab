import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { callCommitStockMovement } from '../../../lib/commitStockMovement'
import { updateProduct } from '../../../lib/firestore'
import type { Product } from '../../../types'
import type { OperazioneMagazzinoMode } from './constants'
import type { OperazioneMagazzinoState } from './OperazioneMagazzinoModal'

type CommitOpts = {
  studioId: string
  operatorId?: string
  operatorName?: string
}

export async function commitOperazioneMagazzinoLine(
  mode: OperazioneMagazzinoMode,
  state: OperazioneMagazzinoState,
  line: OperazioneMagazzinoState['lines'][0],
  opts: CommitOpts,
): Promise<void> {
  let product: Product | undefined
  if (mode === 'load' && state.updateSupplierPrice && line.unitCost > 0) {
    const snap = await getDoc(doc(db, 'products', line.productId))
    if (snap.exists()) product = { id: snap.id, ...snap.data() } as Product
  }
  await callCommitStockMovement({
    movement: {
      studioId: opts.studioId,
      date: state.date,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      subjectType: state.subjectType,
      subjectId: state.subjectId || undefined,
      subjectName: state.subjectName || undefined,
      type: mode,
      quantity: mode === 'adjust' ? line.newStock : line.quantity,
      adjustTo: mode === 'adjust' ? line.newStock : undefined,
      adjustMode: mode === 'adjust' ? 'absolute' : undefined,
      cause: state.cause || undefined,
      operatorId: opts.operatorId,
      operatorName: opts.operatorName,
    },
  })
  if (mode === 'load' && state.updateSupplierPrice && product && line.unitCost > 0) {
    await updateProduct(product.id, { purchasePrice: line.unitCost })
  }
}
