import type { SchedaTabId } from '../prodotti/types'

export const MOVIMENTI_SCHEDA_TABS: {
  id: SchedaTabId
  label: string
  requiresMagazzino?: boolean
}[] = [
  { id: 'caratteristiche', label: 'Prodotto' },
  { id: 'dimensioni', label: 'Dimensioni e peso' },
  { id: 'magazzino', label: 'Magazzino', requiresMagazzino: true },
]
