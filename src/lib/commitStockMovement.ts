import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { StockMovementType } from '../types'
import { isCloudFunctionUnavailable } from './cloudFunctions'

export type CommitStockMovementPayload = {
  movement: {
    studioId: string
    date: string
    productId: string
    productCode?: string
    productName?: string
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
  const fn = httpsCallable<CommitStockMovementPayload, CommitStockMovementResult>(
    functions,
    'commitStockMovement',
  )
  const res = await fn(payload)
  return res.data
}

export async function callRevertStockMovement(
  movementId: string,
  studioId: string,
): Promise<{ ok: boolean }> {
  const fn = httpsCallable<{ movementId: string; studioId: string }, { ok: boolean }>(
    functions,
    'revertStockMovement',
  )
  const res = await fn({ movementId, studioId })
  return res.data
}
