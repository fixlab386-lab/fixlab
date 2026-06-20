import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  countDueSoonPayments,
  countLowStockProducts,
  countStaleRepairs,
  countStudioClients,
} from './firestorePagination'

export type DashboardAggregates = {
  clientCount: number
  productCount: number
  openRepairs: number
  readyRepairs: number
  staleRepairs: number
  lowStock: number
  outOfStock: number
  unsettledPayments: number
  dueSoonPayments: number
  openOrders: number
  salesMonthTotal: number
}

const AGGREGATES_CACHE_TTL_MS = 10 * 60 * 1000

function aggregatesCacheKey(studioId: string): string {
  return `fixlab-aggregates-v1-${studioId}`
}

function readAggregatesCache(studioId: string): DashboardAggregates | null {
  try {
    const raw = sessionStorage.getItem(aggregatesCacheKey(studioId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ts: number; data: DashboardAggregates }
    if (Date.now() - parsed.ts > AGGREGATES_CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeAggregatesCache(studioId: string, data: DashboardAggregates): void {
  try {
    sessionStorage.setItem(aggregatesCacheKey(studioId), JSON.stringify({ ts: Date.now(), data }))
  } catch {
    /* quota */
  }
}

export function invalidateDashboardAggregatesCache(studioId: string): void {
  try {
    sessionStorage.removeItem(aggregatesCacheKey(studioId))
  } catch {
    /* ignore */
  }
}

async function countWhere(
  collectionName: string,
  studioId: string,
  ...filters: ReturnType<typeof where>[]
): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(db, collectionName), where('studioId', '==', studioId), ...filters),
  )
  return snap.data().count
}

async function countOpenClientOrders(studioId: string): Promise<number> {
  const [total, completed, cancelled] = await Promise.all([
    countWhere('documents', studioId, where('type', '==', 'ordine_cliente')),
    countWhere('documents', studioId, where('type', '==', 'ordine_cliente'), where('status', '==', 'completed')),
    countWhere('documents', studioId, where('type', '==', 'ordine_cliente'), where('status', '==', 'cancelled')),
  ])
  return Math.max(0, total - completed - cancelled)
}

/** Somma vendite mese corrente (clienti) paginando documenti del periodo. */
async function sumSalesMonthTotal(studioId: string): Promise<number> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endMonth = month === 11 ? 1 : month + 2
  const endYear = month === 11 ? year + 1 : year
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  let total = 0
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null
  const pageSize = 400

  for (;;) {
    const base = [
      collection(db, 'documents'),
      where('studioId', '==', studioId),
      where('date', '>=', start),
      where('date', '<', end),
      orderBy('date', 'desc'),
    ] as const

    const q = cursor
      ? query(...base, startAfter(cursor), limit(pageSize))
      : query(...base, limit(pageSize))

    const snap = await getDocs(q)
    if (snap.empty) break

    for (const d of snap.docs) {
      const data = d.data()
      if (data.status === 'cancelled' || data.status === 'draft') continue
      if (data.subjectType === 'supplier') continue
      total += Number(data.totalDocument) || 0
    }

    if (snap.docs.length < pageSize) break
    cursor = snap.docs[snap.docs.length - 1]
  }

  return total
}

async function loadDashboardAggregatesFresh(studioId: string): Promise<DashboardAggregates> {
  const [
    clientCount,
    productCount,
    openRepairs,
    readyRepairs,
    staleRepairs,
    lowStock,
    outOfStock,
    unsettledPayments,
    dueSoonPayments,
    openOrders,
    salesMonthTotal,
  ] = await Promise.all([
    countStudioClients(studioId),
    countWhere('products', studioId),
    countWhere('repairs', studioId, where('status', '!=', 'completed')),
    countWhere('repairs', studioId, where('status', '==', 'ready')),
    countStaleRepairs(studioId),
    countLowStockProducts(studioId),
    countWhere('products', studioId, where('stock', '==', 0)),
    countWhere('payments', studioId, where('settled', '==', false)),
    countDueSoonPayments(studioId),
    countOpenClientOrders(studioId),
    sumSalesMonthTotal(studioId),
  ])

  return {
    clientCount,
    productCount,
    openRepairs,
    readyRepairs,
    staleRepairs,
    lowStock,
    outOfStock,
    unsettledPayments,
    dueSoonPayments,
    openOrders,
    salesMonthTotal,
  }
}

/** KPI esatti via conteggi Firestore (cache 10 min + refresh in background). */
export async function loadDashboardAggregates(
  studioId: string,
  options?: { force?: boolean },
): Promise<DashboardAggregates> {
  if (!options?.force) {
    const cached = readAggregatesCache(studioId)
    if (cached) {
      void loadDashboardAggregatesFresh(studioId)
        .then(fresh => writeAggregatesCache(studioId, fresh))
        .catch(() => {})
      return cached
    }
  }

  const fresh = await loadDashboardAggregatesFresh(studioId)
  writeAggregatesCache(studioId, fresh)
  return fresh
}
