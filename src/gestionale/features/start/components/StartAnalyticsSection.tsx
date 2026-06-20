import { useEffect, useMemo, useState } from 'react'
import type { Repair } from '../../../../types'
import type { DashboardAggregates } from '../../../../lib/dashboardAggregates'
import { fetchRepairsForPeriod, type AnalyticsPeriod } from '../../../../lib/firestorePagination'
import { coalesceDate } from '../dashboardMetrics'

const PERIOD_LABEL: Record<AnalyticsPeriod, string> = {
  week: 'Settimana',
  month: 'Mese',
  year: 'Anno',
}

const STATUS_LABEL: Record<string, string> = {
  waiting: 'In attesa',
  accepted: 'Accettata',
  in_progress: 'In lavorazione',
  ready: 'Pronta',
  completed: 'Completata',
  on_hold: 'In sospeso',
}

type Props = {
  studioId: string
  /** Fallback slice recente mentre carica il periodo. */
  repairsFallback: Repair[]
  aggregates: DashboardAggregates | null
}

export default function StartAnalyticsSection({ studioId, repairsFallback, aggregates }: Props) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [periodRepairs, setPeriodRepairs] = useState<Repair[]>([])
  const [loadingPeriod, setLoadingPeriod] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingPeriod(true)
    void fetchRepairsForPeriod(studioId, period)
      .then(rows => {
        if (!cancelled) setPeriodRepairs(rows)
      })
      .catch(() => {
        if (!cancelled) {
          const now = new Date()
          setPeriodRepairs(
            repairsFallback.filter(r => {
              const date = coalesceDate(r.createdAt) ?? coalesceDate(r.updatedAt)
              if (!date || Number.isNaN(date.getTime())) return false
              if (period === 'week') return date.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000
              if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
              return date.getFullYear() === now.getFullYear()
            }),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPeriod(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, period, repairsFallback])

  const insights = useMemo(() => {
    const totalRevenue = periodRepairs.reduce((a, r) => a + (r.totalCost || 0), 0)
    const completed = periodRepairs.filter(r => r.status === 'completed')
    const avgRepairValue = completed.length > 0 ? totalRevenue / completed.length : 0

    const repairsByStatus: Record<string, number> = {}
    Object.keys(STATUS_LABEL).forEach(k => {
      repairsByStatus[k] = 0
    })
    periodRepairs.forEach(r => {
      repairsByStatus[r.status] = (repairsByStatus[r.status] || 0) + 1
    })

    const productCount: Record<string, number> = {}
    periodRepairs.forEach(r => {
      r.products?.forEach(p => {
        productCount[p.name] = (productCount[p.name] || 0) + p.qty
      })
    })
    const topProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    const maxProd = topProducts[0]?.[1] || 1

    const deviceCount: Record<string, number> = {}
    periodRepairs.forEach(r => {
      const dt = r.deviceType || 'Altro'
      deviceCount[dt] = (deviceCount[dt] || 0) + 1
    })
    const topDevices = Object.entries(deviceCount).sort((a, b) => b[1] - a[1])
    const maxDev = topDevices[0]?.[1] || 1

    const warehouse = aggregates
      ? {
          total: aggregates.productCount,
          available: Math.max(0, aggregates.productCount - aggregates.outOfStock - aggregates.lowStock),
          low: aggregates.lowStock,
          out: aggregates.outOfStock,
        }
      : null

    return {
      totalRevenue,
      completedCount: completed.length,
      avgRepairValue,
      repairsByStatus,
      topProducts,
      topDevices,
      maxProd,
      maxDev,
      warehouse,
      count: periodRepairs.length,
    }
  }, [periodRepairs, aggregates])

  return (
    <section className="gestionale-start-panel gestionale-start-panel--wide">
      <div className="gestionale-start-analytics__head">
        <h2 className="gestionale-start-panel__title">Andamento</h2>
        <div className="gestionale-start-period-toggle">
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              type="button"
              className={`gestionale-start-period-btn${period === p ? ' gestionale-start-period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {loadingPeriod ? (
        <p className="gestionale-start-subpanel__empty" aria-live="polite">
          Caricamento dati periodo…
        </p>
      ) : null}

      <div className="gestionale-start-kpi-grid gestionale-start-kpi-grid--4">
        {[
          { label: 'Fatturato periodo', value: `€ ${insights.totalRevenue.toFixed(2)}` },
          { label: 'Riparazioni', value: String(insights.count) },
          { label: 'Completate', value: String(insights.completedCount) },
          { label: 'Valore medio', value: `€ ${insights.avgRepairValue.toFixed(2)}` },
        ].map(item => (
          <div key={item.label} className="gestionale-start-kpi gestionale-start-kpi--neutral">
            <span className="gestionale-start-kpi__label">{item.label}</span>
            <span className="gestionale-start-kpi__value">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="gestionale-start-analytics__grid">
        <div className="gestionale-start-subpanel">
          <h3 className="gestionale-start-subpanel__title">Stato riparazioni</h3>
          {Object.keys(STATUS_LABEL).map(status => {
            const count = insights.repairsByStatus[status] || 0
            const pct = Math.round((count / (insights.count || 1)) * 100)
            return (
              <div key={status} className="gestionale-start-bar-row">
                <div className="gestionale-start-bar-row__label">
                  <span>{STATUS_LABEL[status]}</span>
                  <span>{count}</span>
                </div>
                <div className="gestionale-start-bar-row__track">
                  <div className="gestionale-start-bar-row__fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="gestionale-start-subpanel">
          <h3 className="gestionale-start-subpanel__title">Dispositivi più presenti</h3>
          {insights.topDevices.length === 0 ? (
            <p className="gestionale-start-subpanel__empty">Nessun dato nel periodo</p>
          ) : (
            insights.topDevices.map(([device, count]) => {
              const pct = Math.round((count / insights.maxDev) * 100)
              return (
                <div key={device} className="gestionale-start-bar-row">
                  <div className="gestionale-start-bar-row__label">
                    <span>{device}</span>
                    <span>{count}</span>
                  </div>
                  <div className="gestionale-start-bar-row__track">
                    <div className="gestionale-start-bar-row__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="gestionale-start-subpanel">
          <h3 className="gestionale-start-subpanel__title">Prodotti più usati</h3>
          {insights.topProducts.length === 0 ? (
            <p className="gestionale-start-subpanel__empty">Nessun dato nel periodo</p>
          ) : (
            insights.topProducts.map(([name, count]) => {
              const pct = Math.round((count / insights.maxProd) * 100)
              return (
                <div key={name} className="gestionale-start-bar-row">
                  <div className="gestionale-start-bar-row__label">
                    <span>{name}</span>
                    <span>{count} pz</span>
                  </div>
                  <div className="gestionale-start-bar-row__track">
                    <div className="gestionale-start-bar-row__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="gestionale-start-subpanel">
          <h3 className="gestionale-start-subpanel__title">Magazzino</h3>
          {insights.warehouse ? (
            [
              { label: 'Prodotti totali', value: insights.warehouse.total },
              { label: 'Disponibili', value: insights.warehouse.available },
              { label: 'Scorte basse', value: insights.warehouse.low },
              { label: 'Esauriti', value: insights.warehouse.out },
            ].map(row => (
              <div key={row.label} className="gestionale-start-snapshot-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))
          ) : (
            <p className="gestionale-start-subpanel__empty">Caricamento magazzino…</p>
          )}
        </div>
      </div>
    </section>
  )
}
