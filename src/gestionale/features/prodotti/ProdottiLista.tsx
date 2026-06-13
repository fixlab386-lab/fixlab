import { useMemo, useRef, useState } from 'react'
import { COLONNE_DEF, CERCA_VELOCE_CAMPI, CERCA_VELOCE_MODI } from './constants'
import type { ColonnaId, ColumnFilter, Prodotto, CercaVeloceCampo, CercaVeloceModo } from './types'
import type { RaggruppaCriterio } from './types'
import { applyColumnFilters, buildGroupedList, getColumnValue, uniqueColumnValues, type GroupedRow } from './utils'

type Props = {
  prodotti: Prodotto[]
  selectedId: string | null
  selectionMode: boolean
  selectedIds: Set<string>
  colonneVisibili: Record<ColonnaId, boolean>
  criterioRaggruppamento: RaggruppaCriterio
  filtriColonna: Partial<Record<ColonnaId, ColumnFilter>>
  collapsedGroups: Set<string>
  cercaCampo: CercaVeloceCampo
  cercaModo: CercaVeloceModo
  cercaQuery: string
  onCercaCampo: (c: CercaVeloceCampo) => void
  onCercaModo: (m: CercaVeloceModo) => void
  onCercaQuery: (q: string) => void
  onSelect: (p: Prodotto) => void
  onToggleGroup: (key: string) => void
  onToggleSelect: (id: string) => void
  onFilterChange: (col: ColonnaId, filter: ColumnFilter | undefined) => void
}

function FilterPopover({
  col,
  prodotti,
  filter,
  onChange,
  onClose,
}: {
  col: ColonnaId
  prodotti: Prodotto[]
  filter?: ColumnFilter
  onChange: (f: ColumnFilter | undefined) => void
  onClose: () => void
}) {
  if (col === 'cod') {
    const text = filter?.kind === 'text' ? filter.search : ''
    return (
      <div className="prodotti-filter-popover" onClick={e => e.stopPropagation()}>
        <input
          className="prodotti-input"
          placeholder="Cerca codice"
          value={text}
          onChange={e => onChange(e.target.value ? { kind: 'text', search: e.target.value } : undefined)}
          autoFocus
        />
        <button type="button" className="prodotti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
          Chiudi
        </button>
      </div>
    )
  }

  if (col === 'produttore') {
    const mode = filter?.kind === 'produttore' ? filter.mode : 'tutti'
    return (
      <div className="prodotti-filter-popover" onClick={e => e.stopPropagation()}>
        {(['tutti', 'personalizzato', 'nonVuote', 'vuote'] as const).map(m => (
          <label key={m} className="prodotti-dropdown__check">
            <input
              type="radio"
              name={`filtro-${col}`}
              checked={mode === m}
              onChange={() =>
                onChange(m === 'tutti' ? undefined : { kind: 'produttore', mode: m })
              }
            />
            ({m === 'tutti' ? 'Tutti' : m === 'personalizzato' ? 'Personalizzato…' : m === 'nonVuote' ? 'Non vuote' : 'Vuote'})
          </label>
        ))}
        <button type="button" className="prodotti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
          Chiudi
        </button>
      </div>
    )
  }

  const values = uniqueColumnValues(prodotti, col)
  const textFilter: ColumnFilter =
    filter?.kind === 'values'
      ? filter
      : { kind: 'values', selected: new Set(values), showEmpty: true, showAll: true, search: '' }

  const toggleVal = (val: string) => {
    if (textFilter.kind !== 'values') return
    const next = new Set(textFilter.selected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    onChange({ ...textFilter, selected: next, showAll: false })
  }

  return (
    <div className="prodotti-filter-popover" onClick={e => e.stopPropagation()}>
      <input
        className="prodotti-input"
        placeholder="Cerca…"
        value={textFilter.kind === 'values' ? textFilter.search : ''}
        onChange={e =>
          textFilter.kind === 'values' &&
          onChange({ ...textFilter, search: e.target.value, showAll: false })
        }
      />
      <label className="prodotti-dropdown__check">
        <input
          type="checkbox"
          checked={textFilter.kind === 'values' && textFilter.showAll}
          onChange={e =>
            textFilter.kind === 'values' &&
            onChange({ ...textFilter, showAll: e.target.checked, selected: new Set(values) })
          }
        />
        (Tutti)
      </label>
      <label className="prodotti-dropdown__check">
        <input
          type="checkbox"
          checked={textFilter.kind === 'values' && textFilter.showEmpty}
          onChange={e =>
            textFilter.kind === 'values' && onChange({ ...textFilter, showEmpty: e.target.checked })
          }
        />
        (Vuote)
      </label>
      <button type="button" className="prodotti-link" onClick={() => alert('Filtro personalizzato…')}>
        (Personalizzato…)
      </button>
      <div style={{ maxHeight: 160, overflow: 'auto', marginTop: 4 }}>
        {values.map(v => (
          <label key={v} className="prodotti-dropdown__check">
            <input
              type="checkbox"
              checked={textFilter.kind === 'values' && (textFilter.showAll || textFilter.selected.has(v))}
              onChange={() => toggleVal(v)}
            />
            {v}
          </label>
        ))}
      </div>
      <button type="button" className="prodotti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
        Chiudi
      </button>
    </div>
  )
}

function CercaVeloceMenu({
  campo,
  modo,
  onCampo,
  onModo,
  onClose,
}: {
  campo: CercaVeloceCampo
  modo: CercaVeloceModo
  onCampo: (c: CercaVeloceCampo) => void
  onModo: (m: CercaVeloceModo) => void
  onClose: () => void
}) {
  return (
    <div className="prodotti-filter-popover" style={{ right: 0, left: 'auto', minWidth: 220 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Tipologia di ricerca</div>
      {CERCA_VELOCE_CAMPI.map(c => (
        <label key={c.id} className="prodotti-dropdown__check">
          <input type="radio" name="cerca-campo" checked={campo === c.id} onChange={() => onCampo(c.id)} />
          {c.label}
        </label>
      ))}
      <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #ccc' }} />
      {CERCA_VELOCE_MODI.map(m => (
        <label key={m.id} className="prodotti-dropdown__check">
          <input type="radio" name="cerca-modo" checked={modo === m.id} onChange={() => onModo(m.id)} />
          {m.label}
        </label>
      ))}
      <button type="button" className="prodotti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
        Chiudi
      </button>
    </div>
  )
}

export default function ProdottiLista({
  prodotti,
  selectedId,
  selectionMode,
  selectedIds,
  colonneVisibili,
  criterioRaggruppamento,
  filtriColonna,
  collapsedGroups,
  cercaCampo,
  cercaModo,
  cercaQuery,
  onCercaCampo,
  onCercaModo,
  onCercaQuery,
  onSelect,
  onToggleGroup,
  onToggleSelect,
  onFilterChange,
}: Props) {
  const [filterCol, setFilterCol] = useState<ColonnaId | null>(null)
  const [showCercaMenu, setShowCercaMenu] = useState(false)
  const headerRef = useRef<HTMLTableSectionElement>(null)

  const filtered = useMemo(() => applyColumnFilters(prodotti, filtriColonna), [prodotti, filtriColonna])
  const rows: GroupedRow[] = useMemo(
    () => buildGroupedList(filtered, criterioRaggruppamento, collapsedGroups),
    [filtered, criterioRaggruppamento, collapsedGroups],
  )

  const visibleCols = COLONNE_DEF.filter(c => colonneVisibili[c.id])

  return (
    <div className="prodotti-section__lista">
      <div className="prodotti-grid-wrap">
        <table className="prodotti-grid">
          <thead ref={headerRef}>
            <tr>
              {selectionMode ? <th style={{ width: 28 }} /> : null}
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  className={filtriColonna[col.id] ? 'prodotti-grid__th--filtered' : ''}
                  style={{ position: 'relative' }}
                >
                  {col.label}
                  <span
                    className="prodotti-grid__filter"
                    title="Filtro"
                    onClick={e => {
                      e.stopPropagation()
                      setFilterCol(filterCol === col.id ? null : col.id)
                    }}
                  >
                    ▼
                  </span>
                  {filterCol === col.id ? (
                    <FilterPopover
                      col={col.id}
                      prodotti={prodotti}
                      filter={filtriColonna[col.id]}
                      onChange={f => onFilterChange(col.id, f)}
                      onClose={() => setFilterCol(null)}
                    />
                  ) : null}
                </th>
              ))}
              <th style={{ width: 80, position: 'relative' }}>
                <button
                  type="button"
                  className="prodotti-grid__search-btn"
                  title="Cerca veloce"
                  onClick={() => setShowCercaMenu(v => !v)}
                >
                  🔍
                </button>
                {showCercaMenu ? (
                  <CercaVeloceMenu
                    campo={cercaCampo}
                    modo={cercaModo}
                    onCampo={onCercaCampo}
                    onModo={onModo => onCercaModo(onModo)}
                    onClose={() => setShowCercaMenu(false)}
                  />
                ) : null}
              </th>
            </tr>
            {cercaQuery ? (
              <tr>
                <td colSpan={visibleCols.length + (selectionMode ? 2 : 1)} style={{ padding: 2 }}>
                  <input
                    className="prodotti-input"
                    placeholder={CERCA_VELOCE_CAMPI.find(c => c.id === cercaCampo)?.label}
                    value={cercaQuery}
                    onChange={e => onCercaQuery(e.target.value)}
                  />
                </td>
              </tr>
            ) : null}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + (selectionMode ? 2 : 1)} style={{ textAlign: 'center', padding: 12 }}>
                  Nessun prodotto in elenco.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                if (row.kind === 'group') {
                  const collapsed = collapsedGroups.has(row.key)
                  return (
                    <tr key={`g-${row.key}`} className="prodotti-grid__group" onClick={() => onToggleGroup(row.key)}>
                      <td colSpan={visibleCols.length + (selectionMode ? 2 : 1)}>
                        <span className="prodotti-grid__group-toggle">{collapsed ? '▶' : '▼'}</span>
                        {row.label} ({row.count})
                      </td>
                    </tr>
                  )
                }
                const p = row.prodotto
                const selected = p.id === selectedId
                const draft = p.isDraft
                return (
                  <tr
                    key={p.id || i}
                    className={`${selected ? 'prodotti-grid__row--selected' : ''} ${draft ? 'prodotti-grid__row--draft' : ''}`}
                    onClick={() => onSelect(p)}
                  >
                    {selectionMode ? (
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => onToggleSelect(p.id)}
                        />
                      </td>
                    ) : null}
                    {visibleCols.map(col => (
                      <td key={col.id}>{getColumnValue(p, col.id)}</td>
                    ))}
                    <td />
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
