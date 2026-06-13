import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../components/ui'
import {
  filterProducts,
  getProductCategoryFilters,
  type ProductDetailTab,
  type ProductGroupByMode,
} from '../gestionale/lib/productListUtils'
import type { Category, Product } from '../types'

export type ProductEditMode = null | 'new' | 'edit'

export function useProductListState(
  products: Product[],
  categories: Category[],
  getSearchHaystack: (p: Product) => string,
) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailTab, setDetailTab] = useState<ProductDetailTab>('prodotto')
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<ProductGroupByMode>('none')
  const [selectionMode, setSelectionMode] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortColumnId, setSortColumnId] = useState<string | null>('name')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('asc')
  const [editMode, setEditMode] = useState<ProductEditMode>(null)

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])
  const categoryFilters = useMemo(
    () => getProductCategoryFilters(products, categories),
    [products, categories],
  )

  const filtered = useMemo(
    () => filterProducts(products, searchLower, categoryFilter, categories, getSearchHaystack),
    [products, searchLower, categoryFilter, categories, getSearchHaystack],
  )

  const handleSort = useCallback((columnId: string) => {
    setGroupBy('none')
    setSortColumnId(prev => {
      if (prev === columnId) {
        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return columnId
    })
  }, [])

  const selectItem = useCallback((item: Product) => {
    setSelected(item)
    setSelectedKeys([item.id])
    setDetailTab('prodotto')
    setEditMode(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedKeys([])
  }, [])

  const toggleGroupBy = useCallback(() => {
    setGroupBy(g => (g === 'none' ? 'category' : 'none'))
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(v => !v)
  }, [])

  const toggleFilterMenu = useCallback(() => {
    setShowFilterMenu(v => !v)
  }, [])

  const resetCategoryFilter = useCallback(() => {
    setCategoryFilter('all')
  }, [])

  const startNew = useCallback(() => {
    setEditMode('new')
    setSelected(null)
    setSelectedKeys([])
    setDetailTab('prodotto')
    setDetailCollapsed(false)
  }, [])

  const startEdit = useCallback(() => {
    setEditMode('edit')
    setDetailCollapsed(false)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditMode(null)
  }, [])

  return {
    search,
    setSearch,
    selected,
    setSelected,
    selectedKeys,
    setSelectedKeys,
    detailTab,
    setDetailTab,
    detailCollapsed,
    setDetailCollapsed,
    categoryFilter,
    setCategoryFilter,
    groupBy,
    selectionMode,
    showFilterMenu,
    sortColumnId,
    sortDirection,
    categoryFilters,
    filtered,
    handleSort,
    selectItem,
    clearSelection,
    toggleGroupBy,
    toggleSelectionMode,
    toggleFilterMenu,
    resetCategoryFilter,
    editMode,
    setEditMode,
    startNew,
    startEdit,
    cancelEdit,
  }
}
