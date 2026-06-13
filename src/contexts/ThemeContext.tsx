import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useCookieConsent } from './CookieConsentContext'

/** Tema fisso: solo chiaro (nessuna scelta utente). */
type Theme = 'light'

interface ThemeContextType {
  theme: Theme
  /** Mantenuto per compatibilità: ignorato, resta sempre chiaro. */
  setTheme: (t: 'dark' | 'light') => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const THEME_KEY = 'fixlab-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { functionalStorageAllowed } = useCookieConsent()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  useEffect(() => {
    try {
      if (functionalStorageAllowed) {
        localStorage.setItem(THEME_KEY, 'light')
      } else {
        localStorage.removeItem(THEME_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [functionalStorageAllowed])

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: 'light',
      setTheme: () => {
        document.documentElement.setAttribute('data-theme', 'light')
      },
      toggleTheme: () => {},
    }),
    [],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve essere usato dentro ThemeProvider')
  return ctx
}
