import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../../../../components/ui'
import type { StockMovement } from '../../../../types'
import type { MovementPeriod, MovementStatusFilter } from '../constants'
import { DEFAULT_MOVEMENT_PERIOD } from '../constants'
import { filterStockMovements } from '../utils'

export function useStockMovementListState(movements: StockMovement[]) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StockMovement | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [period, setPeriod] = useState<MovementPeriod>(DEFAULT_MOVEMENT_PERIOD)
  const [statusFilter, setStatusFilter] = useState<MovementStatusFilter>('all')
  const [productFilter, setProductFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sortColumnId, setSortColumnId] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('desc')

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () =>
      filterStockMovements(
        movements,
        searchLower,
        period,
        statusFilter,
        productFilter,
        subjectFilter,
      ),
    [movements, searchLower, period, statusFilter, productFilter, subjectFilter],
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

  const resetFilters = useCallback(() => {
    setPeriod(DEFAULT_MOVEMENT_PERIOD)
    setStatusFilter('all')
    setProductFilter('all')
    setSubjectFilter('all')
  }, [])

  return {
    search,
    setSearch,
    selected,
    setSelected,
    selectedKeys,
    setSelectedKeys,
    period,
    setPeriod,
    statusFilter,
    setStatusFilter,
    productFilter,
    setProductFilter,
    subjectFilter,
    setSubjectFilter,
    sortColumnId,
    sortDirection,
    filtered,
    handleSort,
    selectItem,
    clearSelection,
    resetFilters,
  }
}
