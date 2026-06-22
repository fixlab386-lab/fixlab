import {
  collection,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Category, Client, DocRecord, Payment, Product, Repair, StockMovement, Supplier } from '../types'
import type { ClientSearchCriteria } from './clientSearch'
import { filterClientsByCriteria } from './clientSearch'
import { filterProductsByCriteria, type ProductSearchCriteria } from './productSearch'
import type { ProductSelectionFilters } from '../gestionale/features/vendita-banco/productSelectionFilter'
import { filterProductsForSelection } from '../gestionale/features/vendita-banco/productSelectionFilter'
import { STALE_REPAIR_DAYS } from './dashboardMetrics'
import { FIRESTORE_PAGE_SIZE, FIRESTORE_SEARCH_LIMIT } from './firestoreScale'
import { haystackIncludesAll, tokenizeSearchTerm } from './searchTokens'

type PageResult<T> = {
  items: T[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

/** Ricerca su tutto il catalogo via searchTokens (array-contains). */
async function searchByTokens<T>(
  collectionName: 'products' | 'clients' | 'suppliers',
  studioId: string,
  term: string,
  maxResults: number,
  toHaystack: (item: T) => string,
  mapDoc: (id: string, data: DocumentData) => T,
): Promise<T[]> {
  const words = tokenizeSearchTerm(term)
  if (!words.length) return []

  try {
    const snap = await getDocs(
      query(
        collection(db, collectionName),
        where('studioId', '==', studioId),
        where('searchTokens', 'array-contains', words[0]),
        limit(Math.max(maxResults * 3, 60)),
      ),
    )
    if (snap.empty) return []

    let items = snap.docs.map(d => mapDoc(d.id, d.data()))
    if (words.length > 1) {
      items = items.filter(item => haystackIncludesAll(toHaystack(item), words))
    }
    return items.slice(0, maxResults)
  } catch {
    return []
  }
}

/** Ordine stabile: tie-break su documentId evita salti in paginazione (import con stesso createdAt). */
function studioPageConstraints(
  studioId: string,
  orderField: string,
  extra: QueryConstraint[] = [],
): QueryConstraint[] {
  return [where('studioId', '==', studioId), ...extra, orderBy(orderField, 'desc'), orderBy(documentId(), 'desc')]
}

export function studioListenQuery(
  collectionName: string,
  studioId: string,
  orderField: string,
  maxItems: number,
  extra: QueryConstraint[] = [],
) {
  return query(collection(db, collectionName), ...studioPageConstraints(studioId, orderField, extra), limit(maxItems))
}

async function fetchStudioPage<T>(
  collectionName: string,
  studioId: string,
  orderField: string,
  pageSize: number,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  extra: QueryConstraint[] = [],
): Promise<PageResult<T>> {
  const constraints = studioPageConstraints(studioId, orderField, extra)
  const q = cursor
    ? query(collection(db, collectionName), ...constraints, startAfter(cursor), limit(pageSize))
    : query(collection(db, collectionName), ...constraints, limit(pageSize))

  const snap = await getDocs(q)
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { items, lastDoc, hasMore: snap.docs.length >= pageSize }
}

export function fetchProductsPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  return fetchStudioPage<Product>('products', studioId, 'createdAt', pageSize, cursor)
}

export function fetchClientsPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  return fetchStudioPage<Client>('clients', studioId, 'createdAt', pageSize, cursor)
}

export function fetchSuppliersPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  return fetchStudioPage<Supplier>('suppliers', studioId, 'createdAt', pageSize, cursor)
}

export function fetchRepairsPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  return fetchStudioPage<Repair>('repairs', studioId, 'createdAt', pageSize, cursor)
}

export function fetchDocumentsPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
  type?: string,
) {
  if (!type) return fetchStudioPage<DocRecord>('documents', studioId, 'createdAt', pageSize, cursor)

  const constraints = studioPageConstraints(studioId, 'createdAt', [where('type', '==', type)])
  const q = cursor
    ? query(collection(db, 'documents'), ...constraints, startAfter(cursor), limit(pageSize))
    : query(collection(db, 'documents'), ...constraints, limit(pageSize))

  return getDocs(q).then(snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocRecord))
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
    return { items, lastDoc, hasMore: snap.docs.length >= pageSize }
  })
}

export function fetchPaymentsPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  return fetchStudioPage<Payment>('payments', studioId, 'date', pageSize, cursor)
}

export function fetchStockMovementsPage(
  studioId: string,
  cursor?: QueryDocumentSnapshot<DocumentData> | null,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  return fetchStudioPage<StockMovement>('stockMovements', studioId, 'date', pageSize, cursor)
}

/** Prodotto per codice esatto (query mirata). */
export async function findProductByCode(studioId: string, code: string): Promise<Product | null> {
  const trimmed = code.trim()
  if (!trimmed) return null
  const snap = await getDocs(
    query(
      collection(db, 'products'),
      where('studioId', '==', studioId),
      where('code', '==', trimmed),
      limit(1),
    ),
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Product
}

/** Autocomplete righe documento: barcode/codice esatto + ricerca bounded. */
export async function autocompleteProducts(
  studioId: string,
  term: string,
  maxResults = 10,
): Promise<Product[]> {
  const trimmed = term.trim()
  if (!trimmed) return []

  const found: Product[] = []
  const seen = new Set<string>()
  const add = (p: Product | null) => {
    if (p && !seen.has(p.id)) {
      seen.add(p.id)
      found.push(p)
    }
  }

  if (trimmed.length >= 4) {
    add(await findProductByBarcode(studioId, trimmed))
  }
  add(await findProductByCode(studioId, trimmed))

  if (found.length < maxResults) {
    for (const p of await searchProducts(studioId, trimmed, maxResults)) {
      add(p)
      if (found.length >= maxResults) break
    }
  }

  return found.slice(0, maxResults)
}

/** Ricerca prodotti bounded (max N record da Firestore, filtro in memoria). */
export async function searchProducts(studioId: string, term: string, maxResults = FIRESTORE_SEARCH_LIMIT): Promise<Product[]> {
  const q = term.trim().toLowerCase()
  if (q) {
    const tokenHits = await searchByTokens<Product>(
      'products',
      studioId,
      q,
      maxResults,
      p => `${p.code} ${p.name} ${p.brand || ''} ${p.model || ''} ${p.barcode || ''} ${p.categoryName || ''}`,
      (id, data) => ({ id, ...data } as Product),
    )
    if (tokenHits.length) return tokenHits
  }

  const snap = await getDocs(
    query(
      collection(db, 'products'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 3, 60)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  if (!q) return all.filter(p => p.stock > 0).slice(0, maxResults)
  return all
    .filter(p => {
      const hay = `${p.code} ${p.name} ${p.brand || ''} ${p.model || ''} ${p.barcode || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, maxResults)
}

/** Ricerca prodotti con criteri multipli (bounded). */
export async function searchProductsByCriteria(
  studioId: string,
  criteria: ProductSearchCriteria,
  options?: { categoryTreeId?: string | null; categories?: Category[] },
  maxResults = 40,
): Promise<Product[]> {
  const parts = [criteria.code, criteria.description, criteria.category].map(s => s.trim()).filter(Boolean)
  const term = parts.join(' ')
  const snap = await getDocs(
    query(
      collection(db, 'products'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 4, 80)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  if (!term && !options?.categoryTreeId) {
    return filterProductsByCriteria(all, criteria, options).slice(0, maxResults)
  }
  const narrowed = term
    ? all.filter(p => {
        const hay = `${p.code} ${p.name} ${p.brand || ''} ${p.model || ''} ${p.barcode || ''} ${p.categoryName || ''}`.toLowerCase()
        return hay.includes(term.toLowerCase())
      })
    : all
  return filterProductsByCriteria(narrowed, criteria, options).slice(0, maxResults)
}

/** Ricerca catalogo per dialog selezione prodotti (bounded + filtri locali). */
export async function searchProductsForSelection(
  studioId: string,
  filters: ProductSelectionFilters,
  filtraPanelOpen: boolean,
  maxResults = 60,
  categories: Category[] = [],
): Promise<Product[]> {
  const quick = filters.quickSearch.trim()
  const hasDetail =
    filtraPanelOpen &&
    Boolean(
      filters.codice.trim() ||
        filters.descrizione.trim() ||
        filters.categoriaId ||
        filters.produttore.trim() ||
        filters.soloConGiacenza ||
        filters.soloServizi,
    )

  if (!quick && !hasDetail) {
    const page = await fetchProductsPage(studioId, null, maxResults)
    return page.items
  }

  const term = quick || [filters.codice, filters.descrizione, filters.produttore].filter(s => s.trim()).join(' ')
  const snap = await getDocs(
    query(
      collection(db, 'products'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 3, 90)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
  const narrowed = term
    ? all.filter(p => {
        const hay = [p.code, p.name, p.categoryName, p.brand, p.model, p.barcode, p.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(term.toLowerCase())
      })
    : all
  return filterProductsForSelection(narrowed, filters, filtraPanelOpen, categories).slice(0, maxResults)
}

export type AnalyticsPeriod = 'week' | 'month' | 'year'

function periodStartDate(period: AnalyticsPeriod): Date {
  const now = new Date()
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(now.getFullYear(), 0, 1)
}

/** Riparazioni nel periodo (query Firestore paginata, cap 800). */
export async function fetchRepairsForPeriod(
  studioId: string,
  period: AnalyticsPeriod,
  maxResults = 800,
): Promise<Repair[]> {
  const startTs = Timestamp.fromDate(periodStartDate(period))
  const items: Repair[] = []
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null
  const pageSize = 200

  for (;;) {
    const base = [
      collection(db, 'repairs'),
      where('studioId', '==', studioId),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
    ] as const

    const q = cursor
      ? query(...base, startAfter(cursor), limit(pageSize))
      : query(...base, limit(pageSize))

    const snap = await getDocs(q)
    if (snap.empty) break

    for (const d of snap.docs) {
      items.push({ id: d.id, ...d.data() } as Repair)
      if (items.length >= maxResults) return items
    }

    if (snap.docs.length < pageSize) break
    cursor = snap.docs[snap.docs.length - 1]
  }

  return items
}

/** Ricerca clienti bounded. */
export async function searchClients(studioId: string, term: string, maxResults = FIRESTORE_SEARCH_LIMIT): Promise<Client[]> {
  const q = term.trim().toLowerCase()
  if (q) {
    const tokenHits = await searchByTokens<Client>(
      'clients',
      studioId,
      q,
      maxResults,
      c => `${c.code || ''} ${c.name} ${c.phone || ''} ${c.email || ''} ${c.vatNumber || ''} ${c.fiscalCode || ''} ${c.city || ''}`,
      (id, data) => ({ id, ...data } as Client),
    )
    if (tokenHits.length) return tokenHits
  }

  const snap = await getDocs(
    query(
      collection(db, 'clients'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 3, 60)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))
  if (!q) return all.slice(0, maxResults)
  return all
    .filter(c => {
      const hay = `${c.name} ${c.phone || ''} ${c.email || ''} ${c.code || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, maxResults)
}

/** Cliente per codice esatto (query mirata). */
export async function findClientByCode(studioId: string, code: string): Promise<Client | null> {
  const trimmed = code.trim()
  if (!trimmed) return null
  const snap = await getDocs(
    query(
      collection(db, 'clients'),
      where('studioId', '==', studioId),
      where('code', '==', trimmed),
      limit(1),
    ),
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Client
}

/** Autocomplete clienti: codice esatto + ricerca bounded. */
export async function autocompleteClients(
  studioId: string,
  term: string,
  maxResults = 12,
): Promise<Client[]> {
  const trimmed = term.trim()
  if (!trimmed) return fetchClientsPage(studioId, null, maxResults).then(p => p.items)

  const found: Client[] = []
  const seen = new Set<string>()
  const add = (c: Client | null) => {
    if (c && !seen.has(c.id)) {
      seen.add(c.id)
      found.push(c)
    }
  }

  add(await findClientByCode(studioId, trimmed))

  if (found.length < maxResults) {
    for (const c of await searchClients(studioId, trimmed, maxResults)) {
      add(c)
      if (found.length >= maxResults) break
    }
  }

  return found.slice(0, maxResults)
}

/** Riparazioni di un cliente. */
export async function fetchClientRepairs(
  studioId: string,
  clientId: string,
  maxItems = 100,
): Promise<Repair[]> {
  const snap = await getDocs(
    query(
      collection(db, 'repairs'),
      where('studioId', '==', studioId),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    ),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Repair))
}

/** Documenti collegati a un soggetto (cliente/fornitore). */
export async function fetchSubjectDocuments(
  studioId: string,
  subjectId: string,
  maxItems = 200,
): Promise<DocRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, 'documents'),
      where('studioId', '==', studioId),
      where('subjectId', '==', subjectId),
      orderBy('createdAt', 'desc'),
      limit(maxItems),
    ),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DocRecord))
}

/** Verifica se esistono pagamenti collegati a un documento. */
export async function hasPaymentsForDocument(studioId: string, documentId: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, 'payments'),
      where('studioId', '==', studioId),
      where('linkedDocumentId', '==', documentId),
      limit(1),
    ),
  )
  return !snap.empty
}

/** Conteggio documenti per tipo (scalabile, no download). */
export async function countDocumentsByType(studioId: string, type: string): Promise<number> {
  const snap = await getCountFromServer(
    query(
      collection(db, 'documents'),
      where('studioId', '==', studioId),
      where('type', '==', type),
    ),
  )
  return snap.data().count
}

/** Conteggio documenti in una collezione tenant. */
export async function countStudioCollection(collectionName: string, studioId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, collectionName), where('studioId', '==', studioId)),
  )
  return snap.data().count
}

/** Riparazioni pronte per consegna (bounded). */
export async function fetchReadyRepairs(studioId: string, maxResults = 25): Promise<Repair[]> {
  const snap = await getDocs(
    query(
      collection(db, 'repairs'),
      where('studioId', '==', studioId),
      where('status', '==', 'ready'),
      orderBy('createdAt', 'desc'),
      limit(maxResults),
    ),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Repair))
}

/** Prodotto per barcode (query mirata). */
export async function findProductByBarcode(studioId: string, barcode: string): Promise<Product | null> {
  const trimmed = barcode.trim()
  if (!trimmed) return null
  const snap = await getDocs(
    query(
      collection(db, 'products'),
      where('studioId', '==', studioId),
      where('barcode', '==', trimmed),
      limit(1),
    ),
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Product
}

/** Ricerca clienti con criteri multipli (bounded). */
export async function searchClientsByCriteria(
  studioId: string,
  criteria: ClientSearchCriteria,
  maxResults = 40,
): Promise<Client[]> {
  const parts = [criteria.vatNumber, criteria.fiscalCode, criteria.code, criteria.name]
    .map(s => s.trim())
    .filter(Boolean)
  const term = parts.join(' ')
  const snap = await getDocs(
    query(
      collection(db, 'clients'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 4, 80)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))
  if (!term) return filterClientsByCriteria(all, criteria).slice(0, maxResults)
  const narrowed = all.filter(c => {
    const hay = `${c.code} ${c.name} ${c.fiscalCode || ''} ${c.vatNumber || ''} ${c.phone || ''}`.toLowerCase()
    return hay.includes(term.toLowerCase())
  })
  return filterClientsByCriteria(narrowed, criteria).slice(0, maxResults)
}

/** Conteggio prodotti sotto scorta via aggregazione (stock 1–3, soglia predefinita). */
export async function countLowStockProducts(studioId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(
      collection(db, 'products'),
      where('studioId', '==', studioId),
      where('stock', '>=', 1),
      where('stock', '<=', 3),
    ),
  )
  return snap.data().count
}

/** Conteggio riparazioni stale (on_hold + aperte inattive). */
export async function countStaleRepairs(studioId: string): Promise<number> {
  const onHold = await countStudioCollectionWithFilters('repairs', studioId, where('status', '==', 'on_hold'))
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STALE_REPAIR_DAYS)
  const cutoffTs = Timestamp.fromDate(cutoff)
  const staleOpen = await countStudioCollectionWithFilters(
    'repairs',
    studioId,
    where('status', 'in', ['received', 'in_progress', 'waiting_parts']),
    where('updatedAt', '<', cutoffTs),
  )
  return onHold + staleOpen
}

/** Pagamenti non saldati in scadenza entro 7 giorni. */
export async function countDueSoonPayments(studioId: string): Promise<number> {
  const in7 = new Date()
  in7.setDate(in7.getDate() + 7)
  const dateLimit = in7.toISOString().slice(0, 10)
  return countStudioCollectionWithFilters(
    'payments',
    studioId,
    where('settled', '==', false),
    where('date', '<=', dateLimit),
  )
}

async function countStudioCollectionWithFilters(
  collectionName: string,
  studioId: string,
  ...filters: ReturnType<typeof where>[]
): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, collectionName), where('studioId', '==', studioId), ...filters),
  )
  return snap.data().count
}

/** Conteggio totale documenti dello studio. */
export async function countStudioDocuments(studioId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, 'documents'), where('studioId', '==', studioId)),
  )
  return snap.data().count
}

const EXPORT_COLLECTION_ORDER: Record<string, string> = {
  payments: 'date',
  stockMovements: 'date',
  categories: 'order',
}

const EXPORT_PAGE_SIZE = 400

/** Scarica un'intera collezione tenant a pagine (backup/export senza picco memoria). */
export async function fetchStudioCollectionForExport(
  collectionName: string,
  studioId: string,
  onPage?: (loaded: number) => void,
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  const orderField = EXPORT_COLLECTION_ORDER[collectionName] ?? 'createdAt'
  const items: Array<{ id: string } & Record<string, unknown>> = []
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null

  for (;;) {
    const page = await fetchStudioPage<Record<string, unknown>>(
      collectionName,
      studioId,
      orderField,
      EXPORT_PAGE_SIZE,
      cursor,
    )
    for (const row of page.items) {
      const typed = row as { id: string } & Record<string, unknown>
      items.push({ id: typed.id, ...typed })
    }
    onPage?.(items.length)
    if (!page.hasMore || page.items.length === 0) break
    cursor = page.lastDoc
  }

  return items
}

/** Ricerca fornitori bounded. */
export async function searchSuppliers(
  studioId: string,
  term: string,
  maxResults = FIRESTORE_SEARCH_LIMIT,
): Promise<Supplier[]> {
  const q = term.trim().toLowerCase()
  if (q) {
    const tokenHits = await searchByTokens<Supplier>(
      'suppliers',
      studioId,
      q,
      maxResults,
      s => `${s.code} ${s.name} ${s.phone || ''} ${s.email || ''} ${s.vatNumber || ''} ${s.fiscalCode || ''} ${s.city || ''}`,
      (id, data) => ({ id, ...data } as Supplier),
    )
    if (tokenHits.length) return tokenHits
  }

  const snap = await getDocs(
    query(
      collection(db, 'suppliers'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 3, 60)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier))
  if (!q) return all.slice(0, maxResults)
  return all
    .filter(s => {
      const hay = `${s.name} ${s.phone || ''} ${s.email || ''} ${s.code || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, maxResults)
}

/** Fornitore per codice esatto. */
export async function findSupplierByCode(studioId: string, code: string): Promise<Supplier | null> {
  const trimmed = code.trim()
  if (!trimmed) return null
  const snap = await getDocs(
    query(
      collection(db, 'suppliers'),
      where('studioId', '==', studioId),
      where('code', '==', trimmed),
      limit(1),
    ),
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Supplier
}

/** Autocomplete fornitori: codice esatto + ricerca bounded. */
export async function autocompleteSuppliers(
  studioId: string,
  term: string,
  maxResults = 12,
): Promise<Supplier[]> {
  const trimmed = term.trim()
  if (!trimmed) return fetchSuppliersPage(studioId, null, maxResults).then(p => p.items)

  const found: Supplier[] = []
  const seen = new Set<string>()
  const add = (s: Supplier | null) => {
    if (s && !seen.has(s.id)) {
      seen.add(s.id)
      found.push(s)
    }
  }

  add(await findSupplierByCode(studioId, trimmed))

  if (found.length < maxResults) {
    for (const s of await searchSuppliers(studioId, trimmed, maxResults)) {
      add(s)
      if (found.length >= maxResults) break
    }
  }

  return found.slice(0, maxResults)
}

/** Ricerca documenti bounded (numero, soggetto, commento). */
export async function searchDocuments(
  studioId: string,
  term: string,
  maxResults = FIRESTORE_SEARCH_LIMIT,
): Promise<DocRecord[]> {
  const q = term.trim().toLowerCase()
  const snap = await getDocs(
    query(
      collection(db, 'documents'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc'),
      limit(Math.max(maxResults * 3, 60)),
    ),
  )
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as DocRecord))
  if (!q) return all.slice(0, maxResults)
  return all
    .filter(d => {
      const hay = `${d.fullNumber || d.number || ''} ${d.subjectName || ''} ${d.internalNotes || ''}`.toLowerCase()
      return hay.includes(q)
    })
    .slice(0, maxResults)
}

/** Conteggio pagamenti per risorsa (no download massivo). */
export async function countPaymentsByResource(studioId: string, resourceId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(
      collection(db, 'payments'),
      where('studioId', '==', studioId),
      where('resourceId', '==', resourceId),
    ),
  )
  return snap.data().count
}

/** Conteggio clienti dello studio. */
export async function countStudioClients(studioId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, 'clients'), where('studioId', '==', studioId)),
  )
  return snap.data().count
}
