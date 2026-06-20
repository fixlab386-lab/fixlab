import type { ActiveDocumentType } from '../documenti/constants'
import type { DocumentoOrdineFornitore } from '../ordine-fornitore/types'
import type { DocumentType } from '../../../types'

/** Tipi documento fornitore apribili in MDI (escluso ordine_fornitore). */
export type DocumentoFornitoreModalType = Extract<
  ActiveDocumentType,
  'preventivo_fornitore' | 'arrivo_merce' | 'reg_fattura_fornitore'
>

export interface DocumentoFornitoreState extends DocumentoOrdineFornitore {
  documentType: DocumentoFornitoreModalType
  ordineRif: string
  linkedDocumentId?: string
  linkedDocumentType?: DocumentType
  /** Solo arrivo merce — causale di carico magazzino. */
  causaleCarico?: string
  /** Solo arrivo merce — aggiorna prezzo d'acquisto fornitore sulle righe caricate. */
  aggiornaPrezzoFornitore?: boolean
  /** Solo arrivo merce — seguirà registrazione fattura fornitore. */
  seguiraRegFattura?: boolean
}

export type DocumentoFornitoreSeed = {
  documentType: DocumentoFornitoreModalType
  ordineRif: string
  mettiQtaZero: boolean
  linkedDocumentId?: string
  linkedDocumentType?: DocumentType
  fornitore: DocumentoOrdineFornitore['fornitore']
  listino: string
  data: string
  intestatario: DocumentoOrdineFornitore['intestatario']
  destinazione: DocumentoOrdineFornitore['destinazione']
  tipoPagamento: string
  acconto: string
  campiLiberi: DocumentoOrdineFornitore['campiLiberi']
  noteFine: string
  commentoInterno: string
  speseTipo: string
  speseIva: number
  speseImporto: number
  trasporto: DocumentoOrdineFornitore['trasporto']
  rinnovo: DocumentoOrdineFornitore['rinnovo']
  codLotteria?: string
  dataOraStampa?: string
  righe: DocumentoOrdineFornitore['righe']
  causaleCarico?: string
  aggiornaPrezzoFornitore?: boolean
  seguiraRegFattura?: boolean
}

export type TabDocumentoFornitoreId = 'righe' | 'pagamento' | 'note' | 'indirizzi' | 'opzioni'
