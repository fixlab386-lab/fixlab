import type { StockMovementType } from '../../../types'

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  load: 'Carico',
  unload: 'Scarico',
  adjust: 'Rettifica',
  committed: 'Impegnato',
  incoming: 'In arrivo',
}

export const MOVEMENT_TYPES: StockMovementType[] = [
  'load',
  'unload',
  'adjust',
  'committed',
  'incoming',
]

export const CAUSE_PRESETS = [
  'Carico da fornitore',
  'Rettifica inventario',
  'Scarto',
  'Reso cliente',
  'Inventario fisico',
]
