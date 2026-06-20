import { useEffect, useMemo, useState } from 'react'
import { fetchAllStudios, type StudioAdminSummary } from '../../lib/adminApi'
import {
  formatEuro,
  resolveSubscriptionState,
  subscriptionStatusEmoji,
  subscriptionStatusLabel,
  todayYmd,
} from '../../lib/subscription'
import StudioDetail from './StudioDetail'
import { formatCallableError } from '../../lib/cloudFunctions'

type StatusFilter = 'all' | 'active' | 'trial' | 'expired' | 'suspended'

function effectiveStatus(studio: StudioAdminSummary) {
  const state = resolveSubscriptionState(studio.subscription, todayYmd())
  return state?.effectiveStatus ?? studio.subscription?.status ?? 'expired'
}

export default function AdminDashboard() {
  const [studios, setStudios] = useState<StudioAdminSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedStudio, setSelectedStudio] = useState<StudioAdminSummary | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await fetchAllStudios()
      setStudios(list)
    } catch (err) {
      setError(formatCallableError(err, 'Impossibile caricare gli studi.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const stats = useMemo(() => {
    const today = todayYmd()
    let active = 0
    let expired = 0
    let monthlyRevenue = 0
    let yearlyRevenue = 0

    for (const s of studios) {
      const state = resolveSubscriptionState(s.subscription, today)
      const status = state?.effectiveStatus ?? 'expired'
      if (status === 'active' || status === 'trial' || status === 'expiring') active += 1
      if (status === 'expired' || status === 'suspended') expired += 1
      if (state && !state.isBlocked && s.subscription) {
        if (s.subscription.paymentFrequency === 'monthly') {
          monthlyRevenue += s.subscription.monthlyPrice
        } else {
          yearlyRevenue += s.subscription.yearlyPrice / 12
        }
      }
    }

    return {
      total: studios.length,
      active,
      expired,
      monthlyRevenue,
      yearlyProjected: monthlyRevenue * 12 + yearlyRevenue * 12,
    }
  }, [studios])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return studios.filter(s => {
      const status = effectiveStatus(s)
      if (statusFilter === 'active' && !['active', 'expiring'].includes(status)) return false
      if (statusFilter === 'trial' && status !== 'trial') return false
      if (statusFilter === 'expired' && status !== 'expired') return false
      if (statusFilter === 'suspended' && status !== 'suspended') return false
      if (!q) return true
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    })
  }, [studios, search, statusFilter])

  const cardStyle: React.CSSProperties = {
    background: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '20px',
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: '#fafafa' }}>Dashboard Admin</h1>
      <p style={{ margin: '0 0 24px', color: '#71717a', fontSize: '14px' }}>
        Gestione account, abbonamenti e supporto
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Studi registrati', value: stats.total },
          { label: 'Studi attivi', value: stats.active, color: '#22c55e' },
          { label: 'Studi scaduti', value: stats.expired, color: '#ef4444' },
          { label: 'Revenue mensile', value: formatEuro(stats.monthlyRevenue), color: '#a78bfa' },
          { label: 'Revenue annuale proiettata', value: formatEuro(stats.yearlyProjected), color: '#a78bfa' },
        ].map(card => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color ?? '#fafafa' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...cardStyle, marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '10px 14px',
            background: '#09090b',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            color: '#fafafa',
            fontSize: '14px',
          }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          style={{
            padding: '10px 14px',
            background: '#09090b',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            color: '#fafafa',
            fontSize: '14px',
          }}
        >
          <option value="all">Tutti gli stati</option>
          <option value="active">Attivi</option>
          <option value="trial">Trial</option>
          <option value="expired">Scaduti</option>
          <option value="suspended">Sospesi</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            padding: '10px 16px',
            background: '#7c3aed',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Aggiorna
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#450a0a', borderRadius: '8px', marginBottom: '16px', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Caricamento studi...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#09090b', textAlign: 'left' }}>
                  {['Studio', 'Email', 'Piano', 'Stato', 'Scadenza', 'Ultimo accesso', 'Prod.', 'Clienti', 'Doc.', 'Azioni'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', color: '#71717a', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const status = effectiveStatus(s)
                  const sub = s.subscription
                  return (
                    <tr key={s.id} style={{ borderTop: '1px solid #27272a' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 500 }}>{s.name || '—'}</td>
                      <td style={{ padding: '12px 14px', color: '#a1a1aa' }}>{s.email}</td>
                      <td style={{ padding: '12px 14px' }}>{sub?.plan ?? '—'}</td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {subscriptionStatusEmoji(status)} {subscriptionStatusLabel(status)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {sub?.expiryDate ? new Date(`${sub.expiryDate}T12:00:00`).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#a1a1aa' }}>
                        {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>{s.counts.products}</td>
                      <td style={{ padding: '12px 14px' }}>{s.counts.clients}</td>
                      <td style={{ padding: '12px 14px' }}>{s.counts.documents}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedStudio(s)}
                          style={{
                            padding: '6px 12px',
                            background: '#7c3aed',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Dettaglio
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#71717a' }}>Nessuno studio trovato.</div>
            )}
          </div>
        )}
      </div>

      {selectedStudio && (
        <StudioDetail
          studio={selectedStudio}
          onClose={() => setSelectedStudio(null)}
          onUpdated={() => void load()}
        />
      )}
    </div>
  )
}
