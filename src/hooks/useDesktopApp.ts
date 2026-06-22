import { useCallback, useEffect, useState } from 'react'
import type { FixLabUpdateStatus } from '../types/electron'

const WEB_VERSION = import.meta.env.VITE_APP_VERSION ?? 'web'

function getDesktopApi() {
  return window.fixlabDesktop?.isElectron ? window.fixlabDesktop : null
}

export function useDesktopApp() {
  const [isDesktop, setIsDesktop] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<FixLabUpdateStatus | null>(null)

  useEffect(() => {
    const api = getDesktopApi()
    if (!api) {
      setIsDesktop(false)
      setVersion(WEB_VERSION)
      return
    }

    setIsDesktop(true)
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    void (async () => {
      try {
        const [appVersion, status] = await Promise.all([
          api.getAppVersion(),
          api.getUpdateStatus(),
        ])
        if (cancelled) return
        setVersion(appVersion)
        setUpdateStatus(status)
      } catch {
        if (!cancelled) setVersion(null)
      }
    })()

    unsubscribe = api.onUpdateStatusChanged((status) => {
      if (!cancelled) setUpdateStatus(status)
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const installUpdate = useCallback(async () => {
    const api = getDesktopApi()
    if (!api) return
    await api.installUpdate()
  }, [])

  const checkForUpdates = useCallback(async () => {
    const api = getDesktopApi()
    if (!api?.checkForUpdates) return null
    const status = await api.checkForUpdates()
    setUpdateStatus(status)
    return status
  }, [])

  return {
    isDesktop,
    version,
    updateStatus,
    installUpdate,
    checkForUpdates,
  }
}

export function formatUpdateStatusLabel(status: FixLabUpdateStatus | null): string | null {
  if (!status || status.state === 'idle' || status.state === 'not-available') return null
  if (status.state === 'checking') return 'Controllo aggiornamenti…'
  if (status.state === 'available') return `Aggiornamento ${status.version ?? ''} disponibile`
  if (status.state === 'downloading') {
    const pct = status.progress != null ? Math.round(status.progress) : null
    return pct != null ? `Download aggiornamento… ${pct}%` : 'Download aggiornamento…'
  }
  if (status.state === 'downloaded') {
    return `Aggiornamento ${status.version ?? ''} pronto — riavvia per installare`
  }
  if (status.state === 'error') {
    return status.error
      ? `Errore aggiornamento: ${status.error}`
      : 'Controllo aggiornamenti non riuscito'
  }
  if (status.state === 'not-available' && status.version) {
    return `Sei aggiornato (ultima release: ${status.version})`
  }
  return null
}
