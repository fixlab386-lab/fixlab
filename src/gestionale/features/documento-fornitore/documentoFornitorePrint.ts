import { buildConfermaOrdineHtml, CONFERMA_ORDINE_PRINT_CSS } from '../../../lib/confermaOrdineTemplate'
import { buildPrintFilename } from '../../../lib/printDocument'
import {
  buildDocRecordPrintViewModel,
  getDocumentTypePrintOptions,
  studioDataToConfermaStudio,
} from '../../../lib/printTemplates'
import { applyModelloToPrintOptions, type StampaModello } from '../../../lib/stampaModelli'
import type { DocRecord } from '../../../types'
import type { AnteprimaStampaMeta } from '../vendita-banco/dialogs/AnteprimaStampaDialog'
import { formatDataIt } from '../vendita-banco/utils'
import { ACTIVE_DOCUMENT_LABELS } from '../documenti/constants'
import type { DocumentoFornitoreState } from './types'
import type { RigaOrdineFornitore } from '../ordine-fornitore/types'
import { buildDocumentoFornitorePayload } from './utils'
import { documentTotalsFromRigheOrdine } from '../ordine-fornitore/utils'

export { CONFERMA_ORDINE_PRINT_CSS }

export function buildDocumentoFornitorePrintContent(
  doc: DocumentoFornitoreState,
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
  const payload = buildDocumentoFornitorePayload(doc, studioId, activeRighe, totals, doc.stato)
  const docRecord: DocRecord = {
    id: '',
    ...payload,
    createdAt: new Date(),
  }
  const baseOptions = getDocumentTypePrintOptions(studioData ?? undefined, doc.documentType)
  const printOptions = applyModelloToPrintOptions(baseOptions, modello, doc.documentType)
  const studio = studioDataToConfermaStudio(studioData ?? undefined)
  const model = buildDocRecordPrintViewModel(docRecord, studio, printOptions)
  const innerHtml = buildConfermaOrdineHtml(model)
  const title = `${printOptions.titoloStampa || ACTIVE_DOCUMENT_LABELS[doc.documentType]} ${docRecord.fullNumber}`
  const filename = buildPrintFilename(doc.documentType, doc.documentType, docRecord.fullNumber)
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
