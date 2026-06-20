import { buildConfermaOrdineHtml } from '../../../lib/confermaOrdineTemplate'
import { buildPrintFilename } from '../../../lib/printDocument'
import {
  buildDocRecordPrintViewModel,
  getDocumentTypePrintOptions,
  PRINT_LAYOUT_OPTIONS,
  studioDataToConfermaStudio,
} from '../../../lib/printTemplates'
import { applyModelloToPrintOptions, type StampaModello } from '../../../lib/stampaModelli'
import type { DocRecord } from '../../../types'
import type { AnteprimaStampaMeta } from '../vendita-banco/dialogs/AnteprimaStampaDialog'
import { formatDataIt } from '../vendita-banco/utils'
import type { DocumentoOrdineFornitore, RigaOrdineFornitore } from './types'
import { buildOrdineFornitorePayload, documentTotalsFromRigheOrdine } from './utils'

export function buildOrdineFornitorePrintContent(
  doc: DocumentoOrdineFornitore,
  studioId: string,
  activeRighe: RigaOrdineFornitore[],
  studioData: Record<string, unknown> | null | undefined,
  modello?: StampaModello,
): {
  innerHtml: string
  title: string
  filename: string
  meta: AnteprimaStampaMeta
} {
  const totals = documentTotalsFromRigheOrdine(doc.righe, doc.speseImporto, doc.speseIva)
  const payload = buildOrdineFornitorePayload(doc, studioId, activeRighe, totals, doc.stato)
  const docRecord: DocRecord = {
    id: '',
    ...payload,
    createdAt: new Date(),
  }
  const baseOptions = getDocumentTypePrintOptions(studioData ?? undefined, 'ordine_fornitore')
  const printOptions = applyModelloToPrintOptions(baseOptions, modello, 'ordine_fornitore')
  const studio = studioDataToConfermaStudio(studioData ?? undefined)
  const model = buildDocRecordPrintViewModel(docRecord, studio, printOptions)
  const innerHtml = buildConfermaOrdineHtml(model)
  const title = `${printOptions.titoloStampa || 'Ordine fornitore'} ${docRecord.fullNumber}`
  const filename = buildPrintFilename('ordine_fornitore', 'Ordine_fornitore', docRecord.fullNumber)
  const meta: AnteprimaStampaMeta = {
    title,
    filename,
    fullNumber: docRecord.fullNumber,
    docDate: formatDataIt(doc.data),
    clienteNome: doc.fornitore.nome,
    totalDocument: totals.totaleDocumento,
    studioName: studio?.name || 'FIXLab',
  }
  return { innerHtml, title, filename, meta }
}

export function resolveOrdineFornitoreModelloLabel(studioData: Record<string, unknown> | null | undefined): string {
  const opts = getDocumentTypePrintOptions(studioData ?? undefined, 'ordine_fornitore')
  const layout = PRINT_LAYOUT_OPTIONS.find(l => l.id === opts.layoutTemplate)
  const layoutLabel = layout?.label ?? opts.layoutTemplate
  return opts.titoloStampa ? `${opts.titoloStampa} (${layoutLabel})` : layoutLabel
}
