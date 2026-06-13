import type { DocumentRow } from '../../../types'
import { roundMoney } from '../../lib/documentTotals'

/** `unitPrice` è prezzo unitario ivato (modalità retail FIXLab). */
export function calcDocumentRow(row: DocumentRow): DocumentRow {
  const factor = 1 - (row.discount || 0) / 100
  const total = roundMoney(row.quantity * row.unitPrice * factor)
  const totalNet =
    row.vatRate > 0 ? roundMoney(total / (1 + row.vatRate / 100)) : total
  return { ...row, totalNet, total }
}

export function emptyDocumentRow(): DocumentRow {
  return calcDocumentRow({
    id: crypto.randomUUID(),
    productId: '',
    productCode: '',
    description: '',
    quantity: 1,
    unitOfMeasure: 'pz',
    unitPrice: 0,
    discount: 0,
    vatRate: 22,
    totalNet: 0,
    total: 0,
  })
}

export function documentTotals(
  rows: DocumentRow[],
  shippingCost = 0,
  shippingVatRate = 22,
): { totalNet: number; totalVat: number; totalDocument: number; vatByRate: Map<number, number> } {
  const active = rows.filter(r => r.description.trim())
  const vatByRate = new Map<number, number>()
  let netSum = 0
  let vatSum = 0

  for (const r of active) {
    const row = calcDocumentRow(r)
    netSum += row.totalNet
    const rowVat = row.total - row.totalNet
    vatSum += rowVat
    vatByRate.set(row.vatRate, (vatByRate.get(row.vatRate) || 0) + rowVat)
  }

  const shipGross = shippingCost || 0
  if (shipGross > 0) {
    const shipNet = shippingVatRate > 0 ? roundMoney(shipGross / (1 + shippingVatRate / 100)) : shipGross
    const shipVat = roundMoney(shipGross - shipNet)
    netSum += shipNet
    vatSum += shipVat
    if (shipVat > 0) {
      vatByRate.set(shippingVatRate, (vatByRate.get(shippingVatRate) || 0) + shipVat)
    }
  }

  return {
    totalNet: roundMoney(netSum),
    totalVat: roundMoney(vatSum),
    totalDocument: roundMoney(netSum + vatSum),
    vatByRate,
  }
}
