import type { DataTableColumn, DataTableSortDirection } from '../ui'
import type { Device, DeviceRepairEntry } from '../../types'

export type DeviceDetailTab = 'dispositivo' | 'storico'
export type DeviceGroupByMode = 'none' | 'brand' | 'type'

export function displayDeviceValue(value?: string | number | null): string {
  if (value == null || value === '') return '—'
  return String(value)
}

export function deviceIdentifier(d: Device): string {
  return d.imei || d.serial || d.barcode || '—'
}

export function filterDevices(
  devices: Device[],
  searchLower: string,
  statusFilter: string,
  brandFilter: string,
  getSearchHaystack: (d: Device) => string,
): Device[] {
  return devices.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (brandFilter !== 'all' && d.brand !== brandFilter) return false
    if (searchLower && !getSearchHaystack(d).toLowerCase().includes(searchLower)) return false
    return true
  })
}

export function sortDeviceRows(
  rows: Device[],
  options: {
    groupBy: DeviceGroupByMode
    sortColumnId: string | null
    sortDirection: DataTableSortDirection
    columns: DataTableColumn<Device>[]
  },
): Device[] {
  const sorted = [...rows]
  if (options.groupBy === 'brand') {
    sorted.sort((a, b) => {
      const cmp = (a.brand || 'ZZZ').localeCompare(b.brand || 'ZZZ', 'it', { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return (a.model || '').localeCompare(b.model || '', 'it', { sensitivity: 'base' })
    })
    return sorted
  }
  if (options.groupBy === 'type') {
    sorted.sort((a, b) => {
      const cmp = (a.type || 'ZZZ').localeCompare(b.type || 'ZZZ', 'it', { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return (a.brand || '').localeCompare(b.brand || '', 'it', { sensitivity: 'base' })
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

export type MergedRepairHistoryEntry = DeviceRepairEntry & { source: 'history' | 'linked' }

export function mergeRepairHistory(
  device: Device,
  linkedRepairs: { id: string; ticketNumber?: string; createdAt: unknown; problem: string; status: string; totalCost?: number }[],
): MergedRepairHistoryEntry[] {
  const byId = new Map<string, MergedRepairHistoryEntry>()

  for (const entry of device.repairsHistory || []) {
    if (entry.repairId) {
      byId.set(entry.repairId, { ...entry, source: 'history' })
    }
  }

  for (const r of linkedRepairs) {
    if (byId.has(r.id)) continue
    const date =
      r.createdAt instanceof Date
        ? r.createdAt.toISOString().slice(0, 10)
        : typeof r.createdAt === 'object' && r.createdAt !== null && 'toDate' in r.createdAt
          ? (r.createdAt as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
    byId.set(r.id, {
      repairId: r.id,
      ticketNumber: r.ticketNumber,
      date,
      problem: r.problem,
      status: r.status,
      totalCost: r.totalCost || 0,
      source: 'linked',
    })
  }

  return Array.from(byId.values()).sort((a, b) => b.date.localeCompare(a.date))
}

export function formatItDateShort(input?: string): string {
  if (!input) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(input) ? new Date(`${input}T12:00:00`) : new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
