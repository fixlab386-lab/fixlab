import * as XLSX from 'xlsx'
import { exportRowsToXlsx, buildExportFilename } from '../../../lib/exportExcel'
import type { Product } from '../../../types'
import type { RigaDocumento } from './types'
import { calcRiga, documentTotalsFromRighe, emptyRiga, formatEuro, netFromGross, productListGrossPrice } from './utils'

export function sortRighe(
  righe: RigaDocumento[],
  column: 'prezzoIvato' | 'sconto' | 'iva' | 'scaricaMag',
  direction: 'asc' | 'desc',
): RigaDocumento[] {
  const emptyTrailing = righe.length > 0 && !righe[righe.length - 1].descrizione.trim()
  const body = emptyTrailing ? righe.slice(0, -1) : [...righe]
  const sorted = [...body].sort((a, b) => {
    const av = column === 'scaricaMag' ? Number(a.scaricaMagazzino) : a[column]
    const bv = column === 'scaricaMag' ? Number(b.scaricaMagazzino) : b[column]
    if (av < bv) return direction === 'asc' ? -1 : 1
    if (av > bv) return direction === 'asc' ? 1 : -1
    return 0
  })
  return emptyTrailing ? [...sorted, emptyRiga()] : sorted
}

export function moveRiga(righe: RigaDocumento[], index: number, direction: -1 | 1): RigaDocumento[] {
  const target = index + direction
  if (target < 0 || target >= righe.length) return righe
  const next = [...righe]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function addSubtotaleRiga(righe: RigaDocumento[]): RigaDocumento[] {
  const active = righe.filter(r => r.descrizione.trim())
  const sum = active.reduce((acc, r) => acc + calcRiga(r).importoIvato, 0)
  const row = calcRiga({
    ...emptyRiga(),
    descrizione: `Subtotale: ${formatEuro(sum)}`,
    tipoRiga: 'nota',
    qta: 0,
    prezzoIvato: 0,
  })
  return [...righe.filter(r => r.descrizione.trim()), row, emptyRiga()]
}

export function addPercentualeRiga(righe: RigaDocumento[], label: string, percent: number): RigaDocumento[] {
  const totals = documentTotalsFromRighe(righe.filter(r => r.descrizione.trim()))
  const amount = Math.round(totals.totaleDocumento * (percent / 100) * 100) / 100
  const row = calcRiga({
    ...emptyRiga(),
    descrizione: label,
    prezzoIvato: amount,
    qta: 1,
    iva: 22,
    tipoRiga: 'calcolata',
  })
  return [...righe.filter(r => r.descrizione.trim()), row, emptyRiga()]
}

export function scorporaTotaleRighe(righe: RigaDocumento[]): string {
  const active = righe.filter(r => r.descrizione.trim()).map(calcRiga)
  if (!active.length) return 'Nessuna riga da scorporare.'
  const lines = active.map(r => {
    const net = netFromGross(r.importoIvato, r.iva)
    return `${r.descrizione || r.cod}: ivato ${formatEuro(r.importoIvato)} → netto ${formatEuro(net)} (IVA ${r.iva}%)`
  })
  const totals = documentTotalsFromRighe(active)
  lines.push(`Totale netto: ${formatEuro(totals.totNetto)} | IVA: ${formatEuro(totals.totIva)} | Totale: ${formatEuro(totals.totaleDocumento)}`)
  return lines.join('\n')
}

export function confrontaPrezziCatalogo(righe: RigaDocumento[], products: Product[], listino: string): string {
  const active = righe.filter(r => r.productId && r.descrizione.trim())
  if (!active.length) return 'Nessuna riga con prodotto collegato.'
  const lines = active.map(r => {
    const p = products.find(x => x.id === r.productId)
    if (!p) return `${r.cod}: prodotto non trovato in archivio`
    const catalog = productListGrossPrice(p, listino)
    const diff = Math.round((r.prezzoIvato - catalog) * 100) / 100
    const status = diff === 0 ? 'OK' : diff > 0 ? `+${formatEuro(diff)}` : formatEuro(diff)
    return `${r.cod} ${r.descrizione}: doc ${formatEuro(r.prezzoIvato)} / listino ${formatEuro(catalog)} (${status})`
  })
  return lines.join('\n')
}

export function ruotaTotaleIva(righe: RigaDocumento[], newIva: number): RigaDocumento[] {
  return righe.map(r =>
    r.descrizione.trim() ? calcRiga({ ...r, iva: newIva }) : r,
  )
}

export function exportRigheExcel(righe: RigaDocumento[]): void {
  const active = righe.filter(r => r.descrizione.trim()).map(calcRiga)
  exportRowsToXlsx({
    rows: active,
    filename: buildExportFilename('vendita_banco', 'righe'),
    sheetName: 'Righe',
    columns: [
      { header: 'Cod.', value: r => r.cod },
      { header: 'Descrizione', value: r => r.descrizione },
      { header: 'Q.tà', value: r => r.qta },
      { header: 'U.m.', value: r => r.um },
      { header: 'Prezzo ivato', value: r => r.prezzoIvato },
      { header: 'Sconti', value: r => r.sconto },
      { header: 'Iva', value: r => r.iva },
      { header: 'Importo ivato', value: r => r.importoIvato },
    ],
  })
}

export async function importRigheFromExcel(file: File): Promise<RigaDocumento[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return rows
    .map(row => {
      const descrizione = String(row.Descrizione ?? row.descrizione ?? '').trim()
      if (!descrizione) return null
      return calcRiga({
        ...emptyRiga(),
        cod: String(row['Cod.'] ?? row.cod ?? ''),
        descrizione,
        qta: Number(row['Q.tà'] ?? row.qta ?? 1) || 1,
        um: String(row['U.m.'] ?? row.um ?? 'pz'),
        prezzoIvato: Number(row['Prezzo ivato'] ?? row.prezzoIvato ?? 0) || 0,
        sconto: Number(row.Sconti ?? row.sconto ?? 0) || 0,
        iva: Number(row.Iva ?? row.iva ?? 22) || 22,
      })
    })
    .filter((r): r is RigaDocumento => r !== null)
}
