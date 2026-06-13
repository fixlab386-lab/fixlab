import type { DataTableColumn, DataTableSortDirection } from '../ui'

export type AnagraficaDetailTab = 'anagrafica' | 'commerciali' | 'varie'

export type GroupByMode = 'none' | 'province'

export function displayValue(value?: string | number | null): string {
  if (value == null || value === '') return '—'
  return String(value)
}

export function getProvinces<T extends { province?: string }>(items: T[]): string[] {
  return [...new Set(items.map(i => i.province || '').filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'it', { sensitivity: 'base' }),
  )
}

export function filterBySearchAndProvince<T extends { province?: string }>(
  items: T[],
  searchLower: string,
  regionFilter: string,
  getSearchHaystack: (item: T) => string,
): T[] {
  return items.filter(item => {
    if (regionFilter !== 'all' && (item.province || '') !== regionFilter) return false
    if (searchLower && !getSearchHaystack(item).toLowerCase().includes(searchLower)) return false
    return true
  })
}

export function sortAnagraficaRows<T extends { name: string; province?: string }>(
  rows: T[],
  options: {
    groupBy: GroupByMode
    sortColumnId: string | null
    sortDirection: DataTableSortDirection
    columns: DataTableColumn<T>[]
  },
): T[] {
  const sorted = [...rows]
  if (options.groupBy === 'province') {
    sorted.sort((a, b) => {
      const pa = a.province || 'ZZZ'
      const pb = b.province || 'ZZZ'
      const cmp = pa.localeCompare(pb, 'it', { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
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
