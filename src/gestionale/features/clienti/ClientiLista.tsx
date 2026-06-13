import { useMemo, useState } from 'react'
import { COLONNE_DEF } from './constants'
import type { Cliente, ColonnaId, ColumnFilter } from './types'
import {
  applyColumnFilters,
  buildGroupedList,
  getColumnValue,
  sortClienti,
  uniqueColumnValues,
  type GroupedRow,
} from './utils'
import type { RaggruppaCriterio } from './types'

type Props = {
  clienti: Cliente[]
  selectedId: string | null
  selectionMode: boolean
  selectedIds: Set<string>
  colonneVisibili: Record<ColonnaId, boolean>
  criterioRaggruppamento: RaggruppaCriterio
  filtriColonna: Partial<Record<ColonnaId, ColumnFilter>>
  collapsedGroups: Set<string>
  sortColumn: ColonnaId | null
  sortDirection: 'asc' | 'desc'
  filtraAttivo: boolean
  onSelect: (c: Cliente) => void
  onToggleGroup: (key: string) => void
  onToggleSelect: (id: string) => void
  onFilterChange: (col: ColonnaId, filter: ColumnFilter | undefined) => void
  onSort: (col: ColonnaId) => void
  onOpenFilter: (col: ColonnaId) => void
  onFilterPersonalizzato?: (col: ColonnaId) => void
}

function FilterPopover({
  col,
  clienti,
  filter,
  onChange,
  onClose,
  onFilterPersonalizzato,
}: {
  col: ColonnaId
  clienti: Cliente[]
  filter?: ColumnFilter
  onChange: (f: ColumnFilter | undefined) => void
  onClose: () => void
  onFilterPersonalizzato?: () => void
}) {
  const isPiva = col === 'partitaIva'
  const values = uniqueColumnValues(clienti, col)
  const textFilter: ColumnFilter =
    filter?.kind === 'text'
      ? filter
      : { kind: 'text', selected: new Set(values), showEmpty: true, showAll: true, search: '' }

  if (isPiva) {
    const mode = filter?.kind === 'piva' ? filter.mode : 'tutti'
    return (
      <div className="clienti-filter-popover" onClick={e => e.stopPropagation()}>
        {(['tutti', 'personalizzato', 'nonVuote', 'vuote'] as const).map(m => (
          <label key={m} className="clienti-dropdown__check">
            <input
              type="radio"
              name={`filtro-${col}`}
              checked={mode === m}
              onChange={() =>
                onChange(m === 'tutti' ? undefined : { kind: 'piva', mode: m === 'personalizzato' ? 'tutti' : m })
              }
            />
            ({m === 'tutti' ? 'Tutti' : m === 'personalizzato' ? 'Personalizzato…' : m === 'nonVuote' ? 'Non vuote' : 'Vuote'})
          </label>
        ))}
        <button type="button" className="clienti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
          Chiudi
        </button>
      </div>
    )
  }

  const toggleVal = (val: string) => {
    if (textFilter.kind !== 'text') return
    const next = new Set(textFilter.selected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    onChange({ ...textFilter, selected: next, showAll: false })
  }

  return (
    <div className="clienti-filter-popover" onClick={e => e.stopPropagation()}>
      <input
        className="clienti-input"
        placeholder="Cerca…"
        value={textFilter.kind === 'text' ? textFilter.search : ''}
        onChange={e =>
          textFilter.kind === 'text' && onChange({ ...textFilter, search: e.target.value, showAll: false })
        }
        autoFocus
      />
      <label className="clienti-dropdown__check">
        <input
          type="checkbox"
          checked={textFilter.kind === 'text' && textFilter.showAll}
          onChange={e =>
            textFilter.kind === 'text' &&
            onChange({ ...textFilter, showAll: e.target.checked, selected: new Set(values) })
          }
        />
        (Tutti)
      </label>
      <label className="clienti-dropdown__check">
        <input
          type="checkbox"
          checked={textFilter.kind === 'text' && textFilter.showEmpty}
          onChange={e =>
            textFilter.kind === 'text' && onChange({ ...textFilter, showEmpty: e.target.checked })
          }
        />
        (Vuote)
      </label>
      <button
        type="button"
        className="clienti-link"
        onClick={() => {
          onFilterPersonalizzato?.()
          onClose()
        }}
      >
        (Personalizzato…)
      </button>
      <div style={{ maxHeight: 160, overflow: 'auto', marginTop: 4 }}>
        {values.map(v => (
          <label key={v} className="clienti-dropdown__check">
            <input
              type="checkbox"
              checked={textFilter.kind === 'text' && (textFilter.showAll || textFilter.selected.has(v))}
              onChange={() => toggleVal(v)}
            />
            {v}
          </label>
        ))}
      </div>
      <button type="button" className="clienti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
        Chiudi
      </button>
    </div>
  )
}

export default function ClientiLista({
  clienti,
  selectedId,
  selectionMode,
  selectedIds,
  colonneVisibili,
  criterioRaggruppamento,
  filtriColonna,
  collapsedGroups,
  sortColumn,
  sortDirection,
  filtraAttivo,
  onSelect,
  onToggleGroup,
  onToggleSelect,
  onFilterChange,
  onSort,
  onOpenFilter,
  onFilterPersonalizzato,
}: Props) {
  const [filterCol, setFilterCol] = useState<ColonnaId | null>(null)

  const filtered = useMemo(() => {
    let list = applyColumnFilters(clienti, filtriColonna)
    if (sortColumn && criterioRaggruppamento === 'Nessuno') {
      list = sortClienti(list, sortColumn, sortDirection)
    }
    return list
  }, [clienti, filtriColonna, sortColumn, sortDirection, criterioRaggruppamento])

  const rows: GroupedRow[] = useMemo(
    () => buildGroupedList(filtered, criterioRaggruppamento, collapsedGroups),
    [filtered, criterioRaggruppamento, collapsedGroups],
  )

  const visibleCols = COLONNE_DEF.filter(c => colonneVisibili[c.id])
  const dataCount = filtered.length

  const openFilter = (col: ColonnaId) => {
    setFilterCol(col)
    onOpenFilter(col)
  }

  return (
    <div className="clienti-section__lista">
      <div className="clienti-grid-wrap">
        <table className="clienti-grid">
          <thead>
            <tr>
              {selectionMode ? <th style={{ width: 28 }} /> : null}
              {visibleCols.map(col => {
                const hasFilter = Boolean(filtriColonna[col.id])
                const isSorted = sortColumn === col.id
                return (
                  <th
                    key={col.id}
                    className={[hasFilter ? 'clienti-grid__th--filtered' : '', isSorted ? 'clienti-grid__th--sorted' : '']
                      .filter(Boolean)
                      .join(' ')}
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => onSort(col.id)}
                  >
                    {col.label}
                    {isSorted ? <span className="clienti-grid__sort">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                    <span
                      className="clienti-grid__filter"
                      title="Filtro"
                      onClick={e => {
                        e.stopPropagation()
                        setFilterCol(filterCol === col.id ? null : col.id)
                        openFilter(col.id)
                      }}
                    >
                      ▾
                    </span>
                    {filterCol === col.id ? (
                      <FilterPopover
                        col={col.id}
                        clienti={clienti}
                        filter={filtriColonna[col.id]}
                        onChange={f => onFilterChange(col.id, f)}
                        onClose={() => setFilterCol(null)}
                        onFilterPersonalizzato={() => onFilterPersonalizzato?.(col.id)}
                      />
                    ) : null}
                  </th>
                )
              })}
            </tr>
            {filtraAttivo ? (
              <tr className="clienti-grid__filter-row">
                <td colSpan={visibleCols.length + (selectionMode ? 1 : 0)}>
                  <button
                    type="button"
                    className="clienti-grid__filter-hint"
                    onClick={() => visibleCols[0] && openFilter(visibleCols[0].id)}
                  >
                    Clicca qui per impostare un filtro
                  </button>
                </td>
              </tr>
            ) : null}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + (selectionMode ? 1 : 0)} className="clienti-empty">
                  Nessun cliente. Usa «Nuovo» per aggiungerne uno.
                </td>
              </tr>
            ) : null}
            {rows.map(row => {
              if (row.kind === 'group') {
                const expanded = !collapsedGroups.has(row.key)
                return (
                  <tr key={`g-${row.key}`} className="clienti-grid__group" onClick={() => onToggleGroup(row.key)}>
                    <td colSpan={visibleCols.length + (selectionMode ? 1 : 0)}>
                      <span className="clienti-grid__group-toggle">{expanded ? '▼' : '▶'}</span>
                      {row.label} ({row.count})
                    </td>
                  </tr>
                )
              }
              const c = row.cliente
              const selected = c.id === selectedId
              return (
                <tr
                  key={c.id}
                  className={[selected ? 'clienti-grid__row--selected' : '', c.isDraft ? 'clienti-grid__row--draft' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelect(c)}
                >
                  {selectionMode ? (
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => onToggleSelect(c.id)} />
                    </td>
                  ) : null}
                  {visibleCols.map(col => (
                    <td key={col.id}>{getColumnValue(c, col.id) || '—'}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="clienti-lista-footer">{dataCount} voci</div>
    </div>
  )
}
