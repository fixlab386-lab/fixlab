import type { Category, Product } from '../types'
import { matchesProductCategoryTree } from '../gestionale/lib/categoryUtils'

export type ProductSearchCriteria = {
  code: string
  description: string
  category: string
}

export const EMPTY_PRODUCT_SEARCH_CRITERIA: ProductSearchCriteria = {
  code: '',
  description: '',
  category: '',
}

function matchesField(value: string | undefined, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (value || '').toLowerCase().includes(q)
}

function productCategoryLabel(p: Product): string {
  return p.categoryName || p.subcategoryName || ''
}

/** Filtra prodotti: ogni campo compilato deve essere contenuto (AND), come FIXLab. */
export function filterProductsByCriteria(
  products: Product[],
  criteria: ProductSearchCriteria,
  options?: { categoryTreeId?: string | null; categories?: Category[] },
): Product[] {
  const categories = options?.categories ?? []
  const categoryTreeId = options?.categoryTreeId ?? null

  return products.filter(
    p =>
      matchesProductCategoryTree(p, categoryTreeId, categories) &&
      matchesField(p.code, criteria.code) &&
      matchesField(p.name, criteria.description) &&
      matchesField(productCategoryLabel(p), criteria.category),
  )
}

export { matchesProductCategoryTree }
