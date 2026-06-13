import type { DocumentRow } from '../../types'

export function calcDocumentRow(row: DocumentRow): DocumentRow {
  const net = row.quantity * row.unitPrice * (1 - (row.discount || 0) / 100)
  const total = net * (1 + row.vatRate / 100)
  return {
    ...row,
    totalNet: Math.round(net * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
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
  const active = rows.filter(r => r.description)
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
  const shipNet = shippingCost || 0
  const shipVat = shipNet * (shippingVatRate / 100)
  netSum += shipNet
  vatSum += shipVat
  if (shipVat > 0) {
    vatByRate.set(shippingVatRate, (vatByRate.get(shippingVatRate) || 0) + shipVat)
  }
  return {
    totalNet: Math.round(netSum * 100) / 100,
    totalVat: Math.round(vatSum * 100) / 100,
    totalDocument: Math.round((netSum + vatSum) * 100) / 100,
    vatByRate,
  }
}
