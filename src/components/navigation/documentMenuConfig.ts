/** Menu a tendina «Documenti» nella toolbar — stile gestionale Nuovo. */
import type { ActiveDocumentType } from '../../gestionale/features/documenti/constants'

export type DocumentMenuItem = {
  id: ActiveDocumentType
  label: string
  icon: string
}

export const DOCUMENT_MENU_SECTIONS: DocumentMenuItem[][] = [
  [
    { id: 'preventivo', label: 'Preventivi', icon: '📋' },
    { id: 'ordine_cliente', label: 'Ordini cliente', icon: '📦' },
    { id: 'rapporto_intervento', label: "Rapporti d'intervento", icon: '🔧' },
    { id: 'ddt', label: 'Doc. di trasporto', icon: '🚚' },
    { id: 'vendita_banco', label: 'Vendite al banco', icon: '€' },
  ],
  [
    { id: 'preventivo_fornitore', label: 'Preventivi fornitore', icon: '📋' },
    { id: 'ordine_fornitore', label: 'Ordini fornitore', icon: '🏭' },
    { id: 'arrivo_merce', label: 'Arrivi merce', icon: '📥' },
  ],
]
