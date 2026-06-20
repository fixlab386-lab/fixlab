import { functions } from '../firebase'
import type { StockMovementType } from '../types'
import { callCallableWithAuth, isCloudFunctionUnavailable } from './cloudFunctions'

export type CommitStockMovementPayload = {
  movement: {
    studioId: string
    date: string
    productId: string
    productCode?: string
    productName?: string
    subjectType?: 'client' | 'supplier'
    subjectId?: string
    subjectName?: string
    type: StockMovementType
    quantity?: number
    adjustTo?: number
    adjustMode?: 'delta' | 'absolute'
    cause?: string
    notes?: string
    operatorId?: string
    operatorName?: string
  }
}

export type CommitStockMovementResult = {
  movementId: string
  previousStock: number
  newStock: number
  stockUpdated: boolean
}

export const isStockFunctionUnavailable = isCloudFunctionUnavailable

export async function callCommitStockMovement(
  payload: CommitStockMovementPayload,
): Promise<CommitStockMovementResult> {
  return callCallableWithAuth<CommitStockMovementPayload, CommitStockMovementResult>(
    functions,
    'commitStockMovement',
    payload,
  )
}

export async function callRevertStockMovement(
  movementId: string,
  studioId: string,
): Promise<{ ok: boolean }> {
  return callCallableWithAuth<{ movementId: string; studioId: string }, { ok: boolean }>(
    functions,
    'revertStockMovement',
    { movementId, studioId },
  )
}
