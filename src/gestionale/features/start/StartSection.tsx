import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { loadDashboardSnapshot, invalidateDashboardCache } from './dashboardCache'
import { computeDashboardAlerts, computeDashboardKpis } from './dashboardMetrics'
import StartActivityPanel from './components/StartActivityPanel'
import StartAnalyticsSection from './components/StartAnalyticsSection'
import StartKpiCards from './components/StartKpiCards'
import StartQuickLinks from './components/StartQuickLinks'
import { buildActivityLinks } from './components/activityLinks'
import '../../theme/gestionale-tokens.css'

export default function StartSection() {
  const { userProfile, loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()

  const [studioName, setStudioName] = useState('')
  const [repairs, setRepairs] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['repairs']>([])
  const [products, setProducts] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['products']>([])
  const [clients, setClients] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['clients']>([])
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['payments']>([])
  const [documents, setDocuments] = useState<Awaited<ReturnType<typeof loadDashboardSnapshot>>['documents']>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    loadDashboardSnapshot(studioId)
      .then(data => {
        if (cancelled) return
        setRepairs(data.repairs)
        setProducts(data.products)
        setClients(data.clients)
        setPayments(data.payments)
        setDocuments(data.documents)
        setStudioName(data.studioName)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossibile caricare la Start.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
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
    () => computeDashboardAlerts(repairs, products, payments, documents),
    [repairs, products, payments, documents],
  )
  const activityLinks = useMemo(() => buildActivityLinks(alerts), [alerts])
  const kpis = useMemo(
    () => computeDashboardKpis(repairs, products, clients.length, documents, payments),
    [repairs, products, clients.length, documents, payments],
  )

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

  if (loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento Start…</div>
  }

  if (loadError) {
    return <div className="gestionale-page gestionale-datatable__empty">{loadError}</div>
  }

  const displayName = studioName || userProfile?.name || 'FIXLab'

  return (
    <div className="gestionale-page gestionale-start-page" data-tutorial="page-dashboard">
      <header className="gestionale-start-header">
        <div>
          <h1 className="gestionale-start-header__title">{displayName}</h1>
          <p className="gestionale-start-header__subtitle">Panoramica commerciale — vendite, scadenze, magazzino e officina</p>
        </div>
        <time className="gestionale-start-header__date" dateTime={new Date().toISOString().slice(0, 10)}>
          {todayLabel}
        </time>
        <button type="button" className="gestionale-section-header__action-btn" onClick={handleRefresh} title="Aggiorna dati">
          ↻ Aggiorna
        </button>
      </header>

      <div className="gestionale-start-layout">
        <div className="gestionale-start-layout__main">
          <StartActivityPanel links={activityLinks} />
          <StartKpiCards kpis={kpis} />
          <StartAnalyticsSection repairs={repairs} products={products} />
        </div>
        <StartQuickLinks />
      </div>
    </div>
  )
}
