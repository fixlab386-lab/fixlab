import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ActiveDocumentType } from '../gestionale/features/documenti/constants'
import type { AnalisiKind } from '../gestionale/features/analisi/analisiTypes'
import type { OpzioniTabId } from '../components/settings/opzioni/OpzioniApplicazioneShell'
import type { VenditaBancoSeed } from '../gestionale/features/vendita-banco/types'
import type { DocumentoClienteSeed, DocumentoClienteModalType } from '../gestionale/features/documento-cliente/types'
import type {
  DocumentoFornitoreSeed,
  DocumentoFornitoreModalType,
} from '../gestionale/features/documento-fornitore/types'

export type DocumentoClienteOpenOptions = {
  clientId?: string
  destinazioneMerceId?: string
}

export type OrdineClienteOpenOptions = {
  clientId?: string
  destinazioneMerceId?: string
  /** Precompila l'ordine dai dati del ticket riparazione e crea il collegamento al salvataggio. */
  repairId?: string
}

export type OrdineFornitoreOpenOptions = {
  supplierId?: string
  destinazioneMerceId?: string
}

export type DocumentoFornitoreOpenOptions = {
  supplierId?: string
  destinazioneMerceId?: string
}

type AppWindowsContextValue = {
  venditaBancoOpen: boolean
  venditaBancoSeed: VenditaBancoSeed | null
  venditaBancoEditId: string | null
  openVenditaBanco: (seed?: VenditaBancoSeed) => void
  openVenditaBancoEdit: (documentId: string) => void
  closeVenditaBanco: () => void
  ordineClienteOpen: boolean
  ordineClientePreset: OrdineClienteOpenOptions | null
  ordineClienteEditId: string | null
  openOrdineCliente: (options?: OrdineClienteOpenOptions) => void
  openOrdineClienteEdit: (documentId: string) => void
  closeOrdineCliente: () => void
  ordineFornitoreOpen: boolean
  ordineFornitorePreset: OrdineFornitoreOpenOptions | null
  ordineFornitoreEditId: string | null
  openOrdineFornitore: (options?: OrdineFornitoreOpenOptions) => void
  openOrdineFornitoreEdit: (documentId: string) => void
  closeOrdineFornitore: () => void
  documentoClienteOpen: boolean
  documentoClienteSeed: DocumentoClienteSeed | null
  documentoClienteNewType: DocumentoClienteModalType | null
  documentoClientePreset: DocumentoClienteOpenOptions | null
  documentoClienteEditId: string | null
  openDocumentoCliente: (seed: DocumentoClienteSeed) => void
  openDocumentoClienteNew: (type: DocumentoClienteModalType, options?: DocumentoClienteOpenOptions) => void
  openDocumentoClienteEdit: (documentId: string) => void
  closeDocumentoCliente: () => void
  documentoFornitoreOpen: boolean
  documentoFornitoreSeed: DocumentoFornitoreSeed | null
  documentoFornitoreNewType: DocumentoFornitoreModalType | null
  documentoFornitoreEditId: string | null
  documentoFornitorePreset: DocumentoFornitoreOpenOptions | null
  openDocumentoFornitore: (seed: DocumentoFornitoreSeed) => void
  openDocumentoFornitoreNew: (type: DocumentoFornitoreModalType, options?: DocumentoFornitoreOpenOptions) => void
  openDocumentoFornitoreEdit: (documentId: string) => void
  closeDocumentoFornitore: () => void
  documentiOpen: boolean
  documentiType: ActiveDocumentType | null
  openDocumenti: (type?: ActiveDocumentType | null) => void
  closeDocumenti: () => void
  openDocumentiType: (type: ActiveDocumentType) => void
  backDocumentiHub: () => void
  archiviOpen: boolean
  openArchivi: () => void
  closeArchivi: () => void
  opzioniOpen: boolean
  opzioniInitialTab: OpzioniTabId | null
  openOpzioni: (tab?: OpzioniTabId | null) => void
  closeOpzioni: () => void
  pagamentiRisorseOpen: boolean
  openPagamentiRisorse: () => void
  closePagamentiRisorse: () => void
  analisiOpen: boolean
  analisiKind: AnalisiKind
  openAnalisi: (kind?: AnalisiKind) => void
  closeAnalisi: () => void
  strumentiTabella: StrumentiTabellaKind | null
  openStrumentiTabella: (kind: StrumentiTabellaKind) => void
  closeStrumentiTabella: () => void
}

export type StrumentiTabellaKind = 'aliquote' | 'pagamenti' | 'conti'

const AppWindowsContext = createContext<AppWindowsContextValue | null>(null)

export function AppWindowsProvider({ children }: { children: ReactNode }) {
  const [venditaBancoOpen, setVenditaBancoOpen] = useState(false)
  const [venditaBancoSeed, setVenditaBancoSeed] = useState<VenditaBancoSeed | null>(null)
  const [venditaBancoEditId, setVenditaBancoEditId] = useState<string | null>(null)
  const [ordineClienteOpen, setOrdineClienteOpen] = useState(false)
  const [ordineClientePreset, setOrdineClientePreset] = useState<OrdineClienteOpenOptions | null>(null)
  const [ordineClienteEditId, setOrdineClienteEditId] = useState<string | null>(null)
  const [ordineFornitoreOpen, setOrdineFornitoreOpen] = useState(false)
  const [ordineFornitorePreset, setOrdineFornitorePreset] = useState<OrdineFornitoreOpenOptions | null>(null)
  const [ordineFornitoreEditId, setOrdineFornitoreEditId] = useState<string | null>(null)
  const [documentoClienteOpen, setDocumentoClienteOpen] = useState(false)
  const [documentoClienteSeed, setDocumentoClienteSeed] = useState<DocumentoClienteSeed | null>(null)
  const [documentoClienteNewType, setDocumentoClienteNewType] = useState<DocumentoClienteModalType | null>(null)
  const [documentoClientePreset, setDocumentoClientePreset] = useState<DocumentoClienteOpenOptions | null>(null)
  const [documentoClienteEditId, setDocumentoClienteEditId] = useState<string | null>(null)
  const [documentoFornitoreOpen, setDocumentoFornitoreOpen] = useState(false)
  const [documentoFornitoreSeed, setDocumentoFornitoreSeed] = useState<DocumentoFornitoreSeed | null>(null)
  const [documentoFornitoreNewType, setDocumentoFornitoreNewType] = useState<DocumentoFornitoreModalType | null>(null)
  const [documentoFornitoreEditId, setDocumentoFornitoreEditId] = useState<string | null>(null)
  const [documentoFornitorePreset, setDocumentoFornitorePreset] = useState<DocumentoFornitoreOpenOptions | null>(null)
  const [documentiOpen, setDocumentiOpen] = useState(false)
  const [documentiType, setDocumentiType] = useState<ActiveDocumentType | null>(null)
  const [archiviOpen, setArchiviOpen] = useState(false)
  const [opzioniOpen, setOpzioniOpen] = useState(false)
  const [opzioniInitialTab, setOpzioniInitialTab] = useState<OpzioniTabId | null>(null)
  const [pagamentiRisorseOpen, setPagamentiRisorseOpen] = useState(false)
  const [analisiOpen, setAnalisiOpen] = useState(false)
  const [analisiKind, setAnalisiKind] = useState<AnalisiKind>('vendite')
  const [strumentiTabella, setStrumentiTabella] = useState<StrumentiTabellaKind | null>(null)

  const openVenditaBanco = useCallback((seed?: VenditaBancoSeed) => {
    setVenditaBancoEditId(null)
    setVenditaBancoSeed(seed ?? null)
    setVenditaBancoOpen(true)
  }, [])
  const openVenditaBancoEdit = useCallback((documentId: string) => {
    setVenditaBancoSeed(null)
    setVenditaBancoEditId(documentId)
    setVenditaBancoOpen(true)
  }, [])
  const closeVenditaBanco = useCallback(() => {
    setVenditaBancoOpen(false)
    setVenditaBancoSeed(null)
    setVenditaBancoEditId(null)
  }, [])

  const openOrdineCliente = useCallback((options?: OrdineClienteOpenOptions) => {
    setOrdineClienteEditId(null)
    setOrdineClientePreset(options ?? null)
    setOrdineClienteOpen(true)
  }, [])
  const openOrdineClienteEdit = useCallback((documentId: string) => {
    setOrdineClientePreset(null)
    setOrdineClienteEditId(documentId)
    setOrdineClienteOpen(true)
  }, [])
  const closeOrdineCliente = useCallback(() => {
    setOrdineClienteOpen(false)
    setOrdineClientePreset(null)
    setOrdineClienteEditId(null)
  }, [])

  const openOrdineFornitore = useCallback((options?: OrdineFornitoreOpenOptions) => {
    setOrdineFornitoreEditId(null)
    setOrdineFornitorePreset(options ?? null)
    setOrdineFornitoreOpen(true)
  }, [])
  const openOrdineFornitoreEdit = useCallback((documentId: string) => {
    setOrdineFornitorePreset(null)
    setOrdineFornitoreEditId(documentId)
    setOrdineFornitoreOpen(true)
  }, [])
  const closeOrdineFornitore = useCallback(() => {
    setOrdineFornitoreOpen(false)
    setOrdineFornitorePreset(null)
    setOrdineFornitoreEditId(null)
  }, [])

  const openDocumentoCliente = useCallback((seed: DocumentoClienteSeed) => {
    setDocumentoClienteEditId(null)
    setDocumentoClienteNewType(null)
    setDocumentoClientePreset(null)
    setDocumentoClienteSeed(seed)
    setDocumentoClienteOpen(true)
  }, [])
  const openDocumentoClienteNew = useCallback(
    (type: DocumentoClienteModalType, options?: DocumentoClienteOpenOptions) => {
      setDocumentoClienteEditId(null)
      setDocumentoClienteSeed(null)
      setDocumentoClienteNewType(type)
      setDocumentoClientePreset(options ?? null)
      setDocumentoClienteOpen(true)
    },
    [],
  )
  const openDocumentoClienteEdit = useCallback((documentId: string) => {
    setDocumentoClienteSeed(null)
    setDocumentoClienteNewType(null)
    setDocumentoClientePreset(null)
    setDocumentoClienteEditId(documentId)
    setDocumentoClienteOpen(true)
  }, [])
  const closeDocumentoCliente = useCallback(() => {
    setDocumentoClienteOpen(false)
    setDocumentoClienteSeed(null)
    setDocumentoClienteNewType(null)
    setDocumentoClientePreset(null)
    setDocumentoClienteEditId(null)
  }, [])

  const openDocumentoFornitore = useCallback((seed: DocumentoFornitoreSeed) => {
    setDocumentoFornitoreEditId(null)
    setDocumentoFornitoreNewType(null)
    setDocumentoFornitorePreset(null)
    setDocumentoFornitoreSeed(seed)
    setDocumentoFornitoreOpen(true)
  }, [])
  const openDocumentoFornitoreNew = useCallback(
    (type: DocumentoFornitoreModalType, options?: DocumentoFornitoreOpenOptions) => {
      setDocumentoFornitoreEditId(null)
      setDocumentoFornitoreSeed(null)
      setDocumentoFornitoreNewType(type)
      setDocumentoFornitorePreset(options ?? null)
      setDocumentoFornitoreOpen(true)
    },
    [],
  )
  const openDocumentoFornitoreEdit = useCallback((documentId: string) => {
    setDocumentoFornitoreSeed(null)
    setDocumentoFornitoreNewType(null)
    setDocumentoFornitorePreset(null)
    setDocumentoFornitoreEditId(documentId)
    setDocumentoFornitoreOpen(true)
  }, [])
  const closeDocumentoFornitore = useCallback(() => {
    setDocumentoFornitoreOpen(false)
    setDocumentoFornitoreSeed(null)
    setDocumentoFornitoreNewType(null)
    setDocumentoFornitoreEditId(null)
    setDocumentoFornitorePreset(null)
  }, [])

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

  const openOpzioni = useCallback((tab?: OpzioniTabId | null) => {
    setOpzioniInitialTab(tab ?? null)
    setOpzioniOpen(true)
  }, [])

  const closeOpzioni = useCallback(() => {
    setOpzioniOpen(false)
    setOpzioniInitialTab(null)
  }, [])

  const openPagamentiRisorse = useCallback(() => setPagamentiRisorseOpen(true), [])
  const closePagamentiRisorse = useCallback(() => setPagamentiRisorseOpen(false), [])

  const openAnalisi = useCallback((kind: AnalisiKind = 'vendite') => {
    setAnalisiKind(kind)
    setAnalisiOpen(true)
  }, [])
  const closeAnalisi = useCallback(() => setAnalisiOpen(false), [])

  const openStrumentiTabella = useCallback((kind: StrumentiTabellaKind) => setStrumentiTabella(kind), [])
  const closeStrumentiTabella = useCallback(() => setStrumentiTabella(null), [])

  const value = useMemo(
    () => ({
      venditaBancoOpen,
      venditaBancoSeed,
      venditaBancoEditId,
      openVenditaBanco,
      openVenditaBancoEdit,
      closeVenditaBanco,
      ordineClienteOpen,
      ordineClientePreset,
      ordineClienteEditId,
      openOrdineCliente,
      openOrdineClienteEdit,
      closeOrdineCliente,
      ordineFornitoreOpen,
      ordineFornitorePreset,
      ordineFornitoreEditId,
      openOrdineFornitore,
      openOrdineFornitoreEdit,
      closeOrdineFornitore,
      documentoClienteOpen,
      documentoClienteSeed,
      documentoClienteNewType,
      documentoClientePreset,
      documentoClienteEditId,
      openDocumentoCliente,
      openDocumentoClienteNew,
      openDocumentoClienteEdit,
      closeDocumentoCliente,
      documentoFornitoreOpen,
      documentoFornitoreSeed,
      documentoFornitoreNewType,
      documentoFornitoreEditId,
      documentoFornitorePreset,
      openDocumentoFornitore,
      openDocumentoFornitoreNew,
      openDocumentoFornitoreEdit,
      closeDocumentoFornitore,
      documentiOpen,
      documentiType,
      openDocumenti,
      closeDocumenti,
      openDocumentiType,
      backDocumentiHub,
      archiviOpen,
      openArchivi,
      closeArchivi,
      opzioniOpen,
      opzioniInitialTab,
      openOpzioni,
      closeOpzioni,
      pagamentiRisorseOpen,
      openPagamentiRisorse,
      closePagamentiRisorse,
      analisiOpen,
      analisiKind,
      openAnalisi,
      closeAnalisi,
      strumentiTabella,
      openStrumentiTabella,
      closeStrumentiTabella,
    }),
    [
      venditaBancoOpen,
      venditaBancoSeed,
      venditaBancoEditId,
      openVenditaBanco,
      openVenditaBancoEdit,
      closeVenditaBanco,
      ordineClienteOpen,
      ordineClientePreset,
      ordineClienteEditId,
      openOrdineCliente,
      openOrdineClienteEdit,
      closeOrdineCliente,
      ordineFornitoreOpen,
      ordineFornitorePreset,
      ordineFornitoreEditId,
      openOrdineFornitore,
      openOrdineFornitoreEdit,
      closeOrdineFornitore,
      documentoClienteOpen,
      documentoClienteSeed,
      documentoClienteNewType,
      documentoClientePreset,
      documentoClienteEditId,
      openDocumentoCliente,
      openDocumentoClienteNew,
      openDocumentoClienteEdit,
      closeDocumentoCliente,
      documentoFornitoreOpen,
      documentoFornitoreSeed,
      documentoFornitoreNewType,
      documentoFornitoreEditId,
      documentoFornitorePreset,
      openDocumentoFornitore,
      openDocumentoFornitoreNew,
      openDocumentoFornitoreEdit,
      closeDocumentoFornitore,
      documentiOpen,
      documentiType,
      openDocumenti,
      closeDocumenti,
      openDocumentiType,
      backDocumentiHub,
      archiviOpen,
      openArchivi,
      closeArchivi,
      opzioniOpen,
      opzioniInitialTab,
      openOpzioni,
      closeOpzioni,
      pagamentiRisorseOpen,
      openPagamentiRisorse,
      closePagamentiRisorse,
      analisiOpen,
      analisiKind,
      openAnalisi,
      closeAnalisi,
      strumentiTabella,
      openStrumentiTabella,
      closeStrumentiTabella,
    ],
  )

  return <AppWindowsContext.Provider value={value}>{children}</AppWindowsContext.Provider>
}

export function useAppWindows(): AppWindowsContextValue {
  const ctx = useContext(AppWindowsContext)
  if (!ctx) throw new Error('useAppWindows must be used within AppWindowsProvider')
  return ctx
}
