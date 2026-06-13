import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from './types'
import { IDLE_UPDATE_STATUS } from './types'

let currentStatus: UpdateStatus = { ...IDLE_UPDATE_STATUS }
let updateDialogVisible = false

function log(message: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.log(`[autoUpdater] ${message}`, detail)
    return
  }
  console.log(`[autoUpdater] ${message}`)
}

function broadcastStatus(window: BrowserWindow | null, status: UpdateStatus): void {
  window?.webContents.send('update:status-changed', status)
}

function setStatus(
  window: BrowserWindow | null,
  patch: Partial<UpdateStatus>,
): UpdateStatus {
  currentStatus = { ...currentStatus, ...patch }
  broadcastStatus(window, currentStatus)
  return currentStatus
}

export function getUpdateStatus(): UpdateStatus {
  return { ...currentStatus }
}

async function showUpdateReadyDialog(
  window: BrowserWindow | null,
  version: string,
): Promise<void> {
  if (!window || updateDialogVisible) return

  updateDialogVisible = true
  try {
    const { response } = await dialog.showMessageBox(window, {
      type: 'info',
      title: 'Aggiornamento disponibile',
      message: 'È disponibile un aggiornamento di FixLab.',
      detail: `Versione ${version} pronta. Riavviare ora per installarla?`,
      buttons: ['Riavvia ora', 'Più tardi'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })

    if (response === 0) {
      log('User chose to restart and install now')
      autoUpdater.quitAndInstall(false, true)
    } else {
      log('User chose to install on next restart (autoInstallOnAppQuit enabled)')
    }
  } finally {
    updateDialogVisible = false
  }
}

export function registerUpdateIpc(): void {
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('update:get-status', () => getUpdateStatus())
  ipcMain.handle('update:install', () => {
    log('Install requested from renderer')
    autoUpdater.quitAndInstall(false, true)
  })
}

export function attachUpdateWindowListener(window: BrowserWindow): void {
  window.webContents.on('did-finish-load', () => {
    broadcastStatus(window, currentStatus)
  })
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) {
    log('Skipped: development build (app.isPackaged = false)')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log('checking-for-update')
    setStatus(getMainWindow(), { state: 'checking', error: undefined })
  })

  autoUpdater.on('update-available', (info) => {
    log('update-available', info.version)
    setStatus(getMainWindow(), {
      state: 'available',
      version: info.version,
      progress: 0,
      error: undefined,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    log('update-not-available', info.version)
    setStatus(getMainWindow(), {
      state: 'not-available',
      version: info.version,
      error: undefined,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    log(`download-progress ${Math.round(progress.percent)}%`)
    setStatus(getMainWindow(), {
      state: 'downloading',
      progress: progress.percent,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('update-downloaded', info.version)
    setStatus(getMainWindow(), {
      state: 'downloaded',
      version: info.version,
      progress: 100,
      error: undefined,
    })
    void showUpdateReadyDialog(getMainWindow(), info.version)
  })

  autoUpdater.on('error', (error) => {
    log('error', error)
    setStatus(getMainWindow(), {
      state: 'error',
      error: error.message,
    })
  })

  setTimeout(() => {
    log('Starting checkForUpdates on app startup')
    void autoUpdater.checkForUpdates().catch((error: Error) => {
      log('checkForUpdates failed (app continues normally)', error.message)
      setStatus(getMainWindow(), {
        state: 'error',
        error: error.message,
      })
    })
  }, 3000)
}
