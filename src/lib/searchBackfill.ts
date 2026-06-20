import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Client, Product, Supplier } from '../types'
import {
  buildClientSearchTokens,
  buildProductSearchTokens,
  buildSupplierSearchTokens,
} from './searchTokens'
import { fetchClientsPage, fetchProductsPage, fetchSuppliersPage } from './firestorePagination'

export type SearchBackfillProgress = {
  collection: 'products' | 'clients' | 'suppliers'
  updated: number
}

/** Indicizza record esistenti con searchTokens (una tantum / dopo upgrade). */
export async function backfillSearchTokens(
  studioId: string,
  onProgress?: (progress: SearchBackfillProgress) => void,
): Promise<{ products: number; clients: number; suppliers: number }> {
  const counts = { products: 0, clients: 0, suppliers: 0 }

  let cursor = null as Awaited<ReturnType<typeof fetchProductsPage>>['lastDoc']
  for (;;) {
    const page = await fetchProductsPage(studioId, cursor, 200)
    for (const row of page.items) {
      await updateDoc(doc(db, 'products', row.id), {
        searchTokens: buildProductSearchTokens(row),
      })
      counts.products++
      if (counts.products % 50 === 0) {
        onProgress?.({ collection: 'products', updated: counts.products })
      }
    }
    if (!page.hasMore || page.items.length === 0) break
    cursor = page.lastDoc
  }
  onProgress?.({ collection: 'products', updated: counts.products })

  cursor = null
  for (;;) {
    const page = await fetchClientsPage(studioId, cursor, 200)
    for (const row of page.items) {
      await updateDoc(doc(db, 'clients', row.id), {
        searchTokens: buildClientSearchTokens(row),
      })
      counts.clients++
      if (counts.clients % 50 === 0) {
        onProgress?.({ collection: 'clients', updated: counts.clients })
      }
    }
    if (!page.hasMore || page.items.length === 0) break
    cursor = page.lastDoc
  }
  onProgress?.({ collection: 'clients', updated: counts.clients })

  cursor = null
  for (;;) {
    const page = await fetchSuppliersPage(studioId, cursor, 200)
    for (const row of page.items) {
      await updateDoc(doc(db, 'suppliers', row.id), {
        searchTokens: buildSupplierSearchTokens(row),
      })
      counts.suppliers++
      if (counts.suppliers % 50 === 0) {
        onProgress?.({ collection: 'suppliers', updated: counts.suppliers })
      }
    }
    if (!page.hasMore || page.items.length === 0) break
    cursor = page.lastDoc
  }
  onProgress?.({ collection: 'suppliers', updated: counts.suppliers })

  return counts
}
