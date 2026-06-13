import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import {
  addDocument,
  getCategories,
  getClients,
  getDocuments,
  getNextDocumentNumber,
  getProducts,
  updateDocument,
} from '../../../lib/firestore'
import { callCommitDocument, isCommitFunctionUnavailable } from '../../../lib/commitDocument'
import { omitUndefined } from '../../../lib/firestoreSanitize'
import {
  attachmentUrls,
  deleteDocumentAttachment,
  uploadDocumentAttachment,
  type DocumentAttachment,
} from '../../../lib/documentAttachments'
import { GENERIC_CLIENT_LABEL } from '../../../lib/clientSearch'
import { sendFiscalReceiptToRt, documentRowsToRtItems, rtItemsGrossTotal, rtShouldSkipLanPrint } from '../../../lib/rtPrinter'
import { buildVenditaBancoFIXLabPrintBody, VENDITA_BANCO_PRINT_CSS } from '../../../lib/venditaBancoPrint'
import {
  buildPrintFilename,
  downloadHtmlAsPdf,
  printHtmlInIframe,
} from '../../../lib/printDocument'
import { buildFullNumber, documentYearFromDate } from '../../../gestionale/features/documenti'
import { mergeIncludedRows } from '../documenti/inclusionUtils'
import { emitPaymentsForDocumentIfNeeded } from '../../lib/paymentSchedule'
import { invalidateDashboardCache } from '../start/dashboardCache'
import type { Category, Client, DocRecord, DocumentType } from '../../../types'
import ClientFormModal from '../../../components/ClientFormModal'
import { LISTINI, NUMERAZIONI, VENDITA_BANCO_TABS, TIPI_SPESE, IVA_ALIQUOTE, COMMENTI_INTERNI_PREDEFINITI } from './constants'
import { getCustomCommentiInterni, addCustomCommentoInterno } from '../../../lib/userPrefs'
import { useAgentOptions } from '../../hooks/useAgentOptions'
import StampaDialog from './dialogs/StampaDialog'
import AnteprimaStampaDialog, { type AnteprimaStampaMeta } from './dialogs/AnteprimaStampaDialog'
import RegistratoreCassaAvvisoDialog from './dialogs/RegistratoreCassaAvvisoDialog'
import IncludiDocumentiDialog from './dialogs/IncludiDocumentiDialog'
import AnomalieMagazzinoDialog from './dialogs/AnomalieMagazzinoDialog'
import AllegatiDialog from './dialogs/AllegatiDialog'
import GeneraDocCollegatoDialog from './dialogs/GeneraDocCollegatoDialog'
import EtichetteDialog from './dialogs/EtichetteDialog'
import SelezioneClienteDialog, { clientModeFromNome } from './dialogs/SelezioneClienteDialog'
import FooterTotals from './FooterTotals'
import { findAnomalieMagazzino, type AnomaliaMagazzino } from './stockCheck'
import { printVenditaBancoEtichette } from './venditaBancoEtichette'
import TabRigheDocumento from './tabs/TabRigheDocumento'
import TabPagamento from './tabs/TabPagamento'
import TabNote from './tabs/TabNote'
import TabIndirizzi from './tabs/TabIndirizzi'
import TabOpzioni from './tabs/TabOpzioni'
import type { DocumentoVenditaBanco, TabVenditaBancoId } from './types'
import {
  createInitialDocumento,
  documentTotalsFromRighe,
  formatDataIt,
  listinoToPriceList,
  parseDataIt,
  refreshRigheListino,
  rigaToDocumentRow,
  documentRowToRiga,
  calcRiga,
  evalCalcolata,
} from './utils'
import { WinField, WinIconBtn, WinInput, WinSelect } from './WinControls'
import WinDropdownMenu from './WinDropdownMenu'
import '../../../theme/gestionale-mdi-window.css'
import '../../../theme/gestionale-document-form.css'
import '../../theme/vendita-al-banco.css'

type StudioDoc = {
  name?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  vatNumber?: string
  phone?: string
  rtIp?: string
  rtModel?: string
}

export default function VenditaAlBancoModal() {
  const { studioId, loading: studioLoading } = useActiveStudio()
  const agenti = useAgentOptions(studioId)
  const { venditaBancoOpen, closeVenditaBanco } = useAppWindows()
  const navigate = useNavigate()

  const [docState, setDocState] = useState<DocumentoVenditaBanco>(createInitialDocumento)
  const [activeTab, setActiveTab] = useState<TabVenditaBancoId>('righe')
  const [minimized, setMinimized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [stockCommitted, setStockCommitted] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getProducts>>>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [studioData, setStudioData] = useState<StudioDoc | null>(null)

  const [showSelezioneCliente, setShowSelezioneCliente] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showStampa, setShowStampa] = useState(false)
  const [showAnteprima, setShowAnteprima] = useState(false)
  const [anteprimaCopie, setAnteprimaCopie] = useState(1)
  const [anteprimaHtml, setAnteprimaHtml] = useState('')
  const [anteprimaMeta, setAnteprimaMeta] = useState<AnteprimaStampaMeta | null>(null)
  const [showRtAvviso, setShowRtAvviso] = useState(false)
  const [showIncludiDoc, setShowIncludiDoc] = useState(false)
  const [includiDocs, setIncludiDocs] = useState<DocRecord[]>([])
  const [includiLoading, setIncludiLoading] = useState(false)
  const [allegati, setAllegati] = useState<DocumentAttachment[]>([])
  const [allegatiUploading, setAllegatiUploading] = useState(false)
  const draftStorageKeyRef = useRef(crypto.randomUUID())
  const [showAllegati, setShowAllegati] = useState(false)
  const [showEtichette, setShowEtichette] = useState(false)
  const [showGeneraDoc, setShowGeneraDoc] = useState(false)
  const [anomalie, setAnomalie] = useState<AnomaliaMagazzino[] | null>(null)
  const [pendingEmetti, setPendingEmetti] = useState(false)
  const [includiDocAvailable, setIncludiDocAvailable] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const patchDoc = useCallback((patch: Partial<DocumentoVenditaBanco>) => {
    setDocState(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setDocState(createInitialDocumento())
    setActiveTab('righe')
    setMinimized(false)
    setLoadError(null)
    setActionMessage(null)
    setSavedDocumentId(null)
    setStockCommitted(false)
    setShowSelezioneCliente(false)
    setShowClientForm(false)
    setShowStampa(false)
    setShowAnteprima(false)
    setAnteprimaHtml('')
    setAnteprimaMeta(null)
    setShowRtAvviso(false)
    setShowIncludiDoc(false)
    setIncludiDocs([])
    setAllegati([])
    setAllegatiUploading(false)
    draftStorageKeyRef.current = crypto.randomUUID()
    setShowAllegati(false)
    setShowEtichette(false)
    setShowGeneraDoc(false)
    setAnomalie(null)
    setPendingEmetti(false)
    setShowSelezioneCliente(false)
  }, [])

  useEffect(() => {
    if (!venditaBancoOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [venditaBancoOpen])

  useEffect(() => {
    if (!venditaBancoOpen) return
    reset()
  }, [venditaBancoOpen, reset])

  useEffect(() => {
    if (!venditaBancoOpen || !studioId) return
    Promise.all([getClients(studioId), getProducts(studioId), getCategories(studioId)]).then(([c, p, cats]) => {
      setClients(c)
      setProducts(p)
      setCategories(cats)
      setDocState(prev => ({
        ...prev,
        righe: refreshRigheListino(prev.righe, p, prev.listino),
      }))
    })
    getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as StudioDoc)
    })
    const today = new Date().toISOString().slice(0, 10)
    getNextDocumentNumber(studioId, 'vendita_banco', documentYearFromDate(today)).then(num =>
      patchDoc({
        data: today,
        numero: num,
        cliente: { id: '', nome: GENERIC_CLIENT_LABEL, codFiscale: '', partitaIva: '' },
      }),
    )
  }, [venditaBancoOpen, studioId, patchDoc])

  useEffect(() => {
    if (!studioId || !docState.cliente.id) {
      setIncludiDocAvailable(false)
      return
    }
    void getDocuments(studioId).then(all => {
      setIncludiDocAvailable(
        all.some(
          d =>
            d.subjectId === docState.cliente.id &&
            d.id !== savedDocumentId &&
            d.type !== 'vendita_banco' &&
            d.status !== 'cancelled',
        ),
      )
    })
  }, [studioId, docState.cliente.id, savedDocumentId])

  const handleRecalcTotals = useCallback(() => {
    setActionMessage('Totali ricalcolati.')
  }, [])

  const handleCalculator = useCallback(() => {
    const expr = window.prompt('Calcolatrice — inserisci espressione (es. 20+211):')
    if (!expr) return
    const val = evalCalcolata(expr)
    if (val === null) {
      alert('Espressione non valida.')
      return
    }
    alert(`Risultato: € ${val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  }, [])

  const commentiItems = useMemo(
    () => [...COMMENTI_INTERNI_PREDEFINITI.slice(0, -1), ...getCustomCommentiInterni(), 'Personalizza…'],
    [docState.commentoInterno],
  )

  const handleNumerazioneChange = useCallback(
    (numerazione: string) => {
      if (docState.protetto) {
        patchDoc({ numerazione })
        return
      }
      patchDoc({ numerazione })
      if (!studioId) return
      void getNextDocumentNumber(studioId, 'vendita_banco', documentYearFromDate(docState.data)).then(num =>
        patchDoc({ numero: num, numerazione }),
      )
    },
    [studioId, docState.data, docState.protetto, patchDoc],
  )

  const activeRighe = useMemo(
    () => docState.righe.filter(r => r.descrizione.trim()),
    [docState.righe],
  )

  const totals = useMemo(
    () => documentTotalsFromRighe(activeRighe, docState.speseImporto, docState.speseIva),
    [activeRighe, docState.speseImporto, docState.speseIva],
  )

  const docWithTotals = useMemo(
    (): DocumentoVenditaBanco => ({
      ...docState,
      totNetto: totals.totNetto,
      totIva: totals.totIva,
      totaleDocumento: totals.totaleDocumento,
    }),
    [docState, totals],
  )

  const documentYear = useMemo(() => documentYearFromDate(docState.data), [docState.data])

  const buildPayload = useCallback(
    (saveStatus: DocRecord['status']): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> => {
      const rows = activeRighe.map(rigaToDocumentRow)
      const fullNumber = buildFullNumber(docState.numero, documentYear, docState.numerazione)
      const internalNotes = [
        docState.commentoInterno ? `Commento ad uso interno: ${docState.commentoInterno}` : '',
        docState.campiLiberi[0] ? `Libero 1: ${docState.campiLiberi[0]}` : '',
        docState.campiLiberi[1] ? `Libero 2: ${docState.campiLiberi[1]}` : '',
        docState.campiLiberi[2] ? `Libero 3: ${docState.campiLiberi[2]}` : '',
        docState.campiLiberi[3] ? `Libero 4: ${docState.campiLiberi[3]}` : '',
        docState.noteFine ? `Note a fine documento:\n${docState.noteFine}` : '',
        docState.rinnovo.attivo ? `Rinnovo: ${docState.rinnovo.mesi} mesi` : '',
        docState.codLotteria ? `Cod. lotteria: ${docState.codLotteria}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const agentName = docState.agente && docState.agente !== '(Nessuno)' ? docState.agente : undefined

      return {
        studioId: studioId!,
        type: 'vendita_banco',
        number: docState.numero,
        numbering: docState.numerazione || undefined,
        fullNumber,
        date: docState.data,
        documentYear,
        subjectType: 'client',
        subjectId: docState.cliente.id || undefined,
        subjectName: docState.cliente.nome,
        subjectVat: docState.cliente.codFiscale || docState.cliente.partitaIva || undefined,
        subjectAddress: docState.intestatario.indirizzo
          ? [docState.intestatario.indirizzo, docState.intestatario.cap, docState.intestatario.citta, docState.intestatario.prov]
              .filter(Boolean)
              .join(', ')
          : undefined,
        rows,
        totalNet: totals.totNetto,
        totalVat: totals.totIva,
        totalDocument: totals.totaleDocumento,
        shippingCost: docState.speseImporto > 0 ? docState.speseImporto : undefined,
        shippingVatRate: docState.speseImporto > 0 ? docState.speseIva : undefined,
        shippingDescription: docState.speseTipo || undefined,
        priceList: listinoToPriceList(docState.listino),
        agentName,
        internalNotes: internalNotes || undefined,
        paymentMethod: docState.tipoPagamento || undefined,
        followUpDoc: docState.seguiraDocVendita || undefined,
        deliveryAddress: docState.destinazione.indirizzo || undefined,
        deliveryCity: docState.destinazione.citta || undefined,
        deliveryProvince: docState.destinazione.prov || undefined,
        deliveryCap: docState.destinazione.cap || undefined,
        status: saveStatus,
        stockCommitted,
        attachments: allegati.length ? attachmentUrls(allegati) : undefined,
      }
    },
    [studioId, docState, activeRighe, documentYear, totals, stockCommitted, allegati],
  )

  const saveWithFallback = useCallback(
    async (saveStatus: DocRecord['status']) => {
      const year = documentYearFromDate(docState.data)
      let num = docState.numero
      let fullNum = buildFullNumber(num, year, docState.numerazione)
      if (!savedDocumentId) {
        num = await getNextDocumentNumber(studioId!, 'vendita_banco', year)
        fullNum = buildFullNumber(num, year, docState.numerazione)
        patchDoc({ numero: num })
      }
      const payload = omitUndefined({
        ...buildPayload(saveStatus),
        number: num,
        fullNumber: fullNum,
        documentYear: year,
      })
      let documentId = savedDocumentId || ''
      if (savedDocumentId) {
        await updateDocument(savedDocumentId, payload)
        documentId = savedDocumentId
      } else {
        const ref = await addDocument(payload)
        documentId = ref.id
        setSavedDocumentId(ref.id)
      }
      setActionMessage(`Documento ${fullNum} salvato (modalità locale).`)
      return { documentId, payload }
    },
    [docState, buildPayload, studioId, savedDocumentId, patchDoc, setSavedDocumentId, setActionMessage],
  )

  const emitScheduledPayments = useCallback(
    async (documentId: string, payload: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!studioId) return 0
      return emitPaymentsForDocumentIfNeeded(studioId, documentId, payload)
    },
    [studioId],
  )

  const handleSave = useCallback(
    async (saveStatus: DocRecord['status'] = 'confirmed', options?: { emitReceipt?: boolean }) => {
      if (!studioId || !docState.cliente.nome.trim()) {
        alert('Seleziona un cliente')
        return false
      }
      if (activeRighe.length === 0) {
        alert('Aggiungi almeno una riga al documento')
        return false
      }

      setSaving(true)
      setLoadError(null)
      setActionMessage(null)

      try {
        const payload = omitUndefined(buildPayload(saveStatus))
        const result = await callCommitDocument({
          documentId: savedDocumentId || undefined,
          document: payload,
          assignNumber: !savedDocumentId,
        })
        setSavedDocumentId(result.documentId)
        patchDoc({ numero: result.number })
        setStockCommitted(result.stockCommitted)

        let paymentNote = ''
        if (saveStatus === 'confirmed') {
          const docForPayments: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> = {
            ...payload,
            number: result.number,
            fullNumber: result.fullNumber,
            documentYear: payload.documentYear,
          }
          const emitted = await emitScheduledPayments(result.documentId, docForPayments)
          if (emitted > 0) {
            paymentNote = ` ${emitted} scadenze pagamento create.`
            invalidateDashboardCache(studioId)
          }
        }

        if (options?.emitReceipt) {
          const rows = activeRighe.map(rigaToDocumentRow)
          const rtItems = documentRowsToRtItems(rows)
          const rtTotal = rtItemsGrossTotal(rtItems)
          const receipt = await sendFiscalReceiptToRt(rtItems, Math.round(rtTotal * 100) / 100, {
            rtIp: studioData?.rtIp,
            rtModel: studioData?.rtModel,
            paymentLabel: docState.tipoPagamento || 'CONTANTI',
          })
          setActionMessage(
            receipt.ok
              ? `Documento ${result.fullNumber} registrato. ${receipt.msg}${paymentNote}`
              : `Documento ${result.fullNumber} registrato ma scontrino non emesso: ${receipt.msg}${paymentNote}`,
          )
        } else {
          setActionMessage(`Documento ${result.fullNumber} salvato correttamente.${paymentNote}`)
        }
        return true
      } catch (err) {
        if (isCommitFunctionUnavailable(err)) {
          try {
            const fallback = await saveWithFallback(saveStatus)
            let paymentNote = ''
            if (saveStatus === 'confirmed' && fallback.documentId) {
              const emitted = await emitScheduledPayments(fallback.documentId, fallback.payload)
              if (emitted > 0) paymentNote = ` ${emitted} scadenze pagamento create.`
            }
            setActionMessage(`Documento salvato (modalità locale).${paymentNote}`)
            return true
          } catch (fallbackErr) {
            setLoadError(fallbackErr instanceof Error ? fallbackErr.message : 'Salvataggio non riuscito.')
          }
        } else {
          setLoadError(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
        }
        return false
      } finally {
        setSaving(false)
      }
    },
    [studioId, docState, activeRighe, buildPayload, savedDocumentId, patchDoc, saveWithFallback, studioData, emitScheduledPayments],
  )

  const rtConfigured = Boolean(studioData?.rtIp?.trim()) && !rtShouldSkipLanPrint(studioData?.rtModel)

  const handleScontrino = useCallback(() => {
    if (!rtConfigured) {
      setShowRtAvviso(true)
      return
    }
    void handleSave('confirmed', { emitReceipt: true })
  }, [handleSave, rtConfigured])

  const completeEmetti = useCallback(async () => {
    const ok = await handleSave('confirmed', { emitReceipt: rtConfigured })
    if (!ok) return
    patchDoc({ protetto: true, dataOraStampa: new Date().toLocaleString('it-IT') })
    if (!rtConfigured) setShowRtAvviso(true)
  }, [handleSave, patchDoc, rtConfigured])

  const handleEmetti = useCallback(() => {
    if (!studioId || !docState.cliente.nome.trim()) {
      alert('Seleziona un cliente')
      return
    }
    if (activeRighe.length === 0) {
      alert('Aggiungi almeno una riga al documento')
      return
    }
    const found = findAnomalieMagazzino(activeRighe.map(calcRiga), products)
    if (found.length) {
      setAnomalie(found)
      setPendingEmetti(true)
      return
    }
    void completeEmetti()
  }, [studioId, docState.cliente.nome, activeRighe, products, completeEmetti])

  const handleAnomalieYes = useCallback(() => {
    setAnomalie(null)
    if (pendingEmetti) {
      setPendingEmetti(false)
      void completeEmetti()
    }
  }, [pendingEmetti, completeEmetti])

  const handleUnlock = useCallback(() => {
    patchDoc({ protetto: false })
    setActionMessage('Documento sbloccato per modifica.')
  }, [patchDoc])

  const handleStampaOpen = useCallback(() => {
    if (activeRighe.length === 0) {
      alert('Aggiungi almeno una riga prima di stampare')
      return
    }
    const now = new Date().toLocaleString('it-IT')
    patchDoc({ dataOraStampa: now })
    setShowStampa(true)
  }, [activeRighe, patchDoc])

  const handleListinoChange = useCallback(
    (listino: string) => {
      patchDoc({
        listino,
        righe: refreshRigheListino(docState.righe, products, listino),
      })
    },
    [docState.righe, products, patchDoc],
  )

  const refreshListinoFromCatalog = useCallback(() => {
    void getProducts(studioId!).then(p => {
      setProducts(p)
      patchDoc({ righe: refreshRigheListino(docState.righe, p, docState.listino) })
      setActionMessage('Listino aggiornato dagli archivi prodotti.')
    })
  }, [studioId, docState.righe, docState.listino, patchDoc])

  const buildPrintDoc = useCallback((): {
    innerHtml: string
    title: string
    filename: string
    meta: AnteprimaStampaMeta
  } => {
    const docRecord: DocRecord = {
      id: savedDocumentId || '',
      ...buildPayload('confirmed'),
      createdAt: new Date(),
    }
    const righeCalcolate = activeRighe.map(calcRiga)
    const innerHtml = buildVenditaBancoFIXLabPrintBody({
      doc: docRecord,
      studio: studioData || undefined,
      cliente: docState.cliente,
      intestatario: docState.intestatario,
      destinazione: docState.destinazione,
      righe: righeCalcolate,
    })
    const title = `Vendita al banco ${docRecord.fullNumber}`
    const filename = buildPrintFilename('vendita_banco', 'Vendita_al_banco', docRecord.fullNumber)
    const meta: AnteprimaStampaMeta = {
      title,
      filename,
      fullNumber: docRecord.fullNumber,
      docDate: formatDataIt(docRecord.date),
      clienteNome: docState.cliente.nome,
      totalDocument: totals.totaleDocumento,
      studioName: studioData?.name || 'FIXLab',
    }
    return { innerHtml, title, filename, meta }
  }, [
    buildPayload,
    savedDocumentId,
    studioData,
    docState.cliente,
    docState.intestatario,
    docState.destinazione,
    activeRighe,
    totals.totaleDocumento,
  ])

  const openAnteprima = useCallback(
    (copie: number) => {
      const { innerHtml, meta } = buildPrintDoc()
      setAnteprimaHtml(innerHtml)
      setAnteprimaMeta(meta)
      setAnteprimaCopie(copie)
      setShowStampa(false)
      setShowAnteprima(true)
    },
    [buildPrintDoc],
  )

  const handleStampaPreview = useCallback(
    (copie: number) => {
      openAnteprima(copie)
    },
    [openAnteprima],
  )

  const handleStampaPrint = useCallback(
    (copie: number) => {
      const { innerHtml, title } = buildPrintDoc()
      for (let i = 0; i < Math.max(1, copie); i++) {
        printHtmlInIframe(innerHtml, title, VENDITA_BANCO_PRINT_CSS)
      }
      setShowStampa(false)
    },
    [buildPrintDoc],
  )

  const handleStampaPdf = useCallback(
    async (_copie: number) => {
      const { innerHtml, filename } = buildPrintDoc()
      try {
        await downloadHtmlAsPdf(innerHtml, filename, VENDITA_BANCO_PRINT_CSS)
        setShowStampa(false)
      } catch {
        alert('Generazione PDF non riuscita.')
      }
    },
    [buildPrintDoc],
  )

  const handleStampaEmail = useCallback(() => {
    const { meta } = buildPrintDoc()
    const subject = encodeURIComponent(`Vendita al banco ${meta.fullNumber}`)
    const body = encodeURIComponent(
      [
        `Vendita al banco n. ${meta.fullNumber} del ${meta.docDate}`,
        `Cliente: ${meta.clienteNome}`,
        `Totale documento: € ${meta.totalDocument.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
        '',
        meta.studioName,
      ].join('\n'),
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }, [buildPrintDoc])

  const handleStampaWhatsApp = useCallback(() => {
    const { meta } = buildPrintDoc()
    const text = encodeURIComponent(
      `Vendita al banco n. ${meta.fullNumber} del ${meta.docDate}\nCliente: ${meta.clienteNome}\nTotale: € ${meta.totalDocument.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
    )
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }, [buildPrintDoc])

  const handleEtichette = useCallback(() => {
    if (activeRighe.length === 0) {
      alert('Aggiungi almeno una riga con codice prodotto.')
      return
    }
    setShowEtichette(true)
  }, [activeRighe.length])

  const handleEtichettePrint = useCallback(() => {
    printVenditaBancoEtichette(activeRighe.map(calcRiga), docState.cliente.nome)
    setShowEtichette(false)
  }, [activeRighe, docState.cliente.nome])

  const handleAllegati = useCallback(() => {
    setShowAllegati(true)
  }, [])

  const documentStorageKey = savedDocumentId || `draft-${draftStorageKeyRef.current}`

  const uploadAllegatiFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!studioId) {
        alert('Archivio non disponibile.')
        return
      }
      const list = Array.from(files)
      if (!list.length) return
      setAllegatiUploading(true)
      try {
        const uploaded: DocumentAttachment[] = []
        for (const file of list) {
          uploaded.push(await uploadDocumentAttachment(studioId, documentStorageKey, file))
        }
        setAllegati(prev => [...prev, ...uploaded])
        setActionMessage(`${uploaded.length} allegato/i caricato/i su cloud.`)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Caricamento allegati non riuscito.')
      } finally {
        setAllegatiUploading(false)
      }
    },
    [studioId, documentStorageKey],
  )

  const handleAllegatiImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => {
      if (input.files?.length) void uploadAllegatiFiles(input.files)
    }
    input.click()
  }, [uploadAllegatiFiles])

  const handleAllegatiScan = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,application/pdf'
    input.onchange = () => {
      if (input.files?.length) void uploadAllegatiFiles(input.files)
    }
    input.click()
    setActionMessage('Seleziona il file acquisito dallo scanner (immagine o PDF).')
  }, [uploadAllegatiFiles])

  const handleAllegatiDelete = useCallback(async (item: DocumentAttachment) => {
    if (!confirm(`Eliminare l'allegato "${item.name}"?`)) return
    await deleteDocumentAttachment(item)
    setAllegati(prev => prev.filter(a => a.path !== item.path))
    setActionMessage(`Allegato "${item.name}" eliminato.`)
  }, [])

  const handleAllegatiOpen = useCallback((item: DocumentAttachment) => {
    window.open(item.url, '_blank', 'noopener,noreferrer')
  }, [])

  const handleAllegatiSmartphone = useCallback(() => {
    const { meta } = buildPrintDoc()
    const subject = encodeURIComponent(`Allegati — Vendita al banco ${meta.fullNumber}`)
    const body = encodeURIComponent(
      [
        'Invia una risposta a questa e-mail con gli allegati da associare al documento.',
        '',
        `Documento: ${meta.fullNumber} del ${meta.docDate}`,
        `Cliente: ${meta.clienteNome}`,
        '',
        meta.studioName,
      ].join('\n'),
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    setActionMessage('Aperta e-mail per invio allegati da smartphone.')
  }, [buildPrintDoc])

  const refreshProducts = useCallback(async () => {
    if (!studioId) return
    const p = await getProducts(studioId)
    setProducts(p)
    setDocState(prev => ({
      ...prev,
      righe: refreshRigheListino(prev.righe, p, prev.listino),
    }))
  }, [studioId])

  const handleGeneraDocConfirm = useCallback(
    async (targetType: DocumentType) => {
      if (!studioId) return
      if (!docState.cliente.nome.trim()) {
        alert('Seleziona un cliente')
        return
      }
      if (activeRighe.length === 0) {
        alert('Aggiungi almeno una riga al documento')
        return
      }
      setShowGeneraDoc(false)
      setSaving(true)
      setLoadError(null)
      try {
        let venditaId = savedDocumentId
        if (!venditaId) {
          const payload = omitUndefined(buildPayload('confirmed'))
          const saved = await callCommitDocument({ document: payload, assignNumber: true })
          venditaId = saved.documentId
          setSavedDocumentId(saved.documentId)
          patchDoc({ numero: saved.number })
          setStockCommitted(saved.stockCommitted)
          const docForPayments = {
            ...payload,
            number: saved.number,
            fullNumber: saved.fullNumber,
            documentYear: payload.documentYear,
          }
          await emitScheduledPayments(saved.documentId, docForPayments)
          invalidateDashboardCache(studioId)
        }

        const today = new Date().toISOString().slice(0, 10)
        const year = documentYearFromDate(today)
        const newNumber = await getNextDocumentNumber(studioId, targetType, year)
        const fullNum = buildFullNumber(newNumber, year, docState.numerazione)
        const rows = activeRighe.map(rigaToDocumentRow).map(r => ({ ...r, id: crypto.randomUUID() }))
        const linkedPayload = omitUndefined({
          studioId,
          type: targetType,
          number: newNumber,
          numbering: docState.numerazione || undefined,
          fullNumber: fullNum,
          date: today,
          documentYear: year,
          subjectType: 'client' as const,
          subjectId: docState.cliente.id || undefined,
          subjectName: docState.cliente.nome,
          subjectVat: docState.cliente.codFiscale || docState.cliente.partitaIva || undefined,
          subjectAddress: docState.intestatario.indirizzo
            ? [docState.intestatario.indirizzo, docState.intestatario.cap, docState.intestatario.citta, docState.intestatario.prov]
                .filter(Boolean)
                .join(', ')
            : undefined,
          rows,
          totalNet: totals.totNetto,
          totalVat: totals.totIva,
          totalDocument: totals.totaleDocumento,
          shippingCost: docState.speseImporto > 0 ? docState.speseImporto : undefined,
          shippingVatRate: docState.speseImporto > 0 ? docState.speseIva : undefined,
          shippingDescription: docState.speseTipo || undefined,
          priceList: listinoToPriceList(docState.listino),
          agentName: docState.agente && docState.agente !== '(Nessuno)' ? docState.agente : undefined,
          paymentMethod: docState.tipoPagamento || undefined,
          linkedDocumentId: venditaId,
          linkedDocumentType: 'vendita_banco' as DocumentType,
          status: 'draft' as DocRecord['status'],
        })

        try {
          const result = await callCommitDocument({ document: linkedPayload, assignNumber: true })
          closeVenditaBanco()
          navigate(`/documenti/${result.documentId}`)
        } catch (err) {
          if (isCommitFunctionUnavailable(err)) {
            const ref = await addDocument(linkedPayload)
            closeVenditaBanco()
            navigate(`/documenti/${ref.id}`)
          } else {
            throw err
          }
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Generazione documento non riuscita.')
      } finally {
        setSaving(false)
      }
    },
    [
      studioId,
      docState,
      activeRighe,
      savedDocumentId,
      buildPayload,
      patchDoc,
      totals,
      closeVenditaBanco,
      navigate,
    ],
  )

  const handleIncludiDoc = useCallback(async () => {
    if (!docState.cliente.id) {
      alert('Seleziona un cliente con anagrafica per includere documenti.')
      return
    }
    setShowIncludiDoc(true)
    setIncludiLoading(true)
    try {
      const all = await getDocuments(studioId!)
      setIncludiDocs(
        all.filter(
          d =>
            d.subjectId === docState.cliente.id &&
            d.id !== savedDocumentId &&
            d.type !== 'vendita_banco',
        ),
      )
    } finally {
      setIncludiLoading(false)
    }
  }, [docState.cliente.id, studioId, savedDocumentId])

  const handleIncludiSelect = useCallback(
    (included: DocRecord) => {
      const existingRows = activeRighe.map(rigaToDocumentRow)
      const merged = mergeIncludedRows(existingRows, included, 'dettagliata')
      const newRighe = merged.map(documentRowToRiga)
      const note = `Incluso doc. ${included.fullNumber} del ${included.date}`
      patchDoc({
        righe: newRighe,
        noteFine: docState.noteFine ? `${docState.noteFine}\n${note}` : note,
      })
      setShowIncludiDoc(false)
      setActionMessage(`Documento ${included.fullNumber} incluso (${included.rows.filter(r => r.description.trim()).length} righe aggiunte).`)
    },
    [activeRighe, docState.noteFine, patchDoc],
  )

  const selectClient = useCallback(
    (c: Client) => {
      patchDoc({
        cliente: {
          id: c.id,
          nome: c.name,
          codFiscale: c.fiscalCode || '',
          partitaIva: c.vatNumber || '',
        },
        intestatario: {
          indirizzo: c.address || '',
          cap: c.cap || '',
          citta: c.city || '',
          prov: c.province || '',
          nazione: 'Italia',
        },
      })
      setShowSelezioneCliente(false)
    },
    [patchDoc],
  )

  const selectNoClient = useCallback(() => {
    patchDoc({
      cliente: { id: '', nome: GENERIC_CLIENT_LABEL, codFiscale: '', partitaIva: '' },
    })
    setShowSelezioneCliente(false)
  }, [patchDoc])

  useEffect(() => {
    if (!venditaBancoOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault()
        handleScontrino()
      }
      if (e.key === 'F11') {
        e.preventDefault()
        if (docState.protetto) handleUnlock()
      }
      if (e.key === 'Escape' && !showStampa && !showAnteprima && !showSelezioneCliente && !showRtAvviso && !showIncludiDoc && !showAllegati && !showEtichette && !anomalie) {
        closeVenditaBanco()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    venditaBancoOpen,
    handleScontrino,
    handleUnlock,
    closeVenditaBanco,
    showStampa,
    showAnteprima,
    showSelezioneCliente,
    showRtAvviso,
    showIncludiDoc,
    showAllegati,
    showEtichette,
    anomalie,
    docState.protetto,
  ])

  if (!venditaBancoOpen) return null

  const studioReady = Boolean(studioId)

  const protetto = docState.protetto

  return createPortal(
    <div
      className="gestionale-mdi-backdrop vb-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vb-title"
    >
      <div
        className={`gestionale-mdi-window gestionale-mdi-window--vendita-banco vb-window${minimized ? ' gestionale-mdi-window--minimized' : ''}`}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="gestionale-mdi-window__titlebar">
          <span className="gestionale-mdi-window__title-icon" aria-hidden="true">
            €
          </span>
          <span id="vb-title" className="gestionale-mdi-window__title-text">
            Vendita al banco
          </span>
          <button
            type="button"
            className="gestionale-mdi-window__title-btn"
            title="Minimizza"
            onClick={() => setMinimized(m => !m)}
          >
            ☐
          </button>
          <button
            type="button"
            className="gestionale-mdi-window__title-btn gestionale-mdi-window__title-btn--close"
            title="Chiudi"
            onClick={closeVenditaBanco}
          >
            ✕
          </button>
        </div>

        {!minimized ? (
          <div className="gestionale-mdi-window__body">
            {!studioReady ? (
              <div className="gestionale-mdi-window__loading">
                {studioLoading
                  ? 'Caricamento archivio…'
                  : 'Archivio non disponibile. Seleziona un archivio dalla barra in alto.'}
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

                {protetto ? (
                  <div className="vb-protected-banner">
                    Documento protetto da modifica —{' '}
                    <button type="button" className="vb-link" onClick={handleUnlock}>
                      sblocca (F11)
                    </button>
                  </div>
                ) : null}

                <div className="gestionale-mdi-window__scroll">
                  <div className="vb-header-row">
                    <WinField label="Cliente" htmlFor="vb-cliente" className="vb-header-field--cliente">
                      <div className="vb-row">
                        <WinInput
                          id="vb-cliente"
                          className="vb-input--flex"
                          value={docState.cliente.nome}
                          readOnly
                          disabled={protetto}
                          placeholder="Seleziona cliente…"
                        />
                        <WinIconBtn
                          title="Ricerca clienti"
                          className="vb-icon-btn--binocular"
                          onClick={() => !protetto && setShowSelezioneCliente(true)}
                        >
                          🔭
                        </WinIconBtn>
                      </div>
                    </WinField>

                    <WinField label="Listino" htmlFor="vb-listino" className="vb-header-field--listino">
                      <div className="vb-row">
                        <WinSelect
                          id="vb-listino"
                          className="vb-input--flex"
                          value={docState.listino}
                          disabled={protetto}
                          onChange={e => handleListinoChange(e.target.value)}
                        >
                          {LISTINI.map(l => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </WinSelect>
                        <WinIconBtn
                          title="Aggiorna listino"
                          className="vb-icon-btn--refresh"
                          disabled={protetto}
                          onClick={refreshListinoFromCatalog}
                        >
                          ↻
                        </WinIconBtn>
                      </div>
                    </WinField>

                    <WinField label="Agente" htmlFor="vb-agente" className="vb-header-field--agente">
                      <div className="vb-row">
                        <WinSelect
                          id="vb-agente"
                          className="vb-input--flex"
                          value={docState.agente || agenti[0]}
                          disabled={protetto}
                          onChange={e => patchDoc({ agente: e.target.value })}
                        >
                          {agenti.map(a => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </WinSelect>
                        <WinIconBtn title="Scheda agente" disabled={protetto}>
                          📄
                        </WinIconBtn>
                      </div>
                    </WinField>

                    <WinField label="Data" htmlFor="vb-data" className="vb-header-field--data">
                      <div className="vb-row">
                        <WinInput
                          id="vb-data"
                          value={formatDataIt(docState.data)}
                          disabled={protetto}
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
                          disabled={protetto}
                          onChange={e => patchDoc({ data: e.target.value })}
                        />
                        <WinIconBtn
                          title="Calendario"
                          disabled={protetto}
                          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                        >
                          📅
                        </WinIconBtn>
                      </div>
                    </WinField>

                    <WinField label="Numero" htmlFor="vb-numero" className="vb-header-field--numero">
                      <WinInput
                        id="vb-numero"
                        type="number"
                        min={1}
                        value={docState.numero}
                        disabled={protetto}
                        onChange={e => patchDoc({ numero: parseInt(e.target.value, 10) || 1 })}
                      />
                    </WinField>

                    <WinField label="Numeraz." htmlFor="vb-numeraz" className="vb-header-field--numeraz">
                      <WinSelect
                        id="vb-numeraz"
                        value={docState.numerazione}
                        disabled={protetto}
                        onChange={e => handleNumerazioneChange(e.target.value)}
                      >
                        <option value="">—</option>
                        {NUMERAZIONI.filter(n => n).map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </WinSelect>
                    </WinField>

                    <label className="vb-check-label vb-header-field--followup">
                      <input
                        type="checkbox"
                        checked={docState.seguiraDocVendita}
                        disabled={protetto}
                        onChange={e => patchDoc({ seguiraDocVendita: e.target.checked })}
                      />
                      Seguirà doc. di vendita
                    </label>
                  </div>

                  <div className="gestionale-mdi-window__tabs" role="tablist">
                    {VENDITA_BANCO_TABS.map(tab => (
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

                  <div className="gestionale-mdi-window__panel" role="tabpanel">
                    {activeTab === 'righe' ? (
                      <TabRigheDocumento
                        doc={docWithTotals}
                        products={products}
                        categories={categories}
                        studioId={studioId || undefined}
                        protetto={protetto}
                        onChange={patchDoc}
                        onProductsChange={() => void refreshProducts()}
                        onToast={setActionMessage}
                        onIncludiDoc={() => void handleIncludiDoc()}
                      />
                    ) : null}
                    {activeTab === 'pagamento' ? <TabPagamento doc={docWithTotals} protetto={protetto} onChange={patchDoc} /> : null}
                    {activeTab === 'note' ? <TabNote doc={docState} protetto={protetto} onChange={patchDoc} /> : null}
                    {activeTab === 'indirizzi' ? <TabIndirizzi doc={docState} protetto={protetto} onChange={patchDoc} /> : null}
                    {activeTab === 'opzioni' ? <TabOpzioni doc={docState} protetto={protetto} onChange={patchDoc} /> : null}
                  </div>
                </div>

                <div className="vb-footer-row">
                  <div className="vb-footer-fields">
                    <WinField label="Spese" htmlFor="vb-spese-tipo">
                      <div className="vb-row">
                        <WinSelect
                          id="vb-spese-tipo"
                          className="vb-input--flex"
                          value={docState.speseTipo}
                          disabled={protetto}
                          onChange={e =>
                            patchDoc({
                              speseTipo: e.target.value === '(Nessuna)' ? '' : e.target.value,
                            })
                          }
                        >
                          {TIPI_SPESE.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </WinSelect>
                        <WinIconBtn title="Tipi spese">📄</WinIconBtn>
                      </div>
                    </WinField>
                    <WinField label="Iva" htmlFor="vb-spese-iva">
                      <WinSelect
                        id="vb-spese-iva"
                        value={docState.speseIva}
                        disabled={protetto}
                        onChange={e => patchDoc({ speseIva: parseInt(e.target.value, 10) || 22 })}
                      >
                        {IVA_ALIQUOTE.map(v => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </WinSelect>
                    </WinField>
                    <WinField label="Importo ivato" htmlFor="vb-spese-importo">
                      <WinInput
                        id="vb-spese-importo"
                        type="number"
                        min={0}
                        step={0.01}
                        className="vb-input--right"
                        value={docState.speseImporto || ''}
                        disabled={protetto}
                        onChange={e => patchDoc({ speseImporto: parseFloat(e.target.value) || 0 })}
                      />
                    </WinField>
                    <WinField label="Commento ad uso interno" htmlFor="vb-commento" className="vb-footer-field--commento">
                      <div className="vb-row">
                        <WinInput
                          id="vb-commento"
                          className="vb-input--flex"
                          value={docState.commentoInterno}
                          disabled={protetto}
                          onChange={e => patchDoc({ commentoInterno: e.target.value })}
                        />
                        <WinDropdownMenu
                          disabled={protetto}
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
                  <FooterTotals doc={docWithTotals} vociCount={activeRighe.length} onRefresh={handleRecalcTotals} />
                </div>

                <div className="gestionale-mdi-window__actionbar">
                  <button type="button" className="gestionale-mdi-window__action-btn" onClick={handleScontrino} disabled={saving}>
                    🧾 Scontrino (F6)
                  </button>
                  <button type="button" className="gestionale-mdi-window__action-btn" onClick={handleStampaOpen} disabled={saving}>
                    🖨 Stampa
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn"
                    onClick={handleEtichette}
                    disabled={saving}
                  >
                    🏷 Etichette
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn"
                    onClick={handleAllegati}
                    disabled={saving}
                    title={allegati.length ? allegati.map(a => a.name).join(', ') : undefined}
                  >
                    📎 Allegati…{allegati.length ? ` (${allegati.length})` : ''}
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn"
                    onClick={() => void handleIncludiDoc()}
                    disabled={!docState.cliente.id || !includiDocAvailable || saving}
                    title={
                      !docState.cliente.id
                        ? 'Seleziona un cliente registrato'
                        : !includiDocAvailable
                          ? 'Nessun documento da includere per questo cliente'
                          : undefined
                    }
                  >
                    📄 Includi doc.
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn"
                    onClick={() => setShowGeneraDoc(true)}
                    disabled={saving}
                  >
                    📋 Genera doc.
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn gestionale-mdi-window__action-btn--primary"
                    onClick={() => void handleEmetti()}
                    disabled={saving || protetto}
                    title="Conferma documento e scarica magazzino"
                  >
                    💾↗ Emetti
                  </button>
                  <div className="gestionale-mdi-window__action-spacer" />
                  <button type="button" className="gestionale-mdi-window__action-btn" onClick={handleCalculator} title="Calcolatrice">
                    🧮
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn"
                    onClick={() =>
                      setActionMessage(
                        'Guida: Emetti conferma e scarica magazzino; F6 scontrino; F11 sblocca documento emesso; Esc chiude.',
                      )
                    }
                  >
                    ?
                  </button>
                  <button
                    type="button"
                    className="gestionale-mdi-window__action-btn gestionale-mdi-window__action-btn--close"
                    onClick={closeVenditaBanco}
                  >
                    ✕ Chiudi
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {studioReady && showSelezioneCliente ? (
        <SelezioneClienteDialog
          clients={clients}
          currentMode={clientModeFromNome(docState.cliente.nome, Boolean(docState.cliente.id))}
          onSelectExisting={selectClient}
          onSelectNone={selectNoClient}
          onNewClient={() => setShowClientForm(true)}
          onClose={() => setShowSelezioneCliente(false)}
        />
      ) : null}

      {studioReady && showClientForm ? (
        <ClientFormModal
          studioId={studioId}
          client={null}
          onSave={c => {
            setClients(prev => [c, ...prev])
            selectClient(c)
            setShowClientForm(false)
          }}
          onClose={() => setShowClientForm(false)}
        />
      ) : null}

      {studioReady && showStampa ? (
        <StampaDialog
          onClose={() => setShowStampa(false)}
          onPreview={handleStampaPreview}
          onPrint={handleStampaPrint}
          onPdf={copie => void handleStampaPdf(copie)}
          onEmail={() => handleStampaEmail()}
          onWhatsApp={() => handleStampaWhatsApp()}
        />
      ) : null}

      {studioReady && showAnteprima && anteprimaMeta ? (
        <AnteprimaStampaDialog
          innerHtml={anteprimaHtml}
          meta={anteprimaMeta}
          initialCopie={anteprimaCopie}
          onClose={() => setShowAnteprima(false)}
        />
      ) : null}

      {studioReady && showIncludiDoc ? (
        <IncludiDocumentiDialog
          documents={includiDocs}
          loading={includiLoading}
          onSelect={handleIncludiSelect}
          onClose={() => setShowIncludiDoc(false)}
        />
      ) : null}

      {showRtAvviso ? <RegistratoreCassaAvvisoDialog onClose={() => setShowRtAvviso(false)} /> : null}

      {anomalie ? (
        <AnomalieMagazzinoDialog
          anomalies={anomalie}
          onYes={handleAnomalieYes}
          onNo={() => {
            setAnomalie(null)
            setPendingEmetti(false)
          }}
          onPrint={() => {
            const body = anomalie
              .map(a => `<tr><td>${a.codice}</td><td>${a.descrizione}</td><td>${a.richiesta}</td><td>${a.giacenza}</td></tr>`)
              .join('')
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Anomalie magazzino</title></head><body><h2>Anomalie magazzino</h2><table border="1" cellpadding="6"><thead><tr><th>Codice</th><th>Descrizione</th><th>Richiesta</th><th>Giacenza</th></tr></thead><tbody>${body}</tbody></table></body></html>`
            printHtmlInIframe(html, 'Anomalie magazzino')
          }}
        />
      ) : null}

      {showAllegati ? (
        <AllegatiDialog
          attachments={allegati}
          uploading={allegatiUploading}
          onSmartphone={handleAllegatiSmartphone}
          onScan={handleAllegatiScan}
          onImport={handleAllegatiImport}
          onOpen={handleAllegatiOpen}
          onDelete={item => void handleAllegatiDelete(item)}
          onClose={() => setShowAllegati(false)}
        />
      ) : null}

      {showGeneraDoc ? (
        <GeneraDocCollegatoDialog onGenerate={tipo => void handleGeneraDocConfirm(tipo)} onClose={() => setShowGeneraDoc(false)} />
      ) : null}

      {showEtichette ? (
        <EtichetteDialog
          righe={activeRighe.map(calcRiga)}
          onPrint={handleEtichettePrint}
          onClose={() => setShowEtichette(false)}
        />
      ) : null}
    </div>,
    document.body,
  )
}
