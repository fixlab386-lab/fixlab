import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ActiveDocumentType } from '../gestionale/features/documenti/constants'

type AppWindowsContextValue = {
  venditaBancoOpen: boolean
  openVenditaBanco: () => void
  closeVenditaBanco: () => void
  documentiOpen: boolean
  documentiType: ActiveDocumentType | null
  openDocumenti: (type?: ActiveDocumentType | null) => void
  closeDocumenti: () => void
  openDocumentiType: (type: ActiveDocumentType) => void
  backDocumentiHub: () => void
  archiviOpen: boolean
  openArchivi: () => void
  closeArchivi: () => void
}

const AppWindowsContext = createContext<AppWindowsContextValue | null>(null)

export function AppWindowsProvider({ children }: { children: ReactNode }) {
  const [venditaBancoOpen, setVenditaBancoOpen] = useState(false)
  const [documentiOpen, setDocumentiOpen] = useState(false)
  const [documentiType, setDocumentiType] = useState<ActiveDocumentType | null>(null)
  const [archiviOpen, setArchiviOpen] = useState(false)

  const openVenditaBanco = useCallback(() => setVenditaBancoOpen(true), [])
  const closeVenditaBanco = useCallback(() => setVenditaBancoOpen(false), [])

  const openDocumenti = useCallback((type?: ActiveDocumentType | null) => {
    if (type) {
      setDocumentiType(type)
      setDocumentiOpen(true)
    }
  }, [])

  const closeDocumenti = useCallback(() => {
    setDocumentiOpen(false)
    setDocumentiType(null)
  }, [])

  const openDocumentiType = useCallback((type: ActiveDocumentType) => {
    setDocumentiType(type)
    setDocumentiOpen(true)
  }, [])

  const backDocumentiHub = useCallback(() => setDocumentiType(null), [])

  const openArchivi = useCallback(() => setArchiviOpen(true), [])
  const closeArchivi = useCallback(() => setArchiviOpen(false), [])

  const value = useMemo(
    () => ({
      venditaBancoOpen,
      openVenditaBanco,
      closeVenditaBanco,
      documentiOpen,
      documentiType,
      openDocumenti,
      closeDocumenti,
      openDocumentiType,
      backDocumentiHub,
      archiviOpen,
      openArchivi,
      closeArchivi,
    }),
    [
      venditaBancoOpen,
      openVenditaBanco,
      closeVenditaBanco,
      documentiOpen,
      documentiType,
      openDocumenti,
      closeDocumenti,
      openDocumentiType,
      backDocumentiHub,
      archiviOpen,
      openArchivi,
      closeArchivi,
    ],
  )

  return <AppWindowsContext.Provider value={value}>{children}</AppWindowsContext.Provider>
}

export function useAppWindows(): AppWindowsContextValue {
  const ctx = useContext(AppWindowsContext)
  if (!ctx) throw new Error('useAppWindows must be used within AppWindowsProvider')
  return ctx
}
