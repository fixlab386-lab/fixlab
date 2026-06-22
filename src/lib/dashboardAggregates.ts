import {
  collection,
  getAggregateFromServer,
  getCountFromServer,
  query,
  sum,
  where,
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

const SALES_STATUSES = ['confirmed', 'sent', 'completed'] as const

/** Somma vendite mese corrente via aggregazione Firestore (poche letture vs paginare ogni documento). */
async function sumSalesMonthTotal(studioId: string): Promise<number> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endMonth = month === 11 ? 1 : month + 2
  const endYear = month === 11 ? year + 1 : year
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  const baseFilters = [
    where('studioId', '==', studioId),
    where('status', 'in', [...SALES_STATUSES]),
    where('date', '>=', start),
    where('date', '<', end),
  ] as const

  try {
    const [totalSnap, supplierSnap] = await Promise.all([
      getAggregateFromServer(query(collection(db, 'documents'), ...baseFilters), {
        total: sum('totalDocument'),
      }),
      getAggregateFromServer(
        query(collection(db, 'documents'), ...baseFilters, where('subjectType', '==', 'supplier')),
        { total: sum('totalDocument') },
      ),
    ])
    const gross = Number(totalSnap.data().total) || 0
    const supplier = Number(supplierSnap.data().total) || 0
    return Math.max(0, gross - supplier)
  } catch {
    return 0
  }
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

/** KPI esatti via conteggi Firestore (cache 10 min). */
export async function loadDashboardAggregates(
  studioId: string,
  options?: { force?: boolean },
): Promise<DashboardAggregates> {
  if (!options?.force) {
    const cached = readAggregatesCache(studioId)
    if (cached) return cached
  }

  const fresh = await loadDashboardAggregatesFresh(studioId)
  writeAggregatesCache(studioId, fresh)
  return fresh
}
