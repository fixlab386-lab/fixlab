import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { loadDashboardSnapshot, invalidateDashboardCache } from './dashboardCache'
import {
  computeDashboardAlerts,
  computeDashboardAlertsFromAggregates,
} from './dashboardMetrics'
import StartActivityPanel from './components/StartActivityPanel'
import StartSidebar from './components/StartSidebar'
import { buildActivityLinks } from './components/activityLinks'
import '../../theme/gestionale-tokens.css'

export default function StartSection() {
  const { userProfile, loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()

  const [studioName, setStudioName] = useState('')
  const [repairs, setRepairs] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['repairs']>([])
  const [products, setProducts] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['products']>([])
  const [aggregates, setAggregates] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['aggregates'] | null>(null)
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['payments']>([])
  const [documents, setDocuments] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['documents']>([])
  const [syncing, setSyncing] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!studioId) {
      setSyncing(false)
      return
    }
    let cancelled = false
    setSyncing(true)
    setLoadError(null)
    loadDashboardSnapshot(studioId)
      .then(data => {
        if (cancelled) return
        setRepairs(data.repairs)
        setProducts(data.products)
        setAggregates(data.aggregates)
        setPayments(data.payments)
        setDocuments(data.documents)
        setStudioName(data.studioName)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare la Start.')
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, reloadKey])

  const handleRefresh = () => {
    if (!studioId) return
    invalidateDashboardCache(studioId)
    setReloadKey(k => k + 1)
  }

  const alerts = useMemo(
    () =>
      aggregates
        ? computeDashboardAlertsFromAggregates(aggregates)
        : computeDashboardAlerts(repairs, products, payments, documents),
    [aggregates, repairs, products, payments, documents],
  )
  const activityLinks = useMemo(() => buildActivityLinks(alerts), [alerts])

  const todayLabel = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (authLoading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento profilo…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  const displayName = studioName || userProfile?.name || 'FIXLab'

  return (
    <div className="gestionale-page gestionale-start-page" data-tutorial="page-dashboard">
      {syncing && repairs.length > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {syncing && repairs.length === 0 ? <div className="gestionale-page-skeleton">Caricamento Start…</div> : null}
      {loadError ? <div className="gestionale-page__banner gestionale-page__banner--error">{loadError}</div> : null}

      <header className="gestionale-start-header gestionale-start-header--centered">
        <div className="gestionale-start-header__intro">
          <h1 className="gestionale-start-header__title">{displayName}</h1>
          <p className="gestionale-start-header__subtitle">Panoramica attività e accessi rapidi</p>
        </div>
        <div className="gestionale-start-header__meta">
          <span className="gestionale-start-header__date">{todayLabel}</span>
          <button type="button" className="gestionale-start-header__refresh" onClick={handleRefresh}>
            Aggiorna
          </button>
        </div>
      </header>

      {!loadError ? (
        <div className="gestionale-start-layout">
          <div className="gestionale-start-layout__main">
            <StartActivityPanel links={activityLinks} />
          </div>
          <StartSidebar />
        </div>
      ) : null}
    </div>
  )
}
