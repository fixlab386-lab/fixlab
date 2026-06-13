export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateStatus {
  state: UpdateState
  version?: string
  progress?: number
  error?: string
}

export const IDLE_UPDATE_STATUS: UpdateStatus = { state: 'idle' }
