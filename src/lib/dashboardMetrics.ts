import type { Payment, Product, Repair } from '../types'

export const STALE_REPAIR_DAYS = 7

export function coalesceDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000)
  }
  try {
    return new Date(value as string)
  } catch {
    return null
  }
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isLowStock(p: Product): boolean {
  if (p.stock <= 0) return false
  const threshold = p.minStock != null && p.minStock > 0 ? p.minStock : 3
  return p.stock <= threshold
}

export function isRepairStale(r: Repair, staleDays = STALE_REPAIR_DAYS): boolean {
  if (r.status === 'completed' || r.status === 'ready') return false
  if (r.status === 'on_hold') return true
  const ref = coalesceDate(r.updatedAt) ?? coalesceDate(r.createdAt)
  if (!ref || Number.isNaN(ref.getTime())) return false
  const days = Math.floor((Date.now() - ref.getTime()) / 86400000)
  return days >= staleDays
}

export type DashboardAlerts = {
  openRepairs: number
  readyRepairs: number
  staleRepairs: number
  lowStock: number
  outOfStock: number
  unsettledPayments: number
}

export function computeDashboardAlerts(
  repairs: Repair[],
  products: Product[],
  payments: Payment[],
): DashboardAlerts {
  return {
    openRepairs: repairs.filter(r => r.status !== 'completed').length,
    readyRepairs: repairs.filter(r => r.status === 'ready').length,
    staleRepairs: repairs.filter(r => isRepairStale(r)).length,
    lowStock: products.filter(isLowStock).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    unsettledPayments: payments.filter(p => !p.settled).length,
  }
}

export type DashboardKpis = {
  openCount: number
  todayRevenue: number
  outOfStockCount: number
  clientCount: number
}

export function computeDashboardKpis(
  repairs: Repair[],
  products: Product[],
  clientCount: number,
): DashboardKpis {
  const now = new Date()
  const completedToday = repairs.filter(r => {
    if (r.status !== 'completed') return false
    const u = coalesceDate(r.updatedAt)
    return u !== null && isSameCalendarDay(u, now)
  })
  return {
    openCount: repairs.filter(r => r.status !== 'completed').length,
    todayRevenue: completedToday.reduce((a, r) => a + (r.totalCost || 0), 0),
    outOfStockCount: products.filter(p => p.stock === 0).length,
    clientCount,
  }
}
