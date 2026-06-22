import type { Client, DocRecord, Payment, Product, Supplier } from '../../../types'
import { fetchStudioCollectionForExport } from '../../../lib/firestorePagination'
import { SALES_DOCUMENT_TYPES, PURCHASE_DOCUMENT_TYPES } from '../documenti/constants'
import { regioneFromProvincia } from './provinceRegioni'
import {
  isProductLevelDimension,
  type AnalisiCalc,
  type AnalisiDimension,
  type AnalisiFlussiMode,
  type AnalisiKind,
  type AnalisiPeriod,
} from './analisiTypes'

const SALES_SET = new Set<string>(SALES_DOCUMENT_TYPES)
const PURCHASE_SET = new Set<string>(PURCHASE_DOCUMENT_TYPES)

export type AnalisiDataset = {
  documents: DocRecord[]
  payments: Payment[]
  clientsById: Map<string, Client>
  suppliersById: Map<string, Supplier>
  productsById: Map<string, Product>
  productsByCode: Map<string, Product>
}

export type FlussiBucket = {
  key: string
  label: string
  sortKey: number
  entrate: number
  uscite: number
  saldo: number
}

export type FlussiResult = {
  buckets: FlussiBucket[]
  totalEntrate: number
  totalUscite: number
  totalSaldo: number
  count: number
}

export type AnalisiBucket = {
  key: string
  label: string
  value: number
  count: number
  /** Chiave di ordinamento cronologico per dimensioni temporali. */
  sortKey: number
  /** true se il valore è negativo (uscite nei flussi). */
  negative: boolean
}

export type AnalisiResult = {
  buckets: AnalisiBucket[]
  total: number
  count: number
  max: number
}

const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const PRICE_LIST_LABELS: Record<string, string> = {
  privati: 'Privati',
  aziende: 'Aziende',
  convenzionati: 'Convenzionati',
  vip: 'VIP',
}

function parseDocDate(value: unknown): Date | null {
  if (!value) return null
  if (typeof value === 'string') {
    const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'object' && value !== null && 'seconds' in (value as Record<string, unknown>)) {
    const secs = Number((value as { seconds: number }).seconds)
    if (!Number.isNaN(secs)) return new Date(secs * 1000)
  }
  return null
}

/** Inizio settimana ISO (lunedì) per la chiave settimanale. */
function startOfIsoWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}

function fmtDateIt(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Carica i dati necessari all'analisi (documenti + anagrafiche + pagamenti per flussi). */
export async function loadAnalisiDataset(studioId: string, kind: AnalisiKind): Promise<AnalisiDataset> {
  const loads: [
    Promise<unknown[]>,
    Promise<unknown[]>,
    Promise<unknown[]>,
    Promise<unknown[]>,
    Promise<unknown[]> | null,
  ] = [
    fetchStudioCollectionForExport('documents', studioId),
    fetchStudioCollectionForExport('clients', studioId),
    fetchStudioCollectionForExport('suppliers', studioId),
    fetchStudioCollectionForExport('products', studioId),
    kind === 'flussi' ? fetchStudioCollectionForExport('payments', studioId) : null,
  ]

  const [docsRaw, clientsRaw, suppliersRaw, productsRaw, paymentsRaw] = await Promise.all([
    loads[0],
    loads[1],
    loads[2],
    loads[3],
    loads[4] ?? Promise.resolve([]),
  ])

  const allDocs = docsRaw as unknown as DocRecord[]
  const documents = allDocs.filter(d => {
    if (d.status === 'cancelled') return false
    if (kind === 'vendite') return SALES_SET.has(d.type)
    if (kind === 'acquisti') return PURCHASE_SET.has(d.type)
    return SALES_SET.has(d.type) || PURCHASE_SET.has(d.type)
  })

  const clientsById = new Map<string, Client>()
  for (const c of clientsRaw as unknown as Client[]) clientsById.set(c.id, c)
  const suppliersById = new Map<string, Supplier>()
  for (const s of suppliersRaw as unknown as Supplier[]) suppliersById.set(s.id, s)
  const productsById = new Map<string, Product>()
  const productsByCode = new Map<string, Product>()
  for (const p of productsRaw as unknown as Product[]) {
    productsById.set(p.id, p)
    if (p.code) productsByCode.set(p.code, p)
  }

  return {
    documents,
    payments: (paymentsRaw as unknown as Payment[]) || [],
    clientsById,
    suppliersById,
    productsById,
    productsByCode,
  }
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function periodRange(opts: {
  period: AnalisiPeriod
  year?: number
  month?: number
  customFrom?: string
  customTo?: string
}): { from: Date | null; to: Date | null } {
  const { period } = opts
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (period) {
    case 'oggi': {
      const d = new Date(y, m, now.getDate())
      return { from: d, to: endOfDay(d) }
    }
    case 'ieri': {
      const d = new Date(y, m, now.getDate() - 1)
      return { from: d, to: endOfDay(d) }
    }
    case 'settimanaCorrente': {
      const start = startOfIsoWeek(now)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { from: start, to: endOfDay(end) }
    }
    case 'settimanaScorsa': {
      const start = startOfIsoWeek(now)
      start.setDate(start.getDate() - 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { from: start, to: endOfDay(end) }
    }
    case 'trimestreCorrente': {
      const q = Math.floor(m / 3)
      return { from: new Date(y, q * 3, 1), to: endOfDay(new Date(y, q * 3 + 3, 0)) }
    }
    case 'trimestreScorso': {
      const q = Math.floor(m / 3) - 1
      const yy = q < 0 ? y - 1 : y
      const qq = (q + 4) % 4
      return { from: new Date(yy, qq * 3, 1), to: endOfDay(new Date(yy, qq * 3 + 3, 0)) }
    }
    case 'meseCorrente':
      return { from: new Date(y, m, 1), to: endOfDay(new Date(y, m + 1, 0)) }
    case 'meseScorso':
      return { from: new Date(y, m - 1, 1), to: endOfDay(new Date(y, m, 0)) }
    case 'annoCorrente':
      return { from: new Date(y, 0, 1), to: endOfDay(new Date(y, 11, 31)) }
    case 'annoScorso':
      return { from: new Date(y - 1, 0, 1), to: endOfDay(new Date(y - 1, 11, 31)) }
    case 'month': {
      if (opts.year == null || opts.month == null) return { from: null, to: null }
      return { from: new Date(opts.year, opts.month, 1), to: endOfDay(new Date(opts.year, opts.month + 1, 0)) }
    }
    case 'custom': {
      const from = opts.customFrom ? parseDocDate(opts.customFrom) : null
      const to = opts.customTo ? parseDocDate(opts.customTo) : null
      return { from, to: to ? endOfDay(to) : null }
    }
    default:
      return { from: null, to: null }
  }
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** Converte un periodo Analisi in intervallo ISO (YYYY-MM-DD) per filtri elenco documenti. */
export function resolvePeriodIsoRange(opts: {
  period: AnalisiPeriod
  year?: number
  month?: number
  customFrom?: string
  customTo?: string
}): { from: string; to: string } {
  const { from, to } = periodRange(opts)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

type RowContext = {
  doc: DocRecord
  date: Date | null
  client?: Client
  supplier?: Supplier
}

/** Estrae la chiave + etichetta + sortKey della dimensione per un documento. */
function dimensionKeyForDoc(dim: AnalisiDimension, ctx: RowContext): { key: string; label: string; sortKey: number } {
  const { doc, date, client } = ctx
  const subject = doc.subjectType === 'supplier' ? ctx.supplier : client
  switch (dim) {
    case 'mese': {
      if (!date) return { key: 'na', label: 'Senza data', sortKey: -1 }
      const y = date.getFullYear()
      const m = date.getMonth()
      return { key: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTH_NAMES[m]} ${y}`, sortKey: y * 12 + m }
    }
    case 'anno': {
      if (!date) return { key: 'na', label: 'Senza data', sortKey: -1 }
      const y = date.getFullYear()
      return { key: String(y), label: String(y), sortKey: y }
    }
    case 'giorno': {
      if (!date) return { key: 'na', label: 'Senza data', sortKey: -1 }
      return { key: date.toISOString().slice(0, 10), label: fmtDateIt(date), sortKey: date.getTime() }
    }
    case 'settimana': {
      if (!date) return { key: 'na', label: 'Senza data', sortKey: -1 }
      const start = startOfIsoWeek(date)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return {
        key: start.toISOString().slice(0, 10),
        label: `${fmtDateIt(start)} – ${fmtDateIt(end)}`,
        sortKey: start.getTime(),
      }
    }
    case 'giornoSettimana': {
      if (!date) return { key: 'na', label: 'Senza data', sortKey: -1 }
      const wd = date.getDay()
      const sortKey = (wd + 6) % 7
      return { key: String(wd), label: WEEKDAY_NAMES[wd], sortKey }
    }
    case 'giornoMese': {
      if (!date) return { key: 'na', label: 'Senza data', sortKey: -1 }
      const d = date.getDate()
      return { key: String(d), label: String(d), sortKey: d }
    }
    case 'singoliDocumenti':
      return {
        key: doc.id,
        label: `${doc.fullNumber || doc.number || '—'} • ${doc.subjectName || '—'}`,
        sortKey: date ? date.getTime() : 0,
      }
    case 'cliente':
      return { key: doc.subjectId || doc.subjectName || 'na', label: doc.subjectName || 'Senza soggetto', sortKey: 0 }
    case 'codSoggetto': {
      const code = subject?.code || ''
      return { key: code || 'na', label: code || 'Senza codice', sortKey: 0 }
    }
    case 'citta': {
      const city = subject?.city?.trim() || ''
      return { key: city.toLowerCase() || 'na', label: city || 'Senza città', sortKey: 0 }
    }
    case 'provincia': {
      const prov = subject?.province?.trim() || ''
      return { key: prov.toUpperCase() || 'na', label: prov || 'Senza provincia', sortKey: 0 }
    }
    case 'nazione': {
      const naz = subject?.nation?.trim() || 'Italia'
      return { key: naz.toLowerCase(), label: naz, sortKey: 0 }
    }
    case 'regione': {
      const reg = regioneFromProvincia(subject?.province)
      return { key: reg ? reg.toLowerCase() : 'na', label: reg || 'Senza regione', sortKey: 0 }
    }
    case 'agente': {
      const agent = doc.agentName?.trim() || client?.agent?.trim() || ''
      return { key: agent.toLowerCase() || 'na', label: agent || 'Senza agente', sortKey: 0 }
    }
    case 'listino': {
      const pl = doc.priceList || subject?.priceList
      const label = pl ? PRICE_LIST_LABELS[pl] || pl : 'Senza listino'
      return { key: pl || 'na', label, sortKey: 0 }
    }
    case 'pagamento': {
      const pm = doc.paymentMethod?.trim() || subject?.paymentMethod?.trim() || ''
      return { key: pm.toLowerCase() || 'na', label: pm || 'Senza pagamento', sortKey: 0 }
    }
    case 'coordBancarie': {
      const iban = doc.bankIban?.trim() || doc.bankName?.trim() || subject?.bankAccount?.trim() || ''
      return { key: iban.toLowerCase() || 'na', label: iban || 'Senza coordinate', sortKey: 0 }
    }
    default:
      return { key: 'na', label: '—', sortKey: 0 }
  }
}

function calcDocValue(doc: DocRecord, calc: AnalisiCalc): number {
  switch (calc) {
    case 'totDovuto':
      return doc.totalDocument || 0
    case 'imponibile':
      return doc.totalNet || 0
    case 'iva':
      return doc.totalVat || 0
    case 'quantita':
      return (doc.rows || []).reduce((a, r) => a + (r.quantity || 0), 0)
    case 'numero':
      return 1
    default:
      return 0
  }
}

function calcRowValue(row: DocRecord['rows'][number], calc: AnalisiCalc): number {
  switch (calc) {
    case 'totDovuto':
      return row.total || 0
    case 'imponibile':
      return row.totalNet || 0
    case 'iva':
      return (row.total || 0) - (row.totalNet || 0)
    case 'quantita':
      return row.quantity || 0
    case 'numero':
      return 1
    default:
      return 0
  }
}

export type AggregateOptions = {
  kind: AnalisiKind
  dimension: AnalisiDimension
  calc: AnalisiCalc
  period: AnalisiPeriod
  periodYear?: number
  periodMonth?: number
  customFrom?: string
  customTo?: string
  /** Filtro per soggetto (id) — «Mostra: cliente specifico». */
  subjectId?: string | null
  /** Filtro per prodotto (id) — «Mostra: prodotto specifico». */
  productId?: string | null
  /** Filtro per agente. */
  agent?: string | null
}

/** Aggrega il dataset secondo le opzioni e ritorna i bucket pronti per la lista/grafico. */
export function aggregateAnalisi(dataset: AnalisiDataset, opts: AggregateOptions): AnalisiResult {
  const { from, to } = periodRange({
    period: opts.period,
    year: opts.periodYear,
    month: opts.periodMonth,
    customFrom: opts.customFrom,
    customTo: opts.customTo,
  })
  const productLevel = isProductLevelDimension(opts.dimension)
  const buckets = new Map<string, AnalisiBucket>()
  let total = 0
  let count = 0

  for (const doc of dataset.documents) {
    const date = parseDocDate(doc.date) ?? parseDocDate((doc as { createdAt?: unknown }).createdAt)
    if (from && (!date || date < from)) continue
    if (to && (!date || date > to)) continue

    if (opts.subjectId && doc.subjectId !== opts.subjectId) continue
    if (opts.agent) {
      const client = doc.subjectId ? dataset.clientsById.get(doc.subjectId) : undefined
      const agent = (doc.agentName || client?.agent || '').trim().toLowerCase()
      if (agent !== opts.agent.trim().toLowerCase()) continue
    }

    const client = doc.subjectId ? dataset.clientsById.get(doc.subjectId) : undefined
    const supplier = doc.subjectId ? dataset.suppliersById.get(doc.subjectId) : undefined
    const ctx: RowContext = { doc, date, client, supplier }

    // Segno per i flussi: vendite positive, acquisti negativi.
    const sign = opts.kind === 'flussi' && PURCHASE_SET.has(doc.type) ? -1 : 1

    if (productLevel) {
      for (const row of doc.rows || []) {
        if (opts.productId && row.productId !== opts.productId) continue
        const meta = productDimensionKey(opts.dimension, row, dataset)
        const value = calcRowValue(row, opts.calc) * sign
        upsert(buckets, meta.key, meta.label, value, meta.sortKey)
        total += value
        count += 1
      }
    } else {
      if (opts.productId) {
        // Filtra documenti che contengono il prodotto.
        const hasProduct = (doc.rows || []).some(r => r.productId === opts.productId)
        if (!hasProduct) continue
      }
      const meta = dimensionKeyForDoc(opts.dimension, ctx)
      const value = calcDocValue(doc, opts.calc) * sign
      upsert(buckets, meta.key, meta.label, value, meta.sortKey)
      total += value
      count += 1
    }
  }

  let max = 0
  for (const b of buckets.values()) {
    b.negative = b.value < 0
    const abs = Math.abs(b.value)
    if (abs > max) max = abs
  }

  return { buckets: Array.from(buckets.values()), total, count, max }
}

export type FlussiAggregateOptions = {
  mode: AnalisiFlussiMode
  period: AnalisiPeriod
  periodYear?: number
  periodMonth?: number
  customFrom?: string
  customTo?: string
  subjectId?: string | null
  onlySettled?: boolean
}

function monthBucketKey(date: Date): { key: string; label: string; sortKey: number } {
  const y = date.getFullYear()
  const m = date.getMonth()
  return { key: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTH_NAMES[m]} ${y}`, sortKey: y * 12 + m }
}

function parsePaymentDate(payment: Payment): Date | null {
  const raw = payment.settled && payment.settledDate ? payment.settledDate : payment.date
  return parseDocDate(raw)
}

function docAmountForFlussi(doc: DocRecord, mode: AnalisiFlussiMode): number {
  if (mode === 'fatturatoNetto') return doc.totalNet || 0
  return doc.totalDocument || 0
}

/** Aggrega entrate/uscite/saldo per mese (analisi flussi Danea). */
export function aggregateFlussi(dataset: AnalisiDataset, opts: FlussiAggregateOptions): FlussiResult {
  const { from, to } = periodRange({
    period: opts.period,
    year: opts.periodYear,
    month: opts.periodMonth,
    customFrom: opts.customFrom,
    customTo: opts.customTo,
  })

  const buckets = new Map<string, FlussiBucket>()
  let totalEntrate = 0
  let totalUscite = 0

  const settledDocIds = new Set<string>()
  if (opts.onlySettled && opts.mode !== 'pagamenti') {
    for (const payment of dataset.payments) {
      if (payment.settled && payment.linkedDocumentId) settledDocIds.add(payment.linkedDocumentId)
    }
  }

  const upsertFlussi = (date: Date, entrate: number, uscite: number) => {
    const meta = monthBucketKey(date)
    const existing = buckets.get(meta.key)
    if (existing) {
      existing.entrate += entrate
      existing.uscite += uscite
      existing.saldo = existing.entrate - existing.uscite
    } else {
      buckets.set(meta.key, {
        key: meta.key,
        label: meta.label,
        sortKey: meta.sortKey,
        entrate,
        uscite,
        saldo: entrate - uscite,
      })
    }
    totalEntrate += entrate
    totalUscite += uscite
  }

  if (opts.mode === 'pagamenti') {
    for (const payment of dataset.payments) {
      if (opts.onlySettled && !payment.settled) continue
      const date = parsePaymentDate(payment)
      if (!date) continue
      if (from && date < from) continue
      if (to && date > to) continue
      if (opts.subjectId && payment.subjectId !== opts.subjectId) continue

      const entrate = payment.amountIn || 0
      const uscite = payment.amountOut || 0
      if (entrate === 0 && uscite === 0) continue
      upsertFlussi(date, entrate, uscite)
    }
  } else {
    for (const doc of dataset.documents) {
      if (doc.status === 'cancelled') continue
      const date = parseDocDate(doc.date) ?? parseDocDate((doc as { createdAt?: unknown }).createdAt)
      if (!date) continue
      if (from && date < from) continue
      if (to && date > to) continue
      if (opts.subjectId && doc.subjectId !== opts.subjectId) continue
      if (opts.onlySettled && !settledDocIds.has(doc.id)) continue

      const amount = docAmountForFlussi(doc, opts.mode)
      if (amount <= 0) continue
      if (SALES_SET.has(doc.type)) {
        upsertFlussi(date, amount, 0)
      } else if (PURCHASE_SET.has(doc.type)) {
        upsertFlussi(date, 0, amount)
      }
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey)
  return {
    buckets: sorted,
    totalEntrate,
    totalUscite,
    totalSaldo: totalEntrate - totalUscite,
    count: sorted.length,
  }
}

function upsert(map: Map<string, AnalisiBucket>, key: string, label: string, value: number, sortKey: number) {
  const existing = map.get(key)
  if (existing) {
    existing.value += value
    existing.count += 1
  } else {
    map.set(key, { key, label, value, count: 1, sortKey, negative: false })
  }
}

function productDimensionKey(
  dim: AnalisiDimension,
  row: DocRecord['rows'][number],
  dataset: AnalisiDataset,
): { key: string; label: string; sortKey: number } {
  const product = row.productId
    ? dataset.productsById.get(row.productId)
    : row.productCode
      ? dataset.productsByCode.get(row.productCode)
      : undefined
  switch (dim) {
    case 'categoriaProdotto': {
      const cat = product?.categoryName?.trim() || ''
      return { key: cat.toLowerCase() || 'na', label: cat || 'Senza categoria', sortKey: 0 }
    }
    case 'sottocatProdotto': {
      const sub = product?.subcategoryName?.trim() || ''
      return { key: sub.toLowerCase() || 'na', label: sub || 'Senza sottocategoria', sortKey: 0 }
    }
    case 'prodotto': {
      const name = product?.name?.trim() || row.description?.trim() || ''
      return { key: (row.productId || name).toLowerCase() || 'na', label: name || 'Senza prodotto', sortKey: 0 }
    }
    case 'codiceProdotto': {
      const code = row.productCode?.trim() || product?.code?.trim() || ''
      return { key: code.toLowerCase() || 'na', label: code || 'Senza codice', sortKey: 0 }
    }
    case 'descrProdotto': {
      const desc = row.description?.trim() || ''
      return { key: desc.toLowerCase() || 'na', label: desc || 'Senza descrizione', sortKey: 0 }
    }
    case 'produttoreProdotto': {
      const brand = product?.brand?.trim() || ''
      return { key: brand.toLowerCase() || 'na', label: brand || 'Senza produttore', sortKey: 0 }
    }
    case 'fornitoreProdotto': {
      const sup = product?.supplierName?.trim() || ''
      return { key: sup.toLowerCase() || 'na', label: sup || 'Senza fornitore', sortKey: 0 }
    }
    case 'codiceIva': {
      const rate = row.vatRate ?? 0
      return { key: String(rate), label: `IVA ${rate}%`, sortKey: rate }
    }
    default:
      return { key: 'na', label: '—', sortKey: 0 }
  }
}

const TEMPORAL_DIMENSIONS: ReadonlySet<AnalisiDimension> = new Set<AnalisiDimension>([
  'mese',
  'giorno',
  'settimana',
  'anno',
  'giornoSettimana',
  'giornoMese',
  'singoliDocumenti',
])

export function isTemporalDimension(dim: AnalisiDimension): boolean {
  return TEMPORAL_DIMENSIONS.has(dim)
}

export type SortMode = 'natural' | 'valueDesc' | 'valueAsc' | 'alpha'

/** Ordina i bucket secondo la dimensione e la modalità scelta dal pulsante «Ordina». */
export function sortBuckets(buckets: AnalisiBucket[], dim: AnalisiDimension, mode: SortMode): AnalisiBucket[] {
  const arr = [...buckets]
  const temporal = isTemporalDimension(dim)
  switch (mode) {
    case 'valueDesc':
      return arr.sort((a, b) => b.value - a.value)
    case 'valueAsc':
      return arr.sort((a, b) => a.value - b.value)
    case 'alpha':
      return arr.sort((a, b) => a.label.localeCompare(b.label, 'it'))
    case 'natural':
    default:
      if (temporal) return arr.sort((a, b) => a.sortKey - b.sortKey)
      return arr.sort((a, b) => b.value - a.value)
  }
}

export function formatCurrency(value: number): string {
  return `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatValue(value: number, calc: AnalisiCalc): string {
  if (calc === 'quantita') return value.toLocaleString('it-IT', { maximumFractionDigits: 2 })
  if (calc === 'numero') return value.toLocaleString('it-IT', { maximumFractionDigits: 0 })
  return formatCurrency(value)
}
