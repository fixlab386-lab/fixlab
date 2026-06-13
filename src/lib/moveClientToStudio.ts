import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export type MoveClientCounts = {
  repairs: number
  devices: number
  documents: number
  payments: number
  repairPhotos: number
  stockMovementsStayingInSource: number
}

export type MoveClientPreviewRequest = {
  clientId: string
  sourceStudioId: string
  targetStudioId: string
  mode: 'preview'
}

export type MoveClientExecuteRequest = {
  clientId: string
  sourceStudioId: string
  targetStudioId: string
  mode: 'execute'
  confirmText: string
}

export type MoveClientPreviewResult = {
  mode: 'preview'
  clientId: string
  clientName: string
  sourceStudioId: string
  targetStudioId: string
  counts: MoveClientCounts
  withinLimits: boolean
  transactionOperationsEstimate: number
  limitMessage?: string
}

export type MoveClientExecuteResult = {
  mode: 'execute'
  clientId: string
  clientName: string
  sourceStudioId: string
  targetStudioId: string
  newClientCode: string
  counts: MoveClientCounts
  repairPhotosMigrated: number
  repairPhotoErrors: string[]
  transferLogId: string
}

export async function previewMoveClientToStudio(
  params: Omit<MoveClientPreviewRequest, 'mode'>,
): Promise<MoveClientPreviewResult> {
  const fn = httpsCallable<MoveClientPreviewRequest, MoveClientPreviewResult>(functions, 'moveClientToStudio')
  const res = await fn({ ...params, mode: 'preview' })
  return res.data
}

export async function executeMoveClientToStudio(
  params: Omit<MoveClientExecuteRequest, 'mode'>,
): Promise<MoveClientExecuteResult> {
  const fn = httpsCallable<MoveClientExecuteRequest, MoveClientExecuteResult>(functions, 'moveClientToStudio')
  const res = await fn({ ...params, mode: 'execute' })
  return res.data
}

export const MOVE_CLIENT_CONFIRM_TEXT = 'SPOSTA CLIENTE'
