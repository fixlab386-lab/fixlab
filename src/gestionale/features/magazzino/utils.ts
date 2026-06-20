import type { DataTableColumn, DataTableSortDirection } from '../../../components/ui'
import type { StockMovement } from '../../../types'
import { ALL_DOCUMENT_TYPE_LABELS } from '../documenti/constants'
import type { MovementPeriod, MovementPeriodFilter, MovementStatusFilter } from './constants'
import { IT_MONTHS } from './constants'

export type { MovementPeriodFilter }
export { formatMovementDate } from './formatMovementDate'

export function filterStockMovements(
  movements: StockMovement[],
  searchLower: string,
  period: MovementPeriod,
  statusFilter: MovementStatusFilter,
  productFilter: string,
  subjectFilter: string,
): StockMovement[] {
  const bounds = periodBounds(period)
  return movements.filter(m => {
    if (!inBounds(m.date, bounds)) return false
    if (productFilter !== 'all' && m.productId !== productFilter) return false
    if (subjectFilter !== 'all' && m.subjectId !== subjectFilter) return false
    if (!matchesStatusFilter(m, statusFilter)) return false
    if (searchLower) {
      const hay = `${m.productName}${m.productCode}${m.subjectName || ''}${m.cause || ''}${m.notes || ''}`.toLowerCase()
      if (!hay.includes(searchLower)) return false
    }
    return true
  })
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

/** Inizio settimana (lunedì) per la data indicata. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const weekday = (x.getDay() + 6) % 7 // 0 = lunedì
  x.setDate(x.getDate() - weekday)
  return x
}

type Bounds = { start: Date; end: Date } | null

/** Calcola l'intervallo [start, end] corrispondente al periodo selezionato. */
export function periodBounds(period: MovementPeriod, now: Date = new Date()): Bounds {
  if (period.kind === 'range') {
    if (!period.from && !period.to) return null
    const start = period.from ? startOfDay(new Date(`${period.from}T12:00:00`)) : new Date(-8640000000000000)
    const end = period.to ? endOfDay(new Date(`${period.to}T12:00:00`)) : new Date(8640000000000000)
    return { start, end }
  }

  if (period.kind === 'month') {
    const start = startOfDay(new Date(period.year, period.month, 1))
    const end = endOfDay(new Date(period.year, period.month + 1, 0))
    return { start, end }
  }

  const preset = period.preset
  switch (preset) {
    case 'all':
      return null
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { start: startOfDay(y), end: endOfDay(y) }
    }
    case 'current_week': {
      const start = startOfWeek(now)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { start, end: endOfDay(end) }
    }
    case 'last_week': {
      const start = startOfWeek(now)
      start.setDate(start.getDate() - 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { start, end: endOfDay(end) }
    }
    case 'current_month':
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    case 'last_month':
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    case 'current_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      return {
        start: startOfDay(new Date(now.getFullYear(), q * 3, 1)),
        end: endOfDay(new Date(now.getFullYear(), q * 3 + 3, 0)),
      }
    }
    case 'last_quarter': {
      const q = Math.floor(now.getMonth() / 3) - 1
      const year = q < 0 ? now.getFullYear() - 1 : now.getFullYear()
      const qq = (q + 4) % 4
      return {
        start: startOfDay(new Date(year, qq * 3, 1)),
        end: endOfDay(new Date(year, qq * 3 + 3, 0)),
      }
    }
    case 'current_year':
      return {
        start: startOfDay(new Date(now.getFullYear(), 0, 1)),
        end: endOfDay(new Date(now.getFullYear(), 11, 31)),
      }
    case 'last_year':
      return {
        start: startOfDay(new Date(now.getFullYear() - 1, 0, 1)),
        end: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
      }
    default:
      return null
  }
}

function inBounds(dateStr: string, bounds: Bounds): boolean {
  if (!bounds) return true
  const d = new Date(`${dateStr}T12:00:00`)
  return d >= bounds.start && d <= bounds.end
}

const PRESET_LABELS: Record<string, string> = {
  all: 'Tutti',
  current_month: 'Mese corrente',
  last_month: 'Mese scorso',
  current_year: 'Anno corrente',
  last_year: 'Anno scorso',
  today: 'Oggi',
  yesterday: 'Ieri',
  current_week: 'Settimana corrente',
  last_week: 'Settimana scorsa',
  current_quarter: 'Trimestre corrente',
  last_quarter: 'Trimestre scorso',
}

function formatItDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/** Etichetta da mostrare nella sidebar per il periodo selezionato. */
export function movementPeriodLabel(period: MovementPeriod): string {
  if (period.kind === 'month') return `${IT_MONTHS[period.month]} ${period.year}`
  if (period.kind === 'range') {
    const from = formatItDate(period.from)
    const to = formatItDate(period.to)
    if (from && to) return `${from} - ${to}`
    if (from) return `Da ${from}`
    if (to) return `Fino a ${to}`
    return 'Intervallo'
  }
  return PRESET_LABELS[period.preset] ?? 'Periodo'
}

/** True se il periodo è uno dei 5 preset mostrati nella lista principale della sidebar. */
export function isPrimaryPeriodPreset(period: MovementPeriod): boolean {
  return (
    period.kind === 'preset' &&
    ['all', 'current_month', 'last_month', 'current_year', 'last_year'].includes(period.preset)
  )
}

function matchesStatusFilter(m: StockMovement, statusFilter: MovementStatusFilter): boolean {
  if (statusFilter === 'all') return true
  if (statusFilter === 'loads') return m.type === 'load' || (m.loaded ?? 0) > 0
  if (statusFilter === 'unloads') return m.type === 'unload' || (m.unloaded ?? 0) > 0
  if (statusFilter === 'committed') return m.type === 'committed' || (m.committed ?? 0) > 0
  if (statusFilter === 'incoming') return m.type === 'incoming' || (m.incoming ?? 0) > 0
  return true
}

export function movementTotals(rows: StockMovement[]) {
  return rows.reduce(
    (acc, m) => ({
      loaded: acc.loaded + (m.loaded ?? 0),
      unloaded: acc.unloaded + (m.unloaded ?? 0),
      committed: acc.committed + (m.committed ?? 0),
      incoming: acc.incoming + (m.incoming ?? 0),
    }),
    { loaded: 0, unloaded: 0, committed: 0, incoming: 0 },
  )
}

export function linkedDocumentLabel(m: StockMovement): string {
  if (m.cause?.trim()) return m.cause.trim()
  if (!m.linkedDocumentId) return '—'
  const typeLabel = m.linkedDocumentType
    ? ALL_DOCUMENT_TYPE_LABELS[m.linkedDocumentType] || m.linkedDocumentType
    : 'Documento'
  return typeLabel
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
