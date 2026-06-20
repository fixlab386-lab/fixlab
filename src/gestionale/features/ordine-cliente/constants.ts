import type { DocRecord } from '../../../types'
import type { TabOrdineClienteId } from './types'

export const ORDINE_CLIENTE_TABS: { id: TabOrdineClienteId; label: string }[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'dispositivo', label: 'Dispositivo' },
  { id: 'note', label: 'Note generali' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

export const STATI_ORDINE: { value: DocRecord['status']; label: string }[] = [
  { value: 'draft', label: 'Da confermare' },
  { value: 'confirmed', label: 'Confermato' },
  { value: 'completed', label: 'Concluso' },
  { value: 'cancelled', label: 'Annullato' },
]
