import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initAutoUpdater, registerUpdateIpc, attachUpdateWindowListener } from './updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

function isOAuthPopupUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'accounts.google.com' ||
      hostname.endsWith('.google.com') ||
      hostname.endsWith('.firebaseapp.com') ||
      hostname.endsWith('.web.app')
    )
  } catch {
    return false
  }
}

function resolveAppIcon(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png')
  }
  return path.join(__dirname, '../build/icon.png')
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: 'FixLab',
    icon: resolveAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isOAuthPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          show: true,
          autoHideMenuBar: true,
          title: 'Accedi con Google',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        },
      }
    }
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const indexHtml = app.isPackaged
      ? path.join(app.getAppPath(), 'dist', 'index.html')
      : path.join(__dirname, '../dist/index.html')
    void mainWindow.loadFile(indexHtml)
  }

  attachUpdateWindowListener(mainWindow)
}

app.whenReady().then(() => {
  registerUpdateIpc(getMainWindow)
  createWindow()
  initAutoUpdater(getMainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
