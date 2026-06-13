export type FixLabUpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface FixLabUpdateStatus {
  state: FixLabUpdateState
  version?: string
  progress?: number
  error?: string
}

export interface FixLabDesktopApi {
  isElectron: true
  getAppVersion: () => Promise<string>
  getUpdateStatus: () => Promise<FixLabUpdateStatus>
  onUpdateStatusChanged: (callback: (status: FixLabUpdateStatus) => void) => () => void
  installUpdate: () => Promise<void>
}

declare global {
  interface Window {
    fixlabDesktop?: FixLabDesktopApi
  }
}

export {}
