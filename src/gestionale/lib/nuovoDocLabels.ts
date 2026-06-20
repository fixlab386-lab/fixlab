import type { ActiveDocumentType } from '../features/documenti/constants'

/** Mappa etichette menu «Nuovo Doc.» (scheda cliente/fornitore) → tipo documento. */
export const NUOVO_DOC_LABEL_TO_TYPE: Record<string, ActiveDocumentType> = {
  Preventivo: 'preventivo',
  'Ordine cliente': 'ordine_cliente',
  "Rapporto d'intervento": 'rapporto_intervento',
  'Preventivo fornitore': 'preventivo_fornitore',
  'Ordine fornitore': 'ordine_fornitore',
  'Arrivo merce': 'arrivo_merce',
  "Richiesta d'offerta": 'preventivo_fornitore',
  'Vendita al banco': 'vendita_banco',
  Fattura: 'fattura',
  'Fattura pro-forma': 'fattura_proforma',
  'Avviso di parcella': 'fattura_proforma',
  'Fattura accomp.': 'fattura_accomp',
  "Fattura d'acconto": 'fattura_acconto',
  Ddt: 'ddt',
  DDT: 'ddt',
}

export function resolveNuovoDocLabel(label: string): ActiveDocumentType | null {
  return NUOVO_DOC_LABEL_TO_TYPE[label] ?? null
}

export type SubjectDocumentContext = {
  clientId?: string
  supplierId?: string
}
