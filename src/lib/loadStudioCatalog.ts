import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import type { Client, DocRecord, Payment, Product, Repair, Supplier } from '../types'
import { FIRESTORE_PAGE_SIZE } from './firestoreScale'
import {
  fetchClientRepairs,
  fetchClientsPage,
  fetchDocumentsPage,
  fetchPaymentsPage,
  fetchProductsPage,
  fetchSubjectDocuments,
  fetchSuppliersPage,
  hasPaymentsForDocument,
} from './firestorePagination'

type PageFetcher<T extends { id: string }> = (
  studioId: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize: number,
) => Promise<{
  items: T[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}>

async function loadAllPages<T extends { id: string }>(
  fetchPage: PageFetcher<T>,
  studioId: string,
): Promise<T[]> {
  const all: T[] = []
  const byId = new Map<string, T>()
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null
  for (;;) {
    const { items, lastDoc, hasMore } = await fetchPage(studioId, cursor, FIRESTORE_PAGE_SIZE)
    for (const item of items) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item)
        all.push(item)
      }
    }
    if (!hasMore || items.length === 0) break
    cursor = lastDoc
  }
  return all
}

export async function loadRecentProducts(studioId: string): Promise<Product[]> {
  return loadAllPages(fetchProductsPage, studioId)
}

export async function loadRecentClients(studioId: string): Promise<Client[]> {
  return loadAllPages(fetchClientsPage, studioId)
}

export async function loadRecentSuppliers(studioId: string): Promise<Supplier[]> {
  return loadAllPages(fetchSuppliersPage, studioId)
}

export async function loadRecentDocuments(studioId: string, type?: string): Promise<DocRecord[]> {
  return loadAllPages(
    (id, cursor, pageSize) => fetchDocumentsPage(id, cursor, pageSize, type),
    studioId,
  )
}

export async function loadRecentPayments(studioId: string): Promise<Payment[]> {
  return loadAllPages(fetchPaymentsPage, studioId)
}

export function loadClientRepairs(studioId: string, clientId: string, limit = 100): Promise<Repair[]> {
  return fetchClientRepairs(studioId, clientId, limit)
}

export function loadSubjectDocuments(studioId: string, subjectId: string, limit = 200): Promise<DocRecord[]> {
  return fetchSubjectDocuments(studioId, subjectId, limit)
}

export { hasPaymentsForDocument }

/** Verifica documenti collegabili per un cliente (bounded, no full scan). */
export function hasLinkableClientDocuments(
  docs: DocRecord[],
  clientId: string,
  excludeId?: string,
): boolean {
  return docs.some(
    d =>
      d.subjectId === clientId &&
      d.id !== excludeId &&
      d.type !== 'vendita_banco' &&
      d.status !== 'cancelled',
  )
}
