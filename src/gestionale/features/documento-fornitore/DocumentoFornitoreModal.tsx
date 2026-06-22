import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import { getCategories, getNextDocumentNumber, updateDocument, updateProduct } from '../../../lib/firestore'
import { loadRecentProducts, loadRecentSuppliers, loadSubjectDocuments } from '../../../lib/loadStudioCatalog'
import { callCommitDocumentWithFallback } from '../../../lib/commitDocument'
import { formatCallableError } from '../../../lib/cloudFunctions'
import { downloadHtmlAsPdf, printHtmlInIframe } from '../../../lib/printDocument'
import { invalidateDashboardCache } from '../start/dashboardCache'
import { defaultDocumentNumerazione, documentYearFromDate, documentYearFromNumerazione, DOCUMENT_TRANSFORM_MAP, getIncludableDocuments } from '../documenti'
import IncludiDocumentiDialog from '../documenti/dialogs/IncludiDocumentiDialog'
import { mergeIncludedRows, type InclusionMode } from '../documenti/inclusionUtils'
import type { ActiveDocumentType } from '../documenti/constants'
import type { Category, DocRecord, Product, Supplier } from '../../../types'
import NumerazioneSelect from '../shared/NumerazioneSelect'
import { COMMENTI_INTERNI_PREDEFINITI } from '../vendita-banco/constants'
import { getCustomCommentiInterni, addCustomCommentoInterno } from '../../../lib/userPrefs'
import TabNote from '../vendita-banco/tabs/TabNote'
import TabIndirizzi from '../vendita-banco/tabs/TabIndirizzi'
import TabOpzioni from '../vendita-banco/tabs/TabOpzioni'
import FooterTotals from '../vendita-banco/FooterTotals'
import WinDropdownMenu from '../vendita-banco/WinDropdownMenu'
import StampaDialog from '../vendita-banco/dialogs/StampaDialog'
import type { StampaModello } from '../../../lib/stampaModelli'
import AnteprimaStampaDialog, { type AnteprimaStampaMeta } from '../vendita-banco/dialogs/AnteprimaStampaDialog'
import { WinField, WinIconBtn, WinInput, WinSelect } from '../vendita-banco/WinControls'
import { formatDataIt, parseDataIt } from '../vendita-banco/utils'
import type { DocumentoVenditaBanco } from '../vendita-banco/types'
import type { StampaDocumentScope } from '../vendita-banco/dialogs/StampaDialog'
import TabRigheOrdineCliente from '../ordine-cliente/tabs/TabRigheOrdineCliente'
import TabPagamentoOrdine from '../ordine-cliente/tabs/TabPagamentoOrdine'
import type { DocumentoOrdineCliente } from '../ordine-cliente/types'
import SelezioneFornitoreOrdineDialog, {
  type SelezioneFornitoreOrdineResult,
} from '../ordine-fornitore/dialogs/SelezioneFornitoreOrdineDialog'
import {
  ordineFornitoreToClienteShape,
  patchFromClienteShape,
  supplierToOrdineFornitore,
  documentTotalsFromRigheOrdine,
  buildOrdineFornitorePayload,
} from '../ordine-fornitore/utils'
import {
  documentRowToRigaOrdine,
  emptyRigaOrdine,
  rigaOrdineToDocumentRow,
} from '../ordine-cliente/utils'
import {
  DOCUMENTO_FORNITORE_TITLES,
  caricaMagazzinoColumnLabel,
  showCaricaMagazzinoColumn,
  tabsForDocumentoFornitore,
  isActiveDocumentoFornitoreModalType,
} from './constants'
import {
  buildDocumentoFornitorePrintContent,
  CONFERMA_ORDINE_PRINT_CSS,
} from './documentoFornitorePrint'
import type { DocumentoFornitoreState, TabDocumentoFornitoreId } from './types'
import {
  buildDocumentoFornitorePayload,
  buildDocumentoFornitoreSeedFromOrdine,
  createDocumentoFornitoreFromSeed,
  createEmptyDocumentoFornitoreSeed,
  documentoFornitoreStateToOrdine,
} from './utils'
import { docRecordToDocumentoFornitoreState } from '../../lib/docRecordLoaders'
import {
  confirmSaveDocumentOnClose,
  documentNeedsSaveOnClose,
  isDocumentStateDirty,
  snapshotDocumentState,
} from '../../lib/confirmSaveOnClose'
import '../../../theme/gestionale-mdi-window.css'
import '../../../theme/gestionale-document-form.css'
import '../../theme/vendita-al-banco.css'
import '../../theme/ordine-cliente.css'
import '../../theme/ordine-fornitore.css'

function docAsVenditaTabs(doc: DocumentoFornitoreState): DocumentoVenditaBanco {
  return {
    cliente: doc.fornitore,
    agente: '(Nessuno)',
    listino: doc.listino,
    data: doc.data,
    numero: doc.numero,
    numerazione: doc.numerazione,
    seguiraDocVendita: false,
    righe: [],
    tipoPagamento: doc.tipoPagamento,
    campiLiberi: doc.campiLiberi,
    noteFine: doc.noteFine,
    intestatario: doc.intestatario,
    destinazione: doc.destinazione,
    dataOraStampa: doc.dataOraStampa,
    codLotteria: doc.codLotteria,
    rinnovo: doc.rinnovo,
    speseTipo: doc.speseTipo,
    speseIva: doc.speseIva,
    speseImporto: doc.speseImporto,
    commentoInterno: doc.commentoInterno,
    totNetto: doc.totNetto,
    totIva: doc.totIva,
    totaleDocumento: doc.totaleDocumento,
    protetto: false,
  }
}

export default function DocumentoFornitoreModal() {
  const navigate = useNavigate()
  const { studioId, loading: studioLoading } = useActiveStudio()
  const {
    documentoFornitoreOpen,
    documentoFornitoreSeed,
    documentoFornitoreNewType,
    documentoFornitoreEditId,
    documentoFornitorePreset,
    closeDocumentoFornitore,
    openDocumentoFornitore,
    openOrdineFornitoreEdit,
  } = useAppWindows()

  const [docState, setDocState] = useState<DocumentoFornitoreState | null>(null)
  const [activeTab, setActiveTab] = useState<TabDocumentoFornitoreId>('righe')
  const [minimized, setMinimized] = useState(false)
  const [showSelezioneFornitore, setShowSelezioneFornitore] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)

  const [showStampa, setShowStampa] = useState(false)
  const [showAnteprima, setShowAnteprima] = useState(false)
  const [anteprimaHtml, setAnteprimaHtml] = useState('')
  const [anteprimaMeta, setAnteprimaMeta] = useState<AnteprimaStampaMeta | null>(null)
  const [anteprimaCopie, setAnteprimaCopie] = useState(1)
  const [studioData, setStudioData] = useState<Record<string, unknown> | null>(null)
  const [showIncludi, setShowIncludi] = useState(false)
  const [includiDocs, setIncludiDocs] = useState<DocRecord[]>([])
  const [includiLoading, setIncludiLoading] = useState(false)
  const [includiCount, setIncludiCount] = useState(0)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const appliedPresetRef = useRef(false)

  const patchDoc = useCallback((patch: Partial<DocumentoFornitoreState>) => {
    setDocState(prev => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const patchFromClienteTabs = useCallback(
    (patch: Partial<DocumentoOrdineCliente>) => {
      patchDoc(patchFromClienteShape(patch) as Partial<DocumentoFornitoreState>)
    },
    [patchDoc],
  )

  const reset = useCallback(() => {
    setDocState(null)
    setActiveTab('righe')
    setMinimized(false)
    setLoadError(null)
    setActionMessage(null)
    setSaving(false)
    setSavedDocumentId(null)
    setSavedSnapshot(null)
    setShowStampa(false)
    setShowAnteprima(false)
    setShowIncludi(false)
    setIncludiDocs([])
    setIncludiCount(0)
    setStudioData(null)
    setShowSelezioneFornitore(false)
    setSuppliers([])
    appliedPresetRef.current = false
  }, [])

  useEffect(() => {
    if (!documentoFornitoreOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [documentoFornitoreOpen])

  useEffect(() => {
    if (!documentoFornitoreOpen) {
      reset()
      return
    }
    if (!studioId) return

    if (documentoFornitoreEditId) {
      reset()
      setShowSelezioneFornitore(false)
      void getDoc(doc(db, 'documents', documentoFornitoreEditId)).then(snap => {
        if (!snap.exists()) {
          setLoadError('Documento non trovato.')
          return
        }
        const record = { id: snap.id, ...(snap.data() as DocRecord) }
        const state = docRecordToDocumentoFornitoreState(record)
        if (!state) {
          setLoadError('Tipo documento non supportato.')
          return
        }
        setDocState(state)
        setSavedDocumentId(record.id)
        setSavedSnapshot(null)
      })
    } else if (documentoFornitoreSeed) {
      reset()
      setShowSelezioneFornitore(false)
      const today = documentoFornitoreSeed.data || new Date().toISOString().slice(0, 10)
      void getNextDocumentNumber(
        studioId,
        documentoFornitoreSeed.documentType,
        documentYearFromDate(today),
      ).then(num => {
        setDocState(createDocumentoFornitoreFromSeed(documentoFornitoreSeed, num))
      })
    } else if (documentoFornitoreNewType) {
      reset()
      if (documentoFornitorePreset?.supplierId) {
        setShowSelezioneFornitore(false)
      } else {
        setShowSelezioneFornitore(true)
      }
    }

    void Promise.all([loadRecentProducts(studioId), getCategories(studioId), loadRecentSuppliers(studioId)]).then(
      ([p, cats, s]) => {
        setProducts(p)
        setCategories(cats)
        setSuppliers(s)
      },
    )
    void getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as Record<string, unknown>)
    })
  }, [
    documentoFornitoreOpen,
    documentoFornitoreSeed,
    documentoFornitoreNewType,
    documentoFornitoreEditId,
    documentoFornitorePreset,
    studioId,
    reset,
  ])

  useEffect(() => {
    if (
      !documentoFornitoreOpen ||
      appliedPresetRef.current ||
      !documentoFornitoreNewType ||
      documentoFornitoreSeed ||
      documentoFornitoreEditId
    ) {
      return
    }
    if (documentoFornitorePreset?.supplierId && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === documentoFornitorePreset.supplierId)
      if (!supplier) return
      appliedPresetRef.current = true
      const partial = supplierToOrdineFornitore(supplier, documentoFornitorePreset.destinazioneMerceId)
      const seed = createEmptyDocumentoFornitoreSeed(documentoFornitoreNewType, {
        fornitore: partial.fornitore!,
        listino: partial.listino ?? 'Privati',
        intestatario: partial.intestatario!,
        destinazione: partial.destinazione!,
        tipoPagamento: partial.tipoPagamento ?? '',
        campiLiberi: partial.campiLiberi ?? ['', '', '', ''],
      })
      void getNextDocumentNumber(studioId!, documentoFornitoreNewType, documentYearFromDate(seed.data)).then(num => {
        setDocState(createDocumentoFornitoreFromSeed(seed, num))
      })
      return
    }
    if (!documentoFornitorePreset?.supplierId && showSelezioneFornitore) {
      return
    }
  }, [
    documentoFornitoreOpen,
    documentoFornitoreNewType,
    documentoFornitoreSeed,
    documentoFornitoreEditId,
    documentoFornitorePreset,
    suppliers,
    studioId,
    showSelezioneFornitore,
  ])

  const handleSupplierConfirm = useCallback(
    (result: SelezioneFornitoreOrdineResult) => {
      if (!studioId || !documentoFornitoreNewType) return
      const partial = supplierToOrdineFornitore(result.supplier, result.destinazioneMerceId)
      const seed = createEmptyDocumentoFornitoreSeed(documentoFornitoreNewType, {
        fornitore: partial.fornitore!,
        listino: partial.listino ?? 'Privati',
        intestatario: partial.intestatario!,
        destinazione: partial.destinazione!,
        tipoPagamento: partial.tipoPagamento ?? '',
        campiLiberi: partial.campiLiberi ?? ['', '', '', ''],
      })
      void getNextDocumentNumber(
        studioId,
        documentoFornitoreNewType,
        documentYearFromDate(seed.data),
      ).then(num => {
        setDocState(createDocumentoFornitoreFromSeed(seed, num))
        setShowSelezioneFornitore(false)
      })
    },
    [studioId, documentoFornitoreNewType],
  )

  const tabs = useMemo(
    () => (docState ? tabsForDocumentoFornitore(docState.documentType) : []),
    [docState],
  )

  const activeRighe = useMemo(
    () => docState?.righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota') ?? [],
    [docState?.righe],
  )

  const totals = useMemo(
    () =>
      docState
        ? documentTotalsFromRigheOrdine(docState.righe, docState.speseImporto, docState.speseIva)
        : { totNetto: 0, totIva: 0, totaleDocumento: 0 },
    [docState],
  )

  const docWithTotals = useMemo(
    () => (docState ? { ...docState, ...totals } : null),
    [docState, totals],
  )

  const isDirty = useMemo(
    () => isDocumentStateDirty(docWithTotals, savedSnapshot),
    [docWithTotals, savedSnapshot],
  )

  useEffect(() => {
    if (documentoFornitoreOpen && docWithTotals && savedSnapshot === null) {
      setSavedSnapshot(snapshotDocumentState(docWithTotals))
    }
  }, [documentoFornitoreOpen, docWithTotals, savedSnapshot])

  const clienteShape = useMemo(
    () => (docWithTotals ? ordineFornitoreToClienteShape(docWithTotals) : null),
    [docWithTotals],
  )

  const transforms = useMemo(
    () => (docState ? DOCUMENT_TRANSFORM_MAP[docState.documentType] || [] : []),
    [docState],
  )

  const isArrivoMerce = docState?.documentType === 'arrivo_merce'

  useEffect(() => {
    if (!documentoFornitoreOpen || !studioId || !docState?.fornitore.id || !isArrivoMerce) {
      setIncludiCount(0)
      return
    }
    void loadSubjectDocuments(studioId, docState.fornitore.id, 200).then(all => {
      const docs = getIncludableDocuments(all, 'arrivo_merce', docState.fornitore.id, 'supplier')
      setIncludiCount(docs.length)
    })
  }, [documentoFornitoreOpen, studioId, docState?.fornitore.id, isArrivoMerce])

  const openIncludiDialog = useCallback(async () => {
    if (!studioId || !docState?.fornitore.id) {
      alert('Seleziona un fornitore per includere documenti.')
      return
    }
    setShowIncludi(true)
    setIncludiLoading(true)
    try {
      const all = await loadSubjectDocuments(studioId, docState.fornitore.id, 200)
      const docs = getIncludableDocuments(all, 'arrivo_merce', docState.fornitore.id, 'supplier')
      setIncludiDocs(docs)
      setIncludiCount(docs.length)
      if (docs.length === 0) {
        alert('Nessun documento includibile per questo fornitore.')
        setShowIncludi(false)
      }
    } finally {
      setIncludiLoading(false)
    }
  }, [studioId, docState?.fornitore.id])

  const handleIncludiInclude = useCallback(
    (included: DocRecord, mode: InclusionMode) => {
      if (!docState) return
      const existingRows = activeRighe.map(rigaOrdineToDocumentRow)
      const merged = mergeIncludedRows(existingRows, included, mode)
      const newRighe = merged.map(documentRowToRigaOrdine)
      if (!newRighe.some(r => !r.descrizione.trim())) {
        newRighe.push(emptyRigaOrdine())
      }
      patchDoc({ righe: newRighe })
      setShowIncludi(false)
      setActionMessage(`Incluso ${included.fullNumber}.`)
      window.setTimeout(() => setActionMessage(null), 2500)
    },
    [docState, activeRighe, patchDoc],
  )

  const commentiItems = useMemo(
    () => [...COMMENTI_INTERNI_PREDEFINITI, ...getCustomCommentiInterni(), 'Personalizza…'],
    [],
  )

  const patchFromVenditaTabs = (patch: Partial<DocumentoVenditaBanco>) => {
    const { righe: _r, agente: _a, seguiraDocVendita: _s, protetto: _p, ...rest } = patch
    patchDoc(patchFromClienteShape(rest as Partial<DocumentoOrdineCliente>) as Partial<DocumentoFornitoreState>)
  }

  const handleRecalcTotals = () => {
    patchDoc(totals)
    setActionMessage('Totali aggiornati.')
    window.setTimeout(() => setActionMessage(null), 2000)
  }

  const handleSalva = useCallback(
    async (status: DocRecord['status'] = 'confirmed') => {
      if (!studioId || !docWithTotals) throw new Error('Archivio non disponibile.')
      if (!docWithTotals.fornitore.id) throw new Error('Fornitore mancante.')
      const payload = buildDocumentoFornitorePayload(docWithTotals, studioId, activeRighe, totals, status)
      const result = await callCommitDocumentWithFallback({
        documentId: savedDocumentId || undefined,
        document: payload,
        assignNumber: !savedDocumentId,
      })
      setSavedDocumentId(result.documentId)
      const savedDoc = { ...docWithTotals, numero: result.number, stato: status }
      patchDoc({ numero: result.number, stato: status })
      setSavedSnapshot(snapshotDocumentState(savedDoc))
      if (
        docWithTotals.linkedDocumentId &&
        docWithTotals.linkedDocumentType === 'ordine_fornitore' &&
        docWithTotals.documentType === 'arrivo_merce'
      ) {
        await updateDocument(docWithTotals.linkedDocumentId, {
          linkedDocumentId: result.documentId,
          linkedDocumentType: 'arrivo_merce',
          status: 'completed',
        })
      }
      invalidateDashboardCache(studioId)
      if (docWithTotals.documentType === 'arrivo_merce' && docWithTotals.aggiornaPrezzoFornitore) {
        await Promise.all(
          activeRighe
            .filter(r => r.productId && r.impegnaMagazzino && r.prezzoNetto > 0)
            .map(r => updateProduct(r.productId!, { purchasePrice: r.prezzoNetto })),
        )
      }
      const msg = result.usedLocalFallback
        ? 'Documento salvato (modalità locale).'
        : `Documento ${result.fullNumber} salvato.`
      setActionMessage(msg)
      return result.documentId
    },
    [studioId, docWithTotals, activeRighe, totals, savedDocumentId, patchDoc],
  )

  const handleGeneraDoc = useCallback(
    async (targetType: ActiveDocumentType) => {
      if (!docWithTotals) return
      setSaving(true)
      try {
        await handleSalva('confirmed')
        if (targetType === 'ordine_fornitore') {
          const ordineDoc = documentoFornitoreStateToOrdine(docWithTotals)
          const ordinePayload = buildOrdineFornitorePayload(ordineDoc, studioId!, activeRighe, totals, 'draft')
          const result = await callCommitDocumentWithFallback({
            document: { ...ordinePayload, type: 'ordine_fornitore', status: 'draft' },
            assignNumber: true,
          })
          closeDocumentoFornitore()
          openOrdineFornitoreEdit(result.documentId)
          return
        }
        if (isActiveDocumentoFornitoreModalType(targetType)) {
          const seed = buildDocumentoFornitoreSeedFromOrdine(
            documentoFornitoreStateToOrdine(docWithTotals),
            targetType,
            false,
          )
          closeDocumentoFornitore()
          openDocumentoFornitore(seed)
        }
      } catch (e) {
        setLoadError(formatCallableError(e, 'Generazione non riuscita.'))
      } finally {
        setSaving(false)
      }
    },
    [
      docWithTotals,
      handleSalva,
      studioId,
      activeRighe,
      totals,
      closeDocumentoFornitore,
      openDocumentoFornitore,
      openOrdineFornitoreEdit,
    ],
  )

  const buildPrintDoc = useCallback(
    (modello?: StampaModello) => {
      if (!studioId || !docWithTotals) throw new Error('Documento non pronto.')
      return buildDocumentoFornitorePrintContent(docWithTotals, studioId, activeRighe, studioData, modello)
    },
    [studioId, docWithTotals, activeRighe, studioData],
  )

  const handleStampaOpen = useCallback(() => {
    if (activeRighe.length === 0) {
      alert('Aggiungi almeno una riga prima di stampare.')
      return
    }
    patchDoc({ dataOraStampa: new Date().toLocaleString('it-IT') })
    setShowStampa(true)
  }, [activeRighe, patchDoc])

  const openAnteprima = useCallback(
    (copie: number, modello?: StampaModello) => {
      const { innerHtml, meta } = buildPrintDoc(modello)
      setAnteprimaHtml(innerHtml)
      setAnteprimaMeta(meta)
      setAnteprimaCopie(copie)
      setShowStampa(false)
      setShowAnteprima(true)
    },
    [buildPrintDoc],
  )

  const handleStampaPrint = useCallback(
    (copie: number, modello?: StampaModello) => {
      const { innerHtml, title } = buildPrintDoc(modello)
      for (let i = 0; i < Math.max(1, copie); i++) {
        printHtmlInIframe(innerHtml, title, CONFERMA_ORDINE_PRINT_CSS)
      }
      setShowStampa(false)
    },
    [buildPrintDoc],
  )

  const handleStampaPdf = useCallback(
    async (_copie: number, modello?: StampaModello) => {
      const { innerHtml, filename } = buildPrintDoc(modello)
      try {
        await downloadHtmlAsPdf(innerHtml, filename, CONFERMA_ORDINE_PRINT_CSS)
        setShowStampa(false)
      } catch {
        alert('Generazione PDF non riuscita.')
      }
    },
    [buildPrintDoc],
  )

  const handleClose = useCallback(async () => {
    const needsPrompt = documentNeedsSaveOnClose(activeRighe.length > 0, savedDocumentId, isDirty)
    const { closed, error } = await confirmSaveDocumentOnClose(needsPrompt, () => handleSalva('confirmed'))
    if (closed) {
      closeDocumentoFornitore()
    } else if (error) {
      setLoadError(error)
    }
  }, [activeRighe.length, savedDocumentId, isDirty, handleSalva, closeDocumentoFornitore])

  useEffect(() => {
    if (!documentoFornitoreOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showStampa && !showAnteprima && !showSelezioneFornitore && !showIncludi) {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [documentoFornitoreOpen, showStampa, showAnteprima, showSelezioneFornitore, showIncludi, handleClose])

  if (!documentoFornitoreOpen) return null

  if (showSelezioneFornitore && studioId) {
    return createPortal(
      <SelezioneFornitoreOrdineDialog
        studioId={studioId}
        suppliers={suppliers}
        onConfirm={handleSupplierConfirm}
        onClose={closeDocumentoFornitore}
      />,
      document.body,
    )
  }

  if (!docState || !docWithTotals || !clienteShape) return null

  const studioReady = Boolean(studioId)
  const title = DOCUMENTO_FORNITORE_TITLES[docState.documentType]
  const caricaLabel = caricaMagazzinoColumnLabel(docState.documentType)
  const caricaVisible = showCaricaMagazzinoColumn(docState.documentType)
  const stampaScope = docState.documentType as unknown as StampaDocumentScope

  return createPortal(
    <>
      <div className="gestionale-mdi-backdrop vb-backdrop of-backdrop df-backdrop" role="dialog" aria-modal="true">
        <div
          className={`gestionale-mdi-window gestionale-mdi-window--documento-fornitore df-window${isArrivoMerce ? ' gestionale-mdi-window--arrivo-merce am-window' : ''}${minimized ? ' gestionale-mdi-window--minimized' : ''}`}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="gestionale-mdi-window__titlebar">
            <span className="gestionale-mdi-window__title-icon" aria-hidden="true">
              {isArrivoMerce ? '📥' : '🏭'}
            </span>
            <span className="gestionale-mdi-window__title-text">{title}</span>
            <button type="button" className="gestionale-mdi-window__title-btn" title="Minimizza" onClick={() => setMinimized(m => !m)}>
              ☐
            </button>
            <button
              type="button"
              className="gestionale-mdi-window__title-btn gestionale-mdi-window__title-btn--close"
              title="Chiudi"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          {!minimized ? (
            <div className="gestionale-mdi-window__body">
              {!studioReady ? (
                <div className="gestionale-mdi-window__loading">
                  {studioLoading ? 'Caricamento archivio…' : 'Archivio non disponibile.'}
                </div>
              ) : (
                <>
                  {(loadError || actionMessage) && (
                    <div className="gestionale-mdi-window__banners">
                      {loadError ? (
                        <div className="gestionale-mdi-window__banner gestionale-mdi-window__banner--error">{loadError}</div>
                      ) : null}
                      {actionMessage ? (
                        <div className="gestionale-mdi-window__banner gestionale-mdi-window__banner--ok">{actionMessage}</div>
                      ) : null}
                    </div>
                  )}

                  <div className="gestionale-mdi-window__doc-shell">
                    <div className="vb-header-row vb-header-row--danea">
                      <WinField label={isArrivoMerce ? 'Soggetto' : 'Fornitore'} className="vb-header-field--cliente">
                        <div className="vb-row">
                          <button type="button" className="vb-link vb-input--flex of-fornitore-link" disabled={!isArrivoMerce}>
                            {docState.fornitore.nome}
                          </button>
                          {isArrivoMerce ? (
                            <WinIconBtn title="Cerca fornitore" onClick={() => setShowSelezioneFornitore(true)}>
                              🔍
                            </WinIconBtn>
                          ) : null}
                        </div>
                      </WinField>
                      <WinField label="Data" htmlFor="df-data" className="vb-header-field--data">
                        <div className="vb-row">
                          <WinInput
                            id="df-data"
                            value={formatDataIt(docState.data)}
                            onChange={e => {
                              const iso = parseDataIt(e.target.value)
                              if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) patchDoc({ data: iso })
                            }}
                          />
                          <input
                            ref={dateInputRef}
                            type="date"
                            className="vb-date-native"
                            value={docState.data}
                            onChange={e => patchDoc({ data: e.target.value })}
                            tabIndex={-1}
                            aria-hidden
                          />
                          <WinIconBtn title="Calendario" onClick={() => dateInputRef.current?.showPicker?.()}>
                            📅
                          </WinIconBtn>
                        </div>
                      </WinField>
                      <WinField label="Numero" htmlFor="df-numero" className="vb-header-field--numero">
                        <WinInput id="df-numero" type="number" min={1} value={docState.numero} readOnly />
                      </WinField>
                      <WinField label="Numeraz." htmlFor="df-numeraz" className="vb-header-field--numeraz">
                        <NumerazioneSelect
                          id="df-numeraz"
                          value={docState.numerazione}
                          date={docState.data}
                          onChange={numerazione => {
                            patchDoc({ numerazione })
                            if (!studioId || !docState.documentType) return
                            void getNextDocumentNumber(
                              studioId,
                              docState.documentType,
                              documentYearFromNumerazione(numerazione, docState.data),
                            ).then(num => patchDoc({ numero: num, numerazione }))
                          }}
                        />
                      </WinField>
                    </div>

                    {isArrivoMerce ? (
                      <div className="am-causale-row">
                        <WinField label="Causale di carico" htmlFor="am-causale" className="am-causale-field">
                          <WinInput
                            id="am-causale"
                            value={docState.causaleCarico || ''}
                            onChange={e => patchDoc({ causaleCarico: e.target.value })}
                          />
                        </WinField>
                      </div>
                    ) : null}

                    <div className="gestionale-mdi-window__tabs" role="tablist">
                      {tabs.map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === tab.id}
                          className={`gestionale-mdi-window__tab${activeTab === tab.id ? ' gestionale-mdi-window__tab--active' : ''}`}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="gestionale-mdi-window__panel gestionale-mdi-window__panel--doc" role="tabpanel">
                      {activeTab === 'righe' ? (
                        <TabRigheOrdineCliente
                          doc={clienteShape}
                          products={products}
                          categories={categories}
                          studioId={studioId}
                          impegnaColumnLabel={caricaLabel}
                          showImpegnaColumn={caricaVisible}
                          prezziIvati={clienteShape.prezziIvati ?? false}
                          onPrezziModeChange={ivati => patchFromClienteTabs({ prezziIvati: ivati })}
                          showCodProdFornitore={isArrivoMerce}
                          colonneDefault={isArrivoMerce ? { tagliaColore: false } : undefined}
                          righeHeaderExtra={
                            isArrivoMerce ? (
                              <div className="am-righe-options">
                                <label className="am-righe-options__check">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(docState.aggiornaPrezzoFornitore)}
                                    onChange={e => patchDoc({ aggiornaPrezzoFornitore: e.target.checked })}
                                  />
                                  Aggiorna anche il prezzo fornitore
                                </label>
                                <label className="am-righe-options__check">
                                  <input
                                    type="checkbox"
                                    checked={docState.seguiraRegFattura !== false}
                                    onChange={e => patchDoc({ seguiraRegFattura: e.target.checked })}
                                  />
                                  Seguirà reg. fattura
                                </label>
                              </div>
                            ) : undefined
                          }
                          onChange={patchFromClienteTabs}
                          onToast={msg => setActionMessage(msg)}
                          onIncludiDoc={isArrivoMerce ? () => void openIncludiDialog() : undefined}
                          onProductsChange={() => {
                            if (!studioId) return
                            void loadRecentProducts(studioId).then(setProducts)
                          }}
                        />
                      ) : null}
                      {activeTab === 'pagamento' ? (
                        <TabPagamentoOrdine doc={clienteShape} onChange={patchFromClienteTabs} />
                      ) : null}
                      {activeTab === 'note' ? (
                        <TabNote doc={docAsVenditaTabs(docWithTotals)} onChange={patchFromVenditaTabs} />
                      ) : null}
                      {activeTab === 'indirizzi' ? (
                        <TabIndirizzi doc={docAsVenditaTabs(docWithTotals)} onChange={patchFromVenditaTabs} />
                      ) : null}
                      {activeTab === 'opzioni' ? (
                        <TabOpzioni doc={docAsVenditaTabs(docWithTotals)} onChange={patchFromVenditaTabs} />
                      ) : null}
                    </div>
                  </div>

                  <div className="vb-footer-row of-footer-row">
                    <div className="vb-footer-fields">
                      <WinField label="Commento ad uso interno" htmlFor="df-commento" className="vb-footer-field--commento">
                        <div className="vb-row">
                          <WinInput
                            id="df-commento"
                            className="vb-input--flex"
                            value={docState.commentoInterno}
                            onChange={e => patchDoc({ commentoInterno: e.target.value })}
                          />
                          <WinDropdownMenu
                            label="▼"
                            items={commentiItems.map(label => ({
                              id: label,
                              label,
                              onClick: () => {
                                if (label === 'Personalizza…') {
                                  const text = window.prompt('Commento predefinito:')
                                  if (!text?.trim()) return
                                  addCustomCommentoInterno(text)
                                  patchDoc({ commentoInterno: text.trim() })
                                  return
                                }
                                patchDoc({ commentoInterno: label })
                              },
                            }))}
                          />
                        </div>
                      </WinField>
                    </div>
                    <FooterTotals doc={docAsVenditaTabs(docWithTotals)} vociCount={activeRighe.length} onRefresh={handleRecalcTotals} />
                  </div>

                  <div className="gestionale-mdi-window__actionbar">
                    <button type="button" className="gestionale-mdi-window__action-btn" onClick={handleStampaOpen} disabled={saving}>
                      🖨 Stampa
                    </button>
                    {isArrivoMerce ? (
                      <>
                        <button
                          type="button"
                          className="gestionale-mdi-window__action-btn"
                          disabled={saving || !docState.fornitore.id || includiCount === 0}
                          onClick={() => void openIncludiDialog()}
                        >
                          📥 Includi doc.{includiCount > 0 ? ` (${includiCount})` : ''}
                        </button>
                        <button
                          type="button"
                          className="gestionale-mdi-window__action-btn am-reg-fattura-btn"
                          disabled={saving || activeRighe.length === 0}
                          onClick={() => void handleGeneraDoc('reg_fattura_fornitore')}
                        >
                          📑 Reg. fattura
                        </button>
                      </>
                    ) : (
                      <>
                        {transforms.length > 0 ? (
                          <WinDropdownMenu
                            label="⚡ Genera doc."
                            disabled={saving}
                            items={transforms.map(t => ({
                              id: t.type,
                              label: t.label,
                              onClick: () => void handleGeneraDoc(t.type),
                            }))}
                          />
                        ) : null}
                        <button
                          type="button"
                          className="gestionale-mdi-window__action-btn"
                          title="Salva documento"
                          disabled={saving}
                          onClick={() =>
                            void handleSalva('confirmed').then(() => {
                              closeDocumentoFornitore()
                              navigate(`/documenti/tipo/${docState.documentType}`)
                            })
                          }
                        >
                          💾 Salva
                        </button>
                      </>
                    )}
                    <div className="gestionale-mdi-window__action-spacer" />
                    {isArrivoMerce ? (
                      <button type="button" className="gestionale-mdi-window__action-btn" title="Calcolatrice" disabled>
                        🧮
                      </button>
                    ) : null}
                    <button type="button" className="gestionale-mdi-window__action-btn" title="Aiuto" disabled>
                      ?
                    </button>
                    {isArrivoMerce ? (
                      <button
                        type="button"
                        className="gestionale-mdi-window__action-btn"
                        title="Salva"
                        disabled={saving}
                        onClick={() => void handleSalva('confirmed')}
                      >
                        ⚡
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="gestionale-mdi-window__action-btn gestionale-mdi-window__action-btn--close"
                      onClick={handleClose}
                    >
                      ✕ Chiudi
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {studioReady && showStampa && docState ? (
        <StampaDialog
          scope={stampaScope}
          studioData={studioData ?? undefined}
          onClose={() => setShowStampa(false)}
          onPreview={openAnteprima}
          onPrint={handleStampaPrint}
          onPdf={(copie, modello) => void handleStampaPdf(copie, modello)}
        />
      ) : null}

      {studioReady && showAnteprima && anteprimaMeta ? (
        <AnteprimaStampaDialog
          innerHtml={anteprimaHtml}
          meta={anteprimaMeta}
          initialCopie={anteprimaCopie}
          printCss={CONFERMA_ORDINE_PRINT_CSS}
          onClose={() => setShowAnteprima(false)}
        />
      ) : null}

      {studioReady && showIncludi ? (
        <IncludiDocumentiDialog
          documents={includiDocs}
          loading={includiLoading}
          title="Includi documenti fornitore"
          subtitle="Selezionare i documenti da includere nell'arrivo merce"
          onInclude={handleIncludiInclude}
          onClose={() => setShowIncludi(false)}
        />
      ) : null}
    </>,
    document.body,
  )
}
