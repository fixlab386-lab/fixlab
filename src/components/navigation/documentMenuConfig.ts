/** Menu a tendina «Documenti» nella toolbar — stile Danea Easyfatt. */
import type { ActiveDocumentType } from '../../gestionale/features/documenti/constants'

export type DocumentMenuActionId =
  | ActiveDocumentType
  | 'fattura'
  | 'reg_fatture_fornitore'
  | 'reg_spese_fuori_iva'
  | 'altri_tipi'

export type DocumentMenuItem = {
  id: DocumentMenuActionId
  label: string
  icon: string
}

export const DOCUMENT_MENU_SECTIONS: DocumentMenuItem[][] = [
  [
    { id: 'preventivo', label: 'Preventivi', icon: '📋' },
    { id: 'ordine_cliente', label: 'Ordini cliente', icon: '📦' },
    { id: 'rapporto_intervento', label: "Rapporti d'intervento", icon: '🔧' },
    { id: 'fattura_proforma', label: 'Fatture pro-forma', icon: '📃' },
    { id: 'ddt', label: 'Doc. di trasporto', icon: '🚚' },
    { id: 'vendita_banco', label: 'Vendite al banco', icon: '€' },
    { id: 'fattura', label: 'Fatture', icon: '🧾' },
    { id: 'fattura_acconto', label: "Fatture d'acconto", icon: '💶' },
    { id: 'fattura_accomp', label: 'Fatture accomp.', icon: '📎' },
  ],
  [
    { id: 'preventivo_fornitore', label: 'Preventivi fornitore', icon: '📋' },
    { id: 'ordine_fornitore', label: 'Ordini fornitore', icon: '🏭' },
    { id: 'arrivo_merce', label: 'Arrivi merce', icon: '📥' },
    { id: 'reg_fatture_fornitore', label: 'Reg. fatture fornitore', icon: '📑' },
    { id: 'reg_spese_fuori_iva', label: 'Reg. spese fuori campo Iva', icon: '💸' },
  ],
  [{ id: 'altri_tipi', label: 'Altri tipi di documenti…', icon: '⋯' }],
]
