import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import {
  getCategories,
  getNextDocumentNumber,
} from '../../../lib/firestore'
import { loadRecentClients, loadSubjectDocuments, loadRecentPayments, loadRecentProducts } from '../../../lib/loadStudioCatalog'
import { callCommitDocumentWithFallback } from '../../../lib/commitDocument'
import { invalidateDashboardCache } from '../start/dashboardCache'
import { formatCallableError } from '../../../lib/cloudFunctions'
import { downloadHtmlAsPdf, printHtmlInIframe } from '../../../lib/printDocument'
import { resolvePresetClient } from '../../lib/resolvePresetClient'
import { documentYearFromDate, DOCUMENT_TRANSFORM_MAP } from '../documenti'
import IncludiDocumentiDialog from '../documenti/dialogs/IncludiDocumentiDialog'
import { getIncludableDocuments, mergeIncludedRows, type InclusionMode } from '../documenti/inclusionUtils'
import type { Category, Client, DocRecord, Payment, Product } from '../../../types'
import { NUMERAZIONI, COMMENTI_INTERNI_PREDEFINITI } from '../vendita-banco/constants'
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
import TabRigheOrdineCliente from '../ordine-cliente/tabs/TabRigheOrdineCliente'
import TabPagamentoOrdine from '../ordine-cliente/tabs/TabPagamentoOrdine'
import TabTrasportoOrdine from '../ordine-cliente/tabs/TabTrasportoOrdine'
import type { ColonnaRigheId } from '../vendita-banco/types'
import {
  documentRowToRigaOrdine,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
  rigaOrdineToDocumentRow,
  clientToOrdineCliente,
} from '../ordine-cliente/utils'
import SelezioneClienteOrdineDialog, {
  type SelezioneClienteOrdineResult,
} from '../ordine-cliente/dialogs/SelezioneClienteOrdineDialog'
import {
  DOCUMENTO_CLIENTE_TITLES,
  impegnaColumnLabel,
  showImpegnaColumn,
  showSeguiraDocVendita,
  tabsForDocumentoCliente,
} from './constants'
import {
  buildDocumentoClientePrintContent,
  CONFERMA_ORDINE_PRINT_CSS,
} from './documentoClientePrint'
import type { DocumentoClienteState, DocumentoClienteModalType, TabDocumentoClienteId } from './types'
import {
  buildDocumentoClientePayload,
  createDocumentoClienteFromSeed,
  createEmptyDocumentoClienteSeed,
  documentoClienteStateToOrdine,
  buildDocumentoSeedFromOrdine,
} from './utils'
import InviaArubaSdiButton from '../../../components/documents/InviaArubaSdiButton'
import { docRecordToDocumentoClienteState } from '../../lib/docRecordLoaders'
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
import '../../theme/ordine-cliente.css'

function docAsVenditaTabs(doc: DocumentoClienteState): DocumentoVenditaBanco {
  return {
    cliente: doc.cliente,
    agente: doc.agente,
    listino: doc.listino,
    data: doc.data,
    numero: doc.numero,
    numerazione: doc.numerazione,
    seguiraDocVendita: doc.seguiraDocVendita,
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

export default function DocumentoClienteModal() {
  const navigate = useNavigate()
  const { studioId, loading: studioLoading } = useActiveStudio()
  const {
    documentoClienteOpen,
    documentoClienteSeed,
    documentoClienteNewType,
    documentoClientePreset,
    documentoClienteEditId,
    closeDocumentoCliente,
    openDocumentoCliente,
  } = useAppWindows()

  const [docState, setDocState] = useState<DocumentoClienteState | null>(null)
  const [activeTab, setActiveTab] = useState<TabDocumentoClienteId>('righe')
  const [minimized, setMinimized] = useState(false)
  const [showSelezioneCliente, setShowSelezioneCliente] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [arubaDocMeta, setArubaDocMeta] = useState<{ status?: string; uploadFileName?: string }>({})

  const [showStampa, setShowStampa] = useState(false)
  const [showAnteprima, setShowAnteprima] = useState(false)
  const [anteprimaHtml, setAnteprimaHtml] = useState('')
  const [anteprimaMeta, setAnteprimaMeta] = useState<AnteprimaStampaMeta | null>(null)
  const [anteprimaCopie, setAnteprimaCopie] = useState(1)
  const [anteprimaCss, setAnteprimaCss] = useState<string>(CONFERMA_ORDINE_PRINT_CSS)
  const [showIncludi, setShowIncludi] = useState(false)
  const [includiDocs, setIncludiDocs] = useState<DocRecord[]>([])
  const [includiLoading, setIncludiLoading] = useState(false)
  const [includiCount, setIncludiCount] = useState(0)
  const [studioData, setStudioData] = useState<Record<string, unknown> | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const appliedPresetRef = useRef(false)

  const patchDoc = useCallback((patch: Partial<DocumentoClienteState>) => {
    setDocState(prev => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const reset = useCallback(() => {
    setDocState(null)
    setActiveTab('righe')
    setMinimized(false)
    setLoadError(null)
    setActionMessage(null)
    setSaving(false)
    setSavedDocumentId(null)
    setSavedSnapshot(null)
    setArubaDocMeta({})
    setShowStampa(false)
    setShowAnteprima(false)
    setShowIncludi(false)
    setIncludiDocs([])
    setIncludiCount(0)
    setStudioData(null)
    setShowSelezioneCliente(false)
    setClients([])
    setPayments([])
  }, [])

  useEffect(() => {
    if (!documentoClienteOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [documentoClienteOpen])

  useEffect(() => {
    if (!documentoClienteOpen) {
      reset()
      return
    }
    if (!studioId) return

    appliedPresetRef.current = false

    if (documentoClienteEditId) {
      reset()
      setShowSelezioneCliente(false)
      void getDoc(doc(db, 'documents', documentoClienteEditId)).then(snap => {
        if (!snap.exists()) {
          setLoadError('Documento non trovato.')
          return
        }
        const record = { id: snap.id, ...(snap.data() as DocRecord) }
        const state = docRecordToDocumentoClienteState(record)
        if (!state) {
          setLoadError('Tipo documento non supportato.')
          return
        }
        setDocState(state)
        setSavedDocumentId(record.id)
        setSavedSnapshot(null)
        setArubaDocMeta({
          status: record.aruba?.status,
          uploadFileName: record.aruba?.uploadFileName,
        })
      })
    } else if (documentoClienteSeed) {
      reset()
      setShowSelezioneCliente(false)
      const today = documentoClienteSeed.data || new Date().toISOString().slice(0, 10)
      void getNextDocumentNumber(
        studioId,
        documentoClienteSeed.documentType,
        documentYearFromDate(today),
      ).then(num => {
        setDocState(createDocumentoClienteFromSeed(documentoClienteSeed, num))
      })
    } else if (documentoClienteNewType) {
      reset()
      if (documentoClientePreset?.clientId) {
        setShowSelezioneCliente(false)
      } else {
        setShowSelezioneCliente(true)
      }
    }

    void Promise.all([
      loadRecentProducts(studioId),
      getCategories(studioId),
      loadRecentClients(studioId),
      loadRecentPayments(studioId),
    ]).then(([p, cats, c, pays]) => {
      setProducts(p)
      setCategories(cats)
      setClients(c)
      setPayments(pays)
    })
    void getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as Record<string, unknown>)
    })
  }, [
    documentoClienteOpen,
    documentoClienteSeed,
    documentoClienteNewType,
    documentoClientePreset,
    documentoClienteEditId,
    studioId,
    reset,
  ]  )

  useEffect(() => {
    if (
      !documentoClienteOpen ||
      appliedPresetRef.current ||
      !documentoClienteNewType ||
      documentoClienteSeed ||
      documentoClienteEditId
    ) {
      return
    }
    if (documentoClientePreset?.clientId) {
      if (appliedPresetRef.current) return
      appliedPresetRef.current = true
      void resolvePresetClient(documentoClientePreset.clientId, clients).then(client => {
        if (!client || !documentoClienteNewType) {
          appliedPresetRef.current = false
          return
        }
        const partial = clientToOrdineCliente(client, documentoClientePreset.destinazioneMerceId)
        const seed = createEmptyDocumentoClienteSeed(documentoClienteNewType, {
          cliente: partial.cliente!,
          listino: partial.listino ?? 'Privati',
          intestatario: partial.intestatario!,
          destinazione: partial.destinazione!,
          tipoPagamento: partial.tipoPagamento ?? '',
          campiLiberi: partial.campiLiberi ?? ['', '', '', ''],
        })
        void getNextDocumentNumber(studioId!, documentoClienteNewType, documentYearFromDate(seed.data)).then(num => {
          setDocState(createDocumentoClienteFromSeed(seed, num))
          setShowSelezioneCliente(false)
        })
      })
      return
    }
    if (!documentoClientePreset?.clientId && showSelezioneCliente) {
      return
    }
  }, [
    documentoClienteOpen,
    documentoClienteNewType,
    documentoClienteSeed,
    documentoClienteEditId,
    documentoClientePreset,
    clients,
    studioId,
    showSelezioneCliente,
  ])

  const handleClientConfirm = useCallback(
    (result: SelezioneClienteOrdineResult) => {
      if (!studioId || !documentoClienteNewType) return
      const partial = clientToOrdineCliente(result.client, result.destinazioneMerceId)
      const seed = createEmptyDocumentoClienteSeed(documentoClienteNewType, {
        cliente: partial.cliente!,
        listino: partial.listino ?? 'Privati',
        intestatario: partial.intestatario!,
        destinazione: partial.destinazione!,
        tipoPagamento: partial.tipoPagamento ?? '',
        campiLiberi: partial.campiLiberi ?? ['', '', '', ''],
      })
      void getNextDocumentNumber(
        studioId,
        documentoClienteNewType,
        documentYearFromDate(seed.data),
      ).then(num => {
        setDocState(createDocumentoClienteFromSeed(seed, num))
        setShowSelezioneCliente(false)
      })
    },
    [studioId, documentoClienteNewType],
  )

  const tabs = useMemo(
    () => (docState ? tabsForDocumentoCliente(docState.documentType) : []),
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
    if (documentoClienteOpen && docWithTotals && savedSnapshot === null) {
      setSavedSnapshot(snapshotDocumentState(docWithTotals))
    }
  }, [documentoClienteOpen, docWithTotals, savedSnapshot])

  const transforms = useMemo(
    () => (docState ? DOCUMENT_TRANSFORM_MAP[docState.documentType] || [] : []),
    [docState],
  )

  const commentiItems = useMemo(
    () => [...COMMENTI_INTERNI_PREDEFINITI, ...getCustomCommentiInterni(), 'Personalizza…'],
    [],
  )

  useEffect(() => {
    if (!studioId || !docState?.cliente.id) {
      setIncludiCount(0)
      return
    }
    void loadSubjectDocuments(studioId, docState.cliente.id, 200).then(all => {
      const docs = getIncludableDocuments(
        all,
        docState.documentType,
        docState.cliente.id,
        'client',
      )
      setIncludiCount(docs.length)
    })
  }, [studioId, docState?.cliente.id, docState?.documentType])

  const patchFromVenditaTabs = (patch: Partial<DocumentoVenditaBanco>) => {
    const { righe: _r, agente: _a, seguiraDocVendita: seg, protetto: _p, ...rest } = patch
    const next: Partial<DocumentoClienteState> = { ...rest } as Partial<DocumentoClienteState>
    if (seg !== undefined) next.seguiraDocVendita = seg
    patchDoc(next)
  }

  const handleRecalcTotals = () => {
    patchDoc(totals)
    setActionMessage('Totali aggiornati.')
    window.setTimeout(() => setActionMessage(null), 2000)
  }

  const handleSalva = useCallback(
    async (status: DocRecord['status'] = 'confirmed') => {
      if (!studioId || !docWithTotals) throw new Error('Archivio non disponibile.')
      if (!docWithTotals.cliente.id) throw new Error('Cliente mancante.')
      const payload = buildDocumentoClientePayload(docWithTotals, studioId, activeRighe, totals, status)
      const result = await callCommitDocumentWithFallback({
        documentId: savedDocumentId || undefined,
        document: payload,
        assignNumber: !savedDocumentId,
      })
      setSavedDocumentId(result.documentId)
      const savedDoc = { ...docWithTotals, numero: result.number, stato: status }
      patchDoc({ numero: result.number, stato: status })
      setSavedSnapshot(snapshotDocumentState(savedDoc))
      invalidateDashboardCache(studioId)
      const msg = result.usedLocalFallback
        ? 'Documento salvato (modalità locale).'
        : `Documento ${result.fullNumber} salvato.`
      setActionMessage(msg)
      return result.documentId
    },
    [studioId, docWithTotals, activeRighe, totals, savedDocumentId, patchDoc],
  )

  const handleGeneraDoc = useCallback(
    async (targetType: DocumentoClienteModalType) => {
      if (!docWithTotals) return
      setSaving(true)
      try {
        await handleSalva('confirmed')
        const seed = buildDocumentoSeedFromOrdine(
          documentoClienteStateToOrdine(docWithTotals),
          targetType,
          false,
        )
        seed.righe = docWithTotals.righe
        seed.seguiraDocVendita = docWithTotals.seguiraDocVendita
        closeDocumentoCliente()
        openDocumentoCliente(seed)
      } catch (e) {
        setLoadError(formatCallableError(e, 'Generazione non riuscita.'))
      } finally {
        setSaving(false)
      }
    },
    [docWithTotals, handleSalva, closeDocumentoCliente, openDocumentoCliente],
  )

  const buildPrintDoc = useCallback(
    (modello?: StampaModello) => {
      if (!studioId || !docWithTotals) throw new Error('Documento non pronto.')
      return buildDocumentoClientePrintContent(docWithTotals, studioId, activeRighe, studioData, modello)
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
      const { innerHtml, meta, css } = buildPrintDoc(modello)
      setAnteprimaHtml(innerHtml)
      setAnteprimaMeta(meta)
      setAnteprimaCss(css)
      setAnteprimaCopie(copie)
      setShowStampa(false)
      setShowAnteprima(true)
    },
    [buildPrintDoc],
  )

  const handleStampaPrint = useCallback(
    (copie: number, modello?: StampaModello) => {
      const { innerHtml, title, css } = buildPrintDoc(modello)
      for (let i = 0; i < Math.max(1, copie); i++) {
        printHtmlInIframe(innerHtml, title, css)
      }
      setShowStampa(false)
    },
    [buildPrintDoc],
  )

  const handleStampaPdf = useCallback(
    async (_copie: number, modello?: StampaModello) => {
      const { innerHtml, filename, css } = buildPrintDoc(modello)
      try {
        await downloadHtmlAsPdf(innerHtml, filename, css)
        setShowStampa(false)
      } catch {
        alert('Generazione PDF non riuscita.')
      }
    },
    [buildPrintDoc],
  )

  const openIncludiDialog = useCallback(async () => {
    if (!studioId || !docState?.cliente.id) return
    setShowIncludi(true)
    setIncludiLoading(true)
    try {
      const all = await loadSubjectDocuments(studioId, docState.cliente.id, 200)
      const docs = getIncludableDocuments(all, docState.documentType, docState.cliente.id, 'client')
      setIncludiDocs(docs)
      setIncludiCount(docs.length)
      if (docs.length === 0) {
        alert('Nessun documento includibile per questo cliente.')
        setShowIncludi(false)
      }
    } finally {
      setIncludiLoading(false)
    }
  }, [studioId, docState?.cliente.id, docState?.documentType])

  const handleIncludiInclude = useCallback(
    (
      included: DocRecord,
      mode: InclusionMode,
      options: { copyPayment: boolean; copyNotes: boolean; copyShipping: boolean; copyDestination: boolean },
    ) => {
      if (!docState) return
      const existingRows = activeRighe.map(rigaOrdineToDocumentRow)
      const merged = mergeIncludedRows(existingRows, included, mode)
      const newRighe = merged.map(documentRowToRigaOrdine)
      if (!newRighe.some(r => !r.descrizione.trim())) newRighe.push(emptyRigaOrdine())
      const note = `Incluso ${included.fullNumber} del ${formatDataIt(included.date)}`
      const patch: Partial<DocumentoClienteState> = { righe: newRighe }
      if (options.copyPayment && included.paymentMethod) patch.tipoPagamento = included.paymentMethod
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
      setIncludiCount(c => Math.max(0, c - 1))
      setActionMessage(`Documento ${included.fullNumber} incluso.`)
    },
    [activeRighe, docState, patchDoc],
  )

  const handleClose = useCallback(async () => {
    const needsPrompt = documentNeedsSaveOnClose(activeRighe.length > 0, savedDocumentId, isDirty)
    const outcome = await confirmSaveDocumentOnClose(needsPrompt, () => handleSalva('confirmed'))
    if (outcome === 'close') {
      closeDocumentoCliente()
    } else if (needsPrompt) {
      setLoadError('Salvataggio non riuscito.')
    }
  }, [activeRighe.length, savedDocumentId, isDirty, handleSalva, closeDocumentoCliente])

  useEffect(() => {
    if (!documentoClienteOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showStampa && !showAnteprima && !showIncludi) {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [documentoClienteOpen, showStampa, showAnteprima, showIncludi, handleClose])

  if (!documentoClienteOpen) return null

  if (showSelezioneCliente && studioId) {
    return createPortal(
      <SelezioneClienteOrdineDialog
        studioId={studioId}
        clients={clients}
        payments={payments}
        onConfirm={handleClientConfirm}
        onClose={closeDocumentoCliente}
      />,
      document.body,
    )
  }

  if (!docState || !docWithTotals) return null

  const studioReady = Boolean(studioId)
  const title = DOCUMENTO_CLIENTE_TITLES[docState.documentType]
  const impegnaLabel = impegnaColumnLabel(docState.documentType)
  const seguiraVisible = showSeguiraDocVendita(docState.documentType)
  const impegnaVisible = showImpegnaColumn(docState.documentType)
  const isDdt = docState.documentType === 'ddt'
  // DDT: nessun prezzo, sconto, iva o importo in griglia (solo codice/descrizione/quantità/u.m.).
  const ddtColonneDefault: Partial<Record<ColonnaRigheId, boolean>> | undefined = isDdt
    ? { um: true, prezzoIvato: false, sconto: false, iva: false, importoIvato: false }
    : undefined

  return createPortal(
    <>
      <div className="gestionale-mdi-backdrop vb-backdrop dc-backdrop" role="dialog" aria-modal="true">
        <div
          className={`gestionale-mdi-window gestionale-mdi-window--documento-cliente dc-window${minimized ? ' gestionale-mdi-window--minimized' : ''}`}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="gestionale-mdi-window__titlebar">
            <span className="gestionale-mdi-window__title-icon" aria-hidden="true">
              📄
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
                      <WinField label="Cliente" className="vb-header-field--cliente">
                        <button type="button" className="vb-link vb-input--flex oc-cliente-link" disabled>
                          {docState.cliente.nome}
                        </button>
                      </WinField>
                      <WinField label="Data" htmlFor="dc-data" className="vb-header-field--data">
                        <div className="vb-row">
                          <WinInput
                            id="dc-data"
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
                      <WinField label="Numero" htmlFor="dc-numero" className="vb-header-field--numero">
                        <WinInput id="dc-numero" type="number" min={1} value={docState.numero} readOnly />
                      </WinField>
                      <WinField label="Numeraz." htmlFor="dc-numeraz" className="vb-header-field--numeraz">
                        <WinSelect id="dc-numeraz" value={docState.numerazione} onChange={e => patchDoc({ numerazione: e.target.value })}>
                          {NUMERAZIONI.map(n => (
                            <option key={n || 'default'} value={n}>
                              {n || '—'}
                            </option>
                          ))}
                        </WinSelect>
                      </WinField>
                      {seguiraVisible ? (
                        <label className="vb-check dc-seguira">
                          <input
                            type="checkbox"
                            checked={docState.seguiraDocVendita}
                            onChange={e => patchDoc({ seguiraDocVendita: e.target.checked })}
                          />
                          Seguirà doc. di vendita
                        </label>
                      ) : null}
                    </div>

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
                          doc={docWithTotals}
                          products={products}
                          categories={categories}
                          studioId={studioId}
                          impegnaColumnLabel={impegnaLabel}
                          showImpegnaColumn={impegnaVisible}
                          colonneDefault={ddtColonneDefault}
                          prezziIvati={docState.prezziIvati ?? false}
                          onPrezziModeChange={ivati => patchDoc({ prezziIvati: ivati })}
                          onChange={patchDoc}
                          onToast={msg => setActionMessage(msg)}
                          onIncludiDoc={() => void openIncludiDialog()}
                          onProductsChange={() => {
                            if (!studioId) return
                            void loadRecentProducts(studioId).then(setProducts)
                          }}
                        />
                      ) : null}
                      {activeTab === 'pagamento' ? <TabPagamentoOrdine doc={docWithTotals} onChange={patchDoc} /> : null}
                      {activeTab === 'trasporto' ? <TabTrasportoOrdine doc={docWithTotals} onChange={patchDoc} /> : null}
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

                  <div className="vb-footer-row oc-footer-row">
                    <div className="vb-footer-fields">
                      <WinField label="Commento ad uso interno" htmlFor="dc-commento" className="vb-footer-field--commento">
                        <div className="vb-row">
                          <WinInput
                            id="dc-commento"
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
                    <WinDropdownMenu
                      className="oc-includi-dropdown"
                      disabled={saving || !docState.cliente.id}
                      label={`📥 Includi doc.${includiCount > 0 ? ` (${includiCount})` : ''}`}
                      items={[
                        {
                          id: 'docs',
                          label: `Documenti (${includiCount})`,
                          disabled: includiCount === 0,
                          onClick: () => void openIncludiDialog(),
                        },
                      ]}
                    />
                    {transforms.length > 0 ? (
                      <WinDropdownMenu
                        label="⚡ Genera doc."
                        disabled={saving}
                        items={transforms.map(t => ({
                          id: t.type,
                          label: t.label,
                          onClick: () => {
                            if (t.type === 'ddt') void handleGeneraDoc('ddt')
                          },
                        }))}
                      />
                    ) : null}
                    {studioId && savedDocumentId && docState.documentType === 'fattura' ? (
                      <InviaArubaSdiButton
                        studioId={studioId}
                        documentId={savedDocumentId}
                        documentType={docState.documentType}
                        documentStatus={docState.stato}
                        arubaStatus={arubaDocMeta.status}
                        uploadFileName={arubaDocMeta.uploadFileName}
                        disabled={saving}
                        onSent={() => {
                          setArubaDocMeta({ status: 'sent' })
                          patchDoc({ stato: 'sent' })
                        }}
                      />
                    ) : null}
                    <div className="gestionale-mdi-window__action-spacer" />
                    <button
                      type="button"
                      className="gestionale-mdi-window__action-btn"
                      title="Salva documento"
                      disabled={saving}
                      onClick={() =>
                        void handleSalva('confirmed').then(() => {
                          closeDocumentoCliente()
                          navigate(`/documenti/tipo/${docState.documentType}`)
                        })
                      }
                    >
                      💾 Salva
                    </button>
                    <button type="button" className="gestionale-mdi-window__action-btn" title="Aiuto" disabled>
                      ?
                    </button>
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
          scope={docState.documentType}
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
          printCss={anteprimaCss}
          onClose={() => setShowAnteprima(false)}
        />
      ) : null}

      {studioReady && showIncludi ? (
        <IncludiDocumentiDialog
          documents={includiDocs}
          loading={includiLoading}
          title="Includi documenti"
          subtitle="Selezionare i documenti da includere"
          onInclude={handleIncludiInclude}
          onClose={() => setShowIncludi(false)}
        />
      ) : null}

    </>,
    document.body,
  )
}
