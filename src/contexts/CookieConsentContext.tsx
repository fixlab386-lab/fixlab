import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

/** Increment when cookie / privacy policy changes materially → banner can reappear. */
export const COOKIE_CONSENT_STORAGE_KEY = 'fixlab_cookie_consent_v1'
export const COOKIE_CONSENT_POLICY_VERSION = 4

export type StoredConsent = {
  policyVersion: number
  /** Sempre true dopo salvataggio: servizi Firebase e funzionamento app. */
  necessary: true
  /** Tema, preferenze UI salvate in locale (localStorage). */
  functional: boolean
  /** Statistiche / strumenti di misurazione (es. analytics futuri). Attualmente non usati. */
  analytics: boolean
  savedAt: number
}

type CookieConsentContextValue = {
  /** null = utente non ha ancora salvato preferenze (mostra banner). */
  consent: StoredConsent | null
  /** Pannello “personalizza” o riapertura da footer. */
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  acceptNecessaryOnly: () => void
  acceptAll: () => void
  saveCustom: (functional: boolean, analytics: boolean) => void
  /** True se le preferenze funzionali consentono persistenza tema in localStorage. */
  functionalStorageAllowed: boolean
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

function readConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<StoredConsent>
    if (p.policyVersion !== COOKIE_CONSENT_POLICY_VERSION || p.necessary !== true) return null
    return {
      policyVersion: COOKIE_CONSENT_POLICY_VERSION,
      necessary: true,
      functional: !!p.functional,
      analytics: !!p.analytics,
      savedAt: typeof p.savedAt === 'number' ? p.savedAt : Date.now(),
    }
  } catch {
    return null
  }
}

function writeConsent(c: StoredConsent) {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredConsent | null>(() => readConsent())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const persist = useCallback((c: StoredConsent) => {
    writeConsent(c)
    setConsent(c)
    setSettingsOpen(false)
  }, [])

  const acceptNecessaryOnly = useCallback(() => {
    persist({
      policyVersion: COOKIE_CONSENT_POLICY_VERSION,
      necessary: true,
      functional: false,
      analytics: false,
      savedAt: Date.now(),
    })
  }, [persist])

  const acceptAll = useCallback(() => {
    persist({
      policyVersion: COOKIE_CONSENT_POLICY_VERSION,
      necessary: true,
      functional: true,
      analytics: true,
      savedAt: Date.now(),
    })
  }, [persist])

  const saveCustom = useCallback(
    (functional: boolean, analytics: boolean) => {
      persist({
        policyVersion: COOKIE_CONSENT_POLICY_VERSION,
        necessary: true,
        functional,
        analytics,
        savedAt: Date.now(),
      })
    },
    [persist],
  )

  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const functionalStorageAllowed = consent?.functional ?? false

  const value = useMemo(
    () => ({
      consent,
      settingsOpen,
      openSettings,
      closeSettings,
      acceptNecessaryOnly,
      acceptAll,
      saveCustom,
      functionalStorageAllowed,
    }),
    [consent, settingsOpen, openSettings, closeSettings, acceptNecessaryOnly, acceptAll, saveCustom, functionalStorageAllowed],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider')
  return ctx
}
