import type { Repair } from '../../../types'
import { REPAIR_STATUS_LABELS } from './constants'

export function coalesceDate(d: unknown): Date | null {
  if (!d) return null
  if (d instanceof Date) return d
  if (typeof d === 'object' && d !== null && 'toDate' in d && typeof (d as { toDate: () => Date }).toDate === 'function') {
    return (d as { toDate: () => Date }).toDate()
  }
  if (typeof d === 'object' && d !== null && 'seconds' in d) {
    return new Date((d as { seconds: number }).seconds * 1000)
  }
  try {
    return new Date(d as string)
  } catch {
    return null
  }
}

export function formatRepairDate(d: unknown): string {
  const date = coalesceDate(d)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function repairStatusLabel(status: Repair['status']): string {
  return REPAIR_STATUS_LABELS[status] || status
}

export function repairSearchHaystack(r: Repair): string {
  return `${r.clientName}${r.clientPhone}${r.deviceBrand}${r.deviceModel}${r.problem}${r.ticketNumber || ''}${r.diagnosis || ''}`.toLowerCase()
}

export function filterRepairs(
  repairs: Repair[],
  searchLower: string,
  statusFilter: string,
  priorityFilter: string,
  staleDays: number | null,
  isStale: (r: Repair, days: number) => boolean,
): Repair[] {
  return repairs.filter(r => {
    if (staleDays != null && !isStale(r, staleDays)) return false
    if (statusFilter === 'active' && r.status === 'completed') return false
    else if (statusFilter !== 'all' && statusFilter !== 'active' && r.status !== statusFilter) return false
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
    if (searchLower && !repairSearchHaystack(r).includes(searchLower)) return false
    return true
  })
}
