import { ACTIVE_DOCUMENT_LABELS } from '../documenti/constants'
import { documentoClienteTabDefs } from '../shared/clienteDocumentTabs'
import type { DocumentoClienteModalType, TabDocumentoClienteId } from './types'
import type { ConcludiOrdineTarget } from '../ordine-cliente/types'

export const DOCUMENTO_CLIENTE_MODAL_TYPES: DocumentoClienteModalType[] = [
  'preventivo',
  'rapporto_intervento',
  'ddt',
  'fattura',
  'fattura_proforma',
  'fattura_acconto',
  'fattura_accomp',
]

export const DOCUMENTO_CLIENTE_TITLES: Record<DocumentoClienteModalType, string> = {
  preventivo: ACTIVE_DOCUMENT_LABELS.preventivo,
  rapporto_intervento: ACTIVE_DOCUMENT_LABELS.rapporto_intervento,
  ddt: 'Doc. di trasporto',
  fattura: ACTIVE_DOCUMENT_LABELS.fattura,
  fattura_proforma: ACTIVE_DOCUMENT_LABELS.fattura_proforma,
  fattura_acconto: ACTIVE_DOCUMENT_LABELS.fattura_acconto,
  fattura_accomp: ACTIVE_DOCUMENT_LABELS.fattura_accomp,
}

export function isActiveDocumentoClienteModalType(
  type: string,
): type is DocumentoClienteModalType {
  return (DOCUMENTO_CLIENTE_MODAL_TYPES as string[]).includes(type)
}

export type ConcludiDocumentoClienteModalType = Exclude<DocumentoClienteModalType, 'preventivo'>

export function isDocumentoClienteModalType(
  target: ConcludiOrdineTarget,
): target is ConcludiDocumentoClienteModalType {
  return target !== 'vendita_banco'
}

export function showSeguiraDocVendita(type: DocumentoClienteModalType): boolean {
  return type === 'rapporto_intervento' || type === 'ddt' || type === 'fattura_accomp'
}

export function showImpegnaColumn(type: DocumentoClienteModalType): boolean {
  return type === 'rapporto_intervento' || type === 'ddt'
}

export function impegnaColumnLabel(type: DocumentoClienteModalType): string {
  return type === 'rapporto_intervento' ? 'Scarica mag.' : 'Impegna'
}

export function tabsForDocumentoCliente(type: DocumentoClienteModalType): { id: TabDocumentoClienteId; label: string }[] {
  return documentoClienteTabDefs(type === 'ddt') as { id: TabDocumentoClienteId; label: string }[]
}

export const CONCLUDI_ORDINE_LABELS: Record<ConcludiOrdineTarget, string> = {
  rapporto_intervento: "Rapporto d'intervento",
  fattura_proforma: 'Fattura pro-forma',
  ddt: 'Doc. di trasporto',
  vendita_banco: 'Vendita al banco',
  fattura_acconto: "Fattura d'acconto",
  fattura_accomp: 'Fattura accomp.',
  fattura: 'Fattura',
}

export const CONCLUDI_ORDINE_ITEMS: { id: ConcludiOrdineTarget; enabled: boolean }[] = [
  { id: 'rapporto_intervento', enabled: true },
  { id: 'fattura_proforma', enabled: true },
  { id: 'vendita_banco', enabled: true },
  { id: 'fattura_acconto', enabled: true },
  { id: 'fattura_accomp', enabled: true },
  { id: 'fattura', enabled: true },
]

/** Target che aprono un documento dopo conferma. */
export const CONCLUDI_DOCUMENT_TARGETS: ConcludiOrdineTarget[] = [
  'rapporto_intervento',
  'fattura_proforma',
  'fattura',
  'vendita_banco',
  'fattura_acconto',
  'fattura_accomp',
]
