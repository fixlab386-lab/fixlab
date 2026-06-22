import { useCallback, useState, type MouseEvent } from 'react'

export type ExpandedCellKey = { rowKey: string; colId: string }

export function useExpandableTableCells() {
  const [expanded, setExpanded] = useState<ExpandedCellKey | null>(null)

  const isExpanded = useCallback(
    (rowKey: string, colId: string) => expanded?.rowKey === rowKey && expanded?.colId === colId,
    [expanded],
  )

  const toggleCell = useCallback((rowKey: string, colId: string) => {
    setExpanded(prev =>
      prev?.rowKey === rowKey && prev?.colId === colId ? null : { rowKey, colId },
    )
  }, [])

  const onCellDoubleClick = useCallback(
    (rowKey: string, colId: string, e: MouseEvent) => {
      e.stopPropagation()
      toggleCell(rowKey, colId)
    },
    [toggleCell],
  )

  return {
    expanded,
    hasExpanded: expanded != null,
    isExpanded,
    toggleCell,
    onCellDoubleClick,
  }
}
