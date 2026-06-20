import type { DataTableColumn, DataTableSortDirection } from '../../../components/ui'
import type { Payment, PaymentResource } from '../../../types'
import { resolvePaymentResourceName } from '../../lib/paymentResources'
import { ALL_DOCUMENT_TYPE_LABELS } from '../documenti/constants'

export type PaymentPeriodFilter = 'all' | 'next_month' | 'current_month' | 'last_month' | 'current_year' | 'last_year'
export type PaymentFlowFilter = 'all' | 'in' | 'out'
export type PaymentStatusFilter = 'all' | 'settled' | 'to_settle'

export function formatPaymentDate(d: unknown): string {
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

export function paymentFlowType(p: Payment): 'in' | 'out' {
  return p.amountIn != null && p.amountIn > 0 ? 'in' : 'out'
}

export function paymentAmount(p: Payment): number {
  return p.amountIn ?? p.amountOut ?? 0
}

export function formatPaymentAmount(p: Payment): string {
  const amt = paymentAmount(p)
  const flow = paymentFlowType(p)
  const prefix = flow === 'in' ? '+' : '−'
  return `${prefix} € ${amt.toFixed(2)}`
}

function inPeriod(dateStr: string, period: PaymentPeriodFilter): boolean {
  if (period === 'all') return true
  const d = new Date(`${dateStr}T12:00:00`)
  const now = new Date()
  if (period === 'current_month')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (period === 'next_month') {
    const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return d.getMonth() === nm.getMonth() && d.getFullYear() === nm.getFullYear()
  }
  if (period === 'last_month') {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  }
  if (period === 'current_year') return d.getFullYear() === now.getFullYear()
  if (period === 'last_year') return d.getFullYear() === now.getFullYear() - 1
  return true
}

export type PaymentMethodFilter = 'all' | 'riba' | 'bonifico'

function matchesMethod(paymentMethod: string | undefined, filter: PaymentMethodFilter): boolean {
  if (filter === 'all') return true
  const m = (paymentMethod || '').toLowerCase()
  if (filter === 'riba') return m.includes('ri.ba') || m.includes('riba') || m.includes('ri ba')
  if (filter === 'bonifico') return m.includes('bonifico')
  return true
}

export function filterPayments(
  payments: Payment[],
  searchLower: string,
  period: PaymentPeriodFilter,
  flowFilter: PaymentFlowFilter,
  statusFilter: PaymentStatusFilter,
  resourceFilter: string,
  subjectFilter: string,
  resources: PaymentResource[],
  methodFilter: PaymentMethodFilter = 'all',
  settleByDate?: string,
): Payment[] {
  return payments.filter(p => {
    if (!inPeriod(p.date, period)) return false
    if (subjectFilter !== 'all' && p.subjectId !== subjectFilter) return false
    if (settleByDate) {
      if (p.settled) return false
      if (p.date > settleByDate) return false
    }
    if (!matchesMethod(p.paymentMethod, methodFilter)) return false
    if (flowFilter === 'in' && !(p.amountIn && p.amountIn > 0)) return false
    if (flowFilter === 'out' && !(p.amountOut && p.amountOut > 0)) return false
    if (statusFilter === 'settled' && !p.settled) return false
    if (statusFilter === 'to_settle' && p.settled) return false
    if (resourceFilter !== 'all') {
      const rid = p.resourceId || resources.find(r => {
        const legacy =
          p.resource === 'cassa_contanti'
            ? 'cash'
            : p.resource === 'pos'
              ? 'card'
              : p.resource === 'banca'
                ? 'bank'
                : null
        return legacy && r.type === legacy
      })?.id
      if (rid !== resourceFilter) return false
    }
    if (searchLower) {
      const hay = `${p.description}${p.subjectName || ''}${p.notes || ''}${resolvePaymentResourceName(p, resources)}`.toLowerCase()
      if (!hay.includes(searchLower)) return false
    }
    return true
  })
}

export function linkedDocumentLabel(p: Payment): string {
  if (!p.linkedDocumentId && !p.linkedDocumentNumber) return '—'
  const typeLabel = p.linkedDocumentType
    ? ALL_DOCUMENT_TYPE_LABELS[p.linkedDocumentType] || p.linkedDocumentType
    : 'Documento'
  const num = p.linkedDocumentNumber || p.linkedDocumentId
  return `${typeLabel} ${num}`
}

export function sortPaymentRows(
  rows: Payment[],
  options: {
    sortColumnId: string | null
    sortDirection: DataTableSortDirection
    columns: DataTableColumn<Payment>[]
  },
): Payment[] {
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
