import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type AppWindowsContextValue = {
  venditaBancoOpen: boolean
  openVenditaBanco: () => void
  closeVenditaBanco: () => void
}

const AppWindowsContext = createContext<AppWindowsContextValue | null>(null)

export function AppWindowsProvider({ children }: { children: ReactNode }) {
  const [venditaBancoOpen, setVenditaBancoOpen] = useState(false)

  const openVenditaBanco = useCallback(() => setVenditaBancoOpen(true), [])
  const closeVenditaBanco = useCallback(() => setVenditaBancoOpen(false), [])

  const value = useMemo(
    () => ({ venditaBancoOpen, openVenditaBanco, closeVenditaBanco }),
    [venditaBancoOpen, openVenditaBanco, closeVenditaBanco],
  )

  return <AppWindowsContext.Provider value={value}>{children}</AppWindowsContext.Provider>
}

export function useAppWindows(): AppWindowsContextValue {
  const ctx = useContext(AppWindowsContext)
  if (!ctx) throw new Error('useAppWindows must be used within AppWindowsProvider')
  return ctx
}
