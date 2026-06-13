import type { DashboardAlerts } from '../dashboardMetrics'
import { STALE_REPAIR_DAYS } from '../dashboardMetrics'

export type ActivityLink = {
  id: string
  label: string
  count: number
  to: string
}

export function buildActivityLinks(alerts: DashboardAlerts): ActivityLink[] {
  const links: ActivityLink[] = []

  if (alerts.openRepairs > 0) {
    links.push({
      id: 'open-repairs',
      label: `${alerts.openRepairs} riparazioni in corso`,
      count: alerts.openRepairs,
      to: '/riparazioni?open=1',
    })
  }
  if (alerts.readyRepairs > 0) {
    links.push({
      id: 'ready-repairs',
      label: `${alerts.readyRepairs} riparazioni pronte per il ritiro`,
      count: alerts.readyRepairs,
      to: '/riparazioni?status=ready',
    })
  }
  if (alerts.staleRepairs > 0) {
    links.push({
      id: 'stale-repairs',
      label: `${alerts.staleRepairs} riparazioni ferme da più di ${STALE_REPAIR_DAYS} giorni`,
      count: alerts.staleRepairs,
      to: `/riparazioni?stale=${STALE_REPAIR_DAYS}`,
    })
  }
  if (alerts.openOrders > 0) {
    links.push({
      id: 'open-orders',
      label: `${alerts.openOrders} ordini clienti aperti`,
      count: alerts.openOrders,
      to: '/documenti?type=ordine_cliente',
    })
  }
  if (alerts.unsettledPayments > 0) {
    links.push({
      id: 'unsettled-payments',
      label: `${alerts.unsettledPayments} pagamenti da incassare / da saldare`,
      count: alerts.unsettledPayments,
      to: '/pagamenti?status=to_settle',
    })
  }
  if (alerts.dueSoonPayments > 0) {
    links.push({
      id: 'due-soon-payments',
      label: `${alerts.dueSoonPayments} scadenze entro 7 giorni`,
      count: alerts.dueSoonPayments,
      to: '/pagamenti?status=to_settle',
    })
  }
  if (alerts.outOfStock > 0) {
    links.push({
      id: 'out-stock',
      label: `${alerts.outOfStock} prodotti esauriti`,
      count: alerts.outOfStock,
      to: '/movimenti?tab=situazione',
    })
  }
  if (alerts.lowStock > 0) {
    links.push({
      id: 'low-stock',
      label: `${alerts.lowStock} prodotti sotto scorta minima`,
      count: alerts.lowStock,
      to: '/movimenti?tab=situazione',
    })
  }

  return links
}
