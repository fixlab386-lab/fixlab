import type { DocumentRow } from '../../../types'
import type { Product } from '../../../types'
import type { DocumentoVenditaBanco, RigaDocumento, ScadenzaPagamento } from './types'

export function formatDataIt(isoDate: string): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

export function parseDataIt(value: string): string {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return value
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function formatEuro(n: number): string {
  return `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function netFromGross(gross: number, vatRate: number): number {
  if (vatRate <= 0) return gross
  return Math.round((gross / (1 + vatRate / 100)) * 100) / 100
}

export function grossFromNet(net: number, vatRate: number): number {
  return Math.round(net * (1 + vatRate / 100) * 100) / 100
}

export function calcRigaImporto(riga: Pick<RigaDocumento, 'qta' | 'prezzoIvato' | 'sconto'>): number {
  const base = riga.qta * riga.prezzoIvato * (1 - (riga.sconto || 0) / 100)
  return Math.round(base * 100) / 100
}

export function calcRiga(riga: RigaDocumento): RigaDocumento {
  const importoIvato = calcRigaImporto(riga)
  return { ...riga, importoIvato }
}

export function emptyRiga(): RigaDocumento {
  return calcRiga({
    id: crypto.randomUUID(),
    cod: '',
    descrizione: '',
    tagliaColore: '',
    qta: 1,
    um: 'pz',
    prezzoIvato: 0,
    sconto: 0,
    iva: 22,
    scaricaMagazzino: true,
    importoIvato: 0,
    tipoRiga: 'normale',
  })
}

export function documentTotalsFromRighe(
  righe: RigaDocumento[],
  speseImporto = 0,
  speseIva = 22,
): {
  totNetto: number
  totIva: number
  totaleDocumento: number
  vatByRate: Map<number, number>
} {
  const active = righe.filter(r => r.descrizione.trim())
  const vatByRate = new Map<number, number>()
  let netSum = 0
  let vatSum = 0

  for (const raw of active) {
    const r = calcRiga(raw)
    const gross = r.importoIvato
    const net = netFromGross(gross, r.iva)
    const rowVat = gross - net
    netSum += net
    vatSum += rowVat
    vatByRate.set(r.iva, (vatByRate.get(r.iva) || 0) + rowVat)
  }

  const shipGross = speseImporto || 0
  if (shipGross > 0) {
    const shipNet = netFromGross(shipGross, speseIva)
    const shipVat = Math.round((shipGross - shipNet) * 100) / 100
    netSum += shipNet
    vatSum += shipVat
    vatByRate.set(speseIva, (vatByRate.get(speseIva) || 0) + shipVat)
  }

  return {
    totNetto: Math.round(netSum * 100) / 100,
    totIva: Math.round(vatSum * 100) / 100,
    totaleDocumento: Math.round((netSum + vatSum) * 100) / 100,
    vatByRate,
  }
}

export function createInitialDocumento(): DocumentoVenditaBanco {
  const today = new Date().toISOString().slice(0, 10)
  return {
    cliente: { id: '', nome: '', codFiscale: '', partitaIva: '' },
    agente: '',
    listino: 'Privati',
    data: today,
    numero: 1,
    numerazione: '',
    seguiraDocVendita: false,
    righe: [emptyRiga()],
    tipoPagamento: '',
    campiLiberi: ['', '', '', ''],
    noteFine: '',
    intestatario: { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    destinazione: { indirizzo: '', cap: '', citta: '', prov: '', nazione: 'Italia' },
    dataOraStampa: '',
    codLotteria: '',
    rinnovo: { attivo: false, mesi: 12 },
    speseTipo: '',
    speseIva: 22,
    speseImporto: 0,
    commentoInterno: '',
    totNetto: 0,
    totIva: 0,
    totaleDocumento: 0,
    protetto: false,
  }
}

/** Predisposizione scadenzario in base al tipo pagamento. */
export function buildScadenzario(
  tipoPagamento: string,
  totale: number,
  dataDocumento: string,
): ScadenzaPagamento[] {
  if (!tipoPagamento || totale <= 0) return []

  const base = new Date(dataDocumento)
  const addDays = (days: number) => {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
  const addMonthsEndOfMonth = (months: number) => {
    const d = new Date(base)
    d.setMonth(d.getMonth() + months)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return last.toISOString().slice(0, 10)
  }

  if (tipoPagamento.includes('Bonifico 30 gg F.M.') || tipoPagamento.includes('RIBA 30 gg F.M.')) {
    return [{ data: addMonthsEndOfMonth(1), importo: totale, descrizione: tipoPagamento }]
  }
  if (tipoPagamento.includes('Bonifico 60 gg F.M.')) {
    return [{ data: addMonthsEndOfMonth(2), importo: totale, descrizione: tipoPagamento }]
  }
  if (tipoPagamento.includes('RIBA 30-60 gg F.M.')) {
    const half = Math.round((totale / 2) * 100) / 100
    return [
      { data: addMonthsEndOfMonth(1), importo: half, descrizione: `${tipoPagamento} — 1ª rata` },
      { data: addMonthsEndOfMonth(2), importo: totale - half, descrizione: `${tipoPagamento} — 2ª rata` },
    ]
  }
  if (tipoPagamento.includes('RIBA 30-60-90 gg F.M.')) {
    const third = Math.round((totale / 3) * 100) / 100
    const rest = totale - third * 2
    return [
      { data: addMonthsEndOfMonth(1), importo: third, descrizione: `${tipoPagamento} — 1ª rata` },
      { data: addMonthsEndOfMonth(2), importo: third, descrizione: `${tipoPagamento} — 2ª rata` },
      { data: addMonthsEndOfMonth(3), importo: rest, descrizione: `${tipoPagamento} — 3ª rata` },
    ]
  }

  return [{ data: dataDocumento, importo: totale, descrizione: tipoPagamento }]
}

export function evalCalcolata(expr: string): number | null {
  const sanitized = expr.replace(/,/g, '.').replace(/[^0-9+\-*/().%\s]/g, '')
  if (!sanitized.trim()) return null
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized})`)() as number
    if (typeof result !== 'number' || !Number.isFinite(result)) return null
    return Math.round(result * 100) / 100
  } catch {
    return null
  }
}

export function productListNetPrice(p: Product, listino: string): number {
  const pl = listinoToPriceList(listino)
  if (pl === 'aziende') return p.prices?.aziende ?? p.price ?? 0
  if (pl === 'convenzionati') return p.prices?.convenzionati ?? p.price ?? 0
  if (pl === 'vip') return p.prices?.vip ?? p.price ?? 0
  return p.prices?.privati ?? p.price ?? 0
}

/** Prezzo ivato da listino prodotto (catalogo FIXLab salva prezzi ivati). */
export function productListGrossPrice(p: Product, listino: string): number {
  return Math.round(productListNetPrice(p, listino) * 100) / 100
}

export function refreshRigheListino(
  righe: RigaDocumento[],
  products: Product[],
  listino: string,
): RigaDocumento[] {
  return righe.map(r => {
    if (!r.productId) return calcRiga(r)
    const p = products.find(x => x.id === r.productId)
    if (!p) return calcRiga(r)
    return calcRiga({
      ...r,
      prezzoIvato: productListGrossPrice(p, listino),
      um: p.unitOfMeasure || r.um,
      cod: p.code || r.cod,
      descrizione: r.descrizione || p.name,
    })
  })
}

export function listinoToPriceList(listino: string): 'privati' | 'aziende' | 'convenzionati' | 'vip' {
  const l = listino.toLowerCase()
  if (l.includes('aziend') || listino === 'Listino 2') return 'aziende'
  if (l.includes('convenz') || listino === 'Listino 3') return 'convenzionati'
  if (l.includes('vip') || listino === 'Listino 4') return 'vip'
  return 'privati'
}

export function rigaToDocumentRow(r: RigaDocumento): DocumentRow {
  const netUnit = netFromGross(r.prezzoIvato, r.iva)
  const lineNet = netFromGross(r.importoIvato, r.iva)
  const qty = r.qta || 1
  return {
    id: r.id,
    productId: r.productId || '',
    productCode: r.cod,
    description: r.descrizione,
    quantity: r.qta,
    unitOfMeasure: r.um,
    unitPrice: Math.round((netUnit) * 100) / 100,
    discount: r.sconto,
    vatRate: r.iva,
    totalNet: Math.round((lineNet) * 100) / 100,
    total: r.importoIvato,
    ...(r.tagliaColore ? { tagliaColore: r.tagliaColore } : {}),
    ...(r.campoFE ? { campoFE: r.campoFE } : {}),
  } as DocumentRow
}

/** Converte riga documento standard → riga vendita al banco (prezzi ivati). */
export function documentRowToRiga(row: DocumentRow): RigaDocumento {
  const qty = row.quantity || 1
  const factor = 1 - (row.discount || 0) / 100
  const prezzoIvato = factor > 0 && qty > 0 ? row.total / (qty * factor) : row.unitPrice
  return calcRiga({
    id: row.id || crypto.randomUUID(),
    productId: row.productId || undefined,
    cod: row.productCode || '',
    descrizione: row.description,
    tagliaColore: (row as DocumentRow & { tagliaColore?: string }).tagliaColore || '',
    qta: qty,
    um: row.unitOfMeasure || 'pz',
    prezzoIvato: Math.round(prezzoIvato * 100) / 100,
    sconto: row.discount || 0,
    iva: row.vatRate,
    scaricaMagazzino: Boolean(row.productId),
    importoIvato: row.total,
    tipoRiga: 'normale',
    campoFE: (row as DocumentRow & { campoFE?: string }).campoFE,
  })
}
