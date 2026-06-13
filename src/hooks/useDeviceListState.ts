import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../components/ui'
import {
  filterDevices,
  type DeviceDetailTab,
  type DeviceGroupByMode,
} from '../components/devices/utils'
import type { Device } from '../types'

export type DeviceEditMode = null | 'new' | 'edit'

export function useDeviceListState(devices: Device[], getSearchHaystack: (d: Device) => string) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Device | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailTab, setDetailTab] = useState<DeviceDetailTab>('dispositivo')
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [groupBy, setGroupBy] = useState<DeviceGroupByMode>('none')
  const [selectionMode, setSelectionMode] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortColumnId, setSortColumnId] = useState<string | null>('identifier')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('asc')
  const [editMode, setEditMode] = useState<DeviceEditMode>(null)

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () => filterDevices(devices, searchLower, statusFilter, brandFilter, getSearchHaystack),
    [devices, searchLower, statusFilter, brandFilter, getSearchHaystack],
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

  const selectItem = useCallback((item: Device) => {
    setSelected(item)
    setSelectedKeys([item.id])
    setDetailTab('dispositivo')
    setEditMode(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelected(null)
    setSelectedKeys([])
  }, [])

  const toggleGroupBy = useCallback(() => {
    setGroupBy(g => (g === 'none' ? 'brand' : g === 'brand' ? 'type' : 'none'))
  }, [])

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(v => !v)
  }, [])

  const toggleFilterMenu = useCallback(() => {
    setShowFilterMenu(v => !v)
  }, [])

  const resetFilters = useCallback(() => {
    setStatusFilter('all')
    setBrandFilter('all')
  }, [])

  const startNew = useCallback(() => {
    setEditMode('new')
    setSelected(null)
    setSelectedKeys([])
    setDetailTab('dispositivo')
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
    statusFilter,
    setStatusFilter,
    brandFilter,
    setBrandFilter,
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
    editMode,
    setEditMode,
    startNew,
    startEdit,
    cancelEdit,
  }
}
