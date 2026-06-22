import type { DocumentType } from '../../../types'
import {
  ORDINE_CLIENTE_TAB_DEFS,
  VENDITA_CLIENTE_TAB_DEFS,
  type ClienteDocumentTabId,
} from '../shared/clienteDocumentTabs'

/** Tipi creabili da UI (vendite + acquisti). */
export const ACTIVE_DOCUMENT_TYPES = [
  'preventivo',
  'ordine_cliente',
  'ddt',
  'rapporto_intervento',
  'fattura',
  'fattura_proforma',
  'fattura_acconto',
  'fattura_accomp',
  'vendita_banco',
  'preventivo_fornitore',
  'ordine_fornitore',
  'arrivo_merce',
  'reg_fattura_fornitore',
] as const

export type ActiveDocumentType = (typeof ACTIVE_DOCUMENT_TYPES)[number]

export const SALES_DOCUMENT_TYPES: ActiveDocumentType[] = [
  'preventivo',
  'ordine_cliente',
  'ddt',
  'rapporto_intervento',
  'fattura',
  'fattura_proforma',
  'fattura_acconto',
  'fattura_accomp',
  'vendita_banco',
]

export const PURCHASE_DOCUMENT_TYPES: ActiveDocumentType[] = [
  'preventivo_fornitore',
  'ordine_fornitore',
  'arrivo_merce',
  'reg_fattura_fornitore',
]

export const ACTIVE_DOCUMENT_LABELS: Record<ActiveDocumentType, string> = {
  preventivo: 'Preventivo',
  ordine_cliente: 'Ordine cliente',
  ddt: 'DDT',
  rapporto_intervento: "Rapporto d'intervento",
  fattura: 'Fattura',
  fattura_proforma: 'Fattura pro-forma',
  fattura_acconto: "Fattura d'acconto",
  fattura_accomp: 'Fattura accomp.',
  vendita_banco: 'Vendita al banco',
  preventivo_fornitore: 'Preventivo fornitore',
  ordine_fornitore: 'Ordine fornitore',
  arrivo_merce: 'Arrivo merce',
  reg_fattura_fornitore: 'Reg. fattura fornitore',
}

/** Titolo elenco (plurale) come Danea Easyfatt. */
export const ACTIVE_DOCUMENT_LIST_LABELS: Record<ActiveDocumentType, string> = {
  preventivo: 'Preventivi',
  ordine_cliente: 'Ordini cliente',
  ddt: 'Documenti di trasporto',
  rapporto_intervento: "Rapporti d'intervento",
  fattura: 'Fatture',
  fattura_proforma: 'Fatture pro-forma',
  fattura_acconto: "Fatture d'acconto",
  fattura_accomp: 'Fatture accomp.',
  vendita_banco: 'Vendite al banco',
  preventivo_fornitore: 'Preventivi fornitore',
  ordine_fornitore: 'Ordini fornitore',
  arrivo_merce: 'Arrivi merce',
  reg_fattura_fornitore: 'Reg. fatture fornitore',
}

export const DOCUMENT_HUB_GROUPS: { title: string; types: ActiveDocumentType[] }[] = [
  {
    title: 'Documenti clienti',
    types: [
      'preventivo',
      'ordine_cliente',
      'rapporto_intervento',
      'ddt',
      'fattura',
      'fattura_proforma',
      'fattura_acconto',
      'fattura_accomp',
      'vendita_banco',
    ],
  },
  {
    title: 'Documenti fornitori',
    types: ['preventivo_fornitore', 'ordine_fornitore', 'arrivo_merce', 'reg_fattura_fornitore'],
  },
]

export function isActiveDocumentType(type: string): type is ActiveDocumentType {
  return (ACTIVE_DOCUMENT_TYPES as readonly string[]).includes(type)
}

/** Etichette per tutti i tipi (inclusi legacy in archivio). */
export const ALL_DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  preventivo: 'Preventivo',
  conferma_ordine: "Conferma d'ordine",
  ordine_cliente: 'Ordine cliente',
  rapporto_intervento: "Rapporto d'intervento",
  ddt: 'DDT',
  vendita_banco: 'Vendita al banco',
  fattura_proforma: 'Fattura pro-forma',
  fattura_acconto: "Fattura d'acconto",
  fattura_accomp: 'Fattura accomp.',
  fattura: 'Fattura (non disponibile)',
  preventivo_fornitore: 'Preventivo fornitore',
  ordine_fornitore: 'Ordine fornitore',
  arrivo_merce: 'Arrivo merce',
  reg_fattura_fornitore: 'Reg. fattura fornitore',
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  confirmed: 'Confermato',
  sent: 'Inviato',
  cancelled: 'Annullato',
  completed: 'Completato',
}

/** Tipi che scaricano magazzino alla conferma. */
export const STOCK_DEDUCT_DOCUMENT_TYPES: DocumentType[] = ['vendita_banco', 'ddt', 'rapporto_intervento']

/** Tipi che incrementano giacenza (resi / arrivi). */
export const STOCK_ADD_DOCUMENT_TYPES: DocumentType[] = ['arrivo_merce']

/** Tipi che impegnano magazzino. */
export const STOCK_RESERVE_DOCUMENT_TYPES: DocumentType[] = ['ordine_cliente']

export const DOCUMENT_PAYMENT_METHODS = [
  'Assegno',
  'Assegno circolare',
  'Bancomat',
  'Bonifico 30 gg F.M.',
  'Bonifico 60 gg F.M.',
  'Bonifico vista fattura',
  'Carta di credito',
  'Contanti',
  'Contrassegno',
  'Incasso corrispettivi',
  'Pagato come da relativi documenti sopra indicati',
  'PayPal',
  'Ri.Ba. 30 gg F.M.',
  'Ri.Ba. 30-60 gg F.M.',
  'Ri.Ba. 30-60-90 gg F.M.',
] as const

export const DOCUMENT_PAYMENT_METHODS_SHORT = [
  'Contanti',
  'Bancomat / POS',
  'Carta di credito',
  'Bonifico',
  'Assegno',
  'Ri.Ba.',
  'Altro',
] as const

export type DocumentFormTabId = ClienteDocumentTabId

export const DOCUMENT_FORM_TABS: { id: DocumentFormTabId; label: string }[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

export const VENDITA_BANCO_FORM_TABS: { id: DocumentFormTabId; label: string }[] = VENDITA_CLIENTE_TAB_DEFS

/** Tab ordine cliente nel form pagina documenti (allineate al modal dedicato). */
export const ORDINE_CLIENTE_FORM_TABS: { id: DocumentFormTabId; label: string }[] = ORDINE_CLIENTE_TAB_DEFS

/** Genera doc. — solo modalità dettagliata (stesso soggetto). */
export const DOCUMENT_TRANSFORM_MAP: Partial<
  Record<ActiveDocumentType, { label: string; type: ActiveDocumentType }[]>
> = {
  preventivo: [
    { label: 'Ordine cliente', type: 'ordine_cliente' },
    { label: 'DDT', type: 'ddt' },
  ],
  ordine_cliente: [{ label: 'DDT', type: 'ddt' }],
  rapporto_intervento: [{ label: 'DDT', type: 'ddt' }],
  preventivo_fornitore: [{ label: 'Ordine fornitore', type: 'ordine_fornitore' }],
  ordine_fornitore: [{ label: 'Arrivo merce', type: 'arrivo_merce' }],
  arrivo_merce: [{ label: 'Reg. fattura fornitore', type: 'reg_fattura_fornitore' }],
}

/** Documenti includibili nel documento destinazione (stesso soggetto). */
export const INCLUDABLE_FROM: Partial<Record<ActiveDocumentType, DocumentType[]>> = {
  ordine_cliente: ['preventivo'],
  rapporto_intervento: ['preventivo', 'ordine_cliente'],
  ddt: ['preventivo', 'ordine_cliente', 'rapporto_intervento'],
  ordine_fornitore: ['preventivo_fornitore'],
  arrivo_merce: ['ordine_fornitore', 'preventivo_fornitore'],
  reg_fattura_fornitore: ['arrivo_merce', 'ordine_fornitore', 'preventivo_fornitore'],
  vendita_banco: ['preventivo', 'ordine_cliente', 'ddt'],
  fattura_proforma: ['preventivo', 'ordine_cliente'],
  fattura_acconto: ['preventivo', 'ordine_cliente'],
  fattura_accomp: ['preventivo', 'ordine_cliente', 'rapporto_intervento', 'ddt'],
}

export function isPurchaseDocumentType(type: string): boolean {
  return PURCHASE_DOCUMENT_TYPES.includes(type as ActiveDocumentType)
}

export function isSalesDocumentType(type: string): boolean {
  return SALES_DOCUMENT_TYPES.includes(type as ActiveDocumentType)
}

export function subjectLabelForType(type: string): string {
  return isPurchaseDocumentType(type) ? 'Fornitore' : 'Cliente'
}

export const DOCUMENTI_UTILITA_ITEMS = [
  'Esporta con Excel/OpenOffice/LibreOffice',
  'Importa con Excel/OpenOffice o Easyfatt-Xml (.DefXml)',
  'Ripara collegamenti e stati (import Danea)',
] as const
