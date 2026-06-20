import type { DocRecord } from '../../../types'
import type { ClienteDocumento, IndirizzoCompleto, RinnovoDocumento } from '../vendita-banco/types'
import type { RigaOrdineCliente, TrasportoOrdine } from '../ordine-cliente/types'

export type RigaOrdineFornitore = RigaOrdineCliente
export type { TrasportoOrdine }

export interface DocumentoOrdineFornitore {
  fornitore: ClienteDocumento
  listino: string
  data: string
  numero: number
  numerazione: string
  righe: RigaOrdineFornitore[]
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
  stato: DocRecord['status']
  dataPrevistaConclusione: string
  trasporto: TrasportoOrdine
  totNetto: number
  totIva: number
  totaleDocumento: number
}

export type TabOrdineFornitoreId = 'righe' | 'pagamento' | 'note' | 'indirizzi' | 'opzioni'

export type ConcludiOrdineFornitoreTarget = 'arrivo_merce'
