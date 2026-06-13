import type { Fornitore, ColonnaId } from '../gestionale/features/fornitori/types'
import type { Cliente } from '../gestionale/features/clienti/types'
import { buildClientiPrintHtml, type ClientiPrintContext } from './clientiPrint'

export type FornitoriPrintContext = {
  archiveName: string
  studioName?: string
  fornitore?: Fornitore | null
  fornitori: Fornitore[]
  visibleCols?: ColonnaId[]
}

export function buildFornitoriPrintHtml(modello: string, ctx: FornitoriPrintContext) {
  const mapped: ClientiPrintContext = {
    archiveName: ctx.archiveName,
    studioName: ctx.studioName,
    cliente: ctx.fornitore as unknown as Cliente,
    clienti: ctx.fornitori as unknown as Cliente[],
    visibleCols: ctx.visibleCols,
  }
  const model =
    modello === 'Scheda fornitore' ? 'Scheda cliente/fornitore' : modello === 'Elenco fornitori' ? 'Elenco' : modello
  return buildClientiPrintHtml(model, mapped)
}
