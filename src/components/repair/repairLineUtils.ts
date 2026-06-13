import { DEFAULT_VAT_PERCENT } from '../../gestionale/lib/constants'
import type { RepairProduct } from '../../types'

export function calcLineAmount(line: Pick<RepairProduct, 'price' | 'qty' | 'discount'>): number {
  return Math.max(0, line.price * line.qty - (line.discount || 0))
}

export function normalizeRepairLine(line: RepairProduct): RepairProduct {
  const vatPercent = line.vatPercent ?? DEFAULT_VAT_PERCENT
  const amount = calcLineAmount(line)
  return { ...line, vatPercent, amount }
}

export function sumLineTotals(lines: RepairProduct[]): number {
  return lines.reduce((sum, line) => sum + calcLineAmount(line), 0)
}

export function productToRepairLine(p: {
  id: string
  code?: string
  name: string
  model?: string
  description?: string
  price: number
}): RepairProduct {
  return normalizeRepairLine({
    productId: p.id,
    code: p.code,
    name: p.name,
    model: p.model,
    description: p.description,
    price: p.price,
    qty: 1,
    discount: 0,
  })
}

export function emptyFreeLine(): RepairProduct {
  return normalizeRepairLine({
    productId: '',
    code: '',
    name: '',
    description: '',
    price: 0,
    qty: 1,
    discount: 0,
  })
}
