import type { DocumentRow, DocumentType, DocRecord } from '../../types'
import { isPurchaseDocumentType } from '../../gestionale/features/documenti/constants'
import { buildFullNumber, documentYearFromDate } from '../../gestionale/features/documenti/utils'
import { findColumn, getCell, parseNumber } from './spreadsheet'
import type { ParsedSpreadsheet } from './types'

export type DaneaDocumentFormat = 'list' | 'lines'

export type ParsedDaneaDocument = {
  number: number
  numbering?: string
  fullNumber: string
  date: string
  type: DocumentType
  subjectType: 'client' | 'supplier'
  subjectName: string
  paymentMethod?: string
  paymentTerms?: string
  rows: DocumentRow[]
  totalNet: number
  totalVat: number
  totalDocument: number
}

const DANEA_TYPE_MAP: Array<{ match: RegExp; type: DocumentType }> = [
  { match: /preventivo\s*fornit/i, type: 'preventivo_fornitore' },
  { match: /ordine\s*fornit/i, type: 'ordine_fornitore' },
  { match: /arrivo\s*merce/i, type: 'arrivo_merce' },
  { match: /reg\.?\s*fatt/i, type: 'reg_fattura_fornitore' },
  { match: /vendita\s*(al\s*)?banco/i, type: 'vendita_banco' },
  { match: /fattura\s*pro[- ]?forma/i, type: 'fattura_proforma' },
  { match: /fattura\s*d['']?acconto/i, type: 'fattura_acconto' },
  { match: /fattura\s*accomp/i, type: 'fattura_accomp' },
  { match: /rapporto\s*d['']?intervento/i, type: 'rapporto_intervento' },
  { match: /conferma\s*d['']?ordine/i, type: 'conferma_ordine' },
  { match: /ordine\s*cliente/i, type: 'ordine_cliente' },
  { match: /doc\.?\s*di\s*trasporto|^ddt$/i, type: 'ddt' },
  { match: /^preventivo$/i, type: 'preventivo' },
  { match: /^fattura$/i, type: 'fattura' },
]

export function detectDocumentFormat(headers: string[]): DaneaDocumentFormat {
  const hasLineQty = Boolean(findColumn(headers, ['q.tà', 'qta', 'quantita', 'quantità']))
  const hasLineDesc = Boolean(findColumn(headers, ['descrizione', 'desc.', 'desc articolo']))
  const hasDocNum = Boolean(
    findColumn(headers, ['numero', 'num.', 'num', 'n. doc', 'numero doc', 'num. doc']),
  )
  const hasDocTotal = Boolean(
    findColumn(headers, ['tot. documento', 'tot documento', 'totale documento', 'totale', 'importo']),
  )
  if (hasLineQty && hasLineDesc && hasDocNum && !hasDocTotal) return 'lines'
  if (hasDocNum && findColumn(headers, ['data', 'data doc'])) return 'list'
  if (hasLineQty && hasLineDesc && hasDocNum) return 'lines'
  return 'list'
}

export function parseDaneaDocumentType(raw: string, fileName: string): DocumentType {
  const label = raw.trim()
  if (label) {
    for (const entry of DANEA_TYPE_MAP) {
      if (entry.match.test(label)) return entry.type
    }
  }
  const name = fileName.toLowerCase()
  if (name.includes('fattur')) return 'fattura'
  if (name.includes('preventiv')) return 'preventivo'
  if (name.includes('ordine') && name.includes('fornit')) return 'ordine_fornitore'
  if (name.includes('ordine')) return 'ordine_cliente'
  if (name.includes('ddt') || name.includes('trasporto')) return 'ddt'
  if (name.includes('vendita') || name.includes('banco')) return 'vendita_banco'
  if (name.includes('arrivo')) return 'arrivo_merce'
  return 'preventivo'
}

export function parseDaneaDate(raw: string): string {
  const s = raw.trim()
  if (!s) return new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const it = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (it) {
    const dd = it[1].padStart(2, '0')
    const mm = it[2].padStart(2, '0')
    let yy = it[3]
    if (yy.length === 2) yy = `20${yy}`
    return `${yy}-${mm}-${dd}`
  }
  const d = new Date(s.includes('T') ? s : `${s}T12:00:00`)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return new Date().toISOString().slice(0, 10)
}

function parseDocNumber(raw: string, year: number): { number: number; numbering?: string; fullNumber: string } {
  const s = raw.trim()
  if (!s) return { number: 0, fullNumber: `0/${year}` }
  const slash = s.match(/^(\d+)\s*\/\s*(.+)$/)
  if (slash) {
    const number = parseInt(slash[1], 10) || 0
    const suffix = slash[2].trim()
    if (/^\d{4}$/.test(suffix)) return { number, fullNumber: `${number}/${suffix}` }
    return { number, numbering: suffix, fullNumber: `${number}/${suffix}` }
  }
  const number = parseInt(s.replace(/\D/g, ''), 10) || 0
  return { number, fullNumber: buildFullNumber(number, year) }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function calcRow(
  description: string,
  qty: number,
  unitPrice: number,
  vatRate: number,
  discount = 0,
  productCode = '',
): DocumentRow {
  const totalNet = round2(unitPrice * qty * (1 - discount / 100))
  const total = round2(totalNet * (1 + vatRate / 100))
  return {
    id: crypto.randomUUID(),
    productCode: productCode || undefined,
    description,
    quantity: qty,
    unitOfMeasure: 'pz',
    unitPrice,
    discount: discount || undefined,
    vatRate,
    totalNet,
    total,
  }
}

function calcTotals(rows: DocumentRow[]): { totalNet: number; totalVat: number; totalDocument: number } {
  const totalNet = round2(rows.reduce((s, r) => s + r.totalNet, 0))
  const totalDocument = round2(rows.reduce((s, r) => s + r.total, 0))
  return { totalNet, totalVat: round2(totalDocument - totalNet), totalDocument }
}

function resolveSubjectType(type: DocumentType, row: Record<string, string>, headers: string[]): 'client' | 'supplier' {
  if (isPurchaseDocumentType(type)) return 'supplier'
  const fornitore = getCell(row, headers, ['fornitore', 'forn.', 'ragione sociale fornitore'])
  if (fornitore) return 'supplier'
  return 'client'
}

function resolveSubjectName(row: Record<string, string>, headers: string[], subjectType: 'client' | 'supplier'): string {
  const candidates =
    subjectType === 'supplier'
      ? ['fornitore', 'forn.', 'ragione sociale', 'soggetto', 'denominazione']
      : ['cliente', 'ragione sociale', 'soggetto', 'denominazione', 'destinatario']
  return getCell(row, headers, candidates) || 'Import Danea'
}

function docKey(number: string, date: string, subject: string, type: string): string {
  return `${type}|${date}|${number}|${subject}`.toLowerCase()
}

function buildRowsFromTotal(totalGross: number, vatRate = 22): DocumentRow[] {
  if (totalGross <= 0) {
    return [calcRow('Import Danea — documento senza righe', 1, 0, vatRate)]
  }
  const totalNet = round2(totalGross / (1 + vatRate / 100))
  const unitPrice = totalNet
  return [calcRow('Import Danea — totale documento', 1, unitPrice, vatRate)]
}

function mapLineRow(row: Record<string, string>, headers: string[]): DocumentRow | null {
  const description = getCell(row, headers, ['descrizione', 'desc.', 'desc articolo', 'articolo'])
  if (!description) return null
  const qty = parseNumber(getCell(row, headers, ['q.tà', 'qta', 'quantita', 'quantità'])) || 1
  const vatRate = parseNumber(getCell(row, headers, ['iva', 'iva %', 'aliquota iva'])) || 22
  const discount = parseNumber(getCell(row, headers, ['sconto', 'sconti', 'sconto %']))
  const gross = parseNumber(getCell(row, headers, ['importo ivato', 'totale ivato', 'importo']))
  const net = parseNumber(getCell(row, headers, ['importo netto', 'prezzo netto', 'prezzo']))
  const ivato = parseNumber(getCell(row, headers, ['prezzo ivato', 'prezzo iva incl']))
  let unitPrice = net
  if (!unitPrice && ivato) unitPrice = round2(ivato / (1 + vatRate / 100))
  if (!unitPrice && gross && qty) unitPrice = round2(gross / qty / (1 + vatRate / 100))
  const code = getCell(row, headers, ['cod.', 'codice', 'cod prodotto', 'cod. prodotto'])
  return calcRow(description, qty, unitPrice, vatRate, discount, code)
}

export function parseDocumentsFromSheet(parsed: ParsedSpreadsheet): ParsedDaneaDocument[] {
  const format = detectDocumentFormat(parsed.headers)
  const { headers, rows, fileName } = parsed

  if (format === 'lines') {
    const groups = new Map<string, { meta: Record<string, string>; lines: DocumentRow[] }>()
    for (const row of rows) {
      const date = parseDaneaDate(getCell(row, headers, ['data', 'data doc', 'data documento']))
      const typeLabel = getCell(row, headers, ['tipo', 'tipo documento', 'causale', 'tipo doc'])
      const type = parseDaneaDocumentType(typeLabel, fileName)
      const subjectType = resolveSubjectType(type, row, headers)
      const subjectName = resolveSubjectName(row, headers, subjectType)
      const numRaw = getCell(row, headers, ['numero', 'num.', 'num', 'n. doc', 'numero doc', 'num. doc'])
      const year = documentYearFromDate(date)
      const num = parseDocNumber(numRaw, year)
      const key = docKey(num.fullNumber, date, subjectName, type)
      const line = mapLineRow(row, headers)
      if (!line) continue
      const existing = groups.get(key)
      if (existing) existing.lines.push(line)
      else groups.set(key, { meta: row, lines: [line] })
    }
    return Array.from(groups.values()).map(({ meta, lines }) => {
      const date = parseDaneaDate(getCell(meta, headers, ['data', 'data doc', 'data documento']))
      const typeLabel = getCell(meta, headers, ['tipo', 'tipo documento', 'causale', 'tipo doc'])
      const type = parseDaneaDocumentType(typeLabel, fileName)
      const subjectType = resolveSubjectType(type, meta, headers)
      const subjectName = resolveSubjectName(meta, headers, subjectType)
      const year = documentYearFromDate(date)
      const num = parseDocNumber(getCell(meta, headers, ['numero', 'num.', 'num', 'n. doc']), year)
      const totals = calcTotals(lines)
      return {
        ...num,
        date,
        type,
        subjectType,
        subjectName,
        paymentMethod: getCell(meta, headers, ['pagamento', 'modalita pagamento']) || undefined,
        paymentTerms: getCell(meta, headers, ['condizioni pagamento', 'scadenza']) || undefined,
        rows: lines,
        ...totals,
      }
    })
  }

  const docs: ParsedDaneaDocument[] = []
  for (const row of rows) {
    const numRaw = getCell(row, headers, ['numero', 'num.', 'num', 'n.'])
    const subjectType = resolveSubjectType(parseDaneaDocumentType(getCell(row, headers, ['tipo', 'tipo documento']), fileName), row, headers)
    const subjectName = resolveSubjectName(row, headers, subjectType)
    const totalDocument =
      parseNumber(getCell(row, headers, ['tot. documento', 'tot documento', 'totale documento', 'totale', 'importo'])) ||
      0
    if (!numRaw.trim() && subjectName === 'Import Danea' && totalDocument <= 0) continue
    const date = parseDaneaDate(getCell(row, headers, ['data', 'data doc', 'data documento']))
    const typeLabel = getCell(row, headers, ['tipo', 'tipo documento', 'causale', 'documento'])
    const type = parseDaneaDocumentType(typeLabel, fileName)
    const year = documentYearFromDate(date)
    const num = parseDocNumber(numRaw, year)
    const vatRate = parseNumber(getCell(row, headers, ['iva', 'iva %'])) || 22
    const rowsDoc = totalDocument > 0 ? buildRowsFromTotal(totalDocument, vatRate) : buildRowsFromTotal(0, vatRate)
    const totals = calcTotals(rowsDoc)
    docs.push({
      ...num,
      date,
      type,
      subjectType,
      subjectName,
      paymentMethod: getCell(row, headers, ['pagamento', 'modalita pagamento']) || undefined,
      paymentTerms: getCell(row, headers, ['condizioni pagamento', 'scadenza']) || undefined,
      rows: rowsDoc,
      totalDocument: totalDocument > 0 ? totalDocument : totals.totalDocument,
      totalNet: totals.totalNet,
      totalVat: totals.totalVat,
    })
  }
  return docs.filter(d => d.subjectName || d.number > 0 || d.totalDocument > 0)
}

export function parsedDaneaToDocRecord(
  doc: ParsedDaneaDocument,
  studioId: string,
  subjectId?: string,
): Omit<DocRecord, 'id' | 'createdAt'> {
  const documentYear = documentYearFromDate(doc.date)
  const fullNumber = doc.fullNumber || buildFullNumber(doc.number, documentYear, doc.numbering)
  return {
    studioId,
    type: doc.type,
    number: doc.number,
    numbering: doc.numbering,
    fullNumber,
    date: doc.date,
    documentYear,
    subjectType: doc.subjectType,
    subjectId,
    subjectName: doc.subjectName,
    rows: doc.rows,
    totalNet: doc.totalNet,
    totalVat: doc.totalVat,
    totalDocument: doc.totalDocument,
    paymentMethod: doc.paymentMethod,
    paymentTerms: doc.paymentTerms,
    status: 'confirmed',
    stockCommitted: true,
    internalNotes: 'Importato da Danea Easyfatt',
  }
}

export function countDocumentsInSheet(parsed: ParsedSpreadsheet): number {
  return parseDocumentsFromSheet(parsed).length
}

export function sampleDocumentLabelsFromSheet(parsed: ParsedSpreadsheet, limit = 3): string[] {
  return parseDocumentsFromSheet(parsed)
    .slice(0, limit)
    .map(d => `${d.fullNumber} ${d.subjectName}`.trim())
}

export function duplicateDocument(
  existing: DocRecord[],
  type: DocumentType,
  fullNumber: string,
  year: number,
  subjectName: string,
): boolean {
  const fn = fullNumber.trim().toLowerCase()
  const sn = subjectName.trim().toLowerCase()
  return existing.some(d => {
    const dy = d.documentYear ?? documentYearFromDate(d.date)
    if (dy !== year) return false
    if (d.type !== type) return false
    if (d.fullNumber?.trim().toLowerCase() === fn) return true
    if (sn && d.subjectName?.trim().toLowerCase() === sn && d.fullNumber?.trim().toLowerCase() === fn) return true
    return false
  })
}
