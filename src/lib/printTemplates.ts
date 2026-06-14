import type { ApplicationOptions, DocumentoTipoOptions, PrintLayoutId } from './applicationOptions'
import {
  DOCUMENT_TYPE_LABELS,
  DEFAULT_PRINT_LAYOUT,
  loadApplicationOptions,
  normalizePrintLayoutId,
  resolveDocumentTemplateFields,
} from './applicationOptions'
import type { DocRecord } from '../types'
import {
  DEFAULT_CONFERMA_ORDINE_DISCLAIMER,
  type ConfermaOrdineStudio,
  type ConfermaOrdineViewModel,
  buildConfermaOrdineHtml,
  formatDateIt,
  printConfermaOrdineHtml,
  resolveDisclaimer,
} from './confermaOrdineTemplate'
import { DEFAULT_DISCLAIMER } from './studioSettings'

export type { PrintLayoutId } from './applicationOptions'
export { DEFAULT_PRINT_LAYOUT } from './applicationOptions'

export const PRINT_LAYOUT_OPTIONS: { id: PrintLayoutId; label: string; description: string }[] = [
  {
    id: 'layout_conferma_ordine',
    label: "Conferma d'ordine (layout standard)",
    description: 'Layout predefinito FixLab: intestazione, riquadri, tabella righe, firma e disclaimer.',
  },
  {
    id: 'vendita_banco_gestionale',
    label: 'Vendita al banco gestionale',
    description: 'Layout dedicato vendita al banco con intestazione cliente/destinazione.',
  },
  {
    id: 'standard_jsPDF',
    label: 'Standard PDF',
    description: 'Stampa PDF compatta classica FixLab.',
  },
]

export type DocumentTypePrintOptions = DocumentoTipoOptions

export function getDocumentTypePrintOptions(
  studioData: Record<string, unknown> | undefined,
  typeId: string,
): DocumentTypePrintOptions {
  const appOptions = loadApplicationOptions(studioData)
  const tipo = appOptions.documenti.tipi[typeId]
  const label = DOCUMENT_TYPE_LABELS[typeId] ?? typeId
  return {
    enabled: tipo?.enabled ?? true,
    destPredefinito: tipo?.destPredefinito ?? 'Destinazione merce',
    usaPrezziIvati: tipo?.usaPrezziIvati ?? true,
    bloccaModifiche: tipo?.bloccaModifiche ?? false,
    numerazAutomatica: tipo?.numerazAutomatica ?? true,
    titoloStampa: tipo?.titoloStampa ?? label,
    noteFine: tipo?.noteFine ?? '',
    layoutTemplate: normalizePrintLayoutId(tipo?.layoutTemplate),
    template: resolveDocumentTemplateFields(typeId, tipo?.template),
  }
}

export function resolvePrintDisclaimer(
  studio: ConfermaOrdineStudio | undefined,
  printOptions: Pick<DocumentTypePrintOptions, 'noteFine'>,
  fallback = DEFAULT_DISCLAIMER,
): string {
  const note = printOptions.noteFine?.trim()
  if (note) return note
  const studioDisclaimer = studio?.disclaimer?.trim()
  if (studioDisclaimer) return resolveDisclaimer(studio)
  return fallback
}

export function resolvePrintTitleLabel(titoloStampa: string, suffix = 'nr.'): string {
  const base = titoloStampa.trim() || 'Documento'
  return base.toLowerCase().endsWith('nr.') || base.toLowerCase().endsWith('nr') ? base : `${base} ${suffix}`
}

export function isDocumentTypeEnabled(studioData: Record<string, unknown> | undefined, typeId: string): boolean {
  return getDocumentTypePrintOptions(studioData, typeId).enabled
}

export function filterEnabledDocumentTypes<T extends string>(
  studioData: Record<string, unknown> | undefined,
  types: readonly T[],
): T[] {
  return types.filter(type => isDocumentTypeEnabled(studioData, type))
}

function applyTemplateToModel(
  model: ConfermaOrdineViewModel,
  printOptions: DocumentTypePrintOptions,
): ConfermaOrdineViewModel {
  const t = printOptions.template
  return {
    ...model,
    documentTitleLabel: resolvePrintTitleLabel(printOptions.titoloStampa),
    clientBoxTitle: t.clientBoxTitle,
    rightBoxTitle: t.secondBoxTitle,
    showRightBox: t.showSecondBox,
    signatureLabel: t.signatureLabel,
    totalLabel: t.totalLabel,
    disclaimer: resolvePrintDisclaimer(model.studio, printOptions, DEFAULT_CONFERMA_ORDINE_DISCLAIMER),
  }
}

function docRowToLine(row: DocRecord['rows'][number]) {
  const qty = row.quantity ?? 1
  const price = row.unitPrice ?? 0
  const discount = row.discount ?? 0
  const importo = row.total ?? qty * price * (1 - discount / 100)
  return {
    code: row.productCode || '',
    description: row.description || '—',
    qty,
    priceIvato: price,
    sconto: discount,
    importo,
    iva: row.vatRate ?? 22,
  }
}

export function buildDocRecordPrintViewModel(
  doc: DocRecord,
  studio: ConfermaOrdineStudio | undefined,
  printOptions: DocumentTypePrintOptions,
): ConfermaOrdineViewModel {
  const subjectLines = [doc.subjectName, doc.subjectVat ? `P.IVA ${doc.subjectVat}` : '', doc.subjectAddress]
    .filter(Boolean)
    .join('\n')
  const noteBody = [doc.internalNotes?.trim()].filter(Boolean).join('\n')
  const lines = (doc.rows ?? []).map(docRowToLine)
  const sampleLines =
    lines.length > 0
      ? lines
      : [
          {
            code: 'ART001',
            description: 'Esempio riga documento',
            qty: 1,
            priceIvato: 0,
            sconto: 0,
            importo: 0,
            iva: 22,
          },
        ]

  const isRepair = doc.type === 'conferma_ordine' || doc.type === 'rapporto_intervento'

  return applyTemplateToModel(
    {
      orderNumber: doc.fullNumber || '0001',
      orderDate: formatDateIt(doc.date) || new Date().toLocaleDateString('it-IT'),
      studio: studio ?? { name: 'FIXLab' },
      clientBody: subjectLines || 'Cliente di esempio\nVia Roma 1\n00100 Roma (RM)',
      deviceBody: noteBody || (isRepair ? 'IMEI e S/N: —\nCodice Blocco: —\nNote: —' : ''),
      lines: sampleLines,
      deposit: 0,
      total: doc.totalDocument ?? sampleLines.reduce((s, l) => s + l.importo, 0),
      disclaimer: '',
    },
    printOptions,
  )
}

export function buildTemplatePreviewModel(
  typeId: string,
  studio: ConfermaOrdineStudio,
  printOptions: DocumentTypePrintOptions,
): ConfermaOrdineViewModel {
  const label = printOptions.titoloStampa || DOCUMENT_TYPE_LABELS[typeId] || typeId
  const isRepair = typeId === 'conferma_ordine' || typeId === 'rapporto_intervento'

  return applyTemplateToModel(
    {
      orderNumber: '0001',
      orderDate: new Date().toLocaleDateString('it-IT'),
      studio,
      clientBody: 'Mario Rossi\nVia Roma 1\n00100 Roma (RM)\nCell: 333 1234567\nE-mail: cliente@email.it',
      deviceBody: isRepair
        ? 'IMEI e S/N: —\nCodice Blocco: —\nAccount e Password: —\nNote: Anteprima template'
        : 'Note o dettagli aggiuntivi del documento.',
      lines: [
        {
          code: 'ART001',
          description: `Riga di esempio — ${label}`,
          qty: 1,
          priceIvato: 49.9,
          sconto: 0,
          importo: 49.9,
          iva: 22,
        },
      ],
      deposit: 0,
      total: 49.9,
      disclaimer: '',
    },
    printOptions,
  )
}

export function printDocRecordWithTemplate(
  doc: DocRecord,
  studio: ConfermaOrdineStudio | undefined,
  studioData?: Record<string, unknown>,
): void {
  const printOptions = getDocumentTypePrintOptions(studioData, doc.type)
  if (printOptions.layoutTemplate === 'layout_conferma_ordine') {
    const model = buildDocRecordPrintViewModel(doc, studio, printOptions)
    printConfermaOrdineHtml(model)
    return
  }
}

export function studioDataToConfermaStudio(data: Record<string, unknown> | undefined): ConfermaOrdineStudio | undefined {
  if (!data) return undefined
  const appOptions = data.appOptions as ApplicationOptions | undefined
  return {
    name: String(data.name ?? data.shopName ?? ''),
    subtitle: String(data.subtitle ?? ''),
    address: String(data.address ?? ''),
    city: String(data.city ?? ''),
    province: String(data.province ?? ''),
    cap: String(data.cap ?? ''),
    nation: appOptions?.azienda?.nation ?? 'Italia',
    vatNumber: String(data.vatNumber ?? ''),
    phone: String(data.phone ?? ''),
    cellPhone: String(data.cellPhone ?? ''),
    email: String(data.email ?? ''),
    logoUrl: String(data.logoUrl ?? ''),
    disclaimer: String(data.disclaimer ?? DEFAULT_DISCLAIMER),
  }
}

export function buildTemplatePreviewHtml(
  typeId: string,
  studio: ConfermaOrdineStudio,
  printOptions: DocumentTypePrintOptions,
): string {
  return buildConfermaOrdineHtml(buildTemplatePreviewModel(typeId, studio, printOptions))
}

/** @deprecated Usare buildDocRecordPrintViewModel */
export const buildDocRecordDaneaViewModel = buildDocRecordPrintViewModel
