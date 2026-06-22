import {
  fetchClientsPage,
  fetchDocumentsPage,
  fetchProductsPage,
  fetchSuppliersPage,
} from '../firestorePagination'
import type { Client, DocRecord, Product, Supplier } from '../../types'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

const PAGE = 400

export type ClientDupIndex = {
  count: number
  vat: Set<string>
  code: Set<string>
  name: Set<string>
  nameToId: Map<string, string>
}

export type SupplierDupIndex = {
  count: number
  vat: Set<string>
  code: Set<string>
  name: Set<string>
  nameToId: Map<string, string>
}

export type ProductDupIndex = {
  count: number
  code: Set<string>
  barcode: Set<string>
}

export type DocumentDupIndex = {
  count: number
  keys: Set<string>
}

async function paginateAll<T>(
  fetchPage: (
    studioId: string,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    pageSize: number,
  ) => Promise<{
    items: T[]
    lastDoc: QueryDocumentSnapshot<DocumentData> | null
    hasMore: boolean
  }>,
  studioId: string,
  onItem: (item: T) => void,
): Promise<number> {
  let count = 0
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null
  for (;;) {
    const page = await fetchPage(studioId, cursor, PAGE)
    for (const item of page.items) {
      onItem(item)
      count++
    }
    if (!page.hasMore || !page.lastDoc) break
    cursor = page.lastDoc
  }
  return count
}

export async function loadClientDupIndex(studioId: string): Promise<ClientDupIndex> {
  const index: ClientDupIndex = { count: 0, vat: new Set(), code: new Set(), name: new Set(), nameToId: new Map() }
  index.count = await paginateAll<Client>(fetchClientsPage, studioId, c => {
    const vat = c.vatNumber?.trim().toLowerCase()
    if (vat) index.vat.add(vat)
    if (c.code) index.code.add(c.code)
    const name = c.name.trim().toLowerCase()
    if (name) {
      index.name.add(name)
      index.nameToId.set(name, c.id)
    }
  })
  return index
}

export async function loadSupplierDupIndex(studioId: string): Promise<SupplierDupIndex> {
  const index: SupplierDupIndex = { count: 0, vat: new Set(), code: new Set(), name: new Set(), nameToId: new Map() }
  index.count = await paginateAll<Supplier>(fetchSuppliersPage, studioId, s => {
    const vat = s.vatNumber?.trim().toLowerCase()
    if (vat) index.vat.add(vat)
    if (s.code) index.code.add(s.code)
    const name = s.name.trim().toLowerCase()
    if (name) {
      index.name.add(name)
      index.nameToId.set(name, s.id)
    }
  })
  return index
}

export async function loadProductDupIndex(studioId: string): Promise<ProductDupIndex> {
  const index: ProductDupIndex = { count: 0, code: new Set(), barcode: new Set() }
  index.count = await paginateAll<Product>(fetchProductsPage, studioId, p => {
    if (p.code) index.code.add(p.code)
    const barcode = p.barcode?.trim()
    if (barcode) index.barcode.add(barcode)
  })
  return index
}

export async function loadDocumentDupIndex(studioId: string): Promise<DocumentDupIndex> {
  const index: DocumentDupIndex = { count: 0, keys: new Set() }
  index.count = await paginateAll<DocRecord>(fetchDocumentsPage, studioId, d => {
    if (d.type && d.fullNumber && d.documentYear) {
      index.keys.add(`${d.type}|${d.fullNumber}|${d.documentYear}`)
    }
  })
  return index
}

export function dupClient(index: ClientDupIndex, vat: string, code: string, name: string): boolean {
  const v = vat.trim().toLowerCase()
  const n = name.trim().toLowerCase()
  if (v && index.vat.has(v)) return true
  if (code && index.code.has(code)) return true
  if (n && index.name.has(n)) return true
  return false
}

export function dupSupplier(index: SupplierDupIndex, vat: string, code: string, name: string): boolean {
  const v = vat.trim().toLowerCase()
  const n = name.trim().toLowerCase()
  if (v && index.vat.has(v)) return true
  if (code && index.code.has(code)) return true
  if (n && index.name.has(n)) return true
  return false
}

export function dupProduct(index: ProductDupIndex, code: string, barcode: string): boolean {
  const c = code.trim()
  const b = barcode.trim()
  if (c && index.code.has(c)) return true
  if (b && index.barcode.has(b)) return true
  return false
}

export function dupDocument(index: DocumentDupIndex, type: string, fullNumber: string, year: number): boolean {
  return index.keys.has(`${type}|${fullNumber}|${year}`)
}

export function registerClient(
  index: ClientDupIndex,
  c: { id?: string; vatNumber?: string; code?: string; name: string },
): void {
  index.count++
  const vat = c.vatNumber?.trim().toLowerCase()
  if (vat) index.vat.add(vat)
  if (c.code) index.code.add(c.code)
  const name = c.name.trim().toLowerCase()
  if (name) {
    index.name.add(name)
    if (c.id) index.nameToId.set(name, c.id)
  }
}

export function registerSupplier(
  index: SupplierDupIndex,
  s: { id?: string; vatNumber?: string; code?: string; name: string },
): void {
  index.count++
  const vat = s.vatNumber?.trim().toLowerCase()
  if (vat) index.vat.add(vat)
  if (s.code) index.code.add(s.code)
  const name = s.name.trim().toLowerCase()
  if (name) {
    index.name.add(name)
    if (s.id) index.nameToId.set(name, s.id)
  }
}

export function registerProduct(index: ProductDupIndex, p: { code?: string; barcode?: string }): void {
  index.count++
  if (p.code) index.code.add(p.code)
  const barcode = p.barcode?.trim()
  if (barcode) index.barcode.add(barcode)
}

export function registerDocument(index: DocumentDupIndex, type: string, fullNumber: string, year: number): void {
  index.count++
  index.keys.add(`${type}|${fullNumber}|${year}`)
}
