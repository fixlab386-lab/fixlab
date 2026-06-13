import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppWindows } from '../contexts/AppWindowsContext'
import { useAuth } from '../hooks/useAuth'
import { useActiveStudio } from '../hooks/useActiveStudio'
import {
  addDocument,
  updateDocument,
  getNextDocumentNumber,
  getProducts,
  getClients,
  getSuppliers,
  getDocuments,
  getCategories,
} from '../lib/firestore'
import { emitPaymentsForDocumentIfNeeded } from '../gestionale/lib/paymentSchedule'
import { invalidateDashboardCache } from '../gestionale/features/start/dashboardCache'
import { callCommitDocument, isCommitFunctionUnavailable } from '../lib/commitDocument'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Category, Client, DocRecord, DocumentRow, DocumentType, Product, Supplier } from '../types'
import { generateDocumentPDF } from '../lib/generatePDF'
import { sendFiscalReceiptToRt, documentRowsToRtItems, rtItemsGrossTotal } from '../lib/rtPrinter'
import { printVenditaBancoDocument } from '../lib/venditaBancoPrint'
import AllegatiDialog from '../gestionale/features/vendita-banco/dialogs/AllegatiDialog'
import { printDocumentRowEtichette } from '../gestionale/features/vendita-banco/venditaBancoEtichette'
import ClientFormModal from '../components/ClientFormModal'
import ClientSearchDialog from '../components/clients/ClientSearchDialog'
import { GENERIC_CLIENT_LABEL } from '../lib/clientSearch'
import RepairSection from '../components/repair/RepairSection'
import {
  ACTIVE_DOCUMENT_LABELS,
  ACTIVE_DOCUMENT_TYPES,
  DOCUMENT_PAYMENT_METHODS,
  DOCUMENT_TRANSFORM_MAP,
  DocumentFormTabBar,
  DocumentLineItemsSection,
  DocumentTotalsSection,
  VENDITA_BANCO_FORM_TABS,
  IncludiDocumentiDialog,
  buildFullNumber,
  documentTotals,
  documentYearFromDate,
  documentTypeLabel,
  emptyDocumentRow,
  getIncludableDocuments,
  mergeIncludedRows,
  applyInclusionSideEffects,
  isPurchaseDocumentType,
  subjectLabelForType,
} from '../gestionale/features/documenti'
import type { ActiveDocumentType, DocumentFormTabId } from '../gestionale/features/documenti/constants'
import { ActionBar, FormField, ToolButton, type ActionBarAction } from '../components/ui'
import '../theme/gestionale-document-form.css'
import '../gestionale/theme/clienti-section.css'

type StudioDoc = {
  name?: string
  address?: string
  city?: string
  province?: string
  cap?: string
  vatNumber?: string
  phone?: string
  email?: string
  disclaimer?: string
  rtIp?: string
  rtModel?: string
}

function parseDocType(raw: string | null): ActiveDocumentType {
  if (raw && ACTIVE_DOCUMENT_TYPES.includes(raw as ActiveDocumentType)) {
    return raw as ActiveDocumentType
  }
  return 'preventivo'
}

export default function NuovoDocumento() {
  const { userProfile } = useAuth()
  const { studioId } = useActiveStudio()
  const navigate = useNavigate()
  const { openVenditaBanco } = useAppWindows()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const initialType = parseDocType(searchParams.get('type'))
  const initialSubjectType =
    searchParams.get('subjectType') === 'supplier' || isPurchaseDocumentType(initialType)
      ? ('supplier' as const)
      : ('client' as const)

  useEffect(() => {
    if (initialType === 'vendita_banco' && !isEdit) {
      openVenditaBanco()
      navigate('/', { replace: true })
    }
  }, [initialType, isEdit, openVenditaBanco, navigate])

  if (initialType === 'vendita_banco' && !isEdit) {
    return null
  }

  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stockWarning, setStockWarning] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [studioData, setStudioData] = useState<StudioDoc | null>(null)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const [type, setType] = useState<ActiveDocumentType>(parseDocType(searchParams.get('type')))
  const [number, setNumber] = useState(1)
  const [numbering, setNumbering] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [subjectId, setSubjectId] = useState('')
  const [subjectType, setSubjectType] = useState<'client' | 'supplier'>(initialSubjectType)
  const [subjectName, setSubjectName] = useState('')
  const [subjectVat, setSubjectVat] = useState('')
  const [subjectAddress, setSubjectAddress] = useState('')
  const [rows, setRows] = useState<DocumentRow[]>([emptyDocumentRow()])
  const [priceList, setPriceList] = useState<DocRecord['priceList']>('privati')
  const [internalNotes, setInternalNotes] = useState('')
  const [validityDays, setValidityDays] = useState(30)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [agentName, setAgentName] = useState('')
  const [followUpDoc, setFollowUpDoc] = useState(false)
  const [shippingDescription, setShippingDescription] = useState('')
  const [shippingCost, setShippingCost] = useState(0)
  const [shippingVatRate, setShippingVatRate] = useState(22)
  const [noteQuoteDesc, setNoteQuoteDesc] = useState('')
  const [noteDelivery, setNoteDelivery] = useState('')
  const [noteFree3, setNoteFree3] = useState('')
  const [noteFree4, setNoteFree4] = useState('')
  const [documentEndNotes, setDocumentEndNotes] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankIban, setBankIban] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryProvince, setDeliveryProvince] = useState('')
  const [deliveryCap, setDeliveryCap] = useState('')
  const [activeFormTab, setActiveFormTab] = useState<DocumentFormTabId>('righe')
  const [status, setStatus] = useState<DocRecord['status']>('draft')
  const [stockCommitted, setStockCommitted] = useState(false)
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(id || null)
  const [receiptResult, setReceiptResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [allegati, setAllegati] = useState<string[]>([])
  const [lotteryCode, setLotteryCode] = useState('')
  const [renewalReminder, setRenewalReminder] = useState(false)
  const [renewalMonths, setRenewalMonths] = useState(12)
  const [printDateTime, setPrintDateTime] = useState('')
  const [showAllegati, setShowAllegati] = useState(false)
  const [showIncludi, setShowIncludi] = useState(false)
  const [includiLoading, setIncludiLoading] = useState(false)
  const [includibleDocs, setIncludibleDocs] = useState<DocRecord[]>([])

  const documentYear = useMemo(() => documentYearFromDate(date), [date])
  const fullNumberPreview = useMemo(
    () => buildFullNumber(number, documentYear, numbering),
    [number, documentYear, numbering],
  )
  const activeRows = useMemo(() => rows.filter(r => r.description), [rows])
  const isVenditaBanco = type === 'vendita_banco'
  const totals = useMemo(
    () => documentTotals(activeRows, isVenditaBanco ? shippingCost : 0, isVenditaBanco ? shippingVatRate : 22),
    [activeRows, isVenditaBanco, shippingCost, shippingVatRate],
  )
  const transforms = DOCUMENT_TRANSFORM_MAP[type] || []

  useEffect(() => {
    if (!studioId) return
    Promise.all([getClients(studioId), getSuppliers(studioId), getProducts(studioId), getCategories(studioId)]).then(
      ([c, s, p, cats]) => {
        setClients(c)
        setSuppliers(s)
        setProducts(p)
        setCategories(cats)
      },
    )
    getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data() as StudioDoc)
    })
    if (!isEdit) {
      getNextDocumentNumber(studioId, type, documentYearFromDate(date)).then(setNumber)
    }
  }, [studioId, isEdit, type])

  useEffect(() => {
    if (!isEdit || !id) return
    setLoadError(null)
    getDoc(doc(db, 'documents', id)).then(snap => {
      if (!snap.exists()) {
        setLoadError('Documento non trovato.')
        return
      }
      const d = snap.data() as DocRecord
      if (ACTIVE_DOCUMENT_TYPES.includes(d.type as ActiveDocumentType)) {
        setType(d.type as ActiveDocumentType)
      }
      setNumber(d.number)
      setNumbering(d.numbering || '')
      setDate(d.date)
      setSubjectId(d.subjectId || '')
      setSubjectType(d.subjectType || 'client')
      setSubjectName(d.subjectName)
      setClientSearch(d.subjectName)
      setSubjectVat(d.subjectVat || '')
      setSubjectAddress(d.subjectAddress || '')
      setRows(d.rows?.length ? d.rows : [emptyDocumentRow()])
      setPriceList(d.priceList || 'privati')
      let notesBody = d.internalNotes || ''
      const lotMatch = notesBody.match(/^Cod\. lotteria: (.+)$/m)
      const renMatch = notesBody.match(/^Rinnovo documento fra (\d+) mesi$/m)
      const printMatch = notesBody.match(/^Data\/ora stampa: (.+)$/m)
      if (lotMatch) {
        setLotteryCode(lotMatch[1].trim())
        notesBody = notesBody.replace(/^Cod\. lotteria: .+\n?/m, '')
      }
      if (renMatch) {
        setRenewalReminder(true)
        setRenewalMonths(parseInt(renMatch[1], 10) || 12)
        notesBody = notesBody.replace(/^Rinnovo documento fra \d+ mesi\n?/m, '')
      }
      if (printMatch) {
        setPrintDateTime(printMatch[1].trim())
        notesBody = notesBody.replace(/^Data\/ora stampa: .+\n?/m, '')
      }
      setInternalNotes(notesBody.trim())
      setValidityDays(d.validityDays || 30)
      setPaymentMethod(d.paymentMethod || '')
      setPaymentTerms(d.paymentTerms || '')
      setPaymentNotes(d.paymentNotes || '')
      setAgentName(d.agentName || '')
      setFollowUpDoc(Boolean(d.followUpDoc))
      setShippingDescription(d.shippingDescription || '')
      setShippingCost(d.shippingCost || 0)
      setShippingVatRate(d.shippingVatRate ?? 22)
      setDocumentEndNotes(d.internalNotes || '')
      setBankName(d.bankName || '')
      setBankIban(d.bankIban || '')
      setDeliveryAddress(d.deliveryAddress || '')
      setDeliveryCity(d.deliveryCity || '')
      setDeliveryProvince(d.deliveryProvince || '')
      setDeliveryCap(d.deliveryCap || '')
      setStatus(d.status)
      setStockCommitted(Boolean(d.stockCommitted))
    })
  }, [isEdit, id])

  useEffect(() => {
    if (isEdit || !studioId) return
    getNextDocumentNumber(studioId, type, documentYear).then(setNumber)
  }, [type, documentYear, isEdit, studioId])

  const selectClient = useCallback((c: Client) => {
    setSubjectType('client')
    setSubjectId(c.id)
    setSubjectName(c.name)
    setSubjectVat(c.vatNumber || c.fiscalCode || '')
    setSubjectAddress([c.address, c.city, c.province].filter(Boolean).join(', '))
    setClientSearch(c.name)
    setShowClientDropdown(false)
    setShowClientSearch(false)
  }, [])

  const selectSupplier = useCallback((s: Supplier) => {
    setSubjectType('supplier')
    setSubjectId(s.id)
    setSubjectName(s.name)
    setSubjectVat(s.vatNumber || s.fiscalCode || '')
    setSubjectAddress([s.address, s.city, s.province].filter(Boolean).join(', '))
    setClientSearch(s.name)
    setShowClientDropdown(false)
  }, [])

  useEffect(() => {
    if (isEdit) return
    const sid = searchParams.get('subjectId')
    if (!sid) return
    if (subjectType === 'supplier') {
      const s = suppliers.find(x => x.id === sid)
      if (s) selectSupplier(s)
    } else {
      const c = clients.find(x => x.id === sid)
      if (c) selectClient(c)
    }
  }, [clients, suppliers, isEdit, searchParams, subjectType, selectClient, selectSupplier])

  const selectNoClient = useCallback(() => {
    setSubjectId('')
    setSubjectName(GENERIC_CLIENT_LABEL)
    setSubjectVat('')
    setSubjectAddress('')
    setClientSearch(GENERIC_CLIENT_LABEL)
    setShowClientSearch(false)
  }, [])

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients.slice(0, 12)
    return clients.filter(c => `${c.name} ${c.phone} ${c.email || ''}`.toLowerCase().includes(q)).slice(0, 12)
  }, [clients, clientSearch])

  const filteredSuppliers = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return suppliers.slice(0, 12)
    return suppliers.filter(s => `${s.name} ${s.phone || ''} ${s.email || ''}`.toLowerCase().includes(q)).slice(0, 12)
  }, [suppliers, clientSearch])

  const openIncludiDialog = useCallback(async () => {
    if (!studioId || !subjectId) return
    setShowIncludi(true)
    setIncludiLoading(true)
    try {
      const all = await getDocuments(studioId)
      setIncludibleDocs(getIncludableDocuments(all, type, subjectId, subjectType))
    } finally {
      setIncludiLoading(false)
    }
  }, [studioId, subjectId, subjectType, type])

  const handleIncludeDocument = useCallback(
    (
      source: DocRecord,
      mode: Parameters<typeof mergeIncludedRows>[2],
      opts: { copyPayment: boolean; copyNotes: boolean; copyShipping: boolean },
    ) => {
      setRows(prev => [...mergeIncludedRows(prev.filter(r => r.description.trim()), source, mode), emptyDocumentRow()])
      const side = applyInclusionSideEffects(
        { paymentMethod, paymentNotes, internalNotes, shippingDescription },
        source,
        opts,
      )
      if (side.paymentMethod) setPaymentMethod(side.paymentMethod)
      if (side.paymentNotes) setPaymentNotes(side.paymentNotes || '')
      if (side.internalNotes) setInternalNotes(side.internalNotes || '')
      if (side.shippingDescription) setShippingDescription(side.shippingDescription || '')
      setShowIncludi(false)
      setActionMessage(`Incluso documento ${source.fullNumber}.`)
    },
    [paymentMethod, paymentNotes, internalNotes, shippingDescription],
  )

  const buildPayload = useCallback(
    (saveStatus: DocRecord['status']): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> => {
      const confirmedPrintStamp =
        !isVenditaBanco && saveStatus === 'confirmed'
          ? printDateTime || new Date().toLocaleString('it-IT')
          : printDateTime
      return {
      studioId,
      type: type as DocumentType,
      number,
      numbering: numbering || undefined,
      fullNumber: fullNumberPreview,
      date,
      documentYear,
      subjectType,
      subjectId: subjectId || undefined,
      subjectName,
      subjectVat: subjectVat || undefined,
      subjectAddress: subjectAddress || undefined,
      rows: activeRows,
      totalNet: totals.totalNet,
      totalVat: totals.totalVat,
      totalDocument: totals.totalDocument,
      priceList,
      internalNotes: isVenditaBanco
        ? [
            internalNotes ? `Commento ad uso interno: ${internalNotes}` : '',
            noteQuoteDesc ? `Desc. preventivo: ${noteQuoteDesc}` : '',
            noteDelivery ? `Consegna: ${noteDelivery}` : '',
            noteFree3 ? `Libero 3: ${noteFree3}` : '',
            noteFree4 ? `Libero 4: ${noteFree4}` : '',
            documentEndNotes ? `Note a fine documento:\n${documentEndNotes}` : '',
          ]
            .filter(Boolean)
            .join('\n') || undefined
        : [
            internalNotes,
            lotteryCode ? `Cod. lotteria: ${lotteryCode}` : '',
            renewalReminder ? `Rinnovo documento fra ${renewalMonths} mesi` : '',
            confirmedPrintStamp ? `Data/ora stampa: ${confirmedPrintStamp}` : '',
          ]
            .filter(Boolean)
            .join('\n') || undefined,
      validityDays: type === 'preventivo' ? validityDays : undefined,
      paymentMethod: paymentMethod || undefined,
      paymentTerms: paymentTerms || undefined,
      paymentNotes: paymentNotes || undefined,
      agentName: agentName || undefined,
      followUpDoc: followUpDoc || undefined,
      shippingDescription: shippingDescription || undefined,
      shippingCost: shippingCost || undefined,
      shippingVatRate: shippingVatRate || undefined,
      bankName: bankName || undefined,
      bankIban: bankIban || undefined,
      deliveryAddress: deliveryAddress || undefined,
      deliveryCity: deliveryCity || undefined,
      deliveryProvince: deliveryProvince || undefined,
      deliveryCap: deliveryCap || undefined,
      status: saveStatus,
      stockCommitted,
      }
    },
    [
      studioId,
      type,
      number,
      numbering,
      fullNumberPreview,
      date,
      documentYear,
      subjectType,
      subjectId,
      subjectName,
      subjectVat,
      subjectAddress,
      activeRows,
      totals,
      priceList,
      internalNotes,
      validityDays,
      paymentMethod,
      paymentTerms,
      paymentNotes,
      agentName,
      followUpDoc,
      shippingDescription,
      shippingCost,
      shippingVatRate,
      noteQuoteDesc,
      noteDelivery,
      noteFree3,
      noteFree4,
      documentEndNotes,
      lotteryCode,
      renewalReminder,
      renewalMonths,
      printDateTime,
      bankName,
      bankIban,
      deliveryAddress,
      deliveryCity,
      deliveryProvince,
      deliveryCap,
      stockCommitted,
      isVenditaBanco,
      internalNotes,
    ],
  )

  const saveWithFallback = useCallback(
    async (saveStatus: DocRecord['status']) => {
      const year = documentYearFromDate(date)
      let num = number
      let fullNum = buildFullNumber(num, year, numbering)
      if (!isEdit) {
        num = await getNextDocumentNumber(studioId, type, year)
        fullNum = buildFullNumber(num, year, numbering)
        setNumber(num)
      }
      const payload = {
        ...buildPayload(saveStatus),
        number: num,
        fullNumber: fullNum,
        documentYear: year,
      }
      let documentId = id || ''
      if (isEdit && id) {
        await updateDocument(id, payload)
      } else {
        const ref = await addDocument(payload)
        documentId = ref.id
        setSavedDocumentId(ref.id)
      }
      setStockWarning('Magazzino non aggiornato (function non attiva).')
      return { documentId, payload }
    },
    [buildPayload, date, id, isEdit, number, numbering, studioId, type],
  )

  const handleSave = useCallback(
    async (saveStatus: DocRecord['status'] = 'draft', options?: { navigate?: boolean; emitReceipt?: boolean }) => {
      if (!studioId || !subjectName.trim()) {
        alert('Seleziona un cliente')
        return false
      }
      if (activeRows.length === 0) {
        alert('Aggiungi almeno una riga al documento')
        return false
      }

      setSaving(true)
      setLoadError(null)
      setStockWarning(null)
      setReceiptResult(null)
      setActionMessage(null)

      try {
        const payload = buildPayload(saveStatus)
        const result = await callCommitDocument({
          documentId: savedDocumentId || (isEdit ? id : undefined),
          document: payload,
          assignNumber: !savedDocumentId && !isEdit,
        })
        if (result.stockWarning) setStockWarning(result.stockWarning)
        setSavedDocumentId(result.documentId)
        setNumber(result.number)
        setStockCommitted(result.stockCommitted)

        let paymentNote = ''
        if (saveStatus === 'confirmed') {
          const docForPayments: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> = {
            ...payload,
            number: result.number,
            fullNumber: result.fullNumber,
            documentYear: payload.documentYear,
          }
          const emitted = await emitPaymentsForDocumentIfNeeded(studioId, result.documentId, docForPayments)
          if (emitted > 0) {
            paymentNote = ` ${emitted} scadenze pagamento create.`
            invalidateDashboardCache(studioId)
          }
          if (!printDateTime) setPrintDateTime(new Date().toLocaleString('it-IT'))
        }

        if (options?.emitReceipt && isVenditaBanco) {
          const rtItems = documentRowsToRtItems(activeRows)
          const rtTotal = rtItemsGrossTotal(rtItems) + (shippingCost || 0) * (1 + (shippingVatRate || 22) / 100)
          const receipt = await sendFiscalReceiptToRt(rtItems, Math.round(rtTotal * 100) / 100, {
            rtIp: studioData?.rtIp,
            rtModel: studioData?.rtModel,
            paymentLabel: paymentMethod || 'CONTANTI',
          })
          setReceiptResult(receipt)
          if (receipt.ok) {
            setActionMessage(`Documento ${result.fullNumber} registrato. ${receipt.msg}${paymentNote}`)
          } else {
            setActionMessage(`Documento ${result.fullNumber} registrato ma scontrino non emesso.${paymentNote}`)
          }
        } else {
          setActionMessage(`Documento ${result.fullNumber} salvato correttamente.${paymentNote}`)
        }

        if (options?.navigate !== false && !isVenditaBanco) {
          navigate('/documenti')
        }
        return true
      } catch (err) {
        if (isCommitFunctionUnavailable(err)) {
          try {
            const fallback = await saveWithFallback(saveStatus)
            if (saveStatus === 'confirmed' && fallback.documentId) {
              const emitted = await emitPaymentsForDocumentIfNeeded(
                studioId,
                fallback.documentId,
                fallback.payload,
              )
              if (emitted > 0) {
                setActionMessage(`Documento salvato (modalità locale). ${emitted} scadenze pagamento create.`)
              } else {
                setActionMessage('Documento salvato (modalità locale).')
              }
            } else {
              setActionMessage('Documento salvato (modalità locale).')
            }
            if (options?.navigate !== false && !isVenditaBanco) {
              navigate('/documenti')
            }
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
    [
      studioId,
      subjectName,
      activeRows,
      buildPayload,
      savedDocumentId,
      isEdit,
      id,
      navigate,
      saveWithFallback,
      isVenditaBanco,
      studioData,
      paymentMethod,
      shippingCost,
      shippingVatRate,
    ],
  )

  const handleScontrino = useCallback(() => {
    void handleSave('confirmed', { navigate: false, emitReceipt: true })
  }, [handleSave])

  const handleStampaDocumento = useCallback(() => {
    if (activeRows.length === 0) {
      alert('Aggiungi almeno una riga prima di stampare')
      return
    }
    const docData: DocRecord = {
      id: savedDocumentId || id || '',
      ...buildPayload(status),
      createdAt: new Date(),
    }
    printVenditaBancoDocument(docData, studioData || undefined)
  }, [activeRows, savedDocumentId, id, buildPayload, status, studioData])

  useEffect(() => {
    if (!isVenditaBanco) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        e.preventDefault()
        handleScontrino()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isVenditaBanco, handleScontrino])

  const handleTransform = useCallback(
    async (targetType: ActiveDocumentType) => {
      if (!subjectName.trim()) {
        alert('Seleziona un cliente prima di generare')
        return
      }
      setSaving(true)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const year = documentYearFromDate(today)
        const newNumber = await getNextDocumentNumber(studioId, targetType, year)
        const fullNum = buildFullNumber(newNumber, year, numbering)
        const payload: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> = {
          studioId,
          type: targetType,
          number: newNumber,
          numbering: numbering || undefined,
          fullNumber: fullNum,
          date: today,
          documentYear: year,
          subjectType,
          subjectId: subjectId || undefined,
          subjectName,
          subjectVat: subjectVat || undefined,
          subjectAddress: subjectAddress || undefined,
          rows: activeRows.map(r => ({ ...r, id: crypto.randomUUID() })),
          totalNet: totals.totalNet,
          totalVat: totals.totalVat,
          totalDocument: totals.totalDocument,
          priceList,
          status: 'draft',
          linkedDocumentId: id || undefined,
          linkedDocumentType: type as DocumentType,
        }
        try {
          const result = await callCommitDocument({ document: payload, assignNumber: true })
          if (isEdit && id) {
            await updateDocument(id, {
              linkedDocumentId: result.documentId,
              linkedDocumentType: targetType,
              status: 'completed',
            })
          }
          navigate(`/documenti/${result.documentId}`)
        } catch (err) {
          if (isCommitFunctionUnavailable(err)) {
            const ref = await addDocument(payload)
            if (isEdit && id) {
              await updateDocument(id, {
                linkedDocumentId: ref.id,
                linkedDocumentType: targetType,
                status: 'completed',
              })
            }
            setStockWarning('Magazzino non aggiornato (function non attiva).')
            navigate(`/documenti/${ref.id}`)
          } else {
            throw err
          }
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Generazione non riuscita.')
      } finally {
        setSaving(false)
      }
    },
    [
      subjectName,
      studioId,
      numbering,
      subjectId,
      subjectName,
      subjectVat,
      subjectAddress,
      activeRows,
      totals,
      priceList,
      id,
      isEdit,
      type,
      navigate,
    ],
  )

  const handlePrint = useCallback(() => {
    const docData: DocRecord = {
      id: id || '',
      ...buildPayload(status),
      createdAt: new Date(),
    }
    generateDocumentPDF(
      docData,
      studioData?.name
        ? {
            name: studioData.name,
            address: studioData.address,
            city: studioData.city,
            province: studioData.province,
            cap: studioData.cap,
            vatNumber: studioData.vatNumber,
            phone: studioData.phone,
            email: studioData.email,
            disclaimer: studioData.disclaimer,
          }
        : undefined,
    )
  }, [buildPayload, status, id, studioData])

  const footerActions: ActionBarAction[] = useMemo(
    () =>
      isVenditaBanco
        ? [
            {
              id: 'receipt',
              label: 'Scontrino (F6)',
              icon: '🧾',
              onClick: handleScontrino,
              disabled: saving,
            },
            {
              id: 'print',
              label: 'Stampa',
              icon: '🖨',
              onClick: handleStampaDocumento,
              disabled: saving,
            },
            {
              id: 'labels',
              label: 'Etichette',
              icon: '🏷',
              onClick: () => {
                if (activeRows.length === 0) {
                  alert('Aggiungi almeno una riga con codice prodotto.')
                  return
                }
                printDocumentRowEtichette(activeRows, subjectName || 'Cliente')
              },
              disabled: saving,
            },
            {
              id: 'attachments',
              label: allegati.length ? `Allegati… (${allegati.length})` : 'Allegati…',
              icon: '📎',
              onClick: () => setShowAllegati(true),
              disabled: saving,
            },
            {
              id: 'confirm',
              label: saving ? 'Salvataggio…' : 'Genera doc.',
              icon: '✓',
              onClick: () => void handleSave('confirmed', { navigate: false }),
              disabled: saving,
            },
            {
              id: 'close',
              label: 'Chiudi',
              icon: '✕',
              onClick: () => navigate('/documenti'),
            },
          ]
        : [
            {
              id: 'save',
              label: saving ? 'Salvataggio…' : 'Salva',
              icon: '✓',
              onClick: () => void handleSave('draft'),
              disabled: saving,
            },
            {
              id: 'confirm',
              label: 'Conferma',
              icon: '✓',
              onClick: () => void handleSave('confirmed'),
              disabled: saving,
            },
            {
              id: 'include',
              label: 'Includi doc.',
              icon: '📋',
              onClick: () => void openIncludiDialog(),
              disabled: saving || !subjectId,
            },
            {
              id: 'pdf',
              label: 'Stampa PDF',
              icon: '🖨',
              onClick: handlePrint,
              disabled: saving,
            },
            {
              id: 'close',
              label: 'Chiudi',
              icon: '←',
              onClick: () => navigate('/documenti'),
            },
          ],
    [saving, handleSave, handleScontrino, handleStampaDocumento, navigate, isVenditaBanco, activeRows, subjectName, allegati.length, openIncludiDialog, subjectId],
  )

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  const subjectPickerLabel = subjectLabelForType(type)
  const isSupplierDoc = isPurchaseDocumentType(type) || subjectType === 'supplier'

  const clientPicker = (
    <FormField label={subjectPickerLabel} htmlFor="doc-client">
      <div className="gestionale-doc-form-header__client-wrap">
        <input
          id="doc-client"
          className="gestionale-form-field__input"
          value={clientSearch}
          onChange={e => {
            setClientSearch(e.target.value)
            setShowClientDropdown(true)
          }}
          onFocus={() => setShowClientDropdown(true)}
          placeholder={isSupplierDoc ? 'Cerca fornitore…' : 'Cerca cliente…'}
        />
        {!isSupplierDoc ? (
          <button type="button" className="gestionale-tool-btn" onClick={() => setShowClientForm(true)}>
            + Nuovo
          </button>
        ) : null}
        {showClientDropdown && (isSupplierDoc ? filteredSuppliers : filteredClients).length > 0 ? (
          <ul className="gestionale-doc-client-dropdown">
            {(isSupplierDoc ? filteredSuppliers : filteredClients).map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => (isSupplierDoc ? selectSupplier(item as Supplier) : selectClient(item as Client))}
                >
                  {item.name}
                  {'phone' in item && item.phone ? ` — ${item.phone}` : ''}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </FormField>
  )

  const venditaBancoClientPicker = (
    <FormField label="Cliente" htmlFor="doc-client-vb">
      <div className="gestionale-doc-form-header__client-wrap">
        <input
          id="doc-client-vb"
          className="gestionale-form-field__input"
          value={clientSearch}
          readOnly
          placeholder="Seleziona cliente…"
        />
        <button
          type="button"
          className="gestionale-doc-form-header__search-btn"
          title="Cerca cliente"
          onClick={() => setShowClientSearch(true)}
        >
          🔍
        </button>
      </div>
    </FormField>
  )

  return (
    <div className={`gestionale-page gestionale-repair-sheet${isVenditaBanco ? ' gestionale-vendita-banco' : ''}`} data-tutorial="page-documento">
      <header className="gestionale-repair-sheet__header">
        <div>
          <h1 className="gestionale-repair-sheet__title">
            {isVenditaBanco
              ? isEdit
                ? 'Modifica vendita al banco'
                : 'Vendita al banco'
              : isEdit
                ? 'Modifica documento'
                : 'Nuovo documento'}
          </h1>
          {!isVenditaBanco ? (
            <div className="gestionale-repair-sheet__meta">
              <span className="gestionale-repair-sheet__badge">{documentTypeLabel(type)}</span>
              <span>{fullNumberPreview}</span>
              <span>{subjectName || 'Cliente da selezionare'}</span>
            </div>
          ) : null}
        </div>
        {!isVenditaBanco ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {transforms.map(t => (
              <ToolButton
                key={t.type}
                label={`→ ${t.label}`}
                icon="↪"
                onClick={() => void handleTransform(t.type)}
                disabled={saving}
              />
            ))}
            <ToolButton label="PDF" icon="🖨" onClick={handlePrint} />
            <ToolButton label="Chiudi" icon="←" onClick={() => navigate('/documenti')} />
          </div>
        ) : null}
      </header>

      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}
      {stockWarning ? (
        <div className="gestionale-page__banner" style={{ background: '#fff8e6', color: '#92400e' }}>
          {stockWarning}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="gestionale-page__banner" style={{ background: '#ecfdf5', color: '#065f46' }}>
          {actionMessage}
        </div>
      ) : null}
      {receiptResult && !receiptResult.ok ? (
        <div className="gestionale-page__banner gestionale-page__banner--error">{receiptResult.msg}</div>
      ) : null}

      <div className="gestionale-repair-sheet__scroll">
        {isVenditaBanco ? (
          <>
            <div className="gestionale-doc-form-header gestionale-doc-form-header--vendita">
              {venditaBancoClientPicker}
              <FormField label="Listino" htmlFor="doc-listino-vb">
                <select
                  id="doc-listino-vb"
                  className="gestionale-form-field__input"
                  value={priceList || 'privati'}
                  onChange={e => setPriceList(e.target.value as DocRecord['priceList'])}
                >
                  <option value="privati">Privati</option>
                  <option value="aziende">Aziende</option>
                  <option value="convenzionati">Convenzionati</option>
                  <option value="vip">Vip</option>
                </select>
              </FormField>
              <FormField label="Agente" htmlFor="doc-agent-vb">
                <input
                  id="doc-agent-vb"
                  className="gestionale-form-field__input"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                />
              </FormField>
              <FormField label="Data" htmlFor="doc-date-vb">
                <input
                  id="doc-date-vb"
                  type="date"
                  className="gestionale-form-field__input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </FormField>
              <FormField label="Numero" htmlFor="doc-number-vb">
                <input
                  id="doc-number-vb"
                  type="number"
                  min={1}
                  className="gestionale-form-field__input"
                  value={number}
                  onChange={e => setNumber(parseInt(e.target.value, 10) || 1)}
                />
              </FormField>
              <FormField label="Numeraz." htmlFor="doc-numeraz-vb">
                <input
                  id="doc-numeraz-vb"
                  className="gestionale-form-field__input"
                  value={numbering}
                  onChange={e => setNumbering(e.target.value)}
                />
              </FormField>
              <label className="gestionale-doc-form-header__followup">
                <input
                  type="checkbox"
                  checked={followUpDoc}
                  onChange={e => setFollowUpDoc(e.target.checked)}
                />
                Seguirà doc. di vendita
              </label>
            </div>

            <DocumentFormTabBar
              tabs={VENDITA_BANCO_FORM_TABS}
              activeTabId={activeFormTab}
              onTabChange={setActiveFormTab}
            />

            <div className="gestionale-doc-form-tab-panel" role="tabpanel">
              {activeFormTab === 'righe' ? (
                <div className="gestionale-doc-form-righe">
                  <div className="gestionale-doc-form-righe__lines">
                    <DocumentLineItemsSection
                      products={products}
                      categories={categories}
                      rows={rows}
                      priceList={priceList || 'privati'}
                      onChange={setRows}
                      variant="vendita_banco"
                    />
                  </div>
                  <div className="gestionale-doc-form-righe__totals">
                    <DocumentTotalsSection
                      rows={rows}
                      shippingCost={shippingCost}
                      shippingVatRate={shippingVatRate}
                      variant="vendita_banco"
                    />
                  </div>
                </div>
              ) : null}

              {activeFormTab === 'pagamento' ? (
                <div className="gestionale-doc-form-stack">
                  <FormField label="Tipo pagamento" htmlFor="doc-payment-type">
                    <select
                      id="doc-payment-type"
                      className="gestionale-form-field__input"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
                      <option value="">— Seleziona —</option>
                      {DOCUMENT_PAYMENT_METHODS.map(method => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              ) : null}

              {activeFormTab === 'note' ? (
                <div className="gestionale-doc-form-stack gestionale-doc-form-stack--wide">
                  <p className="gestionale-doc-form-section-title">Campi aggiuntivi</p>
                  <FormField label="Desc. preventivo" htmlFor="doc-note-quote">
                    <input
                      id="doc-note-quote"
                      className="gestionale-form-field__input"
                      value={noteQuoteDesc}
                      onChange={e => setNoteQuoteDesc(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Consegna" htmlFor="doc-note-delivery">
                    <input
                      id="doc-note-delivery"
                      className="gestionale-form-field__input"
                      value={noteDelivery}
                      onChange={e => setNoteDelivery(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Libero 3" htmlFor="doc-note-free3">
                    <input
                      id="doc-note-free3"
                      className="gestionale-form-field__input"
                      value={noteFree3}
                      onChange={e => setNoteFree3(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Libero 4" htmlFor="doc-note-free4">
                    <input
                      id="doc-note-free4"
                      className="gestionale-form-field__input"
                      value={noteFree4}
                      onChange={e => setNoteFree4(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Note a fine documento" htmlFor="doc-note-end">
                    <textarea
                      id="doc-note-end"
                      className="gestionale-form-field__input"
                      rows={6}
                      value={documentEndNotes}
                      onChange={e => setDocumentEndNotes(e.target.value)}
                    />
                  </FormField>
                </div>
              ) : null}

              {activeFormTab === 'indirizzi' ? (
                <div className="gestionale-doc-form-addresses">
                  <div className="gestionale-doc-form-addresses__col">
                    <p className="gestionale-doc-form-section-title">Intestatario</p>
                    <FormField label="Cod. fiscale" htmlFor="doc-subject-cf">
                      <input id="doc-subject-cf" className="gestionale-form-field__input" value={subjectVat} onChange={e => setSubjectVat(e.target.value)} />
                    </FormField>
                    <FormField label="Partita Iva" htmlFor="doc-subject-vat">
                      <input id="doc-subject-vat" className="gestionale-form-field__input" value={subjectVat} onChange={e => setSubjectVat(e.target.value)} />
                    </FormField>
                    <FormField label="Intestatario" htmlFor="doc-subject-name">
                      <input id="doc-subject-name" className="gestionale-form-field__input" value={subjectName} onChange={e => setSubjectName(e.target.value)} />
                    </FormField>
                    <FormField label="Indirizzo" htmlFor="doc-subject-address">
                      <input id="doc-subject-address" className="gestionale-form-field__input" value={subjectAddress} onChange={e => setSubjectAddress(e.target.value)} />
                    </FormField>
                  </div>
                  <div className="gestionale-doc-form-addresses__col">
                    <p className="gestionale-doc-form-section-title">Destinazione</p>
                    <FormField label="Indirizzo" htmlFor="doc-delivery-address">
                      <input id="doc-delivery-address" className="gestionale-form-field__input" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
                    </FormField>
                    <div className="gestionale-doc-form-addresses__row3">
                      <FormField label="CAP" htmlFor="doc-delivery-cap">
                        <input id="doc-delivery-cap" className="gestionale-form-field__input" value={deliveryCap} onChange={e => setDeliveryCap(e.target.value)} />
                      </FormField>
                      <FormField label="Città" htmlFor="doc-delivery-city">
                        <input id="doc-delivery-city" className="gestionale-form-field__input" value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} />
                      </FormField>
                      <FormField label="Prov." htmlFor="doc-delivery-province">
                        <input id="doc-delivery-province" className="gestionale-form-field__input" value={deliveryProvince} onChange={e => setDeliveryProvince(e.target.value)} />
                      </FormField>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeFormTab === 'opzioni' ? (
                <div className="gestionale-doc-form-stack">
                  <FormField label="Data e ora di stampa" htmlFor="doc-print-datetime">
                    <input
                      id="doc-print-datetime"
                      className="gestionale-form-field__input"
                      placeholder="Impostata alla conferma"
                      readOnly
                      value={printDateTime}
                    />
                  </FormField>
                  <FormField label="Cod. lotteria" htmlFor="doc-lottery-code">
                    <input
                      id="doc-lottery-code"
                      className="gestionale-form-field__input"
                      value={lotteryCode}
                      onChange={e => setLotteryCode(e.target.value)}
                    />
                  </FormField>
                  <label className="gestionale-doc-form-header__followup">
                    <input
                      type="checkbox"
                      checked={renewalReminder}
                      onChange={e => setRenewalReminder(e.target.checked)}
                    />
                    Ricorda di rinnovare questo documento fra
                    <input
                      type="number"
                      min={1}
                      className="gestionale-form-field__input gestionale-doc-form-inline-num"
                      value={renewalMonths}
                      onChange={e => setRenewalMonths(Math.max(1, parseInt(e.target.value, 10) || 12))}
                    />
                    mesi
                  </label>
                </div>
              ) : null}
            </div>

            <div className="gestionale-vendita-banco-footer">
              <div className="gestionale-vendita-banco-footer__left">
                <FormField label="Spese" htmlFor="doc-shipping-desc">
                  <input
                    id="doc-shipping-desc"
                    className="gestionale-form-field__input"
                    value={shippingDescription}
                    onChange={e => setShippingDescription(e.target.value)}
                    placeholder="es. Spese di spedizione"
                  />
                </FormField>
                <FormField label="Iva" htmlFor="doc-shipping-vat">
                  <input
                    id="doc-shipping-vat"
                    type="number"
                    className="gestionale-form-field__input"
                    value={shippingVatRate}
                    onChange={e => setShippingVatRate(parseFloat(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Importo ivato" htmlFor="doc-shipping-cost">
                  <input
                    id="doc-shipping-cost"
                    type="number"
                    min={0}
                    step={0.01}
                    className="gestionale-form-field__input"
                    value={shippingCost}
                    onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                  />
                </FormField>
                <FormField label="Commento ad uso interno" htmlFor="doc-internal-comment">
                  <input
                    id="doc-internal-comment"
                    className="gestionale-form-field__input"
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </>
        ) : (
          <>
            <RepairSection title="Testata documento" id="doc-testata">
              <div className="gestionale-detail-edit-stack">
                <FormField label="Tipo documento" htmlFor="doc-type">
                  <select
                    id="doc-type"
                    className="gestionale-form-field__input"
                    value={type}
                    onChange={e => setType(e.target.value as ActiveDocumentType)}
                    disabled={isEdit}
                  >
                    {ACTIVE_DOCUMENT_TYPES.map(t => (
                      <option key={t} value={t}>
                        {ACTIVE_DOCUMENT_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <FormField label="Numero" htmlFor="doc-number">
                    <input
                      id="doc-number"
                      type="number"
                      min={1}
                      className="gestionale-form-field__input"
                      value={number}
                      onChange={e => setNumber(parseInt(e.target.value, 10) || 1)}
                    />
                  </FormField>
                  <FormField label="Suffisso" htmlFor="doc-suffix">
                    <input
                      id="doc-suffix"
                      className="gestionale-form-field__input"
                      value={numbering}
                      onChange={e => setNumbering(e.target.value)}
                      placeholder="opzionale"
                    />
                  </FormField>
                  <FormField label="Data" htmlFor="doc-date">
                    <input
                      id="doc-date"
                      type="date"
                      className="gestionale-form-field__input"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </FormField>
                </div>
                <p className="gestionale-dialog-hint">Numerazione: {fullNumberPreview}</p>
                {clientPicker}
                {type === 'preventivo' ? (
                  <FormField label="Validità (gg)" htmlFor="doc-validity">
                    <input
                      id="doc-validity"
                      type="number"
                      className="gestionale-form-field__input"
                      value={validityDays}
                      onChange={e => setValidityDays(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormField>
                ) : null}
                <FormField label="Pagamento" htmlFor="doc-payment">
                  <input
                    id="doc-payment"
                    className="gestionale-form-field__input"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  />
                </FormField>
                <FormField label="Note" htmlFor="doc-notes">
                  <textarea
                    id="doc-notes"
                    className="gestionale-form-field__input"
                    rows={2}
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                  />
                </FormField>
              </div>
            </RepairSection>

            <RepairSection title="Righe documento" id="doc-righe">
              <DocumentLineItemsSection
                products={products}
                rows={rows}
                priceList={priceList || 'privati'}
                onChange={setRows}
              />
            </RepairSection>

            <RepairSection title="Totali" id="doc-totali">
              <DocumentTotalsSection rows={rows} />
            </RepairSection>
          </>
        )}
      </div>

      <ActionBar actions={footerActions} />

      {showClientSearch ? (
        <ClientSearchDialog
          clients={clients}
          onSelect={selectClient}
          onNoClient={selectNoClient}
          onNewClient={() => {
            setShowClientSearch(false)
            setShowClientForm(true)
          }}
          onClose={() => setShowClientSearch(false)}
        />
      ) : null}

      {showClientForm ? (
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

      {showAllegati ? (
        <AllegatiDialog
          onSmartphone={() => {
            const subject = encodeURIComponent(`Allegati — Vendita al banco ${fullNumberPreview}`)
            const body = encodeURIComponent(
              `Invia una risposta con gli allegati per il documento ${fullNumberPreview}.\nCliente: ${subjectName}`,
            )
            window.location.href = `mailto:?subject=${subject}&body=${body}`
          }}
          onScan={() => setActionMessage('Nessuno scanner rilevato. Usa Importa o Da smartphone/e-mail.')}
          onImport={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = () => {
              const names = Array.from(input.files || []).map(f => f.name)
              if (names.length) {
                setAllegati(prev => [...prev, ...names])
                setActionMessage(`${names.length} allegato/i importato/i.`)
              }
            }
            input.click()
          }}
          onClose={() => setShowAllegati(false)}
        />
      ) : null}
      {showIncludi ? (
        <IncludiDocumentiDialog
          documents={includibleDocs}
          loading={includiLoading}
          subjectLabel={subjectPickerLabel.toLowerCase()}
          onInclude={handleIncludeDocument}
          onClose={() => setShowIncludi(false)}
        />
      ) : null}
    </div>
  )
}
