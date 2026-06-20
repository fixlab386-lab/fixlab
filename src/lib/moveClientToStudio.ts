import { functions } from '../firebase'
import { callCallableWithAuth } from './cloudFunctions'

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
  return callCallableWithAuth<MoveClientPreviewRequest, MoveClientPreviewResult>(functions, 'moveClientToStudio', {
    ...params,
    mode: 'preview',
  })
}

export async function executeMoveClientToStudio(
  params: Omit<MoveClientExecuteRequest, 'mode'>,
): Promise<MoveClientExecuteResult> {
  return callCallableWithAuth<MoveClientExecuteRequest, MoveClientExecuteResult>(functions, 'moveClientToStudio', {
    ...params,
    mode: 'execute',
  })
}

export const MOVE_CLIENT_CONFIRM_TEXT = 'SPOSTA CLIENTE'
