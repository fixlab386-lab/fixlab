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
  /** Espressione sconto digitata (es. "2+1", "10%"). */
  scontoExpr?: string
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
  prezziIvati?: boolean
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

export type TabVenditaBancoId = 'righe' | 'pagamento' | 'trasporto' | 'note' | 'indirizzi' | 'opzioni'

/** Dati precompilati quando si apre vendita al banco da ordine cliente. */
export type VenditaBancoSeed = {
  cliente: ClienteDocumento
  listino: string
  data?: string
  intestatario: IndirizzoCompleto
  destinazione: IndirizzoCompleto
  tipoPagamento?: string
  commentoInterno?: string
  righe: RigaDocumento[]
}

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
  um: false,
  prezzoIvato: true,
  sconto: true,
  iva: true,
  scaricaMag: true,
  importoIvato: true,
}

/** Ordine colonne griglia righe (allineato a TabRigheDocumento). */
export const COLONNE_RIGHE_ORDER: ColonnaRigheId[] = [
  'cod',
  'descrizione',
  'tagliaColore',
  'qta',
  'um',
  'prezzoIvato',
  'sconto',
  'iva',
  'scaricaMag',
  'importoIvato',
]

export const COLONNE_RIGHE_WIDTH_DEFAULT: Record<ColonnaRigheId, number> = {
  cod: 72,
  descrizione: 220,
  tagliaColore: 88,
  qta: 52,
  um: 44,
  prezzoIvato: 92,
  sconto: 56,
  iva: 48,
  scaricaMag: 80,
  importoIvato: 100,
}

export type SortableColonnaRigheId = 'prezzoIvato' | 'sconto' | 'iva' | 'scaricaMag'
