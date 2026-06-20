import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import { getCategories,
  getNextDocumentNumber,
  updateRepair,
} from '../../../lib/firestore'
import { loadRecentClients, loadSubjectDocuments, loadRecentPayments, loadRecentProducts } from '../../../lib/loadStudioCatalog'
import { callCommitDocumentWithFallback } from '../../../lib/commitDocument'
import { formatCallableError } from '../../../lib/cloudFunctions'
import { invalidateDashboardCache } from '../start/dashboardCache'
import { docRecordToOrdineCliente } from '../../lib/docRecordLoaders'
import { downloadHtmlAsPdf, printHtmlInIframe } from '../../../lib/printDocument'
import { CONFERMA_ORDINE_PRINT_CSS } from '../../../lib/confermaOrdineTemplate'
import { documentYearFromDate } from '../documenti'
import IncludiDocumentiDialog from '../documenti/dialogs/IncludiDocumentiDialog'
import { getIncludableDocuments, mergeIncludedRows, type InclusionMode } from '../documenti/inclusionUtils'
import type { Category, Client, DocRecord, Payment, Product, Repair } from '../../../types'
import { NUMERAZIONI, COMMENTI_INTERNI_PREDEFINITI } from '../vendita-banco/constants'
import { getCustomCommentiInterni, addCustomCommentoInterno } from '../../../lib/userPrefs'
import TabNote from '../vendita-banco/tabs/TabNote'
import TabIndirizzi from '../vendita-banco/tabs/TabIndirizzi'
import TabOpzioni from '../vendita-banco/tabs/TabOpzioni'
import FooterTotals from '../vendita-banco/FooterTotals'
import WinDropdownMenu from '../vendita-banco/WinDropdownMenu'
import { WinField, WinIconBtn, WinInput, WinSelect, WinTextarea } from '../vendita-banco/WinControls'
import { formatDataIt, parseDataIt } from '../vendita-banco/utils'
import type { DocumentoVenditaBanco } from '../vendita-banco/types'
import { ORDINE_CLIENTE_TABS, STATI_ORDINE } from './constants'
import {
  CONCLUDI_ORDINE_ITEMS,
  CONCLUDI_ORDINE_LABELS,
  CONCLUDI_DOCUMENT_TARGETS,
  isDocumentoClienteModalType,
} from '../documento-cliente/constants'
import { buildDocumentoSeedFromOrdine } from '../documento-cliente/utils'
import type { ConcludiOrdineTarget } from './types'
import SelezioneClienteOrdineDialog, {
  type SelezioneClienteOrdineResult,
} from './dialogs/SelezioneClienteOrdineDialog'
import ConfermaConcludiOrdineDialog from './dialogs/ConfermaConcludiOrdineDialog'
import StampaDialog from '../vendita-banco/dialogs/StampaDialog'
import type { StampaModello } from '../../../lib/stampaModelli'
import AnteprimaStampaDialog, { type AnteprimaStampaMeta } from '../vendita-banco/dialogs/AnteprimaStampaDialog'
import TabRigheOrdineCliente from './tabs/TabRigheOrdineCliente'
import TabPagamentoOrdine from './tabs/TabPagamentoOrdine'
import type { DocumentoOrdineCliente, TabOrdineClienteId } from './types'
import {
  buildOrdinePayload,
  buildVenditaBancoSeedFromOrdine,
  clientToOrdineCliente,
  createInitialOrdineCliente,
  documentRowToRigaOrdine,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
  rigaOrdineToDocumentRow,
} from './utils'
import { resolvePresetClient } from '../../lib/resolvePresetClient'
import { buildOrdineClientePrintContent } from './ordineClientePrint'
import { repairToOrdineClientePatch } from './repairToOrdineCliente'
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

function ordineAsVenditaTabs(doc: DocumentoOrdineCliente): DocumentoVenditaBanco {
  return {
    cliente: doc.cliente,
    agente: doc.agente,
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

export default function OrdineClienteModal() {
  const { user } = useAuth()
  const { studioId, loading: studioLoading } = useActiveStudio()
  const { ordineClienteOpen, ordineClientePreset, ordineClienteEditId, closeOrdineCliente, openVenditaBanco, openDocumentoCliente } = useAppWindows()

  const [docState, setDocState] = useState<DocumentoOrdineCliente>(createInitialOrdineCliente)
  const [activeTab, setActiveTab] = useState<TabOrdineClienteId>('righe')
  const [minimized, setMinimized] = useState(false)
  const [showSelezioneCliente, setShowSelezioneCliente] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [showConfermaConcludi, setShowConfermaConcludi] = useState(false)
  const [pendingConcludi, setPendingConcludi] = useState<ConcludiOrdineTarget | null>(null)
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

  const [clients, setClients] = useState<Client[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const dateInputRef = useRef<HTMLInputElement>(null)
  const appliedPresetRef = useRef(false)

  const patchDoc = useCallback((patch: Partial<DocumentoOrdineCliente>) => {
    setDocState(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setDocState(createInitialOrdineCliente())
    setActiveTab('righe')
    setMinimized(false)
    setShowSelezioneCliente(true)
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
    if (!ordineClienteOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [ordineClienteOpen])

  useEffect(() => {
    if (!ordineClienteOpen) {
      appliedPresetRef.current = false
      setSavedSnapshot(null)
      return
    }
    if (!ordineClienteEditId) {
      reset()
    }
  }, [ordineClienteOpen, ordineClienteEditId, reset])

  useEffect(() => {
    if (!ordineClienteOpen || !ordineClienteEditId) return
    setShowSelezioneCliente(false)
    setLoadError(null)
    void getDoc(doc(db, 'documents', ordineClienteEditId)).then(snap => {
      if (!snap.exists()) {
        setLoadError('Documento non trovato.')
        return
      }
      const record = { id: snap.id, ...(snap.data() as DocRecord) }
      setDocState(docRecordToOrdineCliente(record))
      setSavedDocumentId(record.id)
      setSavedSnapshot(null)
    })
  }, [ordineClienteOpen, ordineClienteEditId])

  useEffect(() => {
    if (
      !ordineClienteOpen ||
      ordineClienteEditId ||
      appliedPresetRef.current ||
      !ordineClientePreset
    ) {
      return
    }

    const applyClientPreset = (client: Client) => {
      appliedPresetRef.current = true
      patchDoc(
        clientToOrdineCliente(client, ordineClientePreset.destinazioneMerceId) as Partial<DocumentoOrdineCliente>,
      )
      setShowSelezioneCliente(false)
    }

    if (ordineClientePreset.repairId) {
      if (appliedPresetRef.current) return
      appliedPresetRef.current = true
      void getDoc(doc(db, 'repairs', ordineClientePreset.repairId)).then(async snap => {
        if (!snap.exists()) return
        const repair = { id: snap.id, ...snap.data() } as Repair
        let client: Client | undefined
        if (repair.clientId) {
          client = (await resolvePresetClient(repair.clientId, clients)) ?? undefined
        }
        patchDoc(repairToOrdineClientePatch(repair, client))
        setShowSelezioneCliente(!repair.clientId && !client)
        setActiveTab('dispositivo')
      })
      return
    }

    if (!ordineClientePreset.clientId) return
    if (appliedPresetRef.current) return
    appliedPresetRef.current = true
    void resolvePresetClient(ordineClientePreset.clientId, clients).then(client => {
      if (!client) {
        appliedPresetRef.current = false
        return
      }
      applyClientPreset(client)
    })
  }, [ordineClienteOpen, ordineClienteEditId, ordineClientePreset, clients, patchDoc])

  useEffect(() => {
    if (!ordineClienteOpen || !studioId) return
    void Promise.all([
      loadRecentClients(studioId),
      loadRecentProducts(studioId),
      getCategories(studioId),
      loadRecentPayments(studioId),
    ]).then(([c, p, cats, pays]) => {
      setClients(c)
      setProducts(p)
      setCategories(cats)
      setPayments(pays)
    })
    if (!ordineClienteEditId) {
      const today = new Date().toISOString().slice(0, 10)
      void getNextDocumentNumber(studioId, 'ordine_cliente', documentYearFromDate(today)).then(num =>
        patchDoc({ data: today, numero: num }),
      )
    }
    void getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as Record<string, unknown>)
    })
  }, [ordineClienteOpen, studioId, ordineClienteEditId, patchDoc])

  useEffect(() => {
    if (!studioId || !docState.cliente.id) {
      setIncludiCount(0)
      return
    }
    void loadSubjectDocuments(studioId, docState.cliente.id, 200).then(all => {
      const docs = getIncludableDocuments(all, 'ordine_cliente', docState.cliente.id, 'client')
      setIncludiCount(docs.length)
    })
  }, [studioId, docState.cliente.id])

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
    if (ordineClienteOpen && savedSnapshot === null) {
      setSavedSnapshot(snapshotDocumentState(docWithTotals))
    }
  }, [ordineClienteOpen, docWithTotals, savedSnapshot])

  const commentiItems = useMemo(
    () => [...COMMENTI_INTERNI_PREDEFINITI, ...getCustomCommentiInterni(), 'Personalizza…'],
    [],
  )

  const handleClientConfirm = useCallback(
    (result: SelezioneClienteOrdineResult) => {
      patchDoc(
        clientToOrdineCliente(result.client, result.destinazioneMerceId) as Partial<DocumentoOrdineCliente>,
      )
      setShowSelezioneCliente(false)
    },
    [patchDoc],
  )

  const handleRecalcTotals = () => {
    patchDoc(totals)
    setActionMessage('Totali aggiornati.')
    window.setTimeout(() => setActionMessage(null), 2000)
  }

  const saveOrdine = async (
    status: DocumentoOrdineCliente['stato'] = docState.stato,
    doc: DocumentoOrdineCliente = docWithTotals,
  ): Promise<DocumentoOrdineCliente> => {
    if (!studioId) throw new Error('Archivio non disponibile.')
    if (!user) throw new Error('Sessione scaduta: effettua di nuovo l\'accesso.')
    if (!doc.cliente.id) throw new Error('Seleziona un cliente.')
    const docTotals = documentTotalsFromRigheOrdine(doc.righe, doc.speseImporto, doc.speseIva)
    const righe = doc.righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
    const repairId = ordineClientePreset?.repairId
    const payload = buildOrdinePayload({ ...doc, ...docTotals }, studioId, righe, docTotals, status, repairId)
    const result = await callCommitDocumentWithFallback({
      documentId: savedDocumentId || undefined,
      document: payload,
      assignNumber: !savedDocumentId,
    })
    setSavedDocumentId(result.documentId)
    if (repairId) {
      await updateRepair(repairId, {
        linkedDocumentId: result.documentId,
        linkedDocumentType: 'ordine_cliente',
      })
    }
    const savedDoc = { ...doc, ...docTotals, numero: result.number, stato: status }
    patchDoc({ numero: result.number, stato: status })
    setSavedSnapshot(snapshotDocumentState(savedDoc))
    invalidateDashboardCache(studioId)
    if (result.usedLocalFallback) {
      setActionMessage('Ordine salvato (modalità locale).')
      window.setTimeout(() => setActionMessage(null), 3000)
    }
    return savedDoc
  }

  const buildPrintDoc = useCallback(
    (modello?: StampaModello) => {
      if (!studioId) throw new Error('Archivio non disponibile.')
      return buildOrdineClientePrintContent(docWithTotals, studioId, activeRighe, studioData, modello)
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
    if (!docState.cliente.id) {
      alert('Seleziona un cliente per includere documenti.')
      return
    }
    setShowIncludi(true)
    setIncludiLoading(true)
    try {
      const all = await loadSubjectDocuments(studioId, docState.cliente.id, 200)
      const docs = getIncludableDocuments(all, 'ordine_cliente', docState.cliente.id, 'client')
      setIncludiDocs(docs)
      setIncludiCount(docs.length)
      if (docs.length === 0) {
        alert('Nessun preventivo includibile per questo cliente.')
        setShowIncludi(false)
      }
    } finally {
      setIncludiLoading(false)
    }
  }, [studioId, docState.cliente.id])

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
      const patch: Partial<DocumentoOrdineCliente> = { righe: newRighe }

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

  const handleConcludiTarget = (target: ConcludiOrdineTarget) => {
    const item = CONCLUDI_ORDINE_ITEMS.find(i => i.id === target)
    if (!item?.enabled) {
      setActionMessage(`${CONCLUDI_ORDINE_LABELS[target]} — funzione non ancora disponibile.`)
      window.setTimeout(() => setActionMessage(null), 3500)
      return
    }
    if (!docState.cliente.id) {
      setActionMessage('Seleziona un cliente prima di concludere l\'ordine.')
      window.setTimeout(() => setActionMessage(null), 3500)
      setShowSelezioneCliente(true)
      return
    }
    if (activeRighe.length === 0) {
      setActionMessage('Aggiungi almeno una riga prima di concludere l\'ordine.')
      window.setTimeout(() => setActionMessage(null), 3500)
      return
    }
    if (CONCLUDI_DOCUMENT_TARGETS.includes(target)) {
      setPendingConcludi(target)
      setShowConfermaConcludi(true)
    }
  }

  const handleConfermaConcludi = async (mettiQtaZero: boolean) => {
    const target = pendingConcludi
    setShowConfermaConcludi(false)
    setPendingConcludi(null)
    if (!target) return

    setSaving(true)
    setLoadError(null)
    try {
      const savedDoc = await saveOrdine('confirmed')
      if (target === 'vendita_banco') {
        const seed = buildVenditaBancoSeedFromOrdine(savedDoc, mettiQtaZero)
        closeOrdineCliente()
        openVenditaBanco(seed)
        return
      }
      if (isDocumentoClienteModalType(target)) {
        const seed = buildDocumentoSeedFromOrdine(savedDoc, target, mettiQtaZero)
        closeOrdineCliente()
        openDocumentoCliente(seed)
        return
      }
    } catch (e) {
      setLoadError(formatCallableError(e, 'Operazione non riuscita.'))
    } finally {
      setSaving(false)
    }
  }

  const patchFromVenditaTabs = (patch: Partial<DocumentoVenditaBanco>) => {
    const { righe: _righe, agente: _agente, seguiraDocVendita: _seg, protetto: _prot, ...rest } = patch
    patchDoc(rest as Partial<DocumentoOrdineCliente>)
  }

  const handleClose = useCallback(async () => {
    const needsPrompt = documentNeedsSaveOnClose(activeRighe.length > 0, savedDocumentId, isDirty)
    const outcome = await confirmSaveDocumentOnClose(needsPrompt, () => saveOrdine('confirmed'))
    if (outcome === 'close') {
      closeOrdineCliente()
    } else if (needsPrompt) {
      setLoadError('Salvataggio non riuscito.')
    }
  }, [activeRighe.length, savedDocumentId, isDirty, closeOrdineCliente])

  useEffect(() => {
    if (!ordineClienteOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !showSelezioneCliente &&
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
    ordineClienteOpen,
    showSelezioneCliente,
    showConfermaConcludi,
    showStampa,
    showAnteprima,
    showIncludi,
    handleClose,
  ])

  if (!ordineClienteOpen) return null

  const studioReady = Boolean(studioId)

  return createPortal(
    <>
      {showSelezioneCliente && studioId ? (
        <SelezioneClienteOrdineDialog
          studioId={studioId}
          clients={clients}
          payments={payments}
          onConfirm={handleClientConfirm}
          onClose={closeOrdineCliente}
        />
      ) : null}

      {showConfermaConcludi && pendingConcludi ? (
        <ConfermaConcludiOrdineDialog
          documentLabel={CONCLUDI_ORDINE_LABELS[pendingConcludi]}
          onConfirm={mettiQtaZero => void handleConfermaConcludi(mettiQtaZero)}
          onClose={() => {
            setShowConfermaConcludi(false)
            setPendingConcludi(null)
          }}
        />
      ) : null}

      {!showSelezioneCliente ? (
        <div className="gestionale-mdi-backdrop vb-backdrop oc-backdrop" role="dialog" aria-modal="true" aria-labelledby="oc-title">
          <div
            className={`gestionale-mdi-window gestionale-mdi-window--ordine-cliente oc-window${minimized ? ' gestionale-mdi-window--minimized' : ''}`}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="gestionale-mdi-window__titlebar">
              <span className="gestionale-mdi-window__title-icon" aria-hidden="true">
                📦
              </span>
              <span id="oc-title" className="gestionale-mdi-window__title-text">
                Ordine cliente
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
                        <WinField label="Cliente" htmlFor="oc-cliente" className="vb-header-field--cliente">
                          <div className="vb-row">
                            <button type="button" className="vb-link vb-input--flex oc-cliente-link" onClick={() => setShowSelezioneCliente(true)}>
                              {docState.cliente.nome || 'Seleziona cliente…'}
                            </button>
                            <WinIconBtn title="Ricerca clienti" className="vb-icon-btn--binocular" onClick={() => setShowSelezioneCliente(true)}>
                              🔭
                            </WinIconBtn>
                            <WinIconBtn title="Scheda cliente">📁</WinIconBtn>
                          </div>
                        </WinField>

                        <WinField label="Data" htmlFor="oc-data" className="vb-header-field--data">
                          <div className="vb-row">
                            <WinInput
                              id="oc-data"
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

                        <WinField label="Numero" htmlFor="oc-numero" className="vb-header-field--numero">
                          <WinInput
                            id="oc-numero"
                            type="number"
                            min={1}
                            value={docState.numero}
                            onChange={e => patchDoc({ numero: parseInt(e.target.value, 10) || 1 })}
                          />
                        </WinField>

                        <WinField label="Numeraz." htmlFor="oc-numeraz" className="vb-header-field--numeraz">
                          <WinSelect id="oc-numeraz" value={docState.numerazione} onChange={e => patchDoc({ numerazione: e.target.value })}>
                            {NUMERAZIONI.map(n => (
                              <option key={n || 'default'} value={n}>
                                {n || '—'}
                              </option>
                            ))}
                          </WinSelect>
                        </WinField>
                      </div>

                      <div className="gestionale-mdi-window__tabs" role="tablist">
                        {ORDINE_CLIENTE_TABS.map(tab => (
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
                            prezziIvati={docState.prezziIvati ?? false}
                            onPrezziModeChange={ivati => patchDoc({ prezziIvati: ivati })}
                            showCampiFE={false}
                            showUtilita={false}
                            onChange={patchDoc}
                            onToast={msg => setActionMessage(msg)}
                            onIncludiDoc={() => void openIncludiDialog()}
                            onProductsChange={() => {
                              if (!studioId) return
                              void loadRecentProducts(studioId).then(setProducts)
                            }}
                          />
                        ) : null}
                        {activeTab === 'pagamento' ? (
                          <TabPagamentoOrdine doc={docWithTotals} onChange={patchDoc} showScadenzario={false} />
                        ) : null}
                        {activeTab === 'dispositivo' ? (
                          <div className="vb-tab-panel vb-tab-stack oc-device-tab">
                            <p className="vb-section-title">Dati dispositivo</p>
                            <p className="oc-device-info__hint">
                              Compila questi campi se l'ordine riguarda una riparazione. Per una semplice vendita
                              (es. cover/accessorio) lascia tutto vuoto: usa la tab «Note generali».
                            </p>
                            <div className="oc-device-info__grid">
                              <WinField label="IMEI e S/N" htmlFor="oc-device-imei">
                                <WinInput
                                  id="oc-device-imei"
                                  value={docState.deviceImei}
                                  onChange={e => patchDoc({ deviceImei: e.target.value })}
                                />
                              </WinField>
                              <WinField label="Codice Blocco" htmlFor="oc-device-lock">
                                <WinInput
                                  id="oc-device-lock"
                                  value={docState.deviceLockCode}
                                  onChange={e => patchDoc({ deviceLockCode: e.target.value })}
                                />
                              </WinField>
                              <WinField label="Account e Password" htmlFor="oc-device-account">
                                <WinInput
                                  id="oc-device-account"
                                  value={docState.deviceAccount}
                                  onChange={e => patchDoc({ deviceAccount: e.target.value })}
                                />
                              </WinField>
                              <WinField label="Note dispositivo" htmlFor="oc-device-notes" className="oc-device-info__notes">
                                <WinTextarea
                                  id="oc-device-notes"
                                  rows={3}
                                  value={docState.deviceNotes}
                                  onChange={e => patchDoc({ deviceNotes: e.target.value })}
                                />
                              </WinField>
                            </div>
                          </div>
                        ) : null}
                        {activeTab === 'note' ? (
                          <TabNote doc={ordineAsVenditaTabs(docState)} onChange={patchFromVenditaTabs} />
                        ) : null}
                        {activeTab === 'indirizzi' ? (
                          <TabIndirizzi doc={ordineAsVenditaTabs(docState)} onChange={patchFromVenditaTabs} />
                        ) : null}
                        {activeTab === 'opzioni' ? (
                          <TabOpzioni doc={ordineAsVenditaTabs(docState)} soloStampa onChange={patchFromVenditaTabs} />
                        ) : null}
                      </div>
                    </div>

                    <div className="vb-footer-row oc-footer-row">
                      <div className="vb-footer-fields">
                        <WinField label="Stato" htmlFor="oc-stato">
                          <WinSelect
                            id="oc-stato"
                            value={docState.stato}
                            onChange={e => patchDoc({ stato: e.target.value as DocumentoOrdineCliente['stato'] })}
                          >
                            {STATI_ORDINE.map(s => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </WinSelect>
                        </WinField>

                        <WinField label="Commento ad uso interno" htmlFor="oc-commento" className="vb-footer-field--commento">
                          <div className="vb-row">
                            <WinInput
                              id="oc-commento"
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
                        className="oc-includi-dropdown"
                        disabled={saving || !docState.cliente.id}
                        label={`📥 Includi doc.${includiCount > 0 ? ` (${includiCount})` : ''}`}
                        items={[
                          {
                            id: 'preventivi',
                            label: `Preventivi (${includiCount})`,
                            disabled: includiCount === 0,
                            onClick: () => void openIncludiDialog(),
                          },
                        ]}
                      />

                      <WinDropdownMenu
                        className="oc-concludi-dropdown"
                        disabled={saving || !user}
                        label={
                          <span className="oc-concludi-label">
                            <span aria-hidden="true">✓</span> Concludi ordine
                          </span>
                        }
                        items={CONCLUDI_ORDINE_ITEMS.map(item => ({
                          id: item.id,
                          label: CONCLUDI_ORDINE_LABELS[item.id],
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
          scope="ordine_cliente"
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
          title="Includi Preventivi"
          subtitle="Selezionare i documenti da includere"
          onInclude={handleIncludiInclude}
          onClose={() => setShowIncludi(false)}
        />
      ) : null}

    </>,
    document.body,
  )
}
