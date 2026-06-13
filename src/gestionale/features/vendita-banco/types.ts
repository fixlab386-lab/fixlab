/** Tipi per la finestra Vendita al banco (gestionale enterprise Enterprise). */

export interface RigaDocumento {
  id: string
  cod: string
  descrizione: string
  tagliaColore: string
  qta: number
  um: string
  prezzoIvato: number
  sconto: number
  iva: number
  scaricaMagazzino: boolean
  importoIvato: number
  productId?: string
  /** Codice campo fattura elettronica (Natura/ESigibilità) */
  campoFE?: string
  /** Riga nota o calcolata */
  tipoRiga?: 'normale' | 'nota' | 'calcolata'
}

export interface IndirizzoCompleto {
  indirizzo: string
  cap: string
  citta: string
  prov: string
  nazione: string
}

export interface ClienteDocumento {
  id: string
  nome: string
  codFiscale: string
  partitaIva: string
}

export interface RinnovoDocumento {
  attivo: boolean
  mesi: number
}

export interface DocumentoVenditaBanco {
  cliente: ClienteDocumento
  agente: string
  listino: string
  data: string
  numero: number
  numerazione: string
  seguiraDocVendita: boolean
  righe: RigaDocumento[]
  tipoPagamento: string
  campiLiberi: [string, string, string, string]
  noteFine: string
  intestatario: IndirizzoCompleto
  destinazione: IndirizzoCompleto
  dataOraStampa: string
  codLotteria: string
  rinnovo: RinnovoDocumento
  speseTipo: string
  speseIva: number
  speseImporto: number
  commentoInterno: string
  totNetto: number
  totIva: number
  totaleDocumento: number
  protetto: boolean
}

/** Scadenza per scadenzario pagamenti (predisposto dal tipo pagamento). */
export interface ScadenzaPagamento {
  data: string
  importo: number
  descrizione: string
}

export type TabVenditaBancoId = 'righe' | 'pagamento' | 'note' | 'indirizzi' | 'opzioni'

export type ColonnaRigheId =
  | 'cod'
  | 'descrizione'
  | 'tagliaColore'
  | 'qta'
  | 'um'
  | 'prezzoIvato'
  | 'sconto'
  | 'iva'
  | 'scaricaMag'
  | 'importoIvato'

export const COLONNE_RIGHE_DEFAULT: Record<ColonnaRigheId, boolean> = {
  cod: true,
  descrizione: true,
  tagliaColore: false,
  qta: true,
  um: true,
  prezzoIvato: true,
  sconto: true,
  iva: true,
  scaricaMag: true,
  importoIvato: true,
}

export type SortableColonnaRigheId = 'prezzoIvato' | 'sconto' | 'iva' | 'scaricaMag'
