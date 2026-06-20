import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { logoutAndClearSession } from '../../lib/logout'
import { useAuth } from '../../hooks/useAuth'

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/revenue', label: 'Revenue', end: false },
  { to: '/admin/payment-config', label: 'Config pagamenti', end: false },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleLogout = async () => {
    await logoutAndClearSession()
    navigate('/login')
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0f0f12',
        color: '#e4e4e7',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          background: '#09090b',
          borderRight: '1px solid #27272a',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 0',
        }}
      >
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #27272a' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa' }}>🛡️ FIXLab Admin</div>
          <div
            style={{
              marginTop: '8px',
              display: 'inline-block',
              padding: '2px 8px',
              background: '#7c3aed',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            SUPER ADMIN
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {ADMIN_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? '#fff' : '#a1a1aa',
                background: isActive ? '#7c3aed' : 'transparent',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #27272a' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              background: 'transparent',
              border: '1px solid #3f3f46',
              borderRadius: '6px',
              color: '#a1a1aa',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ← Torna all&apos;app
          </button>
          <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            style={{
              width: '100%',
              padding: '8px',
              background: '#27272a',
              border: 'none',
              borderRadius: '6px',
              color: '#e4e4e7',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Esci
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
        <Outlet />
      </main>
    </div>
  )
}
