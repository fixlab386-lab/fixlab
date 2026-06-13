import type { Product, StockMovement } from '../../../types'
import { calcDisponibile, computeStockStatus, type StockStatus } from '../../lib/stockAvailability'

export type StockSituationRow = {
  productId: string
  code: string
  name: string
  category: string
  giacenza: number
  impegnata: number
  ordinata: number
  disponibile: number
  scortaMinima: number
  stato: StockStatus
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  regolare: 'Regolare',
  in_arrivo: 'In arrivo',
  da_ordinare: 'Da ordinare',
  sotto_scorta: 'Sotto scorta',
  esaurito: 'Esaurito',
}

export function aggregateStockForProduct(productId: string, movements: StockMovement[]) {
  const forProduct = movements.filter(m => m.productId === productId)
  const impegnata = forProduct.reduce((s, m) => s + (m.committed || 0), 0)
  const ordinata = forProduct.reduce((s, m) => s + (m.incoming || 0), 0)
  return { impegnata, ordinata }
}

export function buildStockSituationRows(products: Product[], movements: StockMovement[]): StockSituationRow[] {
  return products
    .filter(p => p.typology === 'with_stock')
    .map(p => {
      const { impegnata, ordinata } = aggregateStockForProduct(p.id, movements)
      const giacenza = p.stock ?? 0
      const scortaMinima = p.minStock ?? 0
      const disponibile = calcDisponibile(giacenza, impegnata, ordinata)
      const stato = computeStockStatus(disponibile, scortaMinima, ordinata)
      return {
        productId: p.id,
        code: p.code || '',
        name: p.name,
        category: p.categoryName || '',
        giacenza,
        impegnata,
        ordinata,
        disponibile,
        scortaMinima,
        stato,
      }
    })
}

export function filterStockSituation(
  rows: StockSituationRow[],
  searchLower: string,
  statusFilter: StockStatus | 'all',
): StockSituationRow[] {
  return rows.filter(r => {
    if (statusFilter !== 'all' && r.stato !== statusFilter) return false
    if (!searchLower) return true
    const hay = `${r.code} ${r.name} ${r.category}`.toLowerCase()
    return hay.includes(searchLower)
  })
}

export function exportStockSituationCsv(rows: StockSituationRow[]): void {
  const header = ['Codice', 'Descrizione', 'Categoria', 'Giacenza', 'Impegnata', 'Ordinata', 'Disponibile', 'Scorta min.', 'Stato']
  const lines = rows.map(r =>
    [
      r.code,
      r.name,
      r.category,
      r.giacenza,
      r.impegnata,
      r.ordinata,
      r.disponibile,
      r.scortaMinima,
      STOCK_STATUS_LABELS[r.stato],
    ].join(';'),
  )
  const blob = new Blob([`\uFEFF${header.join(';')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `situazione-scorte-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
