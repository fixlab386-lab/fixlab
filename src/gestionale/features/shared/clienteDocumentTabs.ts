/**
 * Tab documenti cliente / ordine cliente — allineamento Danea Easyfatt.
 * Usare queste definizioni per evitare tab mancanti tra modali diversi.
 */

export type ClienteDocumentTabId =
  | 'righe'
  | 'pagamento'
  | 'trasporto'
  | 'note'
  | 'indirizzi'
  | 'opzioni'

export type ClienteDocumentTabDef = { id: ClienteDocumentTabId; label: string }

/** Ordine cliente e documenti cliente — tab essenziali stile Danea. */
export const ORDINE_CLIENTE_TAB_DEFS: ClienteDocumentTabDef[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

/**
 * Documenti cliente (preventivo, DDT, fatture…).
 * Per il DDT (documento di trasporto) si usa la tab «Trasporto» al posto di
 * «Pagamento» (nessun prezzo/sconto/pagamento), in linea con Danea Easyfatt.
 */
export function documentoClienteTabDefs(includeTrasporto?: boolean): ClienteDocumentTabDef[] {
  if (includeTrasporto) {
    return [
      { id: 'righe', label: 'Righe documento' },
      { id: 'trasporto', label: 'Trasporto' },
      { id: 'note', label: 'Note' },
      { id: 'indirizzi', label: 'Indirizzi' },
      { id: 'opzioni', label: 'Opzioni' },
    ]
  }
  return [
    { id: 'righe', label: 'Righe documento' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'note', label: 'Note' },
    { id: 'indirizzi', label: 'Indirizzi' },
    { id: 'opzioni', label: 'Opzioni' },
  ]
}

/** Vendita al banco e ricevute. */
export const VENDITA_CLIENTE_TAB_DEFS: ClienteDocumentTabDef[] = [
  { id: 'righe', label: 'Righe documento' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]
