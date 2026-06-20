import { ACTIVE_DOCUMENT_LABELS } from '../documenti/constants'
import type { DocumentoFornitoreModalType, TabDocumentoFornitoreId } from './types'

export const DOCUMENTO_FORNITORE_MODAL_TYPES: DocumentoFornitoreModalType[] = [
  'preventivo_fornitore',
  'arrivo_merce',
  'reg_fattura_fornitore',
]

export const DOCUMENTO_FORNITORE_TITLES: Record<DocumentoFornitoreModalType, string> = {
  preventivo_fornitore: ACTIVE_DOCUMENT_LABELS.preventivo_fornitore,
  arrivo_merce: ACTIVE_DOCUMENT_LABELS.arrivo_merce,
  reg_fattura_fornitore: ACTIVE_DOCUMENT_LABELS.reg_fattura_fornitore,
}

export function isActiveDocumentoFornitoreModalType(
  type: string,
): type is DocumentoFornitoreModalType {
  return (DOCUMENTO_FORNITORE_MODAL_TYPES as string[]).includes(type)
}

export function showCaricaMagazzinoColumn(type: DocumentoFornitoreModalType): boolean {
  return type === 'arrivo_merce'
}

export function caricaMagazzinoColumnLabel(_type: DocumentoFornitoreModalType): string {
  return 'Carica mag.'
}

export function tabsForDocumentoFornitore(
  _type: DocumentoFornitoreModalType,
): { id: TabDocumentoFornitoreId; label: string }[] {
  return [
    { id: 'righe', label: 'Righe documento' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'note', label: 'Note' },
    { id: 'indirizzi', label: 'Indirizzi' },
    { id: 'opzioni', label: 'Opzioni' },
  ]
}
