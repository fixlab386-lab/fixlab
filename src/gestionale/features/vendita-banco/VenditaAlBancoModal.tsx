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
  getNextDocumentNumber,
  updateDocument,
} from '../../../lib/firestore'
import { loadRecentClients, loadSubjectDocuments, loadRecentProducts, hasLinkableClientDocuments } from '../../../lib/loadStudioCatalog'
import { callCommitDocument, isCommitFunctionUnavailable } from '../../../lib/commitDocument'
import { formatCallableError } from '../../../lib/cloudFunctions'
import { omitUndefined } from '../../../lib/firestoreSanitize'
import { GENERIC_CLIENT_LABEL } from '../../../lib/clientSearch'
import { sendFiscalReceiptToRt, documentRowsToRtItems, rtItemsGrossTotal, rtShouldSkipLanPrint, normalizeRtPaymentLabel } from '../../../lib/rtPrinter'
import { buildVenditaBancoConfermaModel, buildVenditaBancoDaneaHtml, VENDITA_BANCO_DANEA_CSS } from '../../../lib/venditaBancoPrint'
import { DEFAULT_VENDITA_BANCO_DISCLAIMER } from '../../../lib/confermaOrdineTemplate'
import { getDocumentTypePrintOptions, resolvePrintDisclaimer, studioDataToConfermaStudio } from '../../../lib/printTemplates'
import { applyModelloToPrintOptions, type StampaModello } from '../../../lib/stampaModelli'
import {
  buildPrintFilename,
  downloadHtmlAsPdf,
  printHtmlInIframe,
} from '../../../lib/printDocument'
import { buildFullNumber, documentYearFromDate } from '../../../gestionale/features/documenti'
import { mergeIncludedRows } from '../documenti/inclusionUtils'
import { emitPaymentsForDocumentIfNeeded } from '../../lib/paymentSchedule'
import { docRecordToVenditaBancoState } from '../../lib/docRecordLoaders'
import { invalidateDashboardCache } from '../start/dashboardCache'
import {
  confirmSaveDocumentOnClose,
  documentNeedsSaveOnClose,
  isDocumentStateDirty,
  snapshotDocumentState,
} from '../../lib/confirmSaveOnClose'
import type { Category, Client, DocRecord, DocumentType, Product } from '../../../types'
import ClientFormModal from '../../../components/ClientFormModal'
import { NUMERAZIONI, VENDITA_BANCO_TABS, COMMENTI_INTERNI_PREDEFINITI } from './constants'
import { getCustomCommentiInterni, addCustomCommentoInterno } from '../../../lib/userPrefs'
import StampaDialog from './dialogs/StampaDialog'
import AnteprimaStampaDialog, { type AnteprimaStampaMeta } from './dialogs/AnteprimaStampaDialog'
import RegistratoreCassaAvvisoDialog from './dialogs/RegistratoreCassaAvvisoDialog'
import IncludiDocumentiDialog from './dialogs/IncludiDocumentiDialog'
import AnomalieMagazzinoDialog from './dialogs/AnomalieMagazzinoDialog'
import GeneraDocCollegatoDialog from './dialogs/GeneraDocCollegatoDialog'
import EasyfattCalcDialog from './dialogs/EasyfattCalcDialog'
import ClientSearchDialog from '../../../components/clients/ClientSearchDialog'
import FooterTotals from './FooterTotals'
import { findAnomalieMagazzino, type AnomaliaMagazzino } from './stockCheck'
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
  const { venditaBancoOpen, closeVenditaBanco, venditaBancoSeed, venditaBancoEditId } = useAppWindows()
  const navigate = useNavigate()

  const [docState, setDocState] = useState<DocumentoVenditaBanco>(createInitialDocumento)
  const [activeTab, setActiveTab] = useState<TabVenditaBancoId>('righe')
  const [minimized, setMinimized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [stockCommitted, setStockCommitted] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
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
  const [showCalc, setShowCalc] = useState(false)
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
    setSavedSnapshot(null)
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
    setShowCalc(false)
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
    if (!venditaBancoOpen) {
      setSavedSnapshot(null)
      return
    }
    if (venditaBancoEditId) {
      setActiveTab('righe')
      setMinimized(false)
      setLoadError(null)
      setActionMessage(null)
      setShowSelezioneCliente(false)
      void getDoc(doc(db, 'documents', venditaBancoEditId)).then(snap => {
        if (!snap.exists()) {
          setLoadError('Documento non trovato.')
          return
        }
        const record = { id: snap.id, ...(snap.data() as DocRecord) }
        setDocState(docRecordToVenditaBancoState(record))
        setSavedDocumentId(record.id)
        setSavedSnapshot(null)
        setStockCommitted(Boolean(record.stockCommitted))
      })
      return
    }
    if (!venditaBancoSeed) {
      reset()
    } else {
      setActiveTab('righe')
      setMinimized(false)
      setLoadError(null)
      setActionMessage(null)
      setSavedDocumentId(null)
      setStockCommitted(false)
    }
  }, [venditaBancoOpen, venditaBancoSeed, venditaBancoEditId, reset])

  useEffect(() => {
    if (!venditaBancoOpen || !studioId || venditaBancoEditId) return
    Promise.all([loadRecentClients(studioId), loadRecentProducts(studioId), getCategories(studioId)]).then(([c, p, cats]) => {
      setClients(c)
      setProducts(p)
      setCategories(cats)
      if (!venditaBancoSeed) {
        setDocState(prev => ({
          ...prev,
          righe: refreshRigheListino(prev.righe, p, prev.listino),
        }))
      }
    })
    getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as StudioDoc)
    })
    const today = new Date().toISOString().slice(0, 10)
    const docDate = venditaBancoSeed?.data || today
    void getNextDocumentNumber(studioId, 'vendita_banco', documentYearFromDate(docDate)).then(num => {
      if (venditaBancoSeed) {
        const totals = documentTotalsFromRighe(venditaBancoSeed.righe, 0, 22)
        patchDoc({
          cliente: venditaBancoSeed.cliente,
          listino: venditaBancoSeed.listino,
          data: docDate,
          numero: num,
          intestatario: venditaBancoSeed.intestatario,
          destinazione: venditaBancoSeed.destinazione,
          tipoPagamento: venditaBancoSeed.tipoPagamento || '',
          commentoInterno: venditaBancoSeed.commentoInterno || '',
          righe: venditaBancoSeed.righe,
          ...totals,
        })
      } else {
        patchDoc({
          data: today,
          numero: num,
          cliente: { id: '', nome: GENERIC_CLIENT_LABEL, codFiscale: '', partitaIva: '' },
        })
      }
    })
  }, [venditaBancoOpen, studioId, patchDoc, venditaBancoSeed])

  useEffect(() => {
    if (!studioId || !docState.cliente.id) {
      setIncludiDocAvailable(false)
      return
    }
    void loadSubjectDocuments(studioId, docState.cliente.id, 200).then(all => {
      setIncludiDocAvailable(hasLinkableClientDocuments(all, docState.cliente.id, savedDocumentId))
    })
  }, [studioId, docState.cliente.id, savedDocumentId])

  const handleRecalcTotals = useCallback(() => {
    setActionMessage('Totali ricalcolati.')
  }, [])

  const handleCalculator = useCallback(() => {
    setShowCalc(true)
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
    () => docState.righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota'),
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

  const isDirty = useMemo(
    () => isDocumentStateDirty(docWithTotals, savedSnapshot),
    [docWithTotals, savedSnapshot],
  )

  useEffect(() => {
    if (venditaBancoOpen && savedSnapshot === null) {
      setSavedSnapshot(snapshotDocumentState(docWithTotals))
    }
  }, [venditaBancoOpen, docWithTotals, savedSnapshot])

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
        pricesVatIncluded: docState.prezziIvati ?? true,
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
      }
    },
    [studioId, docState, activeRighe, documentYear, totals, stockCommitted],
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
            paymentLabel: normalizeRtPaymentLabel(docState.tipoPagamento || 'CONTANTI'),
          })
          setActionMessage(
            receipt.ok
              ? `Documento ${result.fullNumber} registrato. ${receipt.msg}${paymentNote}`
              : `Documento ${result.fullNumber} registrato ma scontrino non emesso: ${receipt.msg}${paymentNote}`,
          )
        } else {
          setActionMessage(`Documento ${result.fullNumber} salvato correttamente.${paymentNote}`)
        }
        setSavedSnapshot(snapshotDocumentState({ ...docWithTotals, numero: result.number }))
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
            setSavedSnapshot(snapshotDocumentState(docWithTotals))
            return true
          } catch (fallbackErr) {
            setLoadError(fallbackErr instanceof Error ? fallbackErr.message : 'Salvataggio non riuscito.')
          }
        } else {
          setLoadError(formatCallableError(err, 'Salvataggio non riuscito.'))
        }
        return false
      } finally {
        setSaving(false)
      }
    },
    [studioId, docState, activeRighe, buildPayload, savedDocumentId, patchDoc, saveWithFallback, studioData, emitScheduledPayments, docWithTotals],
  )

  const handleClose = useCallback(async () => {
    const needsPrompt = documentNeedsSaveOnClose(activeRighe.length > 0, savedDocumentId, isDirty)
    const outcome = await confirmSaveDocumentOnClose(needsPrompt, async () => {
      const ok = await handleSave('confirmed')
      if (!ok) throw new Error('Salvataggio non riuscito.')
    })
    if (outcome === 'close') {
      closeVenditaBanco()
    }
  }, [activeRighe.length, savedDocumentId, isDirty, handleSave, closeVenditaBanco])

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
    void loadRecentProducts(studioId!).then(p => {
      setProducts(p)
      patchDoc({ righe: refreshRigheListino(docState.righe, p, docState.listino) })
      setActionMessage('Listino aggiornato dagli archivi prodotti.')
    })
  }, [studioId, docState.righe, docState.listino, patchDoc])

  const buildPrintDoc = useCallback((modello?: StampaModello): {
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
    const baseOptions = getDocumentTypePrintOptions(studioData ?? undefined, 'vendita_banco')
    const printOptions = applyModelloToPrintOptions(baseOptions, modello, 'vendita_banco')
    const studio = studioDataToConfermaStudio(studioData || undefined) ?? { name: 'FIXLab' }
    const model = {
      ...buildVenditaBancoConfermaModel(
        {
          doc: docRecord,
          cliente: docState.cliente,
          intestatario: docState.intestatario,
          destinazione: docState.destinazione,
          righe: righeCalcolate,
        },
        studio,
        printOptions.titoloStampa || 'Vendita al banco',
      ),
      clientBoxTitle: printOptions.template.clientBoxTitle,
      rightBoxTitle: printOptions.template.secondBoxTitle,
      showRightBox: printOptions.template.showSecondBox,
      totalLabel: printOptions.template.totalLabel,
      disclaimer: resolvePrintDisclaimer(studio, printOptions, DEFAULT_VENDITA_BANCO_DISCLAIMER),
    }
    const innerHtml = buildVenditaBancoDaneaHtml(model)
    const title = `${printOptions.titoloStampa || 'Vendita al banco'} ${docRecord.fullNumber}`
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
        printHtmlInIframe(innerHtml, title, VENDITA_BANCO_DANEA_CSS)
      }
      setShowStampa(false)
    },
    [buildPrintDoc],
  )

  const handleStampaPdf = useCallback(
    async (_copie: number, modello?: StampaModello) => {
      const { innerHtml, filename } = buildPrintDoc(modello)
      try {
        await downloadHtmlAsPdf(innerHtml, filename, VENDITA_BANCO_DANEA_CSS)
        setShowStampa(false)
      } catch {
        alert('Generazione PDF non riuscita.')
      }
    },
    [buildPrintDoc],
  )

  const refreshProducts = useCallback(async () => {
    if (!studioId) return
    const p = await loadRecentProducts(studioId)
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
          try {
            const saved = await callCommitDocument({ document: payload, assignNumber: true })
            venditaId = saved.documentId
            setSavedDocumentId(saved.documentId)
            patchDoc({ numero: saved.number })
            setStockCommitted(saved.stockCommitted)
            try {
              const docForPayments = {
                ...payload,
                number: saved.number,
                fullNumber: saved.fullNumber,
                documentYear: payload.documentYear,
              }
              await emitScheduledPayments(saved.documentId, docForPayments)
            } catch {
              /* pagamenti non bloccano la generazione documento */
            }
            invalidateDashboardCache(studioId)
          } catch (err) {
            if (isCommitFunctionUnavailable(err)) {
              const fallback = await saveWithFallback('confirmed')
              venditaId = fallback.documentId
              try {
                await emitScheduledPayments(fallback.documentId, fallback.payload)
              } catch {
                /* pagamenti non bloccano */
              }
            } else {
              throw err
            }
          }
        }

        const today = new Date().toISOString().slice(0, 10)
        const year = documentYearFromDate(today)
        const rows = activeRighe.map(rigaToDocumentRow).map(r => ({ ...r, id: crypto.randomUUID() }))
        const linkedPayload = omitUndefined({
          studioId,
          type: targetType,
          number: 0,
          fullNumber: '',
          numbering: docState.numerazione || undefined,
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
            const newNumber = await getNextDocumentNumber(studioId, targetType, year)
            const fullNum = buildFullNumber(newNumber, year, docState.numerazione)
            const ref = await addDocument({ ...linkedPayload, number: newNumber, fullNumber: fullNum })
            closeVenditaBanco()
            navigate(`/documenti/${ref.id}`)
          } else {
            throw err
          }
        }
      } catch (e) {
        setLoadError(formatCallableError(e, 'Generazione documento non riuscita.'))
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
      emitScheduledPayments,
      saveWithFallback,
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
      const all = await loadSubjectDocuments(studioId!, docState.cliente.id, 200)
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
      if (e.key === 'Escape' && !showStampa && !showAnteprima && !showSelezioneCliente && !showRtAvviso && !showIncludiDoc && !anomalie) {
        void handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    venditaBancoOpen,
    handleScontrino,
    handleUnlock,
    handleClose,
    showStampa,
    showAnteprima,
    showSelezioneCliente,
    showRtAvviso,
    showIncludiDoc,
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
            onClick={() => void handleClose()}
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

                    <div className="gestionale-mdi-window__doc-shell">
                      <div className="vb-header-row vb-header-row--danea">
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

                      <div className="gestionale-mdi-window__panel gestionale-mdi-window__panel--doc" role="tabpanel">
                    {activeTab === 'righe' ? (
                      <TabRigheDocumento
                        doc={docWithTotals}
                        products={products}
                        categories={categories}
                        studioId={studioId || undefined}
                        protetto={protetto}
                        prezziIvati={docState.prezziIvati ?? true}
                        onPrezziModeChange={ivati => patchDoc({ prezziIvati: ivati })}
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

      {studioReady && showSelezioneCliente ? (
        <ClientSearchDialog
          studioId={studioId}
          onSelect={selectClient}
          onNoClient={selectNoClient}
          onNewClient={() => {
            setShowSelezioneCliente(false)
            setShowClientForm(true)
          }}
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
          onPdf={(copie, modello) => void handleStampaPdf(copie, modello)}
        />
      ) : null}

      {studioReady && showAnteprima && anteprimaMeta ? (
        <AnteprimaStampaDialog
          innerHtml={anteprimaHtml}
          meta={anteprimaMeta}
          initialCopie={anteprimaCopie}
          printCss={VENDITA_BANCO_DANEA_CSS}
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

      {showGeneraDoc ? (
        <GeneraDocCollegatoDialog onGenerate={tipo => void handleGeneraDocConfirm(tipo)} onClose={() => setShowGeneraDoc(false)} />
      ) : null}

      {showCalc ? (
        <EasyfattCalcDialog
          onClose={() => setShowCalc(false)}
          onApply={value => {
            setActionMessage(
              `Calcolatrice: € ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (copiato negli appunti)`,
            )
          }}
        />
      ) : null}

    </div>,
    document.body,
  )
}
