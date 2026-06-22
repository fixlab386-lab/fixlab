import { useMemo, useState } from 'react'
import TableColumnResizer from '../../../components/ui/TableColumnResizer'
import { useExpandableTableCells } from '../../../hooks/useExpandableTableCells'
import { useTableColumnWidths } from '../../../hooks/useTableColumnWidths'
import { useVirtualWindow } from '../../../hooks/useVirtualWindow'
import { COLONNE_DEF, COLONNE_WIDTH_DEFAULT } from './constants'
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

  const colSpan = visibleCols.length + 1
  const { hasExpanded, isExpanded, onCellDoubleClick } = useExpandableTableCells()
  const { widths: colWidths, startResize } = useTableColumnWidths('fixlab.clienti.colWidths', COLONNE_WIDTH_DEFAULT)
  const { scrollRef, start, end, enabled, topPad, bottomPad } = useVirtualWindow(rows.length, 28)
  const useVirtual = enabled && !hasExpanded
  const visibleRows = useVirtual ? rows.slice(start, end) : rows

  return (
    <div className="clienti-section__lista">
      <div className="clienti-grid-wrap" ref={scrollRef}>
        <table className="clienti-grid clienti-grid--resizable">
          <thead>
            <tr>
              <th style={{ width: 28 }} aria-label="Selezione" />
              {visibleCols.map(col => {
                const hasFilter = Boolean(filtriColonna[col.id])
                const isSorted = sortColumn === col.id
                return (
                  <th
                    key={col.id}
                    className={[hasFilter ? 'clienti-grid__th--filtered' : '', isSorted ? 'clienti-grid__th--sorted' : '']
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      width: colWidths[col.id],
                      minWidth: colWidths[col.id],
                      maxWidth: colWidths[col.id],
                    }}
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
                    <TableColumnResizer
                      className="clienti-grid__col-resizer"
                      onMouseDown={clientX => startResize(col.id, clientX)}
                    />
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
                <td colSpan={visibleCols.length + 1}>
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
                <td colSpan={visibleCols.length + 1} className="clienti-empty">
                  Nessun cliente. Usa «Nuovo» per aggiungerne uno.
                </td>
              </tr>
            ) : null}
            {useVirtual && topPad > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={colSpan} style={{ height: topPad, padding: 0, border: 'none' }} />
              </tr>
            ) : null}
            {visibleRows.map(row => {
              if (row.kind === 'group') {
                const expanded = !collapsedGroups.has(row.key)
                return (
                  <tr key={`g-${row.key}`} className="clienti-grid__group" onClick={() => onToggleGroup(row.key)}>
                    <td colSpan={visibleCols.length + 1}>
                      <span className="clienti-grid__group-toggle">{expanded ? '▼' : '▶'}</span>
                      {row.label}
                    </td>
                  </tr>
                )
              }
              const c = row.cliente
              const selected = c.id === selectedId
              const rowExpanded = visibleCols.some(col => isExpanded(c.id, col.id))
              return (
                <tr
                  key={c.id}
                  className={[selected ? 'clienti-grid__row--selected' : '', c.isDraft ? 'clienti-grid__row--draft' : '', rowExpanded ? 'clienti-grid__row--expanded' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelect(c)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => onToggleSelect(c.id)} />
                  </td>
                  {visibleCols.map(col => {
                    const cellExpanded = isExpanded(c.id, col.id)
                    const value = getColumnValue(c, col.id) || '—'
                    return (
                      <td
                        key={col.id}
                        className={cellExpanded ? 'clienti-grid__td--expanded' : undefined}
                        style={{
                          width: colWidths[col.id],
                          minWidth: colWidths[col.id],
                          maxWidth: colWidths[col.id],
                        }}
                        title={cellExpanded ? undefined : 'Doppio clic per espandere'}
                        onDoubleClick={e => onCellDoubleClick(c.id, col.id, e)}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {useVirtual && bottomPad > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={colSpan} style={{ height: bottomPad, padding: 0, border: 'none' }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="clienti-lista-footer">{dataCount} voci</div>
    </div>
  )
}
