import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from './types'
import { IDLE_UPDATE_STATUS } from './types'

const AUTO_INSTALL_DELAY_MS = 4000

let currentStatus: UpdateStatus = { ...IDLE_UPDATE_STATUS }
let installRequested = false
let autoInstallTimer: ReturnType<typeof setTimeout> | null = null

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

function clearAutoInstallTimer(): void {
  if (autoInstallTimer != null) {
    clearTimeout(autoInstallTimer)
    autoInstallTimer = null
  }
}

function scheduleAutoInstall(getMainWindow: () => BrowserWindow | null): void {
  clearAutoInstallTimer()
  autoInstallTimer = setTimeout(() => {
    autoInstallTimer = null
    log('Auto-install timer elapsed')
    installPendingUpdate(getMainWindow)
  }, AUTO_INSTALL_DELAY_MS)
}

function closeAllWindows(): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.removeAllListeners('close')
    window.destroy()
  }
}

function installPendingUpdate(getMainWindow: () => BrowserWindow | null): void {
  clearAutoInstallTimer()

  if (installRequested) {
    log('Install already requested, skipping duplicate call')
    return
  }
  if (currentStatus.state !== 'downloaded') {
    log('Install requested but no downloaded update is ready', currentStatus.state)
    return
  }

  installRequested = true
  log('Installing pending update via quitAndInstall (silent + restart)')

  setImmediate(() => {
    app.removeAllListeners('window-all-closed')
    closeAllWindows()

    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(true, true)
      } catch (error) {
        log('quitAndInstall failed', error)
        installRequested = false
        return
      }

      setTimeout(() => {
        log('Force exit after quitAndInstall')
        app.exit(0)
      }, 5000)
    }, 400)
  })
}

export function registerUpdateIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('update:get-status', () => getUpdateStatus())
  ipcMain.handle('update:install', () => {
    log('Install requested from renderer')
    installPendingUpdate(getMainWindow)
  })
}

export function attachUpdateWindowListener(window: BrowserWindow): void {
  window.webContents.on('did-finish-load', () => {
    broadcastStatus(window, currentStatus)
    if (currentStatus.state === 'downloaded' && !installRequested) {
      scheduleAutoInstall(() => window)
    }
  })
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) {
    log('Skipped: development build (app.isPackaged = false)')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.autoRunAppAfterInstall = true

  autoUpdater.on('checking-for-update', () => {
    log('checking-for-update')
    setStatus(getMainWindow(), { state: 'checking', error: undefined })
  })

  autoUpdater.on('update-available', (info) => {
    log('update-available', info.version)
    clearAutoInstallTimer()
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
      version: currentStatus.version,
      progress: progress.percent,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('update-downloaded', info.version)
    installRequested = false
    setStatus(getMainWindow(), {
      state: 'downloaded',
      version: info.version,
      progress: 100,
      error: undefined,
    })
    scheduleAutoInstall(getMainWindow)
  })

  autoUpdater.on('error', (error) => {
    log('error', error)
    clearAutoInstallTimer()
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
