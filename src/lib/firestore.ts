/**
 * Tutte le operazioni qui sotto assumono `studioId` sul documento (tranne users/studios).
 * Se aggiungi una nuova `collection(...)` verso Firestore (es. paymentResources),
 * aggiungi anche un blocco `match /nomeCollezione/{id}` in `firestore.rules` con le stesse condizioni tenant
 * (vedi commento in cima a quel file).
 */
import type { Product, Repair, Client, Category, Supplier, DocRecord, Payment, PaymentResource, StockMovement, Agent, Warehouse, PriceListConfig } from '../types'
import { omitUndefined } from './firestoreSanitize'
import {
  buildClientSearchTokens,
  buildProductSearchTokens,
  buildSupplierSearchTokens,
} from './searchTokens'
import { FIRESTORE_LIVE_WINDOW } from './firestoreScale'
import { studioListenQuery } from './firestorePagination'
import { db } from '../firebase'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  getDocs, query, where, orderBy, serverTimestamp, onSnapshot, limit
} from 'firebase/firestore'

// ==================== CATEGORIES ====================

export const getCategories = async (studioId: string, maxItems = 500): Promise<Category[]> => {
  const q = query(
    collection(db, 'categories'),
    where('studioId', '==', studioId),
    orderBy('order', 'asc'),
    limit(maxItems),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))
}

export function listenCategories(
  studioId: string,
  callback: (categories: Category[]) => void,
  onError?: (error: Error) => void,
  maxItems = 500,
) {
  const q = query(
    collection(db, 'categories'),
    where('studioId', '==', studioId),
    orderBy('order', 'asc'),
    limit(maxItems),
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))),
    err => onError?.(err),
  )
}

export const addCategory = async (data: Omit<Category, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'categories'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updateCategory = async (id: string, data: Partial<Category>) => {
  return updateDoc(doc(db, 'categories', id), omitUndefined(data))
}

export const deleteCategory = async (id: string) => {
  return deleteDoc(doc(db, 'categories', id))
}

// ==================== PRODUCTS ====================

export const getProducts = async (studioId: string, maxItems = FIRESTORE_LIVE_WINDOW): Promise<Product[]> => {
  const snap = await getDocs(studioListenQuery('products', studioId, 'createdAt', maxItems))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

export const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'products'), {
    ...omitUndefined(data),
    searchTokens: buildProductSearchTokens(data),
    createdAt: serverTimestamp(),
  })
}

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const patch: Record<string, unknown> = { ...omitUndefined(data), updatedAt: serverTimestamp() }
  const tokenFields = ['code', 'name', 'brand', 'model', 'barcode', 'categoryName', 'subcategoryName', 'description']
  if (Object.keys(data).some(k => tokenFields.includes(k))) {
    const snap = await getDoc(doc(db, 'products', id))
    if (snap.exists()) {
      patch.searchTokens = buildProductSearchTokens({ ...snap.data(), ...data } as Product)
    }
  }
  return updateDoc(doc(db, 'products', id), patch)
}

export const deleteProduct = async (id: string) => {
  return deleteDoc(doc(db, 'products', id))
}

export function listenProducts(
  studioId: string,
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
) {
  const q = studioListenQuery('products', studioId, 'createdAt', maxItems)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))),
    err => onError?.(err),
  )
}

export const getNextProductCode = async (studioId: string): Promise<string> => {
  const q = query(collection(db, 'products'), where('studioId', '==', studioId), orderBy('code', 'desc'), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return '0001'
  const lastCode = (snap.docs[0].data() as Product).code || '0000'
  return String(Number(lastCode) + 1).padStart(4, '0')
}

// ==================== REPAIRS ====================

export const getRepairs = async (studioId: string, maxItems = FIRESTORE_LIVE_WINDOW): Promise<Repair[]> => {
  const snap = await getDocs(studioListenQuery('repairs', studioId, 'createdAt', maxItems))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Repair))
}

export const addRepair = async (data: Omit<Repair, 'id' | 'createdAt' | 'updatedAt'>) => {
  return addDoc(collection(db, 'repairs'), {
    ...omitUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const updateRepair = async (id: string, data: Partial<Repair>) => {
  return updateDoc(doc(db, 'repairs', id), { ...omitUndefined(data), updatedAt: serverTimestamp() })
}

export function listenRepairs(
  studioId: string,
  callback: (repairs: Repair[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
) {
  const q = studioListenQuery('repairs', studioId, 'createdAt', maxItems)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Repair))),
    err => onError?.(err),
  )
}

export function listenReadyRepairs(
  studioId: string,
  callback: (repairs: Repair[]) => void,
  onError?: (error: Error) => void,
  maxItems = 25,
) {
  const q = query(
    collection(db, 'repairs'),
    where('studioId', '==', studioId),
    where('status', '==', 'ready'),
    orderBy('createdAt', 'desc'),
    limit(maxItems),
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Repair))),
    err => onError?.(err),
  )
}

// ==================== CLIENTS ====================

export const getClients = async (studioId: string, maxItems = FIRESTORE_LIVE_WINDOW): Promise<Client[]> => {
  const snap = await getDocs(studioListenQuery('clients', studioId, 'createdAt', maxItems))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))
}

export const addClient = async (data: Omit<Client, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'clients'), {
    ...omitUndefined(data),
    searchTokens: buildClientSearchTokens(data),
    createdAt: serverTimestamp(),
  })
}

export const updateClient = async (id: string, data: Partial<Client>) => {
  const patch: Record<string, unknown> = { ...omitUndefined(data), updatedAt: serverTimestamp() }
  const tokenFields = ['code', 'name', 'phone', 'cellPhone', 'email', 'vatNumber', 'fiscalCode', 'city', 'address', 'contactPerson']
  if (Object.keys(data).some(k => tokenFields.includes(k))) {
    const snap = await getDoc(doc(db, 'clients', id))
    if (snap.exists()) {
      patch.searchTokens = buildClientSearchTokens({ ...snap.data(), ...data } as Client)
    }
  }
  return updateDoc(doc(db, 'clients', id), patch)
}

export const deleteClient = async (id: string) => {
  return deleteDoc(doc(db, 'clients', id))
}

export function listenClients(
  studioId: string,
  callback: (clients: Client[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
) {
  const q = studioListenQuery('clients', studioId, 'createdAt', maxItems)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))),
    err => onError?.(err),
  )
}

export const getNextClientCode = async (studioId: string): Promise<string> => {
  return getNextAnagraficaCode(studioId)
}

// ==================== SUPPLIERS ====================

export const getSuppliers = async (studioId: string, maxItems = FIRESTORE_LIVE_WINDOW): Promise<Supplier[]> => {
  const snap = await getDocs(studioListenQuery('suppliers', studioId, 'createdAt', maxItems))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier))
}

export const addSupplier = async (data: Omit<Supplier, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'suppliers'), {
    ...omitUndefined(data),
    searchTokens: buildSupplierSearchTokens(data),
    createdAt: serverTimestamp(),
  })
}

export const updateSupplier = async (id: string, data: Partial<Supplier>) => {
  const patch: Record<string, unknown> = { ...omitUndefined(data), updatedAt: serverTimestamp() }
  const tokenFields = ['code', 'name', 'phone', 'cellPhone', 'email', 'vatNumber', 'fiscalCode', 'city', 'address', 'contactPerson']
  if (Object.keys(data).some(k => tokenFields.includes(k))) {
    const snap = await getDoc(doc(db, 'suppliers', id))
    if (snap.exists()) {
      patch.searchTokens = buildSupplierSearchTokens({ ...snap.data(), ...data } as Supplier)
    }
  }
  return updateDoc(doc(db, 'suppliers', id), patch)
}

export const deleteSupplier = async (id: string) => {
  return deleteDoc(doc(db, 'suppliers', id))
}

export const getNextSupplierCode = async (studioId: string): Promise<string> => {
  return getNextAnagraficaCode(studioId)
}

/** Codice progressivo condiviso clienti + fornitori (come gestionale enterprise). */
export const getNextAnagraficaCode = async (studioId: string): Promise<string> => {
  const [clientSnap, supplierSnap] = await Promise.all([
    getDocs(query(collection(db, 'clients'), where('studioId', '==', studioId), orderBy('code', 'desc'), limit(1))),
    getDocs(query(collection(db, 'suppliers'), where('studioId', '==', studioId), orderBy('code', 'desc'), limit(1))),
  ])
  let max = 0
  if (!clientSnap.empty) {
    const c = clientSnap.docs[0].data() as Client
    max = Math.max(max, Number(c.code) || 0)
  }
  if (!supplierSnap.empty) {
    const s = supplierSnap.docs[0].data() as Supplier
    max = Math.max(max, Number(s.code) || 0)
  }
  return String(max + 1).padStart(4, '0')
}

export function listenSuppliers(
  studioId: string,
  callback: (suppliers: Supplier[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
) {
  const q = studioListenQuery('suppliers', studioId, 'createdAt', maxItems)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier))),
    err => onError?.(err),
  )
}

// ==================== DOCUMENTS ====================

export const getDocuments = async (
  studioId: string,
  type?: string,
  maxItems = FIRESTORE_LIVE_WINDOW,
): Promise<DocRecord[]> => {
  const extra = type ? [where('type', '==', type)] : []
  const snap = await getDocs(studioListenQuery('documents', studioId, 'createdAt', maxItems, extra))
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as DocRecord))
}

export const addDocument = async (data: Omit<DocRecord, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'documents'), {
    ...omitUndefined(data),
    createdAt: serverTimestamp(),
  })
}

export const updateDocument = async (id: string, data: Partial<DocRecord>) => {
  return updateDoc(doc(db, 'documents', id), {
    ...omitUndefined(data),
    updatedAt: serverTimestamp(),
  })
}

export const deleteDocument = async (id: string) => {
  return deleteDoc(doc(db, 'documents', id))
}

export const getNextDocumentNumber = async (
  studioId: string,
  type: string,
  year?: number,
): Promise<number> => {
  const y = year ?? new Date().getFullYear()
  const q = query(
    collection(db, 'documents'),
    where('studioId', '==', studioId),
    where('type', '==', type),
    where('documentYear', '==', y),
    orderBy('number', 'desc'),
    limit(1),
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    return ((snap.docs[0].data() as DocRecord).number || 0) + 1
  }
  // Fallback legacy docs senza documentYear
  const legacyQ = query(
    collection(db, 'documents'),
    where('studioId', '==', studioId),
    where('type', '==', type),
    orderBy('number', 'desc'),
    limit(20),
  )
  const legacySnap = await getDocs(legacyQ)
  const sameYearMax = legacySnap.docs.reduce((max, d) => {
    const rec = d.data() as DocRecord
    const docY = rec.documentYear ?? parseInt(String(rec.date || '').slice(0, 4), 10)
    if (docY !== y) return max
    return Math.max(max, rec.number || 0)
  }, 0)
  return sameYearMax + 1
}

export function listenDocuments(
  studioId: string,
  callback: (docs: DocRecord[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
  type?: string,
) {
  const extra = type ? [where('type', '==', type)] : []
  const q = studioListenQuery('documents', studioId, 'createdAt', maxItems, extra)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as DocRecord))),
    err => onError?.(err),
  )
}

// ==================== PAYMENT RESOURCES ====================

export const getPaymentResources = async (studioId: string, maxItems = 50): Promise<PaymentResource[]> => {
  const q = query(
    collection(db, 'paymentResources'),
    where('studioId', '==', studioId),
    orderBy('sortOrder', 'asc'),
    limit(maxItems),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentResource))
}

export const addPaymentResource = async (data: Omit<PaymentResource, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'paymentResources'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updatePaymentResource = async (id: string, data: Partial<PaymentResource>) => {
  return updateDoc(doc(db, 'paymentResources', id), { ...omitUndefined(data), updatedAt: serverTimestamp() })
}

export const deletePaymentResource = async (id: string) => {
  return deleteDoc(doc(db, 'paymentResources', id))
}

/** Precarica Contanti, POS/Carta, Bonifico se lo studio non ne ha ancora. */
export function listenPaymentResources(
  studioId: string,
  callback: (resources: PaymentResource[]) => void,
  onError?: (error: Error) => void,
  maxItems = 50,
) {
  const q = query(
    collection(db, 'paymentResources'),
    where('studioId', '==', studioId),
    orderBy('sortOrder', 'asc'),
    limit(maxItems),
  )
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentResource))),
    err => onError?.(err),
  )
}

export const ensureDefaultPaymentResources = async (studioId: string): Promise<PaymentResource[]> => {
  const existing = await getPaymentResources(studioId)
  if (existing.length > 0) return existing

  const defaults: Omit<PaymentResource, 'id' | 'createdAt'>[] = [
    { studioId, name: 'Contanti', type: 'cash', isDefault: true, sortOrder: 0, initialBalance: 0 },
    { studioId, name: 'Bancomat', type: 'card', sortOrder: 1 },
    { studioId, name: 'Bonifico bancario', type: 'bank', sortOrder: 2 },
  ]

  await Promise.all(defaults.map(d => addPaymentResource(d)))
  return getPaymentResources(studioId)
}

// ==================== PAYMENTS ====================

export const getPayments = async (studioId: string, maxItems = FIRESTORE_LIVE_WINDOW): Promise<Payment[]> => {
  const snap = await getDocs(studioListenQuery('payments', studioId, 'date', maxItems))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))
}

export const addPayment = async (data: Omit<Payment, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'payments'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updatePayment = async (id: string, data: Partial<Payment>) => {
  return updateDoc(doc(db, 'payments', id), { ...omitUndefined(data), updatedAt: serverTimestamp() })
}

export const deletePayment = async (id: string) => {
  return deleteDoc(doc(db, 'payments', id))
}

export function listenPayments(
  studioId: string,
  callback: (payments: Payment[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
) {
  const q = studioListenQuery('payments', studioId, 'date', maxItems)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment))),
    err => onError?.(err),
  )
}

// ==================== STOCK MOVEMENTS ====================

export const getStockMovements = async (studioId: string, maxItems = FIRESTORE_LIVE_WINDOW): Promise<StockMovement[]> => {
  const snap = await getDocs(studioListenQuery('stockMovements', studioId, 'date', maxItems))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement))
}

export const addStockMovement = async (data: Omit<StockMovement, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'stockMovements'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updateStockMovement = async (id: string, data: Partial<StockMovement>) => {
  return updateDoc(doc(db, 'stockMovements', id), omitUndefined(data))
}

export const deleteStockMovement = async (id: string) => {
  return deleteDoc(doc(db, 'stockMovements', id))
}

export function listenStockMovements(
  studioId: string,
  callback: (movements: StockMovement[]) => void,
  onError?: (error: Error) => void,
  maxItems = FIRESTORE_LIVE_WINDOW,
) {
  const q = studioListenQuery('stockMovements', studioId, 'date', maxItems)
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement))),
    err => onError?.(err),
  )
}

// ==================== AGENTS / WAREHOUSES / PRICE LISTS ====================

export const getAgents = async (studioId: string, maxItems = 200): Promise<Agent[]> => {
  const q = query(
    collection(db, 'agents'),
    where('studioId', '==', studioId),
    orderBy('name', 'asc'),
    limit(maxItems),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Agent))
}

export const addAgent = async (data: Omit<Agent, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'agents'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updateAgent = async (id: string, data: Partial<Agent>) => {
  return updateDoc(doc(db, 'agents', id), { ...omitUndefined(data), updatedAt: serverTimestamp() })
}

export const deleteAgent = async (id: string) => deleteDoc(doc(db, 'agents', id))

export const ensureDefaultAgents = async (studioId: string): Promise<Agent[]> => {
  const existing = await getAgents(studioId)
  if (existing.length > 0) return existing
  const defaults = ['Agente 1', 'Agente 2', 'Agente 3']
  await Promise.all(defaults.map(name => addAgent({ studioId, name, isActive: true })))
  return getAgents(studioId)
}

export const getWarehouses = async (studioId: string, maxItems = 100): Promise<Warehouse[]> => {
  const q = query(
    collection(db, 'warehouses'),
    where('studioId', '==', studioId),
    orderBy('name', 'asc'),
    limit(maxItems),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))
}

export const addWarehouse = async (data: Omit<Warehouse, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'warehouses'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updateWarehouse = async (id: string, data: Partial<Warehouse>) => {
  return updateDoc(doc(db, 'warehouses', id), { ...omitUndefined(data), updatedAt: serverTimestamp() })
}

export const deleteWarehouse = async (id: string) => deleteDoc(doc(db, 'warehouses', id))

export const ensureDefaultWarehouses = async (studioId: string): Promise<Warehouse[]> => {
  const existing = await getWarehouses(studioId)
  if (existing.length > 0) return existing
  await addWarehouse({ studioId, name: 'Magazzino principale', code: 'MAIN', isDefault: true })
  return getWarehouses(studioId)
}

export const getPriceListConfigs = async (studioId: string, maxItems = 20): Promise<PriceListConfig[]> => {
  const q = query(
    collection(db, 'priceLists'),
    where('studioId', '==', studioId),
    orderBy('sortOrder', 'asc'),
    limit(maxItems),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PriceListConfig))
}

export const addPriceListConfig = async (data: Omit<PriceListConfig, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, 'priceLists'), { ...omitUndefined(data), createdAt: serverTimestamp() })
}

export const updatePriceListConfig = async (id: string, data: Partial<PriceListConfig>) => {
  return updateDoc(doc(db, 'priceLists', id), { ...omitUndefined(data), updatedAt: serverTimestamp() })
}

export const deletePriceListConfig = async (id: string) => deleteDoc(doc(db, 'priceLists', id))

export const ensureDefaultPriceLists = async (studioId: string): Promise<PriceListConfig[]> => {
  const existing = await getPriceListConfigs(studioId)
  if (existing.length > 0) return existing
  const defaults: Omit<PriceListConfig, 'id' | 'createdAt'>[] = [
    { studioId, name: 'Privati', code: 'privati', isDefault: true, sortOrder: 1, vatIncluded: true },
    { studioId, name: 'Aziende', code: 'aziende', sortOrder: 2, vatIncluded: true },
    { studioId, name: 'Convenzionati', code: 'convenzionati', sortOrder: 3, vatIncluded: true },
    { studioId, name: 'VIP', code: 'vip', sortOrder: 4, vatIncluded: true },
  ]
  await Promise.all(defaults.map(d => addPriceListConfig(d)))
  return getPriceListConfigs(studioId)
}