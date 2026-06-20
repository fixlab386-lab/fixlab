import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { registerSW } from 'virtual:pwa-register'
import type { FixLabUpdateStatus } from '../types/electron'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'web'
const IS_ELECTRON = import.meta.env.VITE_ELECTRON === 'true'

export type AppUpdateKind = 'web' | 'desktop' | null

export type AppUpdateBannerState = {
  visible: boolean
  kind: AppUpdateKind
  version: string | null
  message: string
  progress: number | null
  canApply: boolean
  applyLabel: string
}

type AppUpdateContextValue = {
  banner: AppUpdateBannerState
  applyUpdate: () => Promise<void>
  dismissBanner: () => void
  currentVersion: string
}

const idleBanner: AppUpdateBannerState = {
  visible: false,
  kind: null,
  version: null,
  message: '',
  progress: null,
  canApply: false,
  applyLabel: '',
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null)

function getDesktopApi() {
  return window.fixlabDesktop?.isElectron ? window.fixlabDesktop : null
}

function sessionDismissKey(version: string) {
  return `fixlab-update-dismiss:${version}`
}

function isDismissed(version: string) {
  try {
    return sessionStorage.getItem(sessionDismissKey(version)) === '1'
  } catch {
    return false
  }
}

function desktopBanner(status: FixLabUpdateStatus | null, dismissedVersion: string | null): AppUpdateBannerState {
  if (!status) return idleBanner

  const version = status.version ?? null

  if (status.state === 'available') {
    if (version && dismissedVersion === version) return idleBanner
    return {
      visible: true,
      kind: 'desktop',
      version,
      message: version
        ? `È disponibile FixLab ${version}. Download in corso…`
        : 'È disponibile un aggiornamento di FixLab.',
      progress: null,
      canApply: false,
      applyLabel: '',
    }
  }

  if (status.state === 'downloading') {
    const pct = status.progress != null ? Math.round(status.progress) : null
    return {
      visible: true,
      kind: 'desktop',
      version,
      message:
        pct != null
          ? `Download aggiornamento FixLab ${version ?? ''}… ${pct}%`
          : `Download aggiornamento FixLab ${version ?? ''}…`,
      progress: pct,
      canApply: false,
      applyLabel: '',
    }
  }

  if (status.state === 'downloaded') {
    if (version && dismissedVersion === version) return idleBanner
    return {
      visible: true,
      kind: 'desktop',
      version,
      message: version
        ? `FixLab ${version} pronto. Riavvio automatico tra pochi secondi…`
        : 'Aggiornamento pronto. Riavvio automatico tra pochi secondi…',
      progress: 100,
      canApply: true,
      applyLabel: 'Riavvia ora',
    }
  }

  return idleBanner
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [desktopStatus, setDesktopStatus] = useState<FixLabUpdateStatus | null>(null)
  const [webUpdateReady, setWebUpdateReady] = useState(false)
  const [webRemoteVersion, setWebRemoteVersion] = useState<string | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const webApplyRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const api = getDesktopApi()
    if (!api) return

    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let autoInstallTimer: number | undefined

    void (async () => {
      try {
        const status = await api.getUpdateStatus()
        if (!cancelled) setDesktopStatus(status)
      } catch {
        /* ignore */
      }
    })()

    unsubscribe = api.onUpdateStatusChanged(status => {
      if (cancelled) return
      setDesktopStatus(status)
      if (status.state === 'downloaded' && status.version) {
        if (autoInstallTimer != null) window.clearTimeout(autoInstallTimer)
        autoInstallTimer = window.setTimeout(() => {
          if (isDismissed(status.version!)) return
          void api.installUpdate()
        }, 4500)
      }
    })

    return () => {
      cancelled = true
      if (autoInstallTimer != null) window.clearTimeout(autoInstallTimer)
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (IS_ELECTRON) return

    let intervalId: number | undefined

    webApplyRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setWebUpdateReady(true)
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return
        void registration.update()
        intervalId = window.setInterval(() => {
          void registration.update()
        }, 90_000)
      },
    })

    return () => {
      if (intervalId != null) window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (IS_ELECTRON) return

    const checkRemoteVersion = async () => {
      try {
        const response = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as { version?: string }
        if (data.version && data.version !== APP_VERSION) {
          setWebRemoteVersion(data.version)
        }
      } catch {
        /* ignore offline / missing file */
      }
    }

    void checkRemoteVersion()
    const intervalId = window.setInterval(checkRemoteVersion, 120_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const banner = useMemo((): AppUpdateBannerState => {
    const desktop = desktopBanner(desktopStatus, dismissedVersion)
    if (desktop.visible) return desktop

    const webVersion = webRemoteVersion
    if (webUpdateReady) {
      if (webVersion && isDismissed(webVersion)) return idleBanner
      return {
        visible: true,
        kind: 'web',
        version: webVersion ?? APP_VERSION,
        message: webVersion
          ? `Nuova versione web FixLab ${webVersion} disponibile.`
          : 'Nuova versione web FixLab disponibile.',
        progress: null,
        canApply: true,
        applyLabel: 'Aggiorna ora',
      }
    }

    if (webVersion) {
      if (isDismissed(webVersion)) return idleBanner
      return {
        visible: true,
        kind: 'web',
        version: webVersion,
        message: `Nuova versione web FixLab ${webVersion} disponibile.`,
        progress: null,
        canApply: true,
        applyLabel: 'Aggiorna ora',
      }
    }

    return idleBanner
  }, [desktopStatus, dismissedVersion, webRemoteVersion, webUpdateReady])

  const applyUpdate = useCallback(async () => {
    const api = getDesktopApi()
    if (banner.kind === 'desktop' && banner.canApply && api) {
      await api.installUpdate()
      return
    }

    if (banner.kind === 'web') {
      const apply = webApplyRef.current
      if (apply) {
        await apply(true)
        return
      }
      window.location.reload()
    }
  }, [banner.canApply, banner.kind])

  const dismissBanner = useCallback(() => {
    const version = banner.version
    if (!version) return
    try {
      sessionStorage.setItem(sessionDismissKey(version), '1')
    } catch {
      /* ignore */
    }
    setDismissedVersion(version)
  }, [banner.version])

  const value = useMemo(
    () => ({
      banner,
      applyUpdate,
      dismissBanner,
      currentVersion: APP_VERSION,
    }),
    [applyUpdate, banner, dismissBanner],
  )

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
}

export function useAppUpdate() {
  const ctx = useContext(AppUpdateContext)
  if (!ctx) throw new Error('useAppUpdate must be used within AppUpdateProvider')
  return ctx
}
