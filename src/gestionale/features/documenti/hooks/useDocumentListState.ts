import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../../../../components/ui'
import { filterDocuments, type DocumentGroupByMode } from '../utils'
import type { DocRecord } from '../../../../types'

export function useDocumentListState(docs: DocRecord[], initialTypeFilter = 'all') {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DocRecord | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [groupBy, setGroupBy] = useState<DocumentGroupByMode>('none')
  const [selectionMode, setSelectionMode] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortColumnId, setSortColumnId] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('desc')

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () => filterDocuments(docs, searchLower, typeFilter, statusFilter, dateFrom, dateTo),
    [docs, searchLower, typeFilter, statusFilter, dateFrom, dateTo],
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

  const selectItem = useCallback((item: DocRecord) => {
    setSelected(item)
    setSelectedKeys([item.id])
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedKeys([])
  }, [])

  const toggleGroupBy = useCallback(() => {
    setGroupBy(g => (g === 'none' ? 'type' : 'none'))
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(v => !v)
  }, [])

  const toggleFilterMenu = useCallback(() => {
    setShowFilterMenu(v => !v)
  }, [])

  const resetFilters = useCallback(() => {
    setTypeFilter(initialTypeFilter)
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }, [initialTypeFilter])

  return {
    search,
    setSearch,
    selected,
    setSelected,
    selectedKeys,
    setSelectedKeys,
    detailCollapsed,
    setDetailCollapsed,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    groupBy,
    selectionMode,
    showFilterMenu,
    sortColumnId,
    sortDirection,
    filtered,
    handleSort,
    selectItem,
    clearSelection,
    toggleGroupBy,
    toggleSelectionMode,
    toggleFilterMenu,
    resetFilters,
  }
}
