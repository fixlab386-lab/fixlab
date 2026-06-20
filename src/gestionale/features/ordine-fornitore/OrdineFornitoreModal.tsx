import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import {
  getCategories,
  getNextDocumentNumber,
} from '../../../lib/firestore'
import { loadSubjectDocuments, loadRecentProducts, loadRecentSuppliers } from '../../../lib/loadStudioCatalog'
import { callCommitDocumentWithFallback } from '../../../lib/commitDocument'
import { formatCallableError } from '../../../lib/cloudFunctions'
import { invalidateDashboardCache } from '../start/dashboardCache'
import { downloadHtmlAsPdf, printHtmlInIframe } from '../../../lib/printDocument'
import { CONFERMA_ORDINE_PRINT_CSS } from '../../../lib/confermaOrdineTemplate'
import { documentYearFromDate } from '../documenti'
import IncludiDocumentiDialog from '../documenti/dialogs/IncludiDocumentiDialog'
import { getIncludableDocuments, mergeIncludedRows, type InclusionMode } from '../documenti/inclusionUtils'
import type { Category, DocRecord, Product, Supplier } from '../../../types'
import { NUMERAZIONI, COMMENTI_INTERNI_PREDEFINITI } from '../vendita-banco/constants'
import { getCustomCommentiInterni, addCustomCommentoInterno } from '../../../lib/userPrefs'
import TabNote from '../vendita-banco/tabs/TabNote'
import TabIndirizzi from '../vendita-banco/tabs/TabIndirizzi'
import TabOpzioni from '../vendita-banco/tabs/TabOpzioni'
import FooterTotals from '../vendita-banco/FooterTotals'
import WinDropdownMenu from '../vendita-banco/WinDropdownMenu'
import { WinField, WinIconBtn, WinInput, WinSelect } from '../vendita-banco/WinControls'
import { formatDataIt, parseDataIt } from '../vendita-banco/utils'
import type { DocumentoVenditaBanco } from '../vendita-banco/types'
import type { StampaDocumentScope } from '../vendita-banco/dialogs/StampaDialog'
import { ORDINE_FORNITORE_TABS, STATI_ORDINE_FORNITORE, CONCLUDI_ORDINE_FORNITORE_ITEMS, CONCLUDI_ORDINE_FORNITORE_LABELS } from './constants'
import SelezioneFornitoreOrdineDialog, {
  type SelezioneFornitoreOrdineResult,
} from './dialogs/SelezioneFornitoreOrdineDialog'
import ConfermaConcludiOrdineDialog from '../ordine-cliente/dialogs/ConfermaConcludiOrdineDialog'
import StampaDialog from '../vendita-banco/dialogs/StampaDialog'
import type { StampaModello } from '../../../lib/stampaModelli'
import AnteprimaStampaDialog, { type AnteprimaStampaMeta } from '../vendita-banco/dialogs/AnteprimaStampaDialog'
import TabRigheOrdineCliente from '../ordine-cliente/tabs/TabRigheOrdineCliente'
import TabPagamentoOrdine from '../ordine-cliente/tabs/TabPagamentoOrdine'
import type { DocumentoOrdineCliente } from '../ordine-cliente/types'
import type { ConcludiOrdineFornitoreTarget, DocumentoOrdineFornitore, TabOrdineFornitoreId } from './types'
import {
  buildDocumentoFornitoreSeedFromOrdine,
} from '../documento-fornitore/utils'
import {
  buildOrdineFornitorePayload,
  createInitialOrdineFornitore,
  documentRowToRigaOrdine,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
  ordineFornitoreToClienteShape,
  patchFromClienteShape,
  rigaOrdineToDocumentRow,
  supplierToOrdineFornitore,
} from './utils'
import { docRecordToOrdineFornitore } from '../../lib/docRecordLoaders'
import { buildOrdineFornitorePrintContent } from './ordineFornitorePrint'
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

function ordineAsVenditaTabs(doc: DocumentoOrdineFornitore): DocumentoVenditaBanco {
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

export default function OrdineFornitoreModal() {
  const { studioId, loading: studioLoading } = useActiveStudio()
  const {
    ordineFornitoreOpen,
    ordineFornitorePreset,
    ordineFornitoreEditId,
    closeOrdineFornitore,
    openDocumentoFornitore,
  } = useAppWindows()

  const [docState, setDocState] = useState<DocumentoOrdineFornitore>(createInitialOrdineFornitore)
  const [activeTab, setActiveTab] = useState<TabOrdineFornitoreId>('righe')
  const [minimized, setMinimized] = useState(false)
  const [showSelezioneFornitore, setShowSelezioneFornitore] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [showConfermaConcludi, setShowConfermaConcludi] = useState(false)
  const [pendingConcludi, setPendingConcludi] = useState<ConcludiOrdineFornitoreTarget | null>(null)
  const [showStampa, setShowStampa] = useState(false)
  const [showAnteprima, setShowAnteprima] = useState(false)
  const [anteprimaHtml, setAnteprimaHtml] = useState('')
  const [anteprimaMeta, setAnteprimaMeta] = useState<AnteprimaStampaMeta | null>(null)
  const [anteprimaCopie, setAnteprimaCopie] = useState(1)
  const [showIncludi, setShowIncludi] = useState(false)
  const [includiDocs, setIncludiDocs] = useState<DocRecord[]>([])
  const [includiLoading, setIncludiLoading] = useState(false)
  const [includiCount, setIncludiCount] = useState(0)
  const [studioData, setStudioData] = useState<Record<string, unknown> | null>(null)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const appliedPresetRef = useRef(false)

  const patchDoc = useCallback((patch: Partial<DocumentoOrdineFornitore>) => {
    setDocState(prev => ({ ...prev, ...patch }))
  }, [])

  const patchFromClienteTabs = useCallback(
    (patch: Partial<DocumentoOrdineCliente>) => {
      patchDoc(patchFromClienteShape(patch))
    },
    [patchDoc],
  )

  const reset = useCallback(() => {
    setDocState(createInitialOrdineFornitore())
    setActiveTab('righe')
    setMinimized(false)
    setShowSelezioneFornitore(true)
    setLoadError(null)
    setActionMessage(null)
    setShowConfermaConcludi(false)
    setPendingConcludi(null)
    setSaving(false)
    setShowStampa(false)
    setShowAnteprima(false)
    setAnteprimaHtml('')
    setAnteprimaMeta(null)
    setShowIncludi(false)
    setIncludiDocs([])
    setIncludiCount(0)
    setStudioData(null)
    setSavedDocumentId(null)
    setSavedSnapshot(null)
  }, [])

  useEffect(() => {
    if (!ordineFornitoreOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [ordineFornitoreOpen])

  useEffect(() => {
    if (!ordineFornitoreOpen) {
      appliedPresetRef.current = false
      setSavedSnapshot(null)
      return
    }
    if (!ordineFornitoreEditId) {
      reset()
    }
  }, [ordineFornitoreOpen, ordineFornitoreEditId, reset])

  useEffect(() => {
    if (!ordineFornitoreOpen || !ordineFornitoreEditId) return
    setShowSelezioneFornitore(false)
    setLoadError(null)
    void getDoc(doc(db, 'documents', ordineFornitoreEditId)).then(snap => {
      if (!snap.exists()) {
        setLoadError('Documento non trovato.')
        return
      }
      const record = { id: snap.id, ...(snap.data() as DocRecord) }
      setDocState(docRecordToOrdineFornitore(record))
      setSavedDocumentId(record.id)
      setSavedSnapshot(null)
    })
  }, [ordineFornitoreOpen, ordineFornitoreEditId])

  useEffect(() => {
    if (
      !ordineFornitoreOpen ||
      appliedPresetRef.current ||
      !ordineFornitorePreset?.supplierId ||
      suppliers.length === 0
    ) {
      return
    }
    const supplier = suppliers.find(s => s.id === ordineFornitorePreset.supplierId)
    if (!supplier) return
    appliedPresetRef.current = true
    patchDoc(
      supplierToOrdineFornitore(supplier, ordineFornitorePreset.destinazioneMerceId) as Partial<DocumentoOrdineFornitore>,
    )
    setShowSelezioneFornitore(false)
  }, [ordineFornitoreOpen, ordineFornitorePreset, suppliers, patchDoc])

  useEffect(() => {
    if (!ordineFornitoreOpen || !studioId) return
    void Promise.all([loadRecentSuppliers(studioId), loadRecentProducts(studioId), getCategories(studioId)]).then(
      ([s, p, cats]) => {
        setSuppliers(s)
        setProducts(p)
        setCategories(cats)
      },
    )
    if (!ordineFornitoreEditId) {
      const today = new Date().toISOString().slice(0, 10)
      void getNextDocumentNumber(studioId, 'ordine_fornitore', documentYearFromDate(today)).then(num =>
        patchDoc({ data: today, numero: num }),
      )
    }
    void getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as Record<string, unknown>)
    })
  }, [ordineFornitoreOpen, studioId, ordineFornitoreEditId, patchDoc])

  useEffect(() => {
    if (!studioId || !docState.fornitore.id) {
      setIncludiCount(0)
      return
    }
    void loadSubjectDocuments(studioId, docState.fornitore.id, 200).then(all => {
      const docs = getIncludableDocuments(all, 'ordine_fornitore', docState.fornitore.id, 'supplier')
      setIncludiCount(docs.length)
    })
  }, [studioId, docState.fornitore.id])

  const activeRighe = useMemo(
    () => docState.righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota'),
    [docState.righe],
  )

  const totals = useMemo(
    () => documentTotalsFromRigheOrdine(docState.righe, docState.speseImporto, docState.speseIva),
    [docState.righe, docState.speseImporto, docState.speseIva],
  )

  const docWithTotals = useMemo(
    () => ({ ...docState, ...totals }),
    [docState, totals],
  )

  const isDirty = useMemo(
    () => isDocumentStateDirty(docWithTotals, savedSnapshot),
    [docWithTotals, savedSnapshot],
  )

  useEffect(() => {
    if (ordineFornitoreOpen && savedSnapshot === null) {
      setSavedSnapshot(snapshotDocumentState(docWithTotals))
    }
  }, [ordineFornitoreOpen, docWithTotals, savedSnapshot])

  const clienteShape = useMemo(
    () => ordineFornitoreToClienteShape(docWithTotals),
    [docWithTotals],
  )

  const commentiItems = useMemo(
    () => [...COMMENTI_INTERNI_PREDEFINITI, ...getCustomCommentiInterni(), 'Personalizza…'],
    [],
  )

  const handleSupplierConfirm = useCallback(
    (result: SelezioneFornitoreOrdineResult) => {
      patchDoc(
        supplierToOrdineFornitore(result.supplier, result.destinazioneMerceId) as Partial<DocumentoOrdineFornitore>,
      )
      setShowSelezioneFornitore(false)
    },
    [patchDoc],
  )

  const handleRecalcTotals = () => {
    patchDoc(totals)
    setActionMessage('Totali aggiornati.')
    window.setTimeout(() => setActionMessage(null), 2000)
  }

  const saveOrdine = async (
    status: DocumentoOrdineFornitore['stato'] = docState.stato,
    doc: DocumentoOrdineFornitore = docWithTotals,
  ): Promise<{ savedDoc: DocumentoOrdineFornitore; documentId: string }> => {
    if (!studioId) throw new Error('Archivio non disponibile.')
    if (!doc.fornitore.id) throw new Error('Seleziona un fornitore.')
    const docTotals = documentTotalsFromRigheOrdine(doc.righe, doc.speseImporto, doc.speseIva)
    const righe = doc.righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    const payload = buildOrdineFornitorePayload({ ...doc, ...docTotals }, studioId, righe, docTotals, status)
    const result = await callCommitDocumentWithFallback({
      documentId: savedDocumentId || undefined,
      document: payload,
      assignNumber: !savedDocumentId,
    })
    setSavedDocumentId(result.documentId)
    const savedDoc = { ...doc, ...docTotals, numero: result.number, stato: status }
    patchDoc({ numero: result.number, stato: status })
    setSavedSnapshot(snapshotDocumentState(savedDoc))
    invalidateDashboardCache(studioId)
    if (result.usedLocalFallback) {
      setActionMessage('Ordine salvato (modalità locale).')
      window.setTimeout(() => setActionMessage(null), 3000)
    }
    return { savedDoc, documentId: result.documentId }
  }

  const buildPrintDoc = useCallback(
    (modello?: StampaModello) => {
      if (!studioId) throw new Error('Archivio non disponibile.')
      return buildOrdineFornitorePrintContent(docWithTotals, studioId, activeRighe, studioData, modello)
    },
    [studioId, docWithTotals, activeRighe, studioData],
  )

  const handleStampaOpen = useCallback(() => {
    if (activeRighe.length === 0) {
      alert('Aggiungi almeno una riga prima di stampare.')
      return
    }
    const now = new Date().toLocaleString('it-IT')
    patchDoc({ dataOraStampa: now })
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

  const handleStampaPreview = useCallback(
    (copie: number, modello?: StampaModello) => {
      openAnteprima(copie, modello)
    },
    [openAnteprima],
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

  const openIncludiDialog = useCallback(async () => {
    if (!studioId) return
    if (!docState.fornitore.id) {
      alert('Seleziona un fornitore per includere documenti.')
      return
    }
    setShowIncludi(true)
    setIncludiLoading(true)
    try {
      const all = await loadSubjectDocuments(studioId, docState.fornitore.id, 200)
      const docs = getIncludableDocuments(all, 'ordine_fornitore', docState.fornitore.id, 'supplier')
      setIncludiDocs(docs)
      setIncludiCount(docs.length)
      if (docs.length === 0) {
        alert('Nessun preventivo includibile per questo fornitore.')
        setShowIncludi(false)
      }
    } finally {
      setIncludiLoading(false)
    }
  }, [studioId, docState.fornitore.id])

  const handleIncludiInclude = useCallback(
    (
      included: DocRecord,
      mode: InclusionMode,
      options: { copyPayment: boolean; copyNotes: boolean; copyShipping: boolean; copyDestination: boolean },
    ) => {
      const existingRows = activeRighe.map(rigaOrdineToDocumentRow)
      const merged = mergeIncludedRows(existingRows, included, mode)
      const newRighe = merged.map(documentRowToRigaOrdine)
      if (!newRighe.some(r => !r.descrizione.trim())) {
        newRighe.push(emptyRigaOrdine())
      }

      const note = `Incluso ${included.fullNumber} del ${formatDataIt(included.date)}`
      const patch: Partial<DocumentoOrdineFornitore> = { righe: newRighe }

      if (options.copyPayment) {
        if (included.paymentMethod) patch.tipoPagamento = included.paymentMethod
        if (included.paymentNotes) patch.acconto = included.paymentNotes
      }
      if (options.copyNotes && included.internalNotes) {
        patch.commentoInterno = docState.commentoInterno
          ? `${docState.commentoInterno}\n${included.internalNotes}`
          : included.internalNotes
      }
      patch.noteFine = docState.noteFine ? `${docState.noteFine}\n${note}` : note

      if (options.copyShipping) {
        if (included.shippingDescription) patch.speseTipo = included.shippingDescription
        if (included.shippingCost != null) patch.speseImporto = included.shippingCost
        if (included.shippingVatRate != null) patch.speseIva = included.shippingVatRate
      }
      if (options.copyDestination && included.deliveryAddress) {
        patch.destinazione = {
          indirizzo: included.deliveryAddress,
          cap: included.deliveryCap || '',
          citta: included.deliveryCity || '',
          prov: included.deliveryProvince || '',
          nazione: 'Italia',
        }
      }

      patchDoc(patch)
      setShowIncludi(false)
      setIncludiDocs(prev => prev.filter(d => d.id !== included.id))
      setIncludiCount(c => Math.max(0, c - 1))
      setActionMessage(`Documento ${included.fullNumber} incluso.`)
      window.setTimeout(() => setActionMessage(null), 3000)
    },
    [activeRighe, docState.commentoInterno, docState.noteFine, patchDoc],
  )

  const handleConcludiTarget = (target: ConcludiOrdineFornitoreTarget) => {
    const item = CONCLUDI_ORDINE_FORNITORE_ITEMS.find(i => i.id === target)
    if (!item?.enabled) {
      setActionMessage(`${CONCLUDI_ORDINE_FORNITORE_LABELS[target]} — funzione non ancora disponibile.`)
      window.setTimeout(() => setActionMessage(null), 3500)
      return
    }
    if (!docState.fornitore.id) {
      setActionMessage('Seleziona un fornitore prima di concludere l\'ordine.')
      window.setTimeout(() => setActionMessage(null), 3500)
      setShowSelezioneFornitore(true)
      return
    }
    if (activeRighe.length === 0) {
      setActionMessage('Aggiungi almeno una riga prima di concludere l\'ordine.')
      window.setTimeout(() => setActionMessage(null), 3500)
      return
    }
    setPendingConcludi(target)
    setShowConfermaConcludi(true)
  }

  const handleConfermaConcludi = async (mettiQtaZero: boolean) => {
    const target = pendingConcludi
    setShowConfermaConcludi(false)
    setPendingConcludi(null)
    if (!target || !studioId) return

    setSaving(true)
    setLoadError(null)
    try {
      const { savedDoc, documentId: ordineId } = await saveOrdine('confirmed')
      if (target === 'arrivo_merce') {
        const seed = buildDocumentoFornitoreSeedFromOrdine(
          savedDoc,
          'arrivo_merce',
          mettiQtaZero,
          ordineId,
          'ordine_fornitore',
        )
        invalidateDashboardCache(studioId)
        closeOrdineFornitore()
        openDocumentoFornitore(seed)
      }
    } catch (e) {
      setLoadError(formatCallableError(e, 'Operazione non riuscita.'))
    } finally {
      setSaving(false)
    }
  }

  const patchFromVenditaTabs = (patch: Partial<DocumentoVenditaBanco>) => {
    const { righe: _righe, agente: _agente, seguiraDocVendita: _seg, protetto: _prot, ...rest } = patch
    patchDoc(patchFromClienteShape(rest as Partial<DocumentoOrdineCliente>))
  }

  const handleClose = useCallback(async () => {
    const needsPrompt = documentNeedsSaveOnClose(activeRighe.length > 0, savedDocumentId, isDirty)
    const outcome = await confirmSaveDocumentOnClose(needsPrompt, () => saveOrdine('confirmed'))
    if (outcome === 'close') {
      closeOrdineFornitore()
    } else if (needsPrompt) {
      setLoadError('Salvataggio non riuscito.')
    }
  }, [activeRighe.length, savedDocumentId, isDirty, closeOrdineFornitore])

  useEffect(() => {
    if (!ordineFornitoreOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !showSelezioneFornitore &&
        !showConfermaConcludi &&
        !showStampa &&
        !showAnteprima &&
        !showIncludi
      ) {
        void handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    ordineFornitoreOpen,
    showSelezioneFornitore,
    showConfermaConcludi,
    showStampa,
    showAnteprima,
    showIncludi,
    handleClose,
  ])

  if (!ordineFornitoreOpen) return null

  const studioReady = Boolean(studioId)
  const stampaScope = 'ordine_fornitore' as unknown as StampaDocumentScope

  return createPortal(
    <>
      {showSelezioneFornitore && studioId ? (
        <SelezioneFornitoreOrdineDialog
          studioId={studioId}
          suppliers={suppliers}
          onConfirm={handleSupplierConfirm}
          onClose={closeOrdineFornitore}
        />
      ) : null}

      {showConfermaConcludi && pendingConcludi ? (
        <ConfermaConcludiOrdineDialog
          documentLabel={CONCLUDI_ORDINE_FORNITORE_LABELS[pendingConcludi]}
          onConfirm={mettiQtaZero => void handleConfermaConcludi(mettiQtaZero)}
          onClose={() => {
            setShowConfermaConcludi(false)
            setPendingConcludi(null)
          }}
        />
      ) : null}

      {!showSelezioneFornitore ? (
        <div className="gestionale-mdi-backdrop vb-backdrop of-backdrop" role="dialog" aria-modal="true" aria-labelledby="of-title">
          <div
            className={`gestionale-mdi-window gestionale-mdi-window--ordine-fornitore of-window${minimized ? ' gestionale-mdi-window--minimized' : ''}`}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="gestionale-mdi-window__titlebar">
              <span className="gestionale-mdi-window__title-icon" aria-hidden="true">
                🏭
              </span>
              <span id="of-title" className="gestionale-mdi-window__title-text">
                Ordine fornitore
              </span>
              <button type="button" className="gestionale-mdi-window__title-btn" title="Minimizza" onClick={() => setMinimized(m => !m)}>
                ☐
              </button>
              <button
                type="button"
                className="gestionale-mdi-window__title-btn gestionale-mdi-window__title-btn--close"
                title="Chiudi"
                onClick={() => void handleClose()}
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
                        <WinField label="Fornitore" htmlFor="of-fornitore" className="vb-header-field--cliente">
                          <div className="vb-row">
                            <button
                              type="button"
                              className="vb-link vb-input--flex of-fornitore-link"
                              onClick={() => setShowSelezioneFornitore(true)}
                            >
                              {docState.fornitore.nome || 'Seleziona fornitore…'}
                            </button>
                            <WinIconBtn
                              title="Ricerca fornitori"
                              className="vb-icon-btn--binocular"
                              onClick={() => setShowSelezioneFornitore(true)}
                            >
                              🔭
                            </WinIconBtn>
                            <WinIconBtn title="Scheda fornitore">📁</WinIconBtn>
                          </div>
                        </WinField>

                        <WinField label="Data" htmlFor="of-data" className="vb-header-field--data">
                          <div className="vb-row">
                            <WinInput
                              id="of-data"
                              value={formatDataIt(docState.data)}
                              onChange={e => {
                                const iso = parseDataIt(e.target.value)
                                if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) patchDoc({ data: iso })
                              }}
                              placeholder="gg/mm/aaaa"
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

                        <WinField label="Numero" htmlFor="of-numero" className="vb-header-field--numero">
                          <WinInput
                            id="of-numero"
                            type="number"
                            min={1}
                            value={docState.numero}
                            onChange={e => patchDoc({ numero: parseInt(e.target.value, 10) || 1 })}
                          />
                        </WinField>

                        <WinField label="Numeraz." htmlFor="of-numeraz" className="vb-header-field--numeraz">
                          <WinSelect id="of-numeraz" value={docState.numerazione} onChange={e => patchDoc({ numerazione: e.target.value })}>
                            {NUMERAZIONI.map(n => (
                              <option key={n || 'default'} value={n}>
                                {n || '—'}
                              </option>
                            ))}
                          </WinSelect>
                        </WinField>
                      </div>

                      <div className="gestionale-mdi-window__tabs" role="tablist">
                        {ORDINE_FORNITORE_TABS.map(tab => (
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
                            showImpegnaColumn={false}
                            prezziIvati={clienteShape.prezziIvati ?? false}
                            onPrezziModeChange={ivati => patchFromClienteTabs({ prezziIvati: ivati })}
                            showCampiFE={false}
                            showUtilita={false}
                            onChange={patchFromClienteTabs}
                            onToast={msg => setActionMessage(msg)}
                            onIncludiDoc={() => void openIncludiDialog()}
                            onProductsChange={() => {
                              if (!studioId) return
                              void loadRecentProducts(studioId).then(setProducts)
                            }}
                          />
                        ) : null}
                        {activeTab === 'pagamento' ? (
                          <TabPagamentoOrdine doc={clienteShape} onChange={patchFromClienteTabs} showScadenzario={false} />
                        ) : null}
                        {activeTab === 'note' ? (
                          <TabNote doc={ordineAsVenditaTabs(docState)} onChange={patchFromVenditaTabs} />
                        ) : null}
                        {activeTab === 'indirizzi' ? (
                          <TabIndirizzi doc={ordineAsVenditaTabs(docState)} onChange={patchFromVenditaTabs} />
                        ) : null}
                        {activeTab === 'opzioni' ? (
                          <TabOpzioni doc={ordineAsVenditaTabs(docState)} onChange={patchFromVenditaTabs} />
                        ) : null}
                      </div>
                    </div>

                    <div className="vb-footer-row of-footer-row">
                      <div className="vb-footer-fields">
                        <WinField label="Stato" htmlFor="of-stato">
                          <WinSelect
                            id="of-stato"
                            value={docState.stato}
                            onChange={e => patchDoc({ stato: e.target.value as DocumentoOrdineFornitore['stato'] })}
                          >
                            {STATI_ORDINE_FORNITORE.map(s => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </WinSelect>
                        </WinField>

                        <WinField label="Commento ad uso interno" htmlFor="of-commento" className="vb-footer-field--commento">
                          <div className="vb-row">
                            <WinInput
                              id="of-commento"
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
                      <FooterTotals doc={ordineAsVenditaTabs(docWithTotals)} vociCount={activeRighe.length} onRefresh={handleRecalcTotals} />
                    </div>

                    <div className="gestionale-mdi-window__actionbar">
                      <button
                        type="button"
                        className="gestionale-mdi-window__action-btn"
                        onClick={handleStampaOpen}
                        disabled={saving}
                      >
                        🖨 Stampa
                      </button>

                      <WinDropdownMenu
                        className="of-includi-dropdown"
                        disabled={saving || !docState.fornitore.id}
                        label={`📥 Includi doc.${includiCount > 0 ? ` (${includiCount})` : ''}`}
                        items={[
                          {
                            id: 'preventivi',
                            label: `Preventivi fornitore (${includiCount})`,
                            disabled: includiCount === 0,
                            onClick: () => void openIncludiDialog(),
                          },
                        ]}
                      />

                      <WinDropdownMenu
                        className="of-concludi-dropdown"
                        disabled={saving}
                        label={
                          <span className="of-concludi-label">
                            <span aria-hidden="true">✓</span> Concludi ordine
                          </span>
                        }
                        items={CONCLUDI_ORDINE_FORNITORE_ITEMS.map(item => ({
                          id: item.id,
                          label: CONCLUDI_ORDINE_FORNITORE_LABELS[item.id],
                          disabled: !item.enabled,
                          onClick: () => handleConcludiTarget(item.id),
                        }))}
                      />

                      <div className="gestionale-mdi-window__action-spacer" />
                      <button type="button" className="gestionale-mdi-window__action-btn" title="Calcolatrice" disabled>
                        🧮
                      </button>
                      <button type="button" className="gestionale-mdi-window__action-btn" title="Aiuto" disabled>
                        ?
                      </button>
                      <button
                        type="button"
                        className="gestionale-mdi-window__action-btn gestionale-mdi-window__action-btn--close"
                        onClick={() => void handleClose()}
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
      ) : null}

      {studioReady && showStampa ? (
        <StampaDialog
          scope={stampaScope}
          studioData={studioData ?? undefined}
          onClose={() => setShowStampa(false)}
          onPreview={handleStampaPreview}
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
          title="Includi Preventivi fornitore"
          subtitle="Selezionare i documenti da includere"
          onInclude={handleIncludiInclude}
          onClose={() => setShowIncludi(false)}
        />
      ) : null}
    </>,
    document.body,
  )
}
