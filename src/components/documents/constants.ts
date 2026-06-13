import type { DocumentType } from '../../types'

/** Tipi visibili in UI per nuovi documenti */
export const ACTIVE_DOCUMENT_TYPES = ['preventivo', 'vendita_banco', 'ddt'] as const
export type ActiveDocumentType = (typeof ACTIVE_DOCUMENT_TYPES)[number]

export const ACTIVE_DOCUMENT_LABELS: Record<ActiveDocumentType, string> = {
  preventivo: 'Preventivo',
  vendita_banco: 'Ricevuta',
  ddt: 'DDT',
}

/** Etichette per tutti i tipi (inclusi legacy in archivio) */
export const ALL_DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  preventivo: 'Preventivo',
  conferma_ordine: "Conferma d'ordine",
  ordine_cliente: 'Ordine cliente',
  rapporto_intervento: "Rapporto d'intervento",
  ddt: 'DDT',
  vendita_banco: 'Ricevuta',
  fattura: 'Fattura',
  preventivo_fornitore: 'Preventivo fornitore',
  ordine_fornitore: 'Ordine fornitore',
  arrivo_merce: 'Arrivo merce',
}

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Bozza',
  confirmed: 'Confermato',
  sent: 'Inviato',
  cancelled: 'Annullato',
  completed: 'Completato',
}

/** Tipi che scaricano magazzino alla conferma */
export const STOCK_DEDUCT_DOCUMENT_TYPES: DocumentType[] = ['vendita_banco', 'ddt']

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

/** Alias legacy per altri form documento */
export const DOCUMENT_PAYMENT_METHODS_SHORT = [
  'Contanti',
  'Bancomat / POS',
  'Carta di credito',
  'Bonifico',
  'Assegno',
  'Ri.Ba.',
  'Altro',
] as const

export type DocumentFormTabId = 'righe' | 'pagamento' | 'note' | 'indirizzi' | 'opzioni'

export const VENDITA_BANCO_FORM_TABS: { id: DocumentFormTabId; label: string }[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

export const DOCUMENT_TRANSFORM_MAP: Partial<
  Record<ActiveDocumentType, { label: string; type: ActiveDocumentType }[]>
> = {
  preventivo: [
    { label: 'Ricevuta', type: 'vendita_banco' },
    { label: 'DDT', type: 'ddt' },
  ],
}
