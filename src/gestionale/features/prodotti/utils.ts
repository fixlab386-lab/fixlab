import { LISTINI_GLOBALI } from './constants'
import type {
  ColonnaId,
  ColumnFilter,
  Prodotto,
  RaggruppaCriterio,
  PrezzoListino,
  RegolaListino,
} from './types'
import { calcDisponibile } from './types'

export type GroupedRow =
  | { kind: 'group'; key: string; label: string; count: number }
  | { kind: 'prodotto'; prodotto: Prodotto }

export function getGroupValue(p: Prodotto, criterio: RaggruppaCriterio): string {
  switch (criterio) {
    case 'Nessuno':
      return ''
    case 'Categoria':
      return p.categoria || '(Senza categoria)'
    case 'CategoriaSottocategoria':
      return p.sottocategoria ? `${p.categoria} / ${p.sottocategoria}` : p.categoria || '(Senza categoria)'
    case 'Um':
      return p.um || '(Vuoto)'
    case 'Fornitore':
      return p.dettagli.fornitore || '(Vuoto)'
    case 'Produttore':
      return p.dettagli.produttore || '(Vuoto)'
    case 'Opzioni':
      return p.dettagli.artAssemblato ? 'Art. assemblato' : 'Standard'
    case 'Giacenza':
      return p.magazzino ? String(p.magazzino.giacenza) : 'N/A'
    case 'Richiesta':
      return p.dettagli.richiesta || '(Vuoto)'
    case 'Nota':
      return p.note ? 'Con nota' : '(Senza nota)'
    default:
      return ''
  }
}

export function groupLabel(criterio: RaggruppaCriterio, value: string): string {
  if (criterio === 'Nessuno') return ''
  const lbl = criterio === 'CategoriaSottocategoria' ? 'Categoria / Sottocategoria' : criterio === 'Um' ? 'U.m.' : criterio
  return `${lbl}: ${value}`
}

export function buildGroupedList(
  prodotti: Prodotto[],
  criterio: RaggruppaCriterio,
  collapsedGroups: Set<string>,
): GroupedRow[] {
  if (criterio === 'Nessuno') {
    return prodotti.map(p => ({ kind: 'prodotto' as const, prodotto: p }))
  }

  const byGroup = new Map<string, Prodotto[]>()
  for (const p of prodotti) {
    const g = getGroupValue(p, criterio)
    const list = byGroup.get(g) || []
    list.push(p)
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
        .sort((a, b) => a.codProdotto.localeCompare(b.codProdotto, 'it'))
        .forEach(prodotto => rows.push({ kind: 'prodotto', prodotto }))
    }
  }
  return rows
}

export function getColumnValue(p: Prodotto, col: ColonnaId): string {
  switch (col) {
    case 'cod':
      return p.codProdotto
    case 'descrizione':
      return p.descrizione
    case 'produttore':
      return p.dettagli.produttore
    case 'prezzo': {
      const priv = p.prezzi.find(x => x.listinoId === 'privati')
      return priv ? formatEuro(priv.valore) : ''
    }
    default:
      return ''
  }
}

import { formatEuro } from '../../lib/formatters'

export { formatEuro }

export function uniqueColumnValues(prodotti: Prodotto[], col: ColonnaId): string[] {
  const set = new Set<string>()
  for (const p of prodotti) {
    const v = getColumnValue(p, col).trim()
    set.add(v || '(Vuote)')
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'it'))
}

export function applyColumnFilters(
  prodotti: Prodotto[],
  filtri: Partial<Record<ColonnaId, ColumnFilter>>,
): Prodotto[] {
  return prodotti.filter(p => {
    for (const [col, filter] of Object.entries(filtri) as [ColonnaId, ColumnFilter][]) {
      const val = getColumnValue(p, col)
      if (filter.kind === 'text') {
        const q = filter.search.trim().toLowerCase()
        if (q && !val.toLowerCase().includes(q)) return false
      } else if (filter.kind === 'produttore') {
        const empty = !p.dettagli.produttore.trim()
        if (filter.mode === 'nonVuote' && empty) return false
        if (filter.mode === 'vuote' && !empty) return false
      } else if (filter.kind === 'values') {
        const normalized = val.trim() || '(Vuote)'
        if (!filter.showAll && !filter.selected.has(normalized)) return false
        if (!filter.showEmpty && !val.trim()) return false
        if (filter.search.trim()) {
          const q = filter.search.toLowerCase()
          if (!normalized.toLowerCase().includes(q)) return false
        }
      }
    }
    return true
  })
}

export function applyCercaVeloce(
  prodotti: Prodotto[],
  campo: 'codBarre' | 'descrizione' | 'codProduttore',
  modo: 'cominciaCon' | 'inizianoPer' | 'contengono',
  query: string,
): Prodotto[] {
  const q = query.trim().toLowerCase()
  if (!q) return prodotti
  return prodotti.filter(p => {
    let hay = ''
    if (campo === 'codBarre') hay = p.dettagli.codBarre
    else if (campo === 'descrizione') hay = p.descrizione
    else hay = p.dettagli.produttore
    hay = hay.toLowerCase()
    if (modo === 'cominciaCon' || modo === 'inizianoPer') return hay.startsWith(q)
    return hay.includes(q)
  })
}

export function sortProdotti(prodotti: Prodotto[]): Prodotto[] {
  return [...prodotti].sort((a, b) => a.codProdotto.localeCompare(b.codProdotto, 'it'))
}

export function aggiornaMagazzinoDisponibile(m: NonNullable<Prodotto['magazzino']>): typeof m {
  return { ...m, disponibile: calcDisponibile(m.giacenza, m.impegnata, m.ordinata) }
}

export function ricalcolaListini(prodotto: Prodotto): Prodotto {
  const costo = prodotto.prezzoCosto
  const next = prodotto.prezzi.map(p => {
    if (p.modalita !== 'calcolato' || !p.regola) return p
    let val = p.valore
    const r = p.regola
    if (r.copiaDaListino) {
      const base = prodotto.prezzi.find(x => x.listinoId === r.copiaDaListino)
      val = base?.valore ?? val
    }
    if (r.ricaricoSuCosto) val = costo * (1 + r.ricaricoSuCosto / 100)
    if (r.diminuzione) val = val * (1 - r.diminuzione / 100)
    if (r.importoFisso) val += r.importoFisso
    if (r.arrotondamento === 'Al centesimo') val = Math.round(val * 100) / 100
    return { ...p, valore: val }
  })
  return { ...prodotto, prezzi: next }
}

export function regolaToLabel(regola?: RegolaListino): string {
  if (!regola) return ''
  const parts: string[] = []
  if (regola.copiaDaListino) parts.push(`copia da ${regola.copiaDaListino}`)
  if (regola.ricaricoSuCosto) parts.push(`+${regola.ricaricoSuCosto}% su costo`)
  if (regola.diminuzione) parts.push(`−${regola.diminuzione}%`)
  if (regola.importoFisso) parts.push(`+€ ${regola.importoFisso.toFixed(2)}`)
  return parts.join(', ')
}

export function listinoLabel(id: string): string {
  return LISTINI_GLOBALI.find(l => l.id === id)?.label ?? id
}

export function getPrezzoListino(prezzi: PrezzoListino[], id: string): PrezzoListino | undefined {
  return prezzi.find(p => p.listinoId === id)
}
