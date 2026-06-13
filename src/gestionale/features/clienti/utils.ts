import type { Cliente, ColonnaId, ColumnFilter, RaggruppaCriterio } from './types'
import { PROVINCE_TO_REGION } from './regionMap'

export type GroupedRow =
  | { kind: 'group'; key: string; label: string; count: number }
  | { kind: 'client'; cliente: Cliente }

export function getGroupValue(cliente: Cliente, criterio: RaggruppaCriterio): string {
  switch (criterio) {
    case 'Nessuno':
      return ''
    case 'Agente':
      return cliente.rapportiCommerciali.agente || '(Nessuno)'
    case 'Cap':
      return cliente.sedeOperativa.cap || '(Vuoto)'
    case 'Città':
    case 'Comune':
      return cliente.sedeOperativa.citta || '(Vuoto)'
    case 'Cod. destinatario':
      return cliente.fatturaElettronica.valore || '(Vuoto)'
    case 'Codice':
      return cliente.codice || '(Vuoto)'
    case 'Nazione':
      return cliente.sedeOperativa.nazione || 'Italia'
    case 'Provincia':
      return cliente.sedeOperativa.prov || '(Vuoto)'
    case 'Regione':
      return regionFromProvincia(cliente.sedeOperativa.prov)
    case 'Sconto (%)':
      return cliente.rapportiCommerciali.sconto || '(Nessuno)'
    case 'Tipologia': {
      if (cliente.isCliente && cliente.isFornitore) return 'Cliente e Fornitore'
      if (cliente.isFornitore) return 'Fornitore'
      return 'Cliente'
    }
    case 'Pagamento':
      return cliente.rapportiCommerciali.pagamento || '(Nessuno)'
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
  clienti: Cliente[],
  criterio: RaggruppaCriterio,
  collapsedGroups: Set<string>,
): GroupedRow[] {
  if (criterio === 'Nessuno') {
    return clienti.map(c => ({ kind: 'client' as const, cliente: c }))
  }

  const byGroup = new Map<string, Cliente[]>()
  for (const c of clienti) {
    const g = getGroupValue(c, criterio)
    const list = byGroup.get(g) || []
    list.push(c)
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
        .forEach(cliente => rows.push({ kind: 'client', cliente }))
    }
  }
  return rows
}

export function getColumnValue(cliente: Cliente, col: ColonnaId): string {
  switch (col) {
    case 'cod':
      return cliente.codice
    case 'denominazione':
      return cliente.sedeOperativa.denominazione
    case 'indirizzo':
      return cliente.sedeOperativa.indirizzo
    case 'cap':
      return cliente.sedeOperativa.cap
    case 'citta':
      return cliente.sedeOperativa.citta
    case 'prov':
      return cliente.sedeOperativa.prov
    case 'nazione':
      return cliente.sedeOperativa.nazione
    case 'codDestinatario':
      return cliente.fatturaElettronica.valore
    case 'partitaIva':
      return cliente.partitaIva
    case 'agente':
      return cliente.rapportiCommerciali.agente
    case 'dichIntento':
      return cliente.rapportiCommerciali.dichIntento
    default:
      return ''
  }
}

export function uniqueColumnValues(clienti: Cliente[], col: ColonnaId): string[] {
  const set = new Set<string>()
  for (const c of clienti) {
    const v = getColumnValue(c, col).trim()
    set.add(v || '(Vuote)')
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'it'))
}

export function applyColumnFilters(
  clienti: Cliente[],
  filtri: Partial<Record<ColonnaId, ColumnFilter>>,
): Cliente[] {
  return clienti.filter(c => {
    for (const [colId, filter] of Object.entries(filtri) as [ColonnaId, ColumnFilter][]) {
      const raw = getColumnValue(c, colId).trim()
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

export function sortClienti(clienti: Cliente[], col: ColonnaId, dir: 'asc' | 'desc'): Cliente[] {
  return [...clienti].sort((a, b) => {
    const va = getColumnValue(a, col).toLowerCase()
    const vb = getColumnValue(b, col).toLowerCase()
    const cmp = va.localeCompare(vb, 'it')
    return dir === 'asc' ? cmp : -cmp
  })
}

export function duplicateCliente(cliente: Cliente, newCode: string): Cliente {
  return {
    ...structuredClone(cliente),
    id: `draft-${crypto.randomUUID()}`,
    codice: newCode,
    sedeOperativa: {
      ...cliente.sedeOperativa,
      denominazione: `${cliente.sedeOperativa.denominazione} (copia)`,
    },
    isDraft: true,
  }
}
