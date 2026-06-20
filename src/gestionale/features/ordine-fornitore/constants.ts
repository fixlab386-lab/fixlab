import type { DocRecord } from '../../../types'
import type { TabOrdineFornitoreId, ConcludiOrdineFornitoreTarget } from './types'

export const ORDINE_FORNITORE_TABS: { id: TabOrdineFornitoreId; label: string }[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

export const STATI_ORDINE_FORNITORE: { value: DocRecord['status']; label: string }[] = [
  { value: 'draft', label: 'Da confermare' },
  { value: 'confirmed', label: 'Confermato' },
  { value: 'completed', label: 'Concluso' },
  { value: 'cancelled', label: 'Annullato' },
]

export const CONCLUDI_ORDINE_FORNITORE_LABELS: Record<ConcludiOrdineFornitoreTarget, string> = {
  arrivo_merce: 'Arrivo merce',
}

export const CONCLUDI_ORDINE_FORNITORE_ITEMS: {
  id: ConcludiOrdineFornitoreTarget
  enabled: boolean
}[] = [{ id: 'arrivo_merce', enabled: true }]
