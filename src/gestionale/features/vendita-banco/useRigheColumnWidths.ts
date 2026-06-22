import type { ColonnaRigheId } from './types'
import { useTableColumnWidths } from '../../../hooks/useTableColumnWidths'

const STORAGE_KEY = 'fixlab.vb.righeColWidths'

export function useRigheColumnWidths(defaults: Record<ColonnaRigheId, number>) {
  const { widths, startResize } = useTableColumnWidths(STORAGE_KEY, defaults)
  return { widths, startResize }
}
