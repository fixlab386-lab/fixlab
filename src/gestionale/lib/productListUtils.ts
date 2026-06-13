import type { DataTableColumn, DataTableSortDirection } from '../../components/ui'
import type { Product } from '../../types'
import { collectDescendantIds } from './categoryUtils'

export type ProductDetailTab = 'prodotto' | 'caratteristiche' | 'magazzino'
export type ProductGroupByMode = 'none' | 'category'

export function displayProductValue(value?: string | number | null): string {
  if (value == null || value === '') return '—'
  return String(value)
}

export function getProductCategoryFilters(
  products: Product[],
  categories: { id: string; name: string }[],
): { id: string; name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const p of products) {
    const key = p.categoryId || ''
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return categories
    .map(c => ({ id: c.id, name: c.name, count: counts.get(c.id) ?? 0 }))
    .filter(c => c.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
}

export function filterProducts(
  products: Product[],
  searchLower: string,
  categoryFilter: string,
  categories: { id: string; parentId?: string }[],
  getSearchHaystack: (p: Product) => string,
): Product[] {
  let result = products
  if (categoryFilter !== 'all') {
    const ids = new Set(collectDescendantIds(categoryFilter, categories as Parameters<typeof collectDescendantIds>[1]))
    result = result.filter(p => ids.has(p.categoryId) || ids.has(p.subcategoryId || ''))
  }
  if (searchLower) {
    result = result.filter(p => getSearchHaystack(p).toLowerCase().includes(searchLower))
  }
  return result
}

export function sortProductRows(
  rows: Product[],
  options: {
    groupBy: ProductGroupByMode
    sortColumnId: string | null
    sortDirection: DataTableSortDirection
    columns: DataTableColumn<Product>[]
  },
): Product[] {
  const sorted = [...rows]
  if (options.groupBy === 'category') {
    sorted.sort((a, b) => {
      const ca = a.categoryName || 'ZZZ'
      const cb = b.categoryName || 'ZZZ'
      const cmp = ca.localeCompare(cb, 'it', { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
    })
    return sorted
  }
  if (options.sortColumnId) {
    const col = options.columns.find(c => c.id === options.sortColumnId)
    if (col?.accessor) {
      const accessor = col.accessor
      sorted.sort((a, b) => {
        const av = accessor(a)
        const bv = accessor(b)
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'number' && typeof bv === 'number') return av - bv
        return String(av).localeCompare(String(bv), 'it', { sensitivity: 'base' })
      })
      if (options.sortDirection === 'desc') sorted.reverse()
    }
  }
  return sorted
}
