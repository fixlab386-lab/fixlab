import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../../../../components/ui'
import type { Repair } from '../../../../types'
import { isRepairStale } from '../../../../lib/dashboardMetrics'
import { filterRepairs } from '../utils'

export function useRepairListState(repairs: Repair[], staleDays: number | null) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Repair | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [showFilterMenu, setShowFilterMenu] = useState(true)
  const [sortColumnId, setSortColumnId] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('desc')

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () => filterRepairs(repairs, searchLower, statusFilter, priorityFilter, staleDays, isRepairStale),
    [repairs, searchLower, statusFilter, priorityFilter, staleDays],
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

  const selectItem = useCallback((item: Repair) => {
    setSelected(item)
    setSelectedKeys([item.id])
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedKeys([])
  }, [])

  const toggleFilterMenu = useCallback(() => {
    setShowFilterMenu(v => !v)
  }, [])

  const resetFilters = useCallback(() => {
    setStatusFilter('active')
    setPriorityFilter('all')
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
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    showFilterMenu,
    sortColumnId,
    sortDirection,
    filtered,
    handleSort,
    selectItem,
    clearSelection,
    toggleFilterMenu,
    resetFilters,
  }
}
