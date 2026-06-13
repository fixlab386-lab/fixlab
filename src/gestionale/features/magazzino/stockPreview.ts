import type { StockMovementType } from '../../../types'

export function computePreviewStock(
  currentStock: number,
  type: StockMovementType,
  options: { quantity: number; adjustMode: 'delta' | 'absolute' },
): number | null {
  switch (type) {
    case 'load':
      return currentStock + options.quantity
    case 'unload':
      return currentStock - options.quantity
    case 'adjust':
      if (options.adjustMode === 'absolute') return options.quantity
      return currentStock + options.quantity
    case 'committed':
    case 'incoming':
      return null
    default:
      return currentStock
  }
}

export function movementQuantityDisplay(m: {
  type: StockMovementType
  loaded?: number
  unloaded?: number
  committed?: number
  incoming?: number
  adjustTo?: number
  adjustDelta?: number
}): string {
  if (m.type === 'load') return `+${m.loaded ?? 0}`
  if (m.type === 'unload') return `−${m.unloaded ?? 0}`
  if (m.type === 'committed') return `${m.committed ?? 0}`
  if (m.type === 'incoming') return `${m.incoming ?? 0}`
  if (m.adjustTo != null) return `→ ${m.adjustTo}`
  if (m.adjustDelta != null) return `${m.adjustDelta >= 0 ? '+' : ''}${m.adjustDelta}`
  return '—'
}
