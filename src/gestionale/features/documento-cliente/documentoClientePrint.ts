import {
  CONFERMA_ORDINE_PRINT_CSS,
  type ConfermaOrdineStudio,
} from '../../../lib/confermaOrdineTemplate'
import { buildPrintFilename } from '../../../lib/printDocument'
import {
  buildDocRecordPrintViewModel,
  buildDocumentPrintOutput,
  getDocumentTypePrintOptions,
  PRINT_LAYOUT_OPTIONS,
  studioDataToConfermaStudio,
} from '../../../lib/printTemplates'
import { applyModelloToPrintOptions, type StampaModello } from '../../../lib/stampaModelli'
import type { DocRecord } from '../../../types'
import type { AnteprimaStampaMeta } from '../vendita-banco/dialogs/AnteprimaStampaDialog'
import { formatDataIt } from '../vendita-banco/utils'
import type { DocumentoClienteState, DocumentoClienteModalType } from './types'
import type { RigaOrdineCliente } from '../ordine-cliente/types'
import { buildDocumentoClientePayload } from './utils'
import { documentTotalsFromRigheOrdine } from '../ordine-cliente/utils'
import { ACTIVE_DOCUMENT_LABELS } from '../documenti/constants'
import { buildDdtPrintHtml, DDT_PRINT_CSS, type DdtPrintModel } from './ddtPrintTemplate'

export { CONFERMA_ORDINE_PRINT_CSS, DDT_PRINT_CSS }

function formatIndirizzoLines(addr: DocumentoClienteState['intestatario']): string[] {
  const line1 = addr.indirizzo?.trim()
  const line2 = [addr.cap, addr.citta, addr.prov ? `(${addr.prov})` : ''].filter(Boolean).join(' ').trim()
  const line3 = addr.nazione && addr.nazione !== 'Italia' ? addr.nazione.trim() : ''
  return [line1, line2, line3].filter(Boolean) as string[]
}

function buildDdtDestinatario(doc: DocumentoClienteState): string {
  const lines: string[] = []
  if (doc.cliente.nome?.trim()) lines.push(doc.cliente.nome.trim())
  lines.push(...formatIndirizzoLines(doc.intestatario))
  if (doc.cliente.codFiscale?.trim()) lines.push(`C.F. ${doc.cliente.codFiscale.trim()}`)
  if (doc.cliente.partitaIva?.trim()) lines.push(`P.IVA ${doc.cliente.partitaIva.trim()}`)
  return lines.join('\n')
}

function buildDdtDestinazione(doc: DocumentoClienteState): string {
  const destLines = formatIndirizzoLines(doc.destinazione)
  const lines: string[] = []
  if (doc.cliente.nome?.trim()) lines.push(doc.cliente.nome.trim())
  lines.push(...(destLines.length ? destLines : formatIndirizzoLines(doc.intestatario)))
  return lines.join('\n')
}

/** datetime-local ("2026-06-20T11:25") → "20/06/2026 11:25". */
function formatDataOraIt(value?: string): string {
  if (!value?.trim()) return ''
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!m) return value
  const [, y, mo, d, hh, mm] = m
  const datePart = `${d}/${mo}/${y}`
  return hh && mm ? `${datePart} ${hh}:${mm}` : datePart
}

function buildDdtPrintModelData(
  doc: DocumentoClienteState,
  activeRighe: RigaOrdineCliente[],
  studio: ConfermaOrdineStudio,
  fullNumber: string,
  dateStr: string,
  titolo: string,
): DdtPrintModel {
  const t = doc.trasporto
  return {
    studio,
    title: titolo,
    number: fullNumber || '0001',
    date: dateStr,
    destinatario: buildDdtDestinatario(doc),
    destinazione: buildDdtDestinazione(doc),
    lines: activeRighe
      .filter(r => r.descrizione.trim())
      .map(r => ({
        code: r.cod || '',
        description: r.descrizione,
        qty: r.qta,
        um: r.um || 'pz',
      })),
    transport: {
      incaricato: t?.incaricato,
      causale: t?.causale,
      porto: t?.porto,
      colli: t?.colli,
      peso: t?.peso,
      aspetto: t?.aspetto,
      dataInizio: formatDataOraIt(t?.inizio),
    },
  }
}

export function buildDocumentoClientePrintContent(
  doc: DocumentoClienteState,
  studioId: string,
  activeRighe: RigaOrdineCliente[],
  studioData: Record<string, unknown> | null | undefined,
  modello?: StampaModello,
): {
  innerHtml: string
  title: string
  filename: string
  meta: AnteprimaStampaMeta
  css: string
} {
  const totals = documentTotalsFromRigheOrdine(doc.righe, doc.speseImporto, doc.speseIva)
  const payload = buildDocumentoClientePayload(doc, studioId, activeRighe, totals, doc.stato)
  const docRecord: DocRecord = {
    id: '',
    ...payload,
    createdAt: new Date(),
  }
  const baseOptions = getDocumentTypePrintOptions(studioData ?? undefined, doc.documentType)
  const printOptions = applyModelloToPrintOptions(baseOptions, modello, doc.documentType)
  const studio = studioDataToConfermaStudio(studioData ?? undefined)

  if (doc.documentType === 'ddt') {
    // Il documento di trasporto usa un layout dedicato, identico in stampa e PDF
    // (e anche nei modelli personalizzati): titolo fisso "Doc. di trasporto".
    const titolo = 'Doc. di trasporto'
    const ddtModel = buildDdtPrintModelData(
      doc,
      activeRighe,
      studio ?? { name: 'FIXLab' },
      docRecord.fullNumber,
      formatDataIt(doc.data),
      titolo,
    )
    const innerHtml = buildDdtPrintHtml(ddtModel)
    const title = `${titolo} ${docRecord.fullNumber}`
    const filename = buildPrintFilename('ddt', 'Documento_trasporto', docRecord.fullNumber)
    const meta: AnteprimaStampaMeta = {
      title,
      filename,
      fullNumber: docRecord.fullNumber,
      docDate: formatDataIt(doc.data),
      clienteNome: doc.cliente.nome,
      totalDocument: totals.totaleDocumento,
      studioName: studio?.name || 'FIXLab',
    }
    return { innerHtml, title, filename, meta, css: DDT_PRINT_CSS }
  }

  const model = buildDocRecordPrintViewModel(docRecord, studio, printOptions)
  const { html: innerHtml, css } = buildDocumentPrintOutput(doc.documentType, model, printOptions)
  const title = `${printOptions.titoloStampa || ACTIVE_DOCUMENT_LABELS[doc.documentType]} ${docRecord.fullNumber}`
  const filename = buildPrintFilename(doc.documentType, doc.documentType, docRecord.fullNumber)
  const meta: AnteprimaStampaMeta = {
    title,
    filename,
    fullNumber: docRecord.fullNumber,
    docDate: formatDataIt(doc.data),
    clienteNome: doc.cliente.nome,
    totalDocument: totals.totaleDocumento,
    studioName: studio?.name || 'FIXLab',
  }
  return { innerHtml, title, filename, meta, css }
}

export function resolveDocumentoClienteModelloLabel(
  type: DocumentoClienteModalType,
  studioData: Record<string, unknown> | null | undefined,
): string {
  const opts = getDocumentTypePrintOptions(studioData ?? undefined, type)
  const layout = PRINT_LAYOUT_OPTIONS.find(l => l.id === opts.layoutTemplate)
  const layoutLabel = layout?.label ?? opts.layoutTemplate
  return opts.titoloStampa ? `${opts.titoloStampa} (${layoutLabel})` : layoutLabel
}
