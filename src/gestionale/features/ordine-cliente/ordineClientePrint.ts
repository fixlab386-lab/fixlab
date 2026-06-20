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
import type { DocumentoOrdineCliente, RigaOrdineCliente } from './types'
import { buildOrdinePayload, documentTotalsFromRigheOrdine } from './utils'

export function buildOrdineClientePrintContent(
  doc: DocumentoOrdineCliente,
  studioId: string,
  activeRighe: RigaOrdineCliente[],
  studioData: Record<string, unknown> | null | undefined,
  modello?: StampaModello,
): {
  innerHtml: string
  title: string
  filename: string
  meta: AnteprimaStampaMeta
} {
  const totals = documentTotalsFromRigheOrdine(doc.righe, doc.speseImporto, doc.speseIva)
  const payload = buildOrdinePayload(doc, studioId, activeRighe, totals, doc.stato)
  const docRecord: DocRecord = {
    id: '',
    ...payload,
    createdAt: new Date(),
  }
  const baseOptions = getDocumentTypePrintOptions(studioData ?? undefined, 'ordine_cliente')
  const printOptions = applyModelloToPrintOptions(baseOptions, modello, 'ordine_cliente')
  const studio = studioDataToConfermaStudio(studioData ?? undefined)
  const model = buildDocRecordPrintViewModel(docRecord, studio, printOptions)
  const innerHtml = buildConfermaOrdineHtml(model)
  const title = `${printOptions.titoloStampa || 'Ordine cliente'} ${docRecord.fullNumber}`
  const filename = buildPrintFilename('ordine_cliente', 'Ordine_cliente', docRecord.fullNumber)
  const meta: AnteprimaStampaMeta = {
    title,
    filename,
    fullNumber: docRecord.fullNumber,
    docDate: formatDataIt(doc.data),
    clienteNome: doc.cliente.nome,
    totalDocument: totals.totaleDocumento,
    studioName: studio?.name || 'FIXLab',
  }
  return { innerHtml, title, filename, meta }
}

export function resolveOrdineClienteModelloLabel(studioData: Record<string, unknown> | null | undefined): string {
  const opts = getDocumentTypePrintOptions(studioData ?? undefined, 'ordine_cliente')
  const layout = PRINT_LAYOUT_OPTIONS.find(l => l.id === opts.layoutTemplate)
  const layoutLabel = layout?.label ?? opts.layoutTemplate
  return opts.titoloStampa ? `${opts.titoloStampa} (${layoutLabel})` : layoutLabel
}
