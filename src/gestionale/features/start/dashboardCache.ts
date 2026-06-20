import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { loadDashboardAggregates, invalidateDashboardAggregatesCache, type DashboardAggregates } from '../../../lib/dashboardAggregates'
import {
  fetchDocumentsPage,
  fetchPaymentsPage,
  fetchProductsPage,
  fetchRepairsPage,
} from '../../../lib/firestorePagination'
import type { DocRecord, Payment, Product, Repair } from '../../../types'

const CACHE_TTL_MS = 2 * 60 * 1000
/** Slice leggera per analytics UI (non KPI, quelli sono in aggregates). */
const ACTIVITY_SLICE = 50

export type DashboardSnapshot = {
  repairs: Repair[]
  products: Product[]
  clients: never[]
  payments: Payment[]
  documents: DocRecord[]
  studioName: string
  aggregates: DashboardAggregates
}

function cacheKey(studioId: string): string {
  return `fixlab-dashboard-v4-${studioId}`
}

function readCache(studioId: string): DashboardSnapshot | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(studioId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ts: number; data: DashboardSnapshot }
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(studioId: string, data: DashboardSnapshot): void {
  try {
    sessionStorage.setItem(cacheKey(studioId), JSON.stringify({ ts: Date.now(), data }))
  } catch {
    /* quota */
  }
}

export function invalidateDashboardCache(studioId: string): void {
  try {
    sessionStorage.removeItem(cacheKey(studioId))
  } catch {
    /* ignore */
  }
  invalidateDashboardAggregatesCache(studioId)
}

export async function loadDashboardSnapshot(studioId: string): Promise<DashboardSnapshot> {
  const cached = readCache(studioId)
  if (cached) return cached

  const [repairsRes, productsRes, paymentsRes, documentsRes, studioSnap, aggregates] = await Promise.all([
    fetchRepairsPage(studioId, null, ACTIVITY_SLICE),
    fetchProductsPage(studioId, null, ACTIVITY_SLICE),
    fetchPaymentsPage(studioId, null, ACTIVITY_SLICE),
    fetchDocumentsPage(studioId, null, ACTIVITY_SLICE),
    getDoc(doc(db, 'studios', studioId)),
    loadDashboardAggregates(studioId),
  ])

  const data: DashboardSnapshot = {
    repairs: repairsRes.items,
    products: productsRes.items,
    clients: [],
    payments: paymentsRes.items,
    documents: documentsRes.items,
    studioName: studioSnap.exists() ? String(studioSnap.data()?.name || '') : '',
    aggregates,
  }
  writeCache(studioId, data)
  return data
}

export type { DashboardAggregates }
