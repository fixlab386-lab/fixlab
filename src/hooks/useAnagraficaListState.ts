import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../components/ui'
import {
  filterBySearchAndProvince,
  getProvinces,
  type AnagraficaDetailTab,
  type GroupByMode,
} from '../components/anagrafica/utils'

export function useAnagraficaListState<T extends { id: string; province?: string; name: string }>(
  items: T[],
  getSearchHaystack: (item: T) => string,
) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<T | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailTab, setDetailTab] = useState<AnagraficaDetailTab>('anagrafica')
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [regionFilter, setRegionFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<GroupByMode>('none')
  const [selectionMode, setSelectionMode] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortColumnId, setSortColumnId] = useState<string | null>('name')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('asc')

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])
  const provinces = useMemo(() => getProvinces(items), [items])

  const filtered = useMemo(
    () => filterBySearchAndProvince(items, searchLower, regionFilter, getSearchHaystack),
    [items, searchLower, regionFilter, getSearchHaystack],
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

  const selectItem = useCallback((item: T) => {
    setSelected(item)
    setSelectedKeys([item.id])
    setDetailTab('anagrafica')
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedKeys([])
  }, [])

  const toggleGroupBy = useCallback(() => {
    setGroupBy(g => (g === 'none' ? 'province' : 'none'))
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(v => !v)
  }, [])

  const toggleFilterMenu = useCallback(() => {
    setShowFilterMenu(v => !v)
  }, [])

  const resetRegionFilter = useCallback(() => {
    setRegionFilter('all')
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
    regionFilter,
    setRegionFilter,
    groupBy,
    selectionMode,
    showFilterMenu,
    sortColumnId,
    sortDirection,
    provinces,
    filtered,
    handleSort,
    selectItem,
    clearSelection,
    toggleGroupBy,
    toggleSelectionMode,
    toggleFilterMenu,
    resetRegionFilter,
  }
}
