import { randomUUID } from 'node:crypto'
import { num, str, type FirebirdRow } from './firebirdClient'

export type MappedDocumentRow = {
  id: string
  productCode?: string
  description: string
  quantity: number
  unitOfMeasure: string
  unitPrice: number
  discount?: number
  vatRate: number
  totalNet: number
  total: number
}

export type DaneaDocLink = {
  destIdDoc: number
  sourceIdDoc: number
}

const PURCHASE_TYPES = new Set([
  'ordine_fornitore',
  'arrivo_merce',
  'reg_fattura_fornitore',
  'preventivo_fornitore',
])

export function mapDocType(raw: string, tipoDocCode?: string): string {
  const label = raw.trim()
  const code = (tipoDocCode ?? '').trim().toUpperCase()
  const codeMap: Record<string, string> = {
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
    Q: 'preventivo',
    R: 'vendita_banco',
    S: 'preventivo_fornitore',
  }
  if (code && codeMap[code]) return codeMap[code]

  const rules: Array<[RegExp, string]> = [
    [/preventivo\s*fornit/i, 'preventivo_fornitore'],
    [/ordine\s*fornit/i, 'ordine_fornitore'],
    [/arrivo\s*merce/i, 'arrivo_merce'],
    [/reg\.?\s*fatt/i, 'reg_fattura_fornitore'],
    [/vendita\s*(al\s*)?banco/i, 'vendita_banco'],
    [/fattura\s*pro[- ]?forma/i, 'fattura_proforma'],
    [/fattura\s*d['']?acconto/i, 'fattura_acconto'],
    [/fattura\s*accomp/i, 'fattura_accomp'],
    [/rapporto\s*d['']?intervento/i, 'rapporto_intervento'],
    [/conferma\s*d['']?ordine/i, 'conferma_ordine'],
    [/ordine\s*cliente/i, 'ordine_cliente'],
    [/doc\.?\s*di\s*trasporto|^ddt$/i, 'ddt'],
    [/^preventivo$/i, 'preventivo'],
    [/^fattura$/i, 'fattura'],
  ]
  for (const [re, type] of rules) {
    if (re.test(label)) return type
  }
  return 'preventivo'
}

export function parseDocDate(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  const s = str(raw)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const it = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (it) {
    const y = it[3].length === 2 ? `20${it[3]}` : it[3]
    return `${y}-${it[2].padStart(2, '0')}-${it[1].padStart(2, '0')}`
  }
  return new Date().toISOString().slice(0, 10)
}

export function docYear(date: string): number {
  const y = Number(date.slice(0, 4))
  return Number.isFinite(y) ? y : new Date().getFullYear()
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function buildFullNumber(number: number, date: string, numeraz?: string): string {
  const suffix = str(numeraz)
  if (suffix) return `${number}/${suffix}`
  return `${number}/${docYear(date)}`
}

export function isPurchaseType(type: string): boolean {
  return PURCHASE_TYPES.has(type)
}

export function isTruthyFlag(raw: unknown): boolean {
  if (raw === true) return true
  if (raw === false || raw == null) return false
  const n = num(raw)
  if (n !== 0) return true
  const s = str(raw).toLowerCase()
  return s === 't' || s === 'true' || s === 's' || s === 'si' || s === 'sì' || s === '1'
}

export function mapDocumentRow(row: FirebirdRow): MappedDocumentRow | null {
  const description = str(row.Desc ?? row.Descrizione ?? row.Description)
  if (!description) return null
  const qty = num(row.Qta) || 1
  const vatRate = num(row.Iva) || 22
  const discount = num(row.Sconti ?? row.Sconto)
  let unitPrice = num(row.PrezzoNet ?? row.Prezzo)
  const grossUnit = num(row.PrezzoIvato)
  if (!unitPrice && grossUnit > 0) unitPrice = round2(grossUnit / (1 + vatRate / 100))
  const totalNet = round2(unitPrice * qty * (1 - discount / 100))
  const total = round2(totalNet * (1 + vatRate / 100))
  const code = str(row.CodArticolo)
  return {
    id: randomUUID(),
    productCode: code || undefined,
    description,
    quantity: qty,
    unitOfMeasure: str(row.UM) || 'pz',
    unitPrice,
    discount: discount || undefined,
    vatRate,
    totalNet,
    total,
  }
}

export function rowsForDocument(idDoc: number, allRows: FirebirdRow[]): MappedDocumentRow[] {
  return allRows
    .filter(r => num(r.IDDoc) === idDoc)
    .map(mapDocumentRow)
    .filter((r): r is MappedDocumentRow => r != null)
}

export function fallbackRows(totalDocument: number, totalNet: number, totalVat: number): MappedDocumentRow[] {
  if (totalDocument <= 0 && totalNet <= 0) {
    return [
      {
        id: randomUUID(),
        description: 'Import Danea — documento senza righe',
        quantity: 1,
        unitOfMeasure: 'pz',
        unitPrice: 0,
        vatRate: 22,
        totalNet: 0,
        total: 0,
      },
    ]
  }
  const net = totalNet > 0 ? totalNet : round2(totalDocument - totalVat)
  const gross = totalDocument > 0 ? totalDocument : round2(net + totalVat)
  return [
    {
      id: randomUUID(),
      description: 'Import Danea — totale documento',
      quantity: 1,
      unitOfMeasure: 'pz',
      unitPrice: net,
      vatRate: gross > net ? round2(((gross - net) / net) * 100) : 22,
      totalNet: net,
      total: gross,
    },
  ]
}

export function mergeDocumentLinks(...groups: DaneaDocLink[][]): DaneaDocLink[] {
  const seen = new Set<string>()
  const out: DaneaDocLink[] = []
  for (const group of groups) {
    for (const link of group) {
      if (!link.destIdDoc || !link.sourceIdDoc || link.destIdDoc === link.sourceIdDoc) continue
      const key = `${link.destIdDoc}|${link.sourceIdDoc}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(link)
    }
  }
  return out
}

export function pickPrimaryConclusionLink(
  sourceIdDoc: number,
  links: DaneaDocLink[],
  docMeta: Map<number, { date: string; type: string }>,
): DaneaDocLink | undefined {
  const candidates = links.filter(l => l.sourceIdDoc === sourceIdDoc)
  if (!candidates.length) return undefined
  const priority = (type: string) => {
    if (type === 'fattura' || type === 'fattura_accomp') return 100
    if (type === 'vendita_banco') return 90
    if (type === 'ddt' || type === 'rapporto_intervento') return 80
    if (type === 'arrivo_merce') return 80
    if (type === 'reg_fattura_fornitore') return 70
    if (type === 'fattura_proforma' || type === 'fattura_acconto') return 60
    return 10
  }
  return [...candidates].sort((a, b) => {
    const da = docMeta.get(a.destIdDoc)
    const db = docMeta.get(b.destIdDoc)
    const pa = da ? priority(da.type) : 0
    const pb = db ? priority(db.type) : 0
    if (pa !== pb) return pb - pa
    const dateA = da?.date ?? ''
    const dateB = db?.date ?? ''
    return dateB.localeCompare(dateA)
  })[0]
}

export function resolveImportedStatus(
  cancelled: boolean,
  hasConclusion: boolean,
): 'cancelled' | 'completed' | 'confirmed' {
  if (cancelled) return 'cancelled'
  if (hasConclusion) return 'completed'
  return 'confirmed'
}
