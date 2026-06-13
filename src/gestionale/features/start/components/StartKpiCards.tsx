import type { DashboardKpis } from '../dashboardMetrics'

type Props = {
  kpis: DashboardKpis
}

export default function StartKpiCards({ kpis }: Props) {
  const items = [
    { label: 'Vendite mese', value: `€ ${kpis.salesMonthTotal.toFixed(2)}`, tone: 'accent' as const },
    { label: 'Pagamenti da saldare', value: String(kpis.unsettledPayments), tone: 'warn' as const },
    { label: 'Ordini aperti', value: String(kpis.openOrders), tone: 'neutral' as const },
    { label: 'Prodotti esauriti', value: String(kpis.outOfStockCount), tone: 'danger' as const },
    { label: 'Riparazioni aperte', value: String(kpis.openRepairs), tone: 'warn' as const },
    { label: 'Clienti totali', value: String(kpis.clientCount), tone: 'neutral' as const },
  ]

  return (
    <section className="gestionale-start-panel">
      <h2 className="gestionale-start-panel__title">KPI rapidi</h2>
      <div className="gestionale-start-kpi-grid">
        {items.map(item => (
          <div key={item.label} className={`gestionale-start-kpi gestionale-start-kpi--${item.tone}`}>
            <span className="gestionale-start-kpi__label">{item.label}</span>
            <span className="gestionale-start-kpi__value">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
