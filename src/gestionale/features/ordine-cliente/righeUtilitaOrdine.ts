import * as XLSX from 'xlsx'
import { exportRowsToXlsx, buildExportFilename } from '../../../lib/exportExcel'
import type { Product } from '../../../types'
import type { RigaOrdineCliente } from '../ordine-cliente/types'
import {
  calcRigaOrdine,
  documentTotalsFromRigheOrdine,
  emptyRigaOrdine,
} from '../ordine-cliente/utils'
import { formatEuro, productListGrossPrice } from '../vendita-banco/utils'

export function sortRigheOrdine(
  righe: RigaOrdineCliente[],
  column: 'prezzoNetto' | 'sconto' | 'iva' | 'impegnaMag',
  direction: 'asc' | 'desc',
): RigaOrdineCliente[] {
  const emptyTrailing = righe.length > 0 && !righe[righe.length - 1].descrizione.trim()
  const body = emptyTrailing ? righe.slice(0, -1) : [...righe]
  const sorted = [...body].sort((a, b) => {
    const av = column === 'impegnaMag' ? Number(a.impegnaMagazzino) : a[column]
    const bv = column === 'impegnaMag' ? Number(b.impegnaMagazzino) : b[column]
    if (av < bv) return direction === 'asc' ? -1 : 1
    if (av > bv) return direction === 'asc' ? 1 : -1
    return 0
  })
  return emptyTrailing ? [...sorted, emptyRigaOrdine()] : sorted
}

export function moveRigaOrdine(righe: RigaOrdineCliente[], index: number, direction: -1 | 1): RigaOrdineCliente[] {
  const target = index + direction
  if (target < 0 || target >= righe.length) return righe
  const next = [...righe]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function righeBasePerCalcolataPercentualeOrdine(righe: RigaOrdineCliente[]): RigaOrdineCliente[] {
  return righe.filter(
    r => r.descrizione.trim() && r.tipoRiga !== 'nota' && r.tipoRiga !== 'calcolata',
  )
}

export function buildSubtotaleRigaOrdine(righe: RigaOrdineCliente[]): RigaOrdineCliente {
  const active = righe.filter(r => r.descrizione.trim() && r.tipoRiga !== 'nota')
  const sum = active.reduce((acc, r) => acc + calcRigaOrdine(r).importo, 0)
  return calcRigaOrdine({
    ...emptyRigaOrdine(),
    descrizione: `Subtotale: ${formatEuro(sum)}`,
    tipoRiga: 'nota',
    qta: 0,
    prezzoNetto: 0,
    impegnaMagazzino: false,
  })
}

export function buildPercentualeRigaOrdine(
  righe: RigaOrdineCliente[],
  label: string,
  percent: number,
): RigaOrdineCliente {
  const base = righeBasePerCalcolataPercentualeOrdine(righe)
  const totals = documentTotalsFromRigheOrdine(base)
  const grossAmount = Math.round(totals.totaleDocumento * (percent / 100) * 100) / 100
  const iva = 22
  return calcRigaOrdine({
    ...emptyRigaOrdine(),
    descrizione: label,
    prezzoNetto: grossAmount,
    qta: 1,
    iva,
    tipoRiga: 'calcolata',
    impegnaMagazzino: false,
  })
}

export function buildImportoFissoRigaOrdine(label: string, amountGross: number, iva = 22): RigaOrdineCliente {
  return calcRigaOrdine({
    ...emptyRigaOrdine(),
    descrizione: label,
    prezzoNetto: amountGross,
    qta: 1,
    iva,
    tipoRiga: 'calcolata',
    impegnaMagazzino: false,
  })
}

export function scontoSuTotaleRigheOrdine(righe: RigaOrdineCliente[], percent: number): RigaOrdineCliente[] {
  const pct = Math.max(0, Math.min(100, percent))
  return righe.map(r => {
    if (!r.descrizione.trim() || r.tipoRiga === 'nota' || r.tipoRiga === 'calcolata') return r
    return calcRigaOrdine({ ...r, sconto: pct })
  })
}

export function portaTotaleAOrdine(righe: RigaOrdineCliente[], targetTotal: number): RigaOrdineCliente[] {
  if (!Number.isFinite(targetTotal) || targetTotal <= 0) return righe
  const adjustable = righeBasePerCalcolataPercentualeOrdine(righe)
  const current = documentTotalsFromRigheOrdine(adjustable).totaleDocumento
  if (current <= 0) return righe
  const factor = targetTotal / current
  return righe.map(r => {
    if (!r.descrizione.trim() || r.tipoRiga === 'nota' || r.tipoRiga === 'calcolata') return r
    return calcRigaOrdine({
      ...r,
      prezzoNetto: Math.round(r.prezzoNetto * factor * 100) / 100,
    })
  })
}

export function confrontaPrezziCatalogoOrdine(
  righe: RigaOrdineCliente[],
  products: Product[],
  listino: string,
): string {
  const active = righe.filter(r => r.productId && r.descrizione.trim())
  if (!active.length) return 'Nessuna riga con prodotto collegato.'
  const lines = active.map(r => {
    const p = products.find(x => x.id === r.productId)
    if (!p) return `${r.cod}: prodotto non trovato in archivio`
    const catalog = productListGrossPrice(p, listino)
    const diff = Math.round((r.prezzoNetto - catalog) * 100) / 100
    const status = diff === 0 ? 'OK' : diff > 0 ? `+${formatEuro(diff)}` : formatEuro(diff)
    return `${r.cod} ${r.descrizione}: doc ${formatEuro(r.prezzoNetto)} / listino ${formatEuro(catalog)} (${status})`
  })
  return lines.join('\n')
}

export function exportRigheOrdineExcel(righe: RigaOrdineCliente[]): void {
  const active = righe.filter(r => r.descrizione.trim()).map(calcRigaOrdine)
  exportRowsToXlsx({
    rows: active,
    filename: buildExportFilename('ordine_cliente', 'righe'),
    sheetName: 'Righe',
    columns: [
      { header: 'Cod.', value: r => r.cod },
      { header: 'Descrizione', value: r => r.descrizione },
      { header: 'Q.tà', value: r => r.qta },
      { header: 'U.m.', value: r => r.um },
      { header: 'Prezzo ivato', value: r => r.prezzoNetto },
      { header: 'Sconti', value: r => r.sconto },
      { header: 'Iva', value: r => r.iva },
      { header: 'Importo', value: r => r.importo },
    ],
  })
}

export async function importRigheOrdineFromExcel(file: File): Promise<RigaOrdineCliente[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return rows
    .map(row => {
      const descrizione = String(row.Descrizione ?? row.descrizione ?? '').trim()
      if (!descrizione) return null
      const prezzoNetto =
        Number(row['Prezzo netto'] ?? row.prezzoNetto ?? row['Prezzo ivato'] ?? row.prezzoIvato ?? 0) || 0
      return calcRigaOrdine({
        ...emptyRigaOrdine(),
        cod: String(row['Cod.'] ?? row.cod ?? ''),
        descrizione,
        qta: Number(row['Q.tà'] ?? row.qta ?? 1) || 1,
        um: String(row['U.m.'] ?? row.um ?? 'pz'),
        prezzoNetto,
        sconto: Number(row.Sconti ?? row.sconto ?? 0) || 0,
        iva: Number(row.Iva ?? row.iva ?? 22) || 22,
      })
    })
    .filter((r): r is RigaOrdineCliente => r !== null)
}
