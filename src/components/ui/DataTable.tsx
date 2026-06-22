import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { useExpandableTableCells } from '../../hooks/useExpandableTableCells'
import { useTableColumnWidths } from '../../hooks/useTableColumnWidths'
import TableColumnResizer from './TableColumnResizer'

export type DataTableSortDirection = 'asc' | 'desc'

export type DataTableColumn<T> = {
  id: string
  header: string
  width?: number | string
  minWidth?: number
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  /** Used for default sort comparison when render is custom */
  accessor?: (row: T) => string | number | boolean | null | undefined
  render?: (row: T, index: number) => ReactNode
}

export type DataTableProps<T> = {
  rows: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  selectedKeys?: string[]
  onSelectionChange?: (keys: string[]) => void
  selectable?: boolean
  sortColumnId?: string | null
  sortDirection?: DataTableSortDirection
  onSort?: (columnId: string) => void
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  rowHeight?: number
  virtualize?: boolean
  virtualizeThreshold?: number
  overscan?: number
  emptyMessage?: string
  className?: string
  getRowClassName?: (row: T, index: number) => string | undefined
  /** Persistenza larghezze colonne in localStorage */
  tableId?: string
  resizableColumns?: boolean
  /** Doppio clic sulla cella per espandere il testo (wrap) */
  expandableCells?: boolean
}

const DEFAULT_ROW_HEIGHT = 26
const DEFAULT_VIRTUAL_THRESHOLD = 40
const DEFAULT_OVERSCAN = 8

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'it', { sensitivity: 'base' })
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  selectedKeys = [],
  onSelectionChange,
  selectable = false,
  sortColumnId = null,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  onRowDoubleClick,
  rowHeight = DEFAULT_ROW_HEIGHT,
  virtualize = true,
  virtualizeThreshold = DEFAULT_VIRTUAL_THRESHOLD,
  overscan = DEFAULT_OVERSCAN,
  emptyMessage = 'Nessun elemento da visualizzare.',
  className = '',
  getRowClassName,
  tableId,
  resizableColumns = true,
  expandableCells = true,
}: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const { hasExpanded, isExpanded, onCellDoubleClick } = useExpandableTableCells()

  const defaultColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    for (const col of columns) {
      if (typeof col.width === 'number') widths[col.id] = col.width
      else if (col.minWidth) widths[col.id] = col.minWidth
      else widths[col.id] = 100
    }
    return widths
  }, [columns])

  const storageKey = tableId ? `fixlab.datatable.${tableId}` : ''
  const columnResize = useTableColumnWidths(
    storageKey || 'fixlab.datatable.default',
    defaultColumnWidths,
  )
  const columnWidths = resizableColumns ? columnResize.widths : defaultColumnWidths

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  const sortedRows = useMemo(() => {
    if (!sortColumnId) return rows
    const col = columns.find(c => c.id === sortColumnId)
    if (!col?.accessor) return rows
    const accessor = col.accessor
    const sorted = [...rows].sort((a, b) => compareValues(accessor(a), accessor(b)))
    return sortDirection === 'desc' ? sorted.reverse() : sorted
  }, [rows, columns, sortColumnId, sortDirection])

  const useVirtual = virtualize && sortedRows.length >= virtualizeThreshold && !hasExpanded

  const { startIndex, endIndex, offsetTop, totalHeight } = useMemo(() => {
    if (!useVirtual) {
      return {
        startIndex: 0,
        endIndex: sortedRows.length,
        offsetTop: 0,
        totalHeight: sortedRows.length * rowHeight,
      }
    }
    const visible = Math.ceil(viewportHeight / rowHeight) + overscan * 2
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const end = Math.min(sortedRows.length, start + visible)
    return {
      startIndex: start,
      endIndex: end,
      offsetTop: start * rowHeight,
      totalHeight: sortedRows.length * rowHeight,
    }
  }, [useVirtual, sortedRows.length, viewportHeight, scrollTop, rowHeight, overscan])

  const visibleRows = useMemo(
    () => sortedRows.slice(startIndex, endIndex),
    [sortedRows, startIndex, endIndex],
  )

  const allSelected = sortedRows.length > 0 && sortedRows.every(r => selectedSet.has(rowKey(r)))
  const someSelected = sortedRows.some(r => selectedSet.has(rowKey(r)))

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setScrollTop(el.scrollTop)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight))
    ro.observe(el)
    setViewportHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [sortedRows.length, useVirtual])

  const bottomSpacerHeight = useMemo(() => {
    if (!useVirtual) return 0
    return Math.max(0, totalHeight - offsetTop - visibleRows.length * rowHeight)
  }, [useVirtual, totalHeight, offsetTop, visibleRows.length, rowHeight])

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allSelected) onSelectionChange([])
    else onSelectionChange(sortedRows.map(rowKey))
  }

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return
    if (selectedSet.has(key)) onSelectionChange(selectedKeys.filter(k => k !== key))
    else onSelectionChange([...selectedKeys, key])
  }

  const thAlign = (align?: 'left' | 'center' | 'right') =>
    align === 'center' ? 'gestionale-datatable__th--center' : align === 'right' ? 'gestionale-datatable__th--right' : ''

  const tdAlign = (align?: 'left' | 'center' | 'right') =>
    align === 'center' ? 'gestionale-datatable__td--center' : align === 'right' ? 'gestionale-datatable__td--right' : ''

  const renderRow = (row: T, index: number) => {
    const key = rowKey(row)
    const selected = selectedSet.has(key)
    const extra = getRowClassName?.(row, index) ?? ''
    const rowExpanded = expandableCells && columns.some(col => isExpanded(key, col.id))

    return (
      <tr
        key={key}
        className={`gestionale-datatable__row${selected ? ' gestionale-datatable__row--selected' : ''}${rowExpanded ? ' gestionale-datatable__row--expanded' : ''}${extra ? ` ${extra}` : ''}`}
        onClick={() => onRowClick?.(row)}
        onDoubleClick={() => onRowDoubleClick?.(row)}
      >
        {selectable ? (
          <td className="gestionale-datatable__td gestionale-datatable__td--checkbox" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              className="gestionale-datatable__checkbox"
              checked={selected}
              onChange={() => toggleRow(key)}
              aria-label={`Seleziona riga ${index + 1}`}
            />
          </td>
        ) : null}
        {columns.map(col => {
          const cellExpanded = expandableCells && isExpanded(key, col.id)
          return (
            <td
              key={col.id}
              className={`gestionale-datatable__td ${tdAlign(col.align)}${cellExpanded ? ' gestionale-datatable__td--expanded' : ''}`}
              style={
                resizableColumns
                  ? { width: columnWidths[col.id], minWidth: columnWidths[col.id], maxWidth: columnWidths[col.id] }
                  : col.width != null
                    ? { width: col.width }
                    : undefined
              }
              title={expandableCells && !cellExpanded ? 'Doppio clic per espandere' : undefined}
              onDoubleClick={
                expandableCells
                  ? (e: MouseEvent) => onCellDoubleClick(key, col.id, e)
                  : undefined
              }
            >
              {col.render ? col.render(row, index) : col.accessor ? String(col.accessor(row) ?? '') : null}
            </td>
          )
        })}
      </tr>
    )
  }

  if (sortedRows.length === 0) {
    return (
      <div className={`gestionale-datatable${className ? ` ${className}` : ''}`}>
        <div className="gestionale-datatable__empty">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={`gestionale-datatable${className ? ` ${className}` : ''}`}>
      <div ref={scrollRef} className="gestionale-datatable__scroll" onScroll={handleScroll}>
        <table
          className={`gestionale-datatable__table${resizableColumns ? ' gestionale-datatable__table--resizable' : ''}`}
          role="grid"
        >
          <thead className="gestionale-datatable__thead">
            <tr>
              {selectable ? (
                <th className="gestionale-datatable__th gestionale-datatable__th--checkbox gestionale-datatable__th--center">
                  <input
                    type="checkbox"
                    className="gestionale-datatable__checkbox"
                    checked={allSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelected && !allSelected
                    }}
                    onChange={toggleAll}
                    aria-label="Seleziona tutte le righe"
                  />
                </th>
              ) : null}
              {columns.map(col => {
                const sorted = sortColumnId === col.id
                const w = columnWidths[col.id]
                return (
                  <th
                    key={col.id}
                    className={`gestionale-datatable__th ${thAlign(col.align)}${col.sortable ? ' gestionale-datatable__th--sortable' : ''}`}
                    style={
                      resizableColumns
                        ? { width: w, minWidth: w, maxWidth: w }
                        : { width: col.width, minWidth: col.minWidth }
                    }
                    onClick={col.sortable && onSort ? () => onSort(col.id) : undefined}
                    aria-sort={sorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="gestionale-datatable__th-label">{col.header}</span>
                    {col.sortable && sorted ? (
                      <span className="gestionale-datatable__sort-icon" aria-hidden="true">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    ) : null}
                    {resizableColumns ? (
                      <TableColumnResizer onMouseDown={clientX => columnResize.startResize(col.id, clientX)} />
                    ) : null}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {useVirtual ? (
              <>
                {offsetTop > 0 ? (
                  <tr className="gestionale-datatable__virtual-spacer" aria-hidden="true">
                    <td
                      colSpan={columns.length + (selectable ? 1 : 0)}
                      style={{ height: offsetTop, padding: 0, border: 'none' }}
                    />
                  </tr>
                ) : null}
                {visibleRows.map((row, i) => renderRow(row, startIndex + i))}
                {bottomSpacerHeight > 0 ? (
                  <tr className="gestionale-datatable__virtual-spacer" aria-hidden="true">
                    <td
                      colSpan={columns.length + (selectable ? 1 : 0)}
                      style={{
                        height: bottomSpacerHeight,
                        padding: 0,
                        border: 'none',
                      }}
                    />
                  </tr>
                ) : null}
              </>
            ) : (
              sortedRows.map((row, i) => renderRow(row, i))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
