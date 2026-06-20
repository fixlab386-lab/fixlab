import type { ActiveDocumentType } from '../documenti/constants'
import type { DocumentoOrdineCliente } from '../ordine-cliente/types'

/** Tipi documento cliente apribili in MDI (da menu o da "Concludi ordine"). */
export type DocumentoClienteModalType = Extract<
  ActiveDocumentType,
  | 'preventivo'
  | 'rapporto_intervento'
  | 'ddt'
  | 'fattura'
  | 'fattura_proforma'
  | 'fattura_acconto'
  | 'fattura_accomp'
>

export interface DocumentoClienteState extends DocumentoOrdineCliente {
  documentType: DocumentoClienteModalType
  seguiraDocVendita: boolean
  ordineRif: string
}

export type DocumentoClienteSeed = {
  documentType: DocumentoClienteModalType
  ordineRif: string
  mettiQtaZero: boolean
  cliente: DocumentoOrdineCliente['cliente']
  agente?: string
  listino: string
  data: string
  intestatario: DocumentoOrdineCliente['intestatario']
  destinazione: DocumentoOrdineCliente['destinazione']
  tipoPagamento: string
  acconto: string
  campiLiberi: DocumentoOrdineCliente['campiLiberi']
  noteFine: string
  commentoInterno: string
  deviceImei?: string
  deviceLockCode?: string
  deviceAccount?: string
  deviceNotes?: string
  speseTipo: string
  speseIva: number
  speseImporto: number
  trasporto: DocumentoOrdineCliente['trasporto']
  rinnovo: DocumentoOrdineCliente['rinnovo']
  codLotteria?: string
  dataOraStampa?: string
  proprietaFatturaElettr?: DocumentoOrdineCliente['proprietaFatturaElettr']
  righe: DocumentoOrdineCliente['righe']
  seguiraDocVendita: boolean
}

export type TabDocumentoClienteId = 'righe' | 'pagamento' | 'trasporto' | 'note' | 'indirizzi' | 'opzioni'
