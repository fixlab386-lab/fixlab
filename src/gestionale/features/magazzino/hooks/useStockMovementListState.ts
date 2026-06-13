import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../../../../components/ui'
import { filterStockMovements, type MovementPeriodFilter } from '../utils'
import type { StockMovement } from '../../../../types'

export function useStockMovementListState(movements: StockMovement[]) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StockMovement | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [period, setPeriod] = useState<MovementPeriodFilter>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortColumnId, setSortColumnId] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('desc')

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () => filterStockMovements(movements, searchLower, period, typeFilter, productFilter),
    [movements, searchLower, period, typeFilter, productFilter],
  )

  const handleSort = useCallback((columnId: string) => {
    setSortColumnId(prev => {
      if (prev === columnId) {
        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return columnId
    })
  }, [])

  const selectItem = useCallback((item: StockMovement) => {
    setSelected(item)
    setSelectedKeys([item.id])
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedKeys([])
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(v => !v)
  }, [])

  const toggleFilterMenu = useCallback(() => {
    setShowFilterMenu(v => !v)
  }, [])

  const resetFilters = useCallback(() => {
    setPeriod('all')
    setTypeFilter('all')
    setProductFilter('all')
  }, [])

  return {
    search,
    setSearch,
    selected,
    setSelected,
    selectedKeys,
    setSelectedKeys,
    detailCollapsed,
    setDetailCollapsed,
    period,
    setPeriod,
    typeFilter,
    setTypeFilter,
    productFilter,
    setProductFilter,
    selectionMode,
    showFilterMenu,
    sortColumnId,
    sortDirection,
    filtered,
    handleSort,
    selectItem,
    clearSelection,
    toggleSelectionMode,
    toggleFilterMenu,
    resetFilters,
  }
}
