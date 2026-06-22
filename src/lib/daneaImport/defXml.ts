import type { DocumentRow, DocumentType } from '../../types'
import { isPurchaseDocumentType } from '../../gestionale/features/documenti/constants'
import { buildFullNumber, documentYearFromDate } from '../../gestionale/features/documenti/utils'
import type { ParsedDaneaDocument } from './mapDocuments'
import { parseDaneaDate } from './mapDocuments'

/** Codici DocumentType ufficiali Danea Easyfatt-Xml. */
const DEFXML_TYPE_MAP: Record<string, DocumentType> = {
  A: 'fattura_acconto',
  B: 'vendita_banco',
  C: 'ordine_cliente',
  D: 'ddt',
  E: 'ordine_fornitore',
  F: 'fattura_accomp',
  G: 'rapporto_intervento',
  H: 'arrivo_merce',
  I: 'fattura',
  J: 'fattura_acconto',
  L: 'fattura_proforma',
  M: 'fattura',
  N: 'fattura',
  O: 'fattura',
  P: 'fattura',
  Q: 'preventivo',
  R: 'vendita_banco',
  S: 'preventivo_fornitore',
}

export function isDefXmlFileName(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith('.defxml')
}

export function isDefXmlImportFile(file: File): boolean {
  if (isDefXmlFileName(file.name)) return true
  const lower = file.name.trim().toLowerCase()
  if (lower.endsWith('.xml')) return true
  const mime = (file.type || '').toLowerCase()
  return mime.includes('xml')
}

export function defXmlImportRejectionMessage(fileName: string): string {
  return `Formato non supportato (${fileName}). Seleziona un file Easyfatt-Xml (.DefXml) o Excel/ODS esportato da Danea.`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function parseNum(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function textContent(el: Element | undefined): string {
  return (el?.textContent ?? '').trim()
}

function firstTag(parent: Element, tag: string): Element | undefined {
  const list = parent.getElementsByTagName(tag)
  return list.length ? list[0] : undefined
}

function childText(parent: Element, tag: string): string {
  return textContent(firstTag(parent, tag))
}

export function mapDefXmlTypeCode(code: string): DocumentType {
  const normalized = code.trim().toUpperCase()
  return DEFXML_TYPE_MAP[normalized] ?? 'ordine_cliente'
}

function parseVatRate(rowEl: Element): number {
  const vatEl = firstTag(rowEl, 'VatCode')
  if (!vatEl) return 22
  const perc = vatEl.getAttribute('Perc')
  if (perc) {
    const n = parseNum(perc)
    if (n > 0) return n
  }
  const text = textContent(vatEl)
  const n = parseNum(text)
  if (n > 0 && n <= 100) return n
  return 22
}

function parseDiscount(raw: string): number {
  const s = raw.trim()
  if (!s) return 0
  const first = s.split('+')[0]?.replace('%', '').trim() ?? ''
  return parseNum(first)
}

function calcRow(
  description: string,
  qty: number,
  unitPrice: number,
  vatRate: number,
  discount = 0,
  productCode = '',
  unitOfMeasure = 'pz',
): DocumentRow {
  const totalNet = round2(unitPrice * qty * (1 - discount / 100))
  const total = round2(totalNet * (1 + vatRate / 100))
  return {
    id: crypto.randomUUID(),
    productCode: productCode || undefined,
    description,
    quantity: qty,
    unitOfMeasure: unitOfMeasure || 'pz',
    unitPrice,
    discount: discount || undefined,
    vatRate,
    totalNet,
    total,
  }
}

function mapRow(rowEl: Element, pricesIncludeVat: boolean): DocumentRow | null {
  const description = childText(rowEl, 'Description')
  if (!description) return null
  const qty = parseNum(childText(rowEl, 'Qty')) || 1
  let unitPrice = parseNum(childText(rowEl, 'Price'))
  const vatRate = parseVatRate(rowEl)
  const discount = parseDiscount(childText(rowEl, 'Discounts'))
  const code = childText(rowEl, 'Code')
  const um = childText(rowEl, 'Um') || 'pz'
  if (pricesIncludeVat && unitPrice > 0) {
    unitPrice = round2(unitPrice / (1 + vatRate / 100))
  }
  return calcRow(description, qty, unitPrice, vatRate, discount, code, um)
}

function calcTotals(rows: DocumentRow[]): { totalNet: number; totalVat: number; totalDocument: number } {
  const totalNet = round2(rows.reduce((s, r) => s + r.totalNet, 0))
  const totalDocument = round2(rows.reduce((s, r) => s + r.total, 0))
  return { totalNet, totalVat: round2(totalDocument - totalNet), totalDocument }
}

function parseDocumentElement(docEl: Element): ParsedDaneaDocument | null {
  const typeCode = childText(docEl, 'DocumentType') || 'C'
  const type = mapDefXmlTypeCode(typeCode)
  const date = parseDaneaDate(childText(docEl, 'Date'))
  const year = documentYearFromDate(date)
  const number = Math.round(parseNum(childText(docEl, 'Number')))
  const numbering = childText(docEl, 'Numbering') || undefined
  const fullNumber = buildFullNumber(number, year, numbering)

  const subjectName = childText(docEl, 'CustomerName') || 'Import Danea'
  const subjectType = isPurchaseDocumentType(type) ? 'supplier' : 'client'
  const pricesIncludeVat = childText(docEl, 'PricesIncludeVat').toLowerCase() === 'true'

  const rows: DocumentRow[] = []
  const rowsContainer = firstTag(docEl, 'Rows')
  if (rowsContainer) {
    const rowEls = rowsContainer.getElementsByTagName('Row')
    for (let i = 0; i < rowEls.length; i++) {
      const row = mapRow(rowEls[i], pricesIncludeVat)
      if (row) rows.push(row)
    }
  }

  let totalNet = parseNum(childText(docEl, 'TotalWithoutTax'))
  let totalVat = parseNum(childText(docEl, 'VatAmount'))
  let totalDocument = parseNum(childText(docEl, 'Total'))
  if (rows.length > 0 && totalDocument <= 0) {
    const totals = calcTotals(rows)
    totalNet = totals.totalNet
    totalVat = totals.totalVat
    totalDocument = totals.totalDocument
  } else if (rows.length === 0 && totalDocument > 0) {
    const vatRate = 22
    const net = totalNet > 0 ? totalNet : round2(totalDocument / (1 + vatRate / 100))
    rows.push(calcRow('Import Danea — totale documento', 1, net, vatRate))
    totalNet = net
    totalVat = round2(totalDocument - net)
  }

  if (!number && !subjectName && totalDocument <= 0 && rows.length === 0) {
    return null
  }

  return {
    number,
    numbering,
    fullNumber,
    date,
    type,
    subjectType,
    subjectName,
    paymentMethod: childText(docEl, 'PaymentName') || undefined,
    rows,
    totalNet,
    totalVat,
    totalDocument,
  }
}

function collectDocumentElements(xmlDoc: Document): Element[] {
  const root = xmlDoc.documentElement
  if (!root) return []
  if (root.tagName === 'Document') return [root]
  return [...xmlDoc.getElementsByTagName('Document')]
}

function isEasyfattXml(xmlDoc: Document): boolean {
  const root = xmlDoc.documentElement
  if (!root) return false
  if (root.tagName === 'EasyfattDocuments' || root.tagName === 'Document') return true
  if (xmlDoc.getElementsByTagName('Document').length > 0) return true
  return false
}

export function parseDefXmlText(text: string, fileName: string): ParsedDaneaDocument[] {
  const xmlDoc = new DOMParser().parseFromString(text, 'application/xml')
  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('File XML non valido o corrotto.')
  }
  if (!isEasyfattXml(xmlDoc)) {
    throw new Error('Il file non è un export Easyfatt-Xml (.DefXml) valido.')
  }
  const docs = collectDocumentElements(xmlDoc)
    .map(el => parseDocumentElement(el))
    .filter((d): d is ParsedDaneaDocument => d != null)
  return docs
}

export async function parseDefXmlFile(file: File): Promise<ParsedDaneaDocument[]> {
  const text = await file.text()
  return parseDefXmlText(text, file.name)
}

export function sampleDefXmlDocumentLabels(docs: ParsedDaneaDocument[], limit = 3): string[] {
  return docs.slice(0, limit).map(d => `${d.fullNumber} ${d.subjectName}`.trim())
}
