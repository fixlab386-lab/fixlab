import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import PageTutorialLauncher from './PageTutorialLauncher'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../hooks/useAuth'
import { useActiveStudio } from '../hooks/useActiveStudio'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import type { Repair, Product, Client } from '../types'
import { useCookieConsent } from '../contexts/CookieConsentContext'

interface SearchResult {
  type: 'repair' | 'product' | 'client' | 'supplier' | 'document' | 'device'
  id: string
  title: string
  subtitle: string
  extra?: string
  path: string
}

interface StockAlert {
  id: string
  name: string
  model: string
  brand: string
  categoryName: string
  stock: number
  color?: string
}

export default function Layout() {
  const { userProfile } = useAuth()
  const { studioId } = useActiveStudio()
  const { consent, openSettings } = useCookieConsent()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const alertsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) setShowAlerts(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!studioId) return
    const fetchAlerts = async () => {
      const snap = await getDocs(query(collection(db, 'products'), where('studioId', '==', studioId), orderBy('stock', 'asc'), limit(50)))
      const alerts: StockAlert[] = []
      snap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() } as Product
        if (p.stock <= 3) alerts.push({ id: p.id, name: p.name, model: p.model, brand: p.brand || '', categoryName: p.categoryName, stock: p.stock, color: p.color })
      })
      setStockAlerts(alerts)
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [studioId])

  useEffect(() => {
    if (!search.trim() || !studioId) {
      const t = setTimeout(() => { setResults([]); setShowResults(false) }, 0)
      return () => clearTimeout(t)
    }
    const q = search.toLowerCase()
    const timer = setTimeout(() => {
      setSearching(true)
      const fetchAll = async () => {
        const all: SearchResult[] = []
        const repairsSnap = await getDocs(query(collection(db, 'repairs'), where('studioId', '==', studioId), orderBy('createdAt', 'desc'), limit(30)))
        repairsSnap.docs.forEach(d => {
          const r = { id: d.id, ...d.data() } as Repair
          if ((r.clientName + r.deviceModel + r.problem + (r.imei || '')).toLowerCase().includes(q))
            all.push({ type: 'repair', id: r.id, title: r.clientName, subtitle: `${r.deviceBrand || ''} ${r.deviceModel}`, extra: `€ ${r.totalCost?.toFixed(2)}`, path: `/riparazioni/${r.id}` })
        })
        const productsSnap = await getDocs(query(collection(db, 'products'), where('studioId', '==', studioId), orderBy('createdAt', 'desc'), limit(30)))
        productsSnap.docs.forEach(d => {
          const p = { id: d.id, ...d.data() } as Product
          if ((p.name + p.model + p.categoryName + (p.brand || '')).toLowerCase().includes(q))
            all.push({ type: 'product', id: p.id, title: p.name, subtitle: `${p.brand} ${p.model} · ${p.categoryName}`, extra: `€ ${p.price.toFixed(2)} · ${p.stock} pz`, path: '/magazzino' })
        })
        const clientsSnap = await getDocs(query(collection(db, 'clients'), where('studioId', '==', studioId), orderBy('createdAt', 'desc'), limit(30)))
        clientsSnap.docs.forEach(d => {
          const c = { id: d.id, ...d.data() } as Client
          if ((c.name + c.phone + (c.email || '')).toLowerCase().includes(q))
            all.push({ type: 'client', id: c.id, title: c.name, subtitle: c.phone || c.email || '—', extra: `${c.repairsCount} riparazioni`, path: '/clienti' })
        })
        setResults(all.slice(0, 8))
        setShowResults(true)
        setSearching(false)
      }
      fetchAll().catch(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search, studioId])

  const handleLogout = async () => { await signOut(auth); navigate('/login') }
  const handleSelect = (result: SearchResult) => { navigate(result.path); setSearch(''); setShowResults(false) }

  const typeIcon: Record<string, string> = { repair: '🔧', product: '📦', client: '👤', supplier: '🏭', document: '📄', device: '📱' }
  const typeLabel: Record<string, string> = { repair: 'Riparazione', product: 'Prodotto', client: 'Cliente', supplier: 'Fornitore', document: 'Documento', device: 'Dispositivo' }

  const outOfStock = stockAlerts.filter(a => a.stock === 0)
  const lowStock = stockAlerts.filter(a => a.stock > 0 && a.stock <= 3)

  const navSections = [
    {
      label: 'Gestione',
      items: [
        { to: '/', label: 'Dashboard', icon: '📊' },
        { to: '/clienti', label: 'Clienti', icon: '👤' },
        { to: '/fornitori', label: 'Fornitori', icon: '🏭' },
        { to: '/magazzino', label: 'Prodotti', icon: '📦', badge: stockAlerts.length > 0 ? stockAlerts.length : undefined, badgeColor: outOfStock.length > 0 ? 'var(--danger)' : 'var(--warning)' },
      ]
    },
    {
      label: 'Operativo',
      items: [
        { to: '/riparazioni', label: 'Riparazioni', icon: '🔧' },
        { to: '/dispositivi', label: 'Dispositivi', icon: '📱' },
        { to: '/documenti', label: 'Documenti', icon: '📄' },
        { to: '/cassa', label: 'Cassa', icon: '💰' },
      ]
    },
    {
      label: 'Contabilità',
      items: [
        { to: '/pagamenti', label: 'Pagamenti', icon: '💳' },
        { to: '/movimenti', label: 'Magazzino', icon: '📋' },
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <aside data-tutorial="layout-nav" style={{ width: '232px', background: 'var(--nav-bg)', borderRight: '1px solid var(--nav-border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 18px 20px', borderBottom: '1px solid var(--nav-border)' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--nav-text-active)' }}>
            FIX<span style={{ color: 'var(--accent)' }}>LAB</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--nav-text)', marginTop: '6px', lineHeight: 1.35 }}>{userProfile?.name}</div>
        </div>
        <nav style={{ padding: '10px 10px', flex: 1, overflowY: 'auto' }}>
          {navSections.map((section, si) => (
            <div key={si} style={{ marginBottom: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--nav-text)', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 12px 6px', marginTop: si > 0 ? '6px' : 0 }}>
                {section.label}
              </div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `layout-nav-link${isActive ? ' layout-nav-link--active' : ''}`}
                >
                  <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span style={{ marginLeft: 'auto', background: item.badgeColor, color: '#fff', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid var(--nav-border)' }}>
          <NavLink
            to="/impostazioni"
            className={({ isActive }) => `layout-nav-link${isActive ? ' layout-nav-link--active' : ''}`}
            style={{ marginBottom: '6px' }}
          >
            <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>⚙️</span>
            Impostazioni
          </NavLink>
          <button onClick={handleLogout} style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid var(--nav-border)', color: 'var(--nav-text)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Logout
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div ref={searchRef} data-tutorial="layout-search" style={{ flex: 1, maxWidth: '520px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-tertiary)', border: `1px solid ${showResults ? 'var(--accent-border2)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: '10px 16px', transition: 'border-color 0.15s' }}>
              <span style={{ color: searching ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '14px' }}>{searching ? '⏳' : '🔍'}</span>
              <input value={search} onChange={e => setSearch(e.target.value)} onFocus={() => results.length > 0 && setShowResults(true)}
                placeholder="Cerca clienti, riparazioni, prodotti, dispositivi..."
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', flex: 1 }} />
              {search && <button onClick={() => { setSearch(''); setShowResults(false) }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '16px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>}
            </div>
            {showResults && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', overflow: 'hidden', zIndex: 1000, boxShadow: `0 8px 32px var(--shadow)` }}>
                {results.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Nessun risultato per "{search}"</div>
                ) : (
                  <>
                    {results.map((r, i) => (
                      <div key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--bg-tertiary)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{typeIcon[r.type]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.subtitle}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600 }}>{r.extra}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{typeLabel[r.type]}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bg-tertiary)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>{results.length} risultati trovati</div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PageTutorialLauncher />
            <div ref={alertsRef} data-tutorial="layout-alerts" style={{ position: 'relative' }}>
              <button onClick={() => setShowAlerts(!showAlerts)} style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: stockAlerts.length > 0 ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
                border: `1px solid ${stockAlerts.length > 0 ? 'var(--danger-border)' : 'var(--border-secondary)'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', position: 'relative'
              }}>
                🔔
                {stockAlerts.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: outOfStock.length > 0 ? 'var(--danger)' : 'var(--warning)', color: '#fff', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '1px 5px', minWidth: '16px', textAlign: 'center', lineHeight: '14px' }}>
                    {stockAlerts.length}
                  </span>
                )}
              </button>
              {showAlerts && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '12px', width: '320px', zIndex: 1000, boxShadow: `0 8px 32px var(--shadow)`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Avvisi magazzino</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{stockAlerts.length} prodotti</span>
                  </div>
                  {stockAlerts.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>✓ Tutto ok — nessun prodotto in esaurimento</div>
                  ) : (
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {outOfStock.length > 0 && (
                        <div style={{ padding: '8px 16px', background: 'var(--danger-bg)', borderBottom: '1px solid var(--danger-border)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Esauriti — {outOfStock.length} prodotti</div>
                        </div>
                      )}
                      {outOfStock.map(a => (
                        <div key={a.id} onClick={() => { navigate('/magazzino'); setShowAlerts(false) }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--bg-tertiary)', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{a.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{a.brand} {a.model} {a.color ? `· ${a.color}` : ''} · {a.categoryName}</div>
                          </div>
                          <span style={{ padding: '2px 8px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: '20px', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>Esaurito</span>
                        </div>
                      ))}
                      {lowStock.length > 0 && (
                        <div style={{ padding: '8px 16px', background: 'var(--warning-bg)', borderBottom: '1px solid var(--warning-border)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Scorte basse — {lowStock.length} prodotti</div>
                        </div>
                      )}
                      {lowStock.map(a => (
                        <div key={a.id} onClick={() => { navigate('/magazzino'); setShowAlerts(false) }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--bg-tertiary)', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 500 }}>{a.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{a.brand} {a.model} {a.color ? `· ${a.color}` : ''} · {a.categoryName}</div>
                          </div>
                          <span style={{ padding: '2px 8px', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: '20px', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginLeft: '8px' }}>{a.stock} rimasti</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-primary)' }}>
                    <button onClick={() => { navigate('/magazzino'); setShowAlerts(false) }} style={{ width: '100%', padding: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Vai ai prodotti →
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                {userProfile?.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{userProfile?.name}</span>
            </div>
          </div>
        </div>

        <main data-tutorial="layout-main" style={{ flex: 1, padding: '28px 32px 36px', overflowY: 'auto' }}>
          <Outlet />
        </main>

        <footer
          data-tutorial="layout-legal-footer"
          style={{
            flexShrink: 0,
            padding: '12px 24px',
            borderTop: '1px solid var(--border-primary)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 20px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Link to="/privacy" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/cookie" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
            Cookie
          </Link>
          {consent ? (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={openSettings}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '12px',
                }}
              >
                Preferenze cookie
              </button>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  )
}