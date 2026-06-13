import type { Fornitore, ColonnaId, ColumnFilter, RaggruppaCriterio } from './types'
import { PROVINCE_TO_REGION } from './regionMap'

export type GroupedRow =
  | { kind: 'group'; key: string; label: string; count: number }
  | { kind: 'fornitore'; fornitore: Fornitore }

export function getGroupValue(fornitore: Fornitore, criterio: RaggruppaCriterio): string {
  switch (criterio) {
    case 'Nessuno':
      return ''
    case 'Agente':
      return fornitore.rapportiCommerciali.agente || '(Nessuno)'
    case 'Cap':
      return fornitore.sedeOperativa.cap || '(Vuoto)'
    case 'Città':
    case 'Comune':
      return fornitore.sedeOperativa.citta || '(Vuoto)'
    case 'Cod. destinatario':
      return fornitore.fatturaElettronica.valore || '(Vuoto)'
    case 'Codice':
      return fornitore.codice || '(Vuoto)'
    case 'Nazione':
      return fornitore.sedeOperativa.nazione || 'Italia'
    case 'Provincia':
      return fornitore.sedeOperativa.prov || '(Vuoto)'
    case 'Regione':
      return regionFromProvincia(fornitore.sedeOperativa.prov)
    case 'Sconto (%)':
      return fornitore.rapportiCommerciali.sconto || '(Nessuno)'
    case 'Tipologia':
      return 'Fornitore'
    case 'Pagamento':
      return fornitore.rapportiCommerciali.pagamento || '(Nessuno)'
    default:
      return ''
  }
}

export function regionFromProvincia(prov: string): string {
  const p = (prov || '').trim().toUpperCase()
  if (!p) return '(Senza regione)'
  return PROVINCE_TO_REGION[p] || `Regione (${p})`
}

export function groupLabel(criterio: RaggruppaCriterio, value: string): string {
  if (criterio === 'Nessuno') return ''
  return `${criterio}: ${value}`
}

export function buildGroupedList(
  fornitori: Fornitore[],
  criterio: RaggruppaCriterio,
  collapsedGroups: Set<string>,
): GroupedRow[] {
  if (criterio === 'Nessuno') {
    return fornitori.map(f => ({ kind: 'fornitore' as const, fornitore: f }))
  }

  const byGroup = new Map<string, Fornitore[]>()
  for (const f of fornitori) {
    const g = getGroupValue(f, criterio)
    const list = byGroup.get(g) || []
    list.push(f)
    byGroup.set(g, list)
  }

  const keys = [...byGroup.keys()].sort((a, b) => a.localeCompare(b, 'it'))
  const rows: GroupedRow[] = []

  for (const key of keys) {
    const items = byGroup.get(key) || []
    const expanded = !collapsedGroups.has(key)
    rows.push({ kind: 'group', key, label: groupLabel(criterio, key), count: items.length })
    if (expanded) {
      items
        .sort((a, b) => a.sedeOperativa.denominazione.localeCompare(b.sedeOperativa.denominazione, 'it'))
        .forEach(fornitore => rows.push({ kind: 'fornitore', fornitore }))
    }
  }
  return rows
}

export function getColumnValue(fornitore: Fornitore, col: ColonnaId): string {
  switch (col) {
    case 'cod':
      return fornitore.codice
    case 'denominazione':
      return fornitore.sedeOperativa.denominazione
    case 'indirizzo':
      return fornitore.sedeOperativa.indirizzo
    case 'cap':
      return fornitore.sedeOperativa.cap
    case 'citta':
      return fornitore.sedeOperativa.citta
    case 'prov':
      return fornitore.sedeOperativa.prov
    case 'nazione':
      return fornitore.sedeOperativa.nazione
    case 'codDestinatario':
      return fornitore.fatturaElettronica.valore
    case 'partitaIva':
      return fornitore.partitaIva
    case 'agente':
      return fornitore.rapportiCommerciali.agente
    case 'dichIntento':
      return fornitore.rapportiCommerciali.dichIntento
    default:
      return ''
  }
}

export function uniqueColumnValues(fornitori: Fornitore[], col: ColonnaId): string[] {
  const set = new Set<string>()
  for (const f of fornitori) {
    const v = getColumnValue(f, col).trim()
    set.add(v || '(Vuote)')
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'it'))
}

export function applyColumnFilters(
  fornitori: Fornitore[],
  filtri: Partial<Record<ColonnaId, ColumnFilter>>,
): Fornitore[] {
  return fornitori.filter(f => {
    for (const [colId, filter] of Object.entries(filtri) as [ColonnaId, ColumnFilter][]) {
      const raw = getColumnValue(f, colId).trim()
      if (filter.kind === 'piva') {
        if (filter.mode === 'vuote' && raw) return false
        if (filter.mode === 'nonVuote' && !raw) return false
        continue
      }
      if (filter.showAll) continue
      const val = raw || '(Vuote)'
      if (filter.search && !val.toLowerCase().includes(filter.search.toLowerCase())) return false
      if (!filter.selected.has(val) && !(filter.showEmpty && !raw)) return false
    }
    return true
  })
}

export function sortFornitori(fornitori: Fornitore[], col: ColonnaId, dir: 'asc' | 'desc'): Fornitore[] {
  return [...fornitori].sort((a, b) => {
    const va = getColumnValue(a, col).toLowerCase()
    const vb = getColumnValue(b, col).toLowerCase()
    const cmp = va.localeCompare(vb, 'it')
    return dir === 'asc' ? cmp : -cmp
  })
}

export function duplicateFornitore(fornitore: Fornitore, newCode: string): Fornitore {
  return {
    ...structuredClone(fornitore),
    id: `draft-${crypto.randomUUID()}`,
    codice: newCode,
    sedeOperativa: {
      ...fornitore.sedeOperativa,
      denominazione: `${fornitore.sedeOperativa.denominazione} (copia)`,
    },
    isDraft: true,
  }
}
