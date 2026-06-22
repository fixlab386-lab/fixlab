import { useMemo, useRef, useState } from 'react'
import TableColumnResizer from '../../../components/ui/TableColumnResizer'
import { useExpandableTableCells } from '../../../hooks/useExpandableTableCells'
import { useTableColumnWidths } from '../../../hooks/useTableColumnWidths'
import { useVirtualWindow } from '../../../hooks/useVirtualWindow'
import CategoryTreeFilter from '../../components/CategoryTreeFilter'
import { FixedDropdownPanel } from '../../components/FixedDropdown'
import type { Category } from '../../../types'
import { COLONNE_DEF, COLONNE_WIDTH_DEFAULT, CERCA_VELOCE_CAMPI, CERCA_VELOCE_MODI } from './constants'
import type { ColonnaId, ColumnFilter, Prodotto, CercaVeloceCampo, CercaVeloceModo } from './types'
import type { RaggruppaCriterio } from './types'
import { applyColumnFilters, buildGroupedList, getColumnValue, uniqueColumnValues, type GroupedRow } from './utils'

type Props = {
  prodotti: Prodotto[]
  categories: Category[]
  selectedId: string | null
  selectionMode: boolean
  selectedIds: Set<string>
  colonneVisibili: Record<ColonnaId, boolean>
  criterioRaggruppamento: RaggruppaCriterio
  filtriColonna: Partial<Record<ColonnaId, ColumnFilter>>
  collapsedGroups: Set<string>
  filtraAttivo: boolean
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
  onOpenFilter: () => void
}

function FilterPopover({
  col,
  prodotti,
  categories,
  filter,
  onChange,
  onClose,
  anchorEl,
}: {
  col: ColonnaId
  prodotti: Prodotto[]
  categories: Category[]
  filter?: ColumnFilter
  onChange: (f: ColumnFilter | undefined) => void
  onClose: () => void
  anchorEl: HTMLElement | null
}) {
  const panelAnchorRef = useRef<HTMLElement | null>(null)
  panelAnchorRef.current = anchorEl
  const panelClass = 'prodotti-filter-popover prodotti-filter-popover--fixed'

  if (col === 'categoria') {
    const selectedTreeId =
      filter?.kind === 'categoryTree' ? filter.categoryId || null : null
    return (
      <FixedDropdownPanel open anchorRef={panelAnchorRef} direction="down" align="left" menuClassName={`${panelClass} prodotti-filter-popover--tree`}>
        <div onClick={e => e.stopPropagation()}>
          <CategoryTreeFilter
            categories={categories}
            products={prodotti.map(p => ({ categoryId: p.categoryId, subcategoryId: p.subcategoryId }))}
            selectedId={selectedTreeId}
            onSelect={id => {
              if (!id) onChange(undefined)
              else onChange({ kind: 'categoryTree', categoryId: id })
            }}
            title="Categoria"
            className="prodotti-filter-popover__tree"
          />
          <button type="button" className="prodotti-dialog__btn" style={{ marginTop: 6 }} onClick={onClose}>
            Chiudi
          </button>
        </div>
      </FixedDropdownPanel>
    )
  }

  if (col === 'cod') {
    const text = filter?.kind === 'text' ? filter.search : ''
    return (
      <FixedDropdownPanel open anchorRef={panelAnchorRef} direction="down" align="left" menuClassName={panelClass}>
        <div onClick={e => e.stopPropagation()}>
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
      </FixedDropdownPanel>
    )
  }

  if (col === 'produttore') {
    const mode = filter?.kind === 'produttore' ? filter.mode : 'tutti'
    return (
      <FixedDropdownPanel open anchorRef={panelAnchorRef} direction="down" align="left" menuClassName={panelClass}>
        <div onClick={e => e.stopPropagation()}>
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
      </FixedDropdownPanel>
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
    <FixedDropdownPanel open anchorRef={panelAnchorRef} direction="down" align="left" menuClassName={panelClass}>
      <div onClick={e => e.stopPropagation()}>
        <input
          className="prodotti-input"
          placeholder="Cerca…"
          value={textFilter.kind === 'values' ? textFilter.search : ''}
          onChange={e =>
            textFilter.kind === 'values' &&
            onChange({ ...textFilter, search: e.target.value, showAll: false })
          }
          autoFocus
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
    </FixedDropdownPanel>
  )
}

function CercaVeloceMenu({
  campo,
  modo,
  onCampo,
  onModo,
  onClose,
  anchorRef,
}: {
  campo: CercaVeloceCampo
  modo: CercaVeloceModo
  onCampo: (c: CercaVeloceCampo) => void
  onModo: (m: CercaVeloceModo) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}) {
  return (
    <FixedDropdownPanel
      open
      anchorRef={anchorRef}
      direction="down"
      align="left"
      menuClassName="prodotti-filter-popover prodotti-filter-popover--fixed prodotti-filter-popover--search"
    >
      <div onClick={e => e.stopPropagation()}>
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
    </FixedDropdownPanel>
  )
}

export default function ProdottiLista({
  prodotti,
  categories,
  selectedId,
  selectionMode,
  selectedIds,
  colonneVisibili,
  criterioRaggruppamento,
  filtriColonna,
  collapsedGroups,
  filtraAttivo,
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
  onOpenFilter,
}: Props) {
  const [filterCol, setFilterCol] = useState<ColonnaId | null>(null)
  const [showCercaMenu, setShowCercaMenu] = useState(false)
  const headerRef = useRef<HTMLTableSectionElement>(null)
  const cercaFieldRef = useRef<HTMLDivElement>(null)
  const filterColRefs = useRef<Partial<Record<ColonnaId, HTMLTableCellElement>>>({})

  const filtered = useMemo(
    () => applyColumnFilters(prodotti, filtriColonna, categories),
    [prodotti, filtriColonna, categories],
  )
  const itemCount = filtered.length
  const rows: GroupedRow[] = useMemo(
    () => buildGroupedList(filtered, criterioRaggruppamento, collapsedGroups),
    [filtered, criterioRaggruppamento, collapsedGroups],
  )

  const visibleCols = COLONNE_DEF.filter(c => colonneVisibili[c.id])
  const colSpan = visibleCols.length + 2
  const { hasExpanded, isExpanded, onCellDoubleClick } = useExpandableTableCells()
  const { widths: colWidths, startResize } = useTableColumnWidths('fixlab.prodotti.colWidths', COLONNE_WIDTH_DEFAULT)
  const { scrollRef, start, end, enabled, topPad, bottomPad } = useVirtualWindow(rows.length, 28)
  const useVirtual = enabled && !hasExpanded
  const visibleRows = useVirtual ? rows.slice(start, end) : rows
  const cercaLabel = CERCA_VELOCE_CAMPI.find(c => c.id === cercaCampo)?.label ?? 'Cerca codice'

  return (
    <div className="prodotti-section__lista">
      <div className="prodotti-lista-search">
        <span className="prodotti-lista-search__icon" aria-hidden="true">
          🔍
        </span>
        <div className="prodotti-lista-search__field" ref={cercaFieldRef}>
          <button
            type="button"
            className="prodotti-lista-search__tipo"
            onClick={() => setShowCercaMenu(v => !v)}
          >
            {cercaLabel} ▼
          </button>
          {showCercaMenu ? (
            <CercaVeloceMenu
              campo={cercaCampo}
              modo={cercaModo}
              onCampo={c => {
                onCercaCampo(c)
                setShowCercaMenu(false)
              }}
              onModo={onCercaModo}
              onClose={() => setShowCercaMenu(false)}
              anchorRef={cercaFieldRef}
            />
          ) : null}
        </div>
        <input
          className="prodotti-input prodotti-lista-search__input"
          placeholder={cercaLabel}
          value={cercaQuery}
          onChange={e => onCercaQuery(e.target.value)}
        />
      </div>

      <div
        className={`prodotti-grid-wrap${filtraAttivo ? ' prodotti-grid-wrap--filtra' : ''}`}
        ref={scrollRef}
      >
        <table className="prodotti-grid prodotti-grid--resizable">
          <thead ref={headerRef}>
            <tr>
              <th style={{ width: 28 }} aria-label="Selezione" />
              {visibleCols.map(col => (
                <th
                  key={col.id}
                  ref={el => {
                    if (el) filterColRefs.current[col.id] = el
                    else delete filterColRefs.current[col.id]
                  }}
                  className={filtriColonna[col.id] ? 'prodotti-grid__th--filtered' : ''}
                  style={{
                    position: 'relative',
                    width: colWidths[col.id],
                    minWidth: colWidths[col.id],
                    maxWidth: colWidths[col.id],
                  }}
                >
                  {col.label}
                  {filtraAttivo ? (
                    <span
                      className="prodotti-grid__filter"
                      title="Filtro"
                      onClick={e => {
                        e.stopPropagation()
                        onOpenFilter()
                        setFilterCol(filterCol === col.id ? null : col.id)
                      }}
                    >
                      ▼
                    </span>
                  ) : null}
                  <TableColumnResizer
                    className="prodotti-grid__col-resizer"
                    onMouseDown={clientX => startResize(col.id, clientX)}
                  />
                  {filterCol === col.id ? (
                    <FilterPopover
                      col={col.id}
                      prodotti={prodotti}
                      categories={categories}
                      filter={filtriColonna[col.id]}
                      onChange={f => onFilterChange(col.id, f)}
                      onClose={() => setFilterCol(null)}
                      anchorEl={filterColRefs.current[col.id] ?? null}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} style={{ textAlign: 'center', padding: 12 }}>
                  Nessun prodotto in elenco.
                </td>
              </tr>
            ) : (
              <>
                {useVirtual && topPad > 0 ? (
                  <tr aria-hidden="true">
                    <td colSpan={colSpan} style={{ height: topPad, padding: 0, border: 'none' }} />
                  </tr>
                ) : null}
                {visibleRows.map((row, i) => {
                  if (row.kind === 'group') {
                    const collapsed = collapsedGroups.has(row.key)
                    return (
                      <tr key={`g-${row.key}`} className="prodotti-grid__group" onClick={() => onToggleGroup(row.key)}>
                        <td colSpan={colSpan}>
                          <span className="prodotti-grid__group-toggle">{collapsed ? '[+]' : '[-]'}</span>
                          {row.label}
                        </td>
                      </tr>
                    )
                  }
                  const p = row.prodotto
                  const selected = p.id === selectedId
                  const draft = p.isDraft
                  const rowExpanded = visibleCols.some(col => isExpanded(p.id, col.id))
                  return (
                    <tr
                      key={p.id || i}
                      className={`${selected ? 'prodotti-grid__row--selected' : ''} ${draft ? 'prodotti-grid__row--draft' : ''} ${rowExpanded ? 'prodotti-grid__row--expanded' : ''}`}
                      onClick={() => onSelect(p)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectionMode ? selectedIds.has(p.id) : p.id === selectedId}
                          readOnly={!selectionMode}
                          onChange={() => {
                            if (selectionMode) onToggleSelect(p.id)
                          }}
                        />
                      </td>
                      {visibleCols.map(col => {
                        const cellExpanded = isExpanded(p.id, col.id)
                        const value = getColumnValue(p, col.id)
                        return (
                          <td
                            key={col.id}
                            className={[
                              col.id === 'prezzo' ? 'prodotti-grid__td--num' : '',
                              cellExpanded ? 'prodotti-grid__td--expanded' : '',
                            ]
                              .filter(Boolean)
                              .join(' ') || undefined}
                            style={{
                              width: colWidths[col.id],
                              minWidth: colWidths[col.id],
                              maxWidth: colWidths[col.id],
                            }}
                            title={cellExpanded ? undefined : 'Doppio clic per espandere'}
                            onDoubleClick={e => onCellDoubleClick(p.id, col.id, e)}
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
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="prodotti-lista-footer" aria-live="polite">
        {itemCount} {itemCount === 1 ? 'voce' : 'voci'}
      </div>
    </div>
  )
}
