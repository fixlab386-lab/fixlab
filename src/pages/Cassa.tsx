import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useActiveStudio } from '../hooks/useActiveStudio'
import { useRequireStudioFeature } from '../hooks/useRequireStudioFeature'
import { useStudioFeatures } from '../hooks/useStudioFeatures'
import { useStudioLiveQuery } from '../hooks/useStudioLiveQuery'
import { useCart } from '../contexts/CartContext'
import {
  addClient,
  getNextClientCode,
  addDocument,
  getNextDocumentNumber,
  addPayment,
  listenProducts,
  listenReadyRepairs,
  listenPaymentResources,
  updateClient,
  ensureDefaultPaymentResources,
} from '../lib/firestore'
import { searchClients } from '../lib/firestorePagination'
import { loadRecentClients } from '../lib/loadStudioCatalog'
import { callCommitDocument, isCommitFunctionUnavailable } from '../lib/commitDocument'
import { getDefaultResource, resourceTypeToLegacy } from '../lib/paymentResources'
import { sendFiscalReceiptToRt, normalizeRtPaymentLabel } from '../lib/rtPrinter'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Client, DocRecord, Payment, PaymentResource, Product, Repair } from '../types'
import { documentYearFromDate } from '../components/documents/utils'
import {
  CassaProductCatalog,
  CassaCartSection,
  CassaClientSection,
  CassaPaymentSection,
  CassaReadyRepairsPanel,
  CassaSaleCompleteView,
  emptyNewClientForm,
} from '../components/cassa'
import { SectionHeader, ToolButton } from '../components/ui'

export default function Cassa() {
  const { loading: featureLoading } = useRequireStudioFeature('pos')
  const { isEnabled: rtEnabled } = useStudioFeatures()
  const { userProfile } = useAuth()
  const { studioId } = useActiveStudio()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { cart, addToCart, changeQty, removeFromCart, cartCount, cartTotal, clearCart } = useCart()

  const [studioData, setStudioData] = useState<Record<string, unknown> | null>(null)
  const { data: products } = useStudioLiveQuery(studioId, listenProducts, Boolean(studioId), 60)
  const { data: readyRepairs } = useStudioLiveQuery(studioId, listenReadyRepairs, Boolean(studioId), 25)
  const { data: paymentResources } = useStudioLiveQuery(studioId, listenPaymentResources, Boolean(studioId), 50)

  useEffect(() => {
    if (!studioId) return
    void ensureDefaultPaymentResources(studioId)
  }, [studioId])

  useEffect(() => {
    if (paymentResources.length === 0) return
    const def = getDefaultResource(paymentResources)
    if (def) setSelectedResourceId(prev => prev || def.id)
  }, [paymentResources])

  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientForm, setNewClientForm] = useState(emptyNewClientForm())
  const [savingClient, setSavingClient] = useState(false)

  const [selectedResourceId, setSelectedResourceId] = useState('')
  const [cashGiven, setCashGiven] = useState('')
  const [cardPaid, setCardPaid] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [notes, setNotes] = useState('')

  const [processing, setProcessing] = useState(false)
  const [receiptResult, setReceiptResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [stockWarning, setStockWarning] = useState<string | null>(null)
  const [saleCompleted, setSaleCompleted] = useState(false)
  const [completedTotal, setCompletedTotal] = useState(0)

  const [importRepairMessage, setImportRepairMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    const term = clientSearch.trim()
    const timer = window.setTimeout(
      () => {
        const load = term ? searchClients(studioId, term) : loadRecentClients(studioId, 40)
        void load.then(data => {
          if (!cancelled) setClientResults(data)
        })
      },
      term ? 250 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [studioId, clientSearch])

  useEffect(() => {
    if (!selectedClient) return
    setClientResults(prev =>
      prev.some(x => x.id === selectedClient.id) ? prev : [selectedClient, ...prev],
    )
  }, [selectedClient])

  useEffect(() => {
    if (!studioId) return
    getDoc(doc(db, 'studios', studioId)).then(snap => {
      if (snap.exists()) setStudioData(snap.data())
    })
  }, [studioId])

  const [importingRepair, setImportingRepair] = useState(false)

  const selectedResource = useMemo(
    () => paymentResources.find(r => r.id === selectedResourceId),
    [paymentResources, selectedResourceId],
  )

  const repairIdFromUrl = searchParams.get('repairId')
  const addToCartRef = useRef(addToCart)
  const changeQtyRef = useRef(changeQty)
  const productsRef = useRef(products)
  addToCartRef.current = addToCart
  changeQtyRef.current = changeQty
  productsRef.current = products

  useEffect(() => {
    if (!repairIdFromUrl || !studioId) return
    let cancelled = false
    setImportingRepair(true)
    setImportRepairMessage(null)
    ;(async () => {
      try {
        const rSnap = await getDoc(doc(db, 'repairs', repairIdFromUrl))
        if (cancelled) return
        if (!rSnap.exists()) {
          setImportRepairMessage('Riparazione non trovata.')
          setSearchParams({}, { replace: true })
          setImportingRepair(false)
          return
        }
        const r = { id: rSnap.id, ...rSnap.data() } as Repair
        if (r.studioId !== studioId) {
          setImportRepairMessage('Riparazione non appartenente al tuo studio.')
          setSearchParams({}, { replace: true })
          setImportingRepair(false)
          return
        }
        const prods = productsRef.current
        if (cancelled) return
        for (const line of r.products || []) {
          const p = prods.find(x => x.id === line.productId)
          if (!p) continue
          addToCartRef.current({
            productId: p.id,
            name: p.name,
            model: p.model,
            brand: p.brand || '',
            color: p.color || '',
            price: line.price,
            maxStock: p.stock,
          })
          const q = Math.min(Math.max(1, line.qty), p.stock)
          if (q > 1) changeQtyRef.current(p.id, q)
        }
        if (r.clientId) {
          const cSnap = await getDoc(doc(db, 'clients', r.clientId))
          if (!cancelled && cSnap.exists()) {
            const c = { id: cSnap.id, ...cSnap.data() } as Client
            setSelectedClient(c)
            setClientSearch(c.name)
          }
        } else if (r.clientPhone) {
          const found = await searchClients(studioId, r.clientPhone, 5)
          const norm = (r.clientPhone || '').replace(/\D/g, '')
          const c = found.find(x => (x.phone || '').replace(/\D/g, '') === norm)
          if (!cancelled && c) {
            setSelectedClient(c)
            setClientSearch(c.name)
          }
        }
        setImportRepairMessage(
          (r.products?.length || 0) > 0
            ? `Caricata riparazione ${r.ticketNumber || r.id.slice(-6)}: ricambi nel carrello. Controlla manodopera (€${(r.laborCost || 0).toFixed(2)}) se da incassare.`
            : `Riparazione ${r.ticketNumber || r.id.slice(-6)}: nessun ricambio collegato. Aggiungi voci o incassa solo manodopera dal totale documento.`,
        )
        setSearchParams({}, { replace: true })
      } catch {
        if (!cancelled) setImportRepairMessage('Errore durante il caricamento dalla riparazione.')
      }
      if (!cancelled) setImportingRepair(false)
    })()
    return () => {
      cancelled = true
    }
  }, [repairIdFromUrl, studioId, setSearchParams])

  const filteredClients = clientResults

  const selectClient = (c: Client) => {
    setSelectedClient(c)
    setClientSearch(c.name)
    setShowClientDropdown(false)
  }

  const handleCreateClient = async () => {
    if (!newClientForm.name) return
    setSavingClient(true)
    try {
      const code = await getNextClientCode(studioId)
      const clientData: Record<string, unknown> = {
        studioId,
        code,
        type: 'client',
        name: newClientForm.name,
        phone: newClientForm.phone,
        totalSpent: 0,
        repairsCount: 0,
      }
      if (newClientForm.email) clientData.email = newClientForm.email
      if (newClientForm.vatNumber) clientData.vatNumber = newClientForm.vatNumber
      if (newClientForm.fiscalCode) clientData.fiscalCode = newClientForm.fiscalCode
      if (newClientForm.address) clientData.address = newClientForm.address
      if (newClientForm.city) clientData.city = newClientForm.city
      if (newClientForm.province) clientData.province = newClientForm.province
      if (newClientForm.cap) clientData.cap = newClientForm.cap
      const ref = await addClient(clientData as Omit<Client, 'id' | 'createdAt'>)
      const newClient: Client = {
        id: ref.id,
        ...newClientForm,
        studioId,
        code,
        type: 'client',
        totalSpent: 0,
        repairsCount: 0,
        createdAt: new Date(),
      } as Client
      setSelectedClient(newClient)
      setClientSearch(newClient.name)
      setShowNewClient(false)
      setNewClientForm(emptyNewClientForm())
    } catch (err) {
      alert('Errore creazione cliente: ' + err)
    }
    setSavingClient(false)
  }

  const subtotal = cartTotal
  const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : discount
  const total = Math.max(0, subtotal - discountAmount)
  const cashChange = cashGiven ? parseFloat(cashGiven) - total : 0

  const buildDocumentPayload = useCallback(
    (docNumber: number, fullNumber: string): Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'> => {
      const today = new Date().toISOString().split('T')[0]
      const resource = selectedResource
      return {
        studioId,
        type: 'vendita_banco',
        number: docNumber,
        fullNumber,
        date: today,
        documentYear: documentYearFromDate(today),
        subjectType: 'client',
        subjectId: selectedClient?.id || '',
        subjectName: selectedClient?.name || 'Cliente generico',
        subjectVat: selectedClient?.vatNumber || '',
        subjectAddress: selectedClient
          ? [selectedClient.address, selectedClient.city, selectedClient.province].filter(Boolean).join(', ')
          : '',
        rows: cart.map(item => {
          const prod = products.find(p => p.id === item.productId)
          return {
            id: crypto.randomUUID(),
            productId: item.productId,
            productCode: prod?.code || '',
            description: `${item.name} ${item.brand} ${item.model}`.trim(),
            quantity: item.qty,
            unitOfMeasure: 'pz',
            unitPrice: item.price,
            discount: 0,
            vatRate: 22,
            totalNet: Math.round(item.price * item.qty * 100) / 100,
            total: Math.round(item.price * item.qty * 1.22 * 100) / 100,
          }
        }),
        totalNet: Math.round(total / 1.22 * 100) / 100,
        totalVat: Math.round((total - total / 1.22) * 100) / 100,
        totalDocument: Math.round(total * 100) / 100,
        paymentMethod: resource?.name || 'Contanti',
        ...(notes ? { internalNotes: notes } : {}),
        status: 'confirmed',
        stockCommitted: false,
      }
    },
    [studioId, selectedClient, cart, products, total, notes, selectedResource],
  )

  const buildPaymentPayload = useCallback(
    (
      documentId: string,
      docNumber: number,
      fullNumber: string,
    ): Omit<Payment, 'id' | 'createdAt'> => {
      const today = new Date().toISOString().split('T')[0]
      const resource = selectedResource!
      const isCash = resource.type === 'cash'
      const isCard = resource.type === 'card'
      const settled = isCash || (isCard && cardPaid)
      return {
        studioId,
        date: today,
        resource: resourceTypeToLegacy(resource.type),
        resourceId: resource.id,
        resourceName: resource.name,
        subjectType: 'client',
        subjectId: selectedClient?.id,
        subjectName: selectedClient?.name || 'Cliente generico',
        description: `Vendita banco ${fullNumber}`,
        paymentMethod: resource.name,
        amountIn: Math.round(total * 100) / 100,
        settled,
        ...(settled ? { settledDate: today } : {}),
        linkedDocumentId: documentId,
        linkedDocumentType: 'vendita_banco',
        linkedDocumentNumber: fullNumber,
        ...(notes ? { notes } : {}),
      }
    },
    [studioId, selectedResource, selectedClient, total, cardPaid, notes],
  )

  const sendRtReceipt = useCallback(async (paymentLabel?: string) => {
    if (!rtEnabled('rtPrinter')) return { ok: false, skipped: true as const }
    const result = await sendFiscalReceiptToRt(
      cart.map(item => ({
        description: `${item.name} ${item.model}`.trim(),
        quantity: item.qty,
        unitPrice: item.price,
        vatRate: 22,
        discount: 0,
      })),
      total,
      {
        rtIp: studioData?.rtIp as string | undefined,
        rtModel: studioData?.rtModel as string | undefined,
        paymentLabel: normalizeRtPaymentLabel(paymentLabel || selectedResource?.name || 'CONTANTI'),
      },
    )
    setReceiptResult({ ok: result.ok, msg: result.msg })
  }, [studioData, cart, total, selectedResource])

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('Il carrello è vuoto')
      return
    }
    if (!selectedResource) {
      alert('Seleziona una risorsa di incasso')
      return
    }

    setProcessing(true)
    setReceiptResult(null)
    setStockWarning(null)

    try {
      let documentId = ''
      let docNumber = 0
      let fullNumber = ''

      const tryCommit = async () => {
        const result = await callCommitDocument({
          document: buildDocumentPayload(0, ''),
          assignNumber: true,
        })
        documentId = result.documentId
        docNumber = result.number
        fullNumber = result.fullNumber
        if (result.stockWarning) setStockWarning(result.stockWarning)
      }

      try {
        await tryCommit()
      } catch (err) {
        if (isCommitFunctionUnavailable(err)) {
          docNumber = await getNextDocumentNumber(studioId, 'vendita_banco')
          fullNumber = String(docNumber)
          const docRef = await addDocument(buildDocumentPayload(docNumber, fullNumber))
          documentId = docRef.id
          setStockWarning('Magazzino non aggiornato (function non attiva).')
        } else {
          throw err
        }
      }

      await addPayment(buildPaymentPayload(documentId, docNumber, fullNumber))

      if (selectedResource.type === 'cash') {
        await sendRtReceipt('CONTANTI')
      } else if (selectedResource.type === 'card') {
        if (cardPaid) {
          await sendRtReceipt('BANCOMAT')
        } else {
          setReceiptResult({
            ok: true,
            msg: 'Vendita registrata. Conferma il pagamento bancomat per emettere lo scontrino RT.',
          })
        }
      } else {
        setReceiptResult({ ok: true, msg: 'Vendita registrata con successo.' })
      }

      if (selectedClient?.id) {
        await updateClient(selectedClient.id, {
          totalSpent: (selectedClient.totalSpent || 0) + total,
        })
      }

      setCompletedTotal(total)
      setSaleCompleted(true)
    } catch (err) {
      setReceiptResult({ ok: false, msg: 'Errore durante la vendita: ' + err })
    }
    setProcessing(false)
  }

  const handleNewSale = () => {
    clearCart()
    setSelectedClient(null)
    setClientSearch('')
    const def = getDefaultResource(paymentResources)
    setSelectedResourceId(def?.id || '')
    setCashGiven('')
    setCardPaid(false)
    setDiscount(0)
    setNotes('')
    setReceiptResult(null)
    setStockWarning(null)
    setSaleCompleted(false)
    setCompletedTotal(0)
  }

  if (featureLoading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  return (
    <div className="gestionale-page gestionale-cassa-page" data-tutorial="page-cassa">
      <SectionHeader
        title="Cassa"
        showSearch={false}
        actions={
          <>
            <ToolButton label="Magazzino" icon="📦" onClick={() => navigate('/magazzino')} />
            {!saleCompleted && cartCount > 0 ? (
              <span className="gestionale-cassa-badge">{cartCount} articoli</span>
            ) : null}
          </>
        }
      />

      {importingRepair ? (
        <div className="gestionale-page__banner">Carico dati dalla riparazione…</div>
      ) : null}
      {importRepairMessage && !saleCompleted ? (
        <div className="gestionale-page__banner gestionale-page__banner--warning">{importRepairMessage}</div>
      ) : null}
      {stockWarning && !saleCompleted ? (
        <div className="gestionale-page__banner gestionale-page__banner--warning">{stockWarning}</div>
      ) : null}

      {saleCompleted ? (
        <CassaSaleCompleteView
          total={completedTotal}
          receiptResult={receiptResult}
          stockWarning={stockWarning}
          onNewSale={handleNewSale}
          onGoDocuments={() => navigate('/documenti')}
        />
      ) : (
        <div className={`gestionale-cassa-layout${cart.length === 0 ? ' gestionale-cassa-layout--empty' : ''}`}>
          <aside className="gestionale-cassa-layout__catalog">
            <CassaProductCatalog studioId={studioId!} products={products} onAdd={addToCart} />
            <CassaReadyRepairsPanel
              repairs={readyRepairs}
              onImport={id => navigate(`/cassa?repairId=${id}`)}
            />
          </aside>

          {cart.length === 0 ? (
            <div className="gestionale-cassa-empty">
              <div className="gestionale-cassa-empty__icon">🛒</div>
              <h2>Carrello vuoto</h2>
              <p>Cerca un prodotto a sinistra, scansiona un barcode o importa una riparazione «Pronta».</p>
              <div className="gestionale-cassa-empty__actions">
                <button type="button" className="gestionale-cassa-btn gestionale-cassa-btn--primary" onClick={() => navigate('/magazzino')}>
                  📦 Magazzino
                </button>
                <button type="button" className="gestionale-cassa-btn" onClick={() => navigate('/riparazioni')}>
                  🔧 Riparazioni
                </button>
              </div>
            </div>
          ) : (
            <>
              <main className="gestionale-cassa-layout__main">
                <CassaCartSection
                  cart={cart}
                  cartCount={cartCount}
                  onChangeQty={changeQty}
                  onRemove={removeFromCart}
                />
                <CassaClientSection
                  selectedClient={selectedClient}
                  clientSearch={clientSearch}
                  showClientDropdown={showClientDropdown}
                  filteredClients={filteredClients}
                  showNewClient={showNewClient}
                  newClientForm={newClientForm}
                  savingClient={savingClient}
                  onClientSearchChange={setClientSearch}
                  onShowClientDropdown={setShowClientDropdown}
                  onSelectClient={selectClient}
                  onClearClient={() => {
                    setSelectedClient(null)
                    setClientSearch('')
                  }}
                  onToggleNewClient={setShowNewClient}
                  onNewClientFormChange={setNewClientForm}
                  onCreateClient={() => void handleCreateClient()}
                />
                <div className="gestionale-cassa-notes">
                  <label className="gestionale-cassa-notes__label">Note (opzionale)</label>
                  <input
                    className="gestionale-cassa-search"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Note sulla vendita…"
                  />
                </div>
              </main>

              <aside className="gestionale-cassa-layout__pay">
                <CassaPaymentSection
                  resources={paymentResources}
                  selectedResourceId={selectedResourceId}
                  onSelectResource={setSelectedResourceId}
                  cashGiven={cashGiven}
                  onCashGivenChange={setCashGiven}
                  cardPaid={cardPaid}
                  onCardPaidChange={setCardPaid}
                  discount={discount}
                  discountType={discountType}
                  onDiscountChange={setDiscount}
                  onDiscountTypeChange={setDiscountType}
                  subtotal={subtotal}
                  discountAmount={discountAmount}
                  total={total}
                  cashChange={cashChange}
                  rtIp={studioData?.rtIp as string | undefined}
                  processing={processing}
                  cartEmpty={cart.length === 0}
                  onComplete={() => void handleCompleteSale()}
                />
                {receiptResult && !saleCompleted ? (
                  <div
                    className={`gestionale-cassa-inline-result${receiptResult.ok ? '' : ' gestionale-cassa-inline-result--error'}`}
                  >
                    {receiptResult.msg}
                  </div>
                ) : null}
              </aside>
            </>
          )}
        </div>
      )}
    </div>
  )
}
