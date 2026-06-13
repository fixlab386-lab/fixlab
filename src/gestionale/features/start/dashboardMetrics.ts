import type { DocRecord, Payment, Product, Repair } from '../../../types'
import {
  coalesceDate,
  isLowStock,
  isRepairStale,
  STALE_REPAIR_DAYS,
} from '../../../lib/dashboardMetrics'

export { coalesceDate, isLowStock, isRepairStale, STALE_REPAIR_DAYS }

export type DashboardAlerts = {
  openRepairs: number
  readyRepairs: number
  staleRepairs: number
  lowStock: number
  outOfStock: number
  unsettledPayments: number
  openOrders: number
  dueSoonPayments: number
}

export function computeDashboardAlerts(
  repairs: Repair[],
  products: Product[],
  payments: Payment[],
  documents: DocRecord[] = [],
): DashboardAlerts {
  const today = new Date()
  const in7days = new Date(today)
  in7days.setDate(in7days.getDate() + 7)

  return {
    openRepairs: repairs.filter(r => r.status !== 'completed').length,
    readyRepairs: repairs.filter(r => r.status === 'ready').length,
    staleRepairs: repairs.filter(r => isRepairStale(r)).length,
    lowStock: products.filter(isLowStock).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    unsettledPayments: payments.filter(p => !p.settled).length,
    openOrders: documents.filter(d => d.type === 'ordine_cliente' && d.status !== 'completed' && d.status !== 'cancelled')
      .length,
    dueSoonPayments: payments.filter(p => {
      if (p.settled) return false
      const d = new Date(`${p.date}T12:00:00`)
      return d <= in7days
    }).length,
  }
}

export type DashboardKpis = {
  openRepairs: number
  salesMonthTotal: number
  unsettledPayments: number
  outOfStockCount: number
  clientCount: number
  openOrders: number
}

export function computeDashboardKpis(
  repairs: Repair[],
  products: Product[],
  clientsCount: number,
  documents: DocRecord[],
  payments: Payment[],
): DashboardKpis {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  const salesMonthTotal = documents
    .filter(d => {
      if (d.status === 'cancelled' || d.status === 'draft') return false
      if (d.subjectType === 'supplier') return false
      const dt = new Date(`${d.date}T12:00:00`)
      return dt.getMonth() === month && dt.getFullYear() === year
    })
    .reduce((s, d) => s + (d.totalDocument || 0), 0)

  return {
    openRepairs: repairs.filter(r => r.status !== 'completed').length,
    salesMonthTotal,
    unsettledPayments: payments.filter(p => !p.settled).length,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    clientCount: clientsCount,
    openOrders: documents.filter(d => d.type === 'ordine_cliente' && d.status !== 'completed' && d.status !== 'cancelled')
      .length,
  }
}
