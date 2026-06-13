import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { UpdateStatus } from './types'

const fixlabDesktop = {
  isElectron: true as const,
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:get-status'),
  onUpdateStatusChanged: (callback: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: UpdateStatus) => {
      callback(status)
    }
    ipcRenderer.on('update:status-changed', listener)
    return () => {
      ipcRenderer.removeListener('update:status-changed', listener)
    }
  },
  installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),
}

contextBridge.exposeInMainWorld('fixlabDesktop', fixlabDesktop)
