import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { getClients, getDocuments, getPayments, getProducts, getRepairs } from '../../../lib/firestore'
import type { Client, DocRecord, Payment, Product, Repair } from '../../../types'

const CACHE_TTL_MS = 2 * 60 * 1000

export type DashboardSnapshot = {
  repairs: Repair[]
  products: Product[]
  clients: Client[]
  payments: Payment[]
  documents: DocRecord[]
  studioName: string
}

function cacheKey(studioId: string): string {
  return `fixlab-dashboard-v2-${studioId}`
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
}

export async function loadDashboardSnapshot(studioId: string): Promise<DashboardSnapshot> {
  const cached = readCache(studioId)
  if (cached) return cached

  const [repairs, products, clients, payments, documents, studioSnap] = await Promise.all([
    getRepairs(studioId),
    getProducts(studioId),
    getClients(studioId),
    getPayments(studioId),
    getDocuments(studioId),
    getDoc(doc(db, 'studios', studioId)),
  ])

  const data: DashboardSnapshot = {
    repairs,
    products,
    clients,
    payments,
    documents,
    studioName: (studioSnap.data()?.name as string) || '',
  }
  writeCache(studioId, data)
  return data
}
