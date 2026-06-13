import type { DataTableColumn, DataTableSortDirection } from '../ui'
import type { StockMovement } from '../../types'
import { MOVEMENT_TYPE_LABELS } from './constants'
import { movementQuantityDisplay } from './stockPreview'
import { ALL_DOCUMENT_TYPE_LABELS } from '../documents/constants'

export type MovementPeriodFilter = 'all' | 'current_month' | 'last_month' | 'current_year' | 'last_year'

export function formatMovementDate(d: unknown): string {
  if (!d) return '—'
  let date: Date
  if (d instanceof Date) date = d
  else if (typeof d === 'string') date = new Date(d.includes('T') ? d : `${d}T12:00:00`)
  else if (typeof d === 'object' && d !== null && 'toDate' in d)
    date = (d as { toDate: () => Date }).toDate()
  else if (typeof d === 'object' && d !== null && 'seconds' in d)
    date = new Date((d as { seconds: number }).seconds * 1000)
  else return '—'
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function inPeriod(dateStr: string, period: MovementPeriodFilter): boolean {
  if (period === 'all') return true
  const d = new Date(`${dateStr}T12:00:00`)
  const now = new Date()
  if (period === 'current_month')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (period === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  }
  if (period === 'current_year') return d.getFullYear() === now.getFullYear()
  if (period === 'last_year') return d.getFullYear() === now.getFullYear() - 1
  return true
}

export function filterStockMovements(
  movements: StockMovement[],
  searchLower: string,
  period: MovementPeriodFilter,
  typeFilter: string,
  productFilter: string,
): StockMovement[] {
  return movements.filter(m => {
    if (!inPeriod(m.date, period)) return false
    if (typeFilter !== 'all' && m.type !== typeFilter) return false
    if (productFilter !== 'all' && m.productId !== productFilter) return false
    if (searchLower) {
      const hay = `${m.productName}${m.productCode}${m.subjectName || ''}${m.cause || ''}${m.notes || ''}`.toLowerCase()
      if (!hay.includes(searchLower)) return false
    }
    return true
  })
}

export function linkedDocumentLabel(m: StockMovement): string {
  if (!m.linkedDocumentId) return '—'
  const typeLabel = m.linkedDocumentType
    ? ALL_DOCUMENT_TYPE_LABELS[m.linkedDocumentType] || m.linkedDocumentType
    : 'Documento'
  return `${typeLabel}`
}

export function sortMovementRows(
  rows: StockMovement[],
  options: {
    sortColumnId: string | null
    sortDirection: DataTableSortDirection
    columns: DataTableColumn<StockMovement>[]
  },
): StockMovement[] {
  const sorted = [...rows]
  if (options.sortColumnId) {
    const col = options.columns.find(c => c.id === options.sortColumnId)
    if (col?.accessor) {
      const accessor = col.accessor
      sorted.sort((a, b) => {
        const av = accessor(a)
        const bv = accessor(b)
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'number' && typeof bv === 'number') return av - bv
        return String(av).localeCompare(String(bv), 'it', { sensitivity: 'base' })
      })
      if (options.sortDirection === 'desc') sorted.reverse()
    }
  }
  return sorted
}
