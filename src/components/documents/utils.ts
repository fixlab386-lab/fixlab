import type { DataTableColumn, DataTableSortDirection } from '../ui'
import type { DocRecord } from '../../types'
import { ALL_DOCUMENT_TYPE_LABELS } from './constants'

export type DocumentGroupByMode = 'none' | 'type'

export function documentTypeLabel(type: string): string {
  return ALL_DOCUMENT_TYPE_LABELS[type as keyof typeof ALL_DOCUMENT_TYPE_LABELS] || type
}

export function formatDocDate(d: unknown): string {
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

export function documentYearFromDate(date: string): number {
  const y = parseInt(date.slice(0, 4), 10)
  return Number.isNaN(y) ? new Date().getFullYear() : y
}

export function buildFullNumber(number: number, year: number, numbering?: string): string {
  if (numbering?.trim()) return `${number}/${numbering.trim()}`
  return `${number}/${year}`
}

export function filterDocuments(
  docs: DocRecord[],
  searchLower: string,
  typeFilter: string,
  statusFilter: string,
  dateFrom: string,
  dateTo: string,
): DocRecord[] {
  return docs.filter(d => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (dateFrom && d.date < dateFrom) return false
    if (dateTo && d.date > dateTo) return false
    if (searchLower) {
      const hay = `${d.subjectName}${d.fullNumber}${d.internalNotes || ''}${documentTypeLabel(d.type)}`.toLowerCase()
      if (!hay.includes(searchLower)) return false
    }
    return true
  })
}

export function sortDocumentRows(
  rows: DocRecord[],
  options: {
    groupBy: DocumentGroupByMode
    sortColumnId: string | null
    sortDirection: DataTableSortDirection
    columns: DataTableColumn<DocRecord>[]
  },
): DocRecord[] {
  const sorted = [...rows]
  if (options.groupBy === 'type') {
    sorted.sort((a, b) => {
      const cmp = documentTypeLabel(a.type).localeCompare(documentTypeLabel(b.type), 'it')
      if (cmp !== 0) return cmp
      return b.date.localeCompare(a.date)
    })
    return sorted
  }
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
