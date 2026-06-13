import type { DashboardKpis } from '../../lib/dashboardMetrics'

type Props = {
  kpis: DashboardKpis
}

export default function StartKpiCards({ kpis }: Props) {
  const items = [
    { label: 'Riparazioni aperte', value: String(kpis.openCount), tone: 'warn' as const },
    { label: 'Incasso oggi', value: `€ ${kpis.todayRevenue.toFixed(2)}`, tone: 'accent' as const },
    { label: 'Prodotti esauriti', value: String(kpis.outOfStockCount), tone: 'danger' as const },
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
