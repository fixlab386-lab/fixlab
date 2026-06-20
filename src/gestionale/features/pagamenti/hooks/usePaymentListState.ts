import { useCallback, useMemo, useState } from 'react'
import type { DataTableSortDirection } from '../../../../components/ui'
import {
  filterPayments,
  type PaymentFlowFilter,
  type PaymentPeriodFilter,
  type PaymentStatusFilter,
  type PaymentMethodFilter,
} from '../utils'
import type { Payment, PaymentResource } from '../../../../types'

export function usePaymentListState(payments: Payment[], resources: PaymentResource[]) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Payment | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [detailCollapsed, setDetailCollapsed] = useState(false)
  const [period, setPeriod] = useState<PaymentPeriodFilter>('all')
  const [flowFilter, setFlowFilter] = useState<PaymentFlowFilter>('all')
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>('all')
  const [settleByDate, setSettleByDate] = useState<string | undefined>(undefined)
  const [selectionMode, setSelectionMode] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [sortColumnId, setSortColumnId] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<DataTableSortDirection>('desc')

  const searchLower = useMemo(() => search.trim().toLowerCase(), [search])

  const filtered = useMemo(
    () =>
      filterPayments(
        payments,
        searchLower,
        period,
        flowFilter,
        statusFilter,
        resourceFilter,
        subjectFilter,
        resources,
        methodFilter,
        settleByDate,
      ),
    [payments, searchLower, period, flowFilter, statusFilter, resourceFilter, subjectFilter, resources, methodFilter, settleByDate],
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

  const selectItem = useCallback((item: Payment) => {
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
    setFlowFilter('all')
    setStatusFilter('all')
    setResourceFilter('all')
    setSubjectFilter('all')
    setMethodFilter('all')
    setSettleByDate(undefined)
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
    flowFilter,
    setFlowFilter,
    statusFilter,
    setStatusFilter,
    resourceFilter,
    setResourceFilter,
    subjectFilter,
    setSubjectFilter,
    methodFilter,
    setMethodFilter,
    settleByDate,
    setSettleByDate,
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
    setShowFilterMenu,
  }
}
