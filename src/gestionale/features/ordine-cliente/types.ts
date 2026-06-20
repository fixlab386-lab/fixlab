import type { DocRecord } from '../../../types'
import type { ProprietaFatturaElettronica } from '../shared/proprietaFatturaElettr'
import type { ClienteDocumento, IndirizzoCompleto, RinnovoDocumento } from '../vendita-banco/types'

export interface RigaOrdineCliente {
  id: string
  cod: string
  codProdFornitore?: string
  descrizione: string
  tagliaColore: string
  qta: number
  um: string
  prezzoNetto: number
  sconto: number
  /** Espressione sconto digitata dall'utente (es. "2+1", "10%"). */
  scontoExpr?: string
  iva: number
  impegnaMagazzino: boolean
  importo: number
  productId?: string
  tipoRiga?: 'normale' | 'nota' | 'calcolata'
  campoFE?: string
}

export interface TrasportoOrdine {
  causale: string
  inizio: string
  porto: string
  incaricato: string
  colli: string
  peso: string
  aspetto: string
  codSpedizione: string
}

export interface DocumentoOrdineCliente {
  cliente: ClienteDocumento
  agente: string
  listino: string
  data: string
  numero: number
  numerazione: string
  righe: RigaOrdineCliente[]
  /** Modalità prezzi in griglia: true = prezzi ivati, false = prezzi netti (default Danea). */
  prezziIvati?: boolean
  tipoPagamento: string
  coordinateBancarie?: string
  acconto: string
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
  /** Riquadro "Informazioni dispositivo" in stampa. */
  deviceImei: string
  deviceLockCode: string
  deviceAccount: string
  deviceNotes: string
  stato: DocRecord['status']
  dataPrevistaConclusione: string
  trasporto: TrasportoOrdine
  proprietaFatturaElettr: ProprietaFatturaElettronica
  totNetto: number
  totIva: number
  totaleDocumento: number
}

export type TabOrdineClienteId =
  | 'righe'
  | 'pagamento'
  | 'trasporto'
  | 'dispositivo'
  | 'note'
  | 'indirizzi'
  | 'opzioni'

export type ConcludiOrdineTarget =
  | 'rapporto_intervento'
  | 'fattura_proforma'
  | 'ddt'
  | 'vendita_banco'
  | 'fattura_acconto'
  | 'fattura_accomp'
  | 'fattura'
