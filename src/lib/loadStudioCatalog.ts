import type { Client, DocRecord, Payment, Product, Repair, Supplier } from '../types'
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

export async function loadRecentProducts(studioId: string, limit = 40): Promise<Product[]> {
  const { items } = await fetchProductsPage(studioId, null, limit)
  return items
}

export async function loadRecentClients(studioId: string, limit = 40): Promise<Client[]> {
  const { items } = await fetchClientsPage(studioId, null, limit)
  return items
}

export async function loadRecentSuppliers(studioId: string, limit = 40): Promise<Supplier[]> {
  const { items } = await fetchSuppliersPage(studioId, null, limit)
  return items
}

export async function loadRecentDocuments(
  studioId: string,
  limit = 40,
  type?: string,
): Promise<DocRecord[]> {
  const { items } = await fetchDocumentsPage(studioId, null, limit, type)
  return items
}

export async function loadRecentPayments(studioId: string, limit = 40): Promise<Payment[]> {
  const { items } = await fetchPaymentsPage(studioId, null, limit)
  return items
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
