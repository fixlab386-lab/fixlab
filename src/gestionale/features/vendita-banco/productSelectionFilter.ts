import type { Category, Product } from '../../../types'
import { flattenCategoriesForSelect, matchesProductCategoryTree } from '../../lib/categoryUtils'

export type ProductSelectionFilters = {
  quickSearch: string
  codice: string
  descrizione: string
  categoriaId: string
  produttore: string
  soloConGiacenza: boolean
  soloServizi: boolean
}

export const EMPTY_PRODUCT_FILTERS: ProductSelectionFilters = {
  quickSearch: '',
  codice: '',
  descrizione: '',
  categoriaId: '',
  produttore: '',
  soloConGiacenza: false,
  soloServizi: false,
}

export function formatCategoryPath(name: string | undefined): string {
  if (!name?.trim()) return ''
  return name.replace(/\s*[»›/\\|]\s*/g, ' >> ').trim()
}

export function filterProductsForSelection(
  products: Product[],
  filters: ProductSelectionFilters,
  filtraPanelOpen: boolean,
  categories: Category[] = [],
): Product[] {
  const q = filters.quickSearch.trim().toLowerCase()

  return products.filter(p => {
    if (q) {
      const hay = [
        p.code,
        p.name,
        p.categoryName,
        p.brand,
        p.model,
        p.barcode,
        p.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) return false
    }

    if (!filtraPanelOpen) return true

    const cod = filters.codice.trim().toLowerCase()
    if (cod && !(p.code || '').toLowerCase().includes(cod) && !(p.barcode || '').toLowerCase().includes(cod)) {
      return false
    }

    const desc = filters.descrizione.trim().toLowerCase()
    if (desc && !(p.name || '').toLowerCase().includes(desc) && !(p.description || '').toLowerCase().includes(desc)) {
      return false
    }

    if (filters.categoriaId && !matchesProductCategoryTree(p, filters.categoriaId, categories)) return false

    const brand = filters.produttore.trim().toLowerCase()
    if (brand && !(p.brand || '').toLowerCase().includes(brand)) return false

    if (filters.soloConGiacenza && p.typology === 'with_stock' && (p.stock ?? 0) <= 0) return false
    if (filters.soloServizi && p.typology !== 'service') return false

    return true
  })
}

export function categoryOptions(categories: Category[]): { id: string; label: string }[] {
  return flattenCategoriesForSelect(categories)
}
