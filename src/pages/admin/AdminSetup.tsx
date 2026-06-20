import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { hasAdminAccess } from '../../lib/adminAccess'

export default function AdminSetup() {
  const { user, isSuperAdmin, loading } = useAuth()
  const adminAccess = hasAdminAccess({ email: user?.email, isSuperAdminClaim: isSuperAdmin })

  useEffect(() => {
    if (!loading && adminAccess) {
      window.location.assign('/admin')
    }
  }, [loading, adminAccess])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f0f12', color: '#a1a1aa' }}>
        Caricamento...
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#0f0f12',
        color: '#e4e4e7',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '32px',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
        <h1 style={{ margin: '0 0 8px', fontSize: '22px' }}>Pannello Admin</h1>

        {!user ? (
          <>
            <p style={{ color: '#71717a', fontSize: '14px' }}>Accedi con il tuo account Google admin.</p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                padding: '12px 20px',
                background: '#7c3aed',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Vai al login
            </Link>
          </>
        ) : !adminAccess ? (
          <>
            <p style={{ color: '#fca5a5', fontSize: '14px' }}>
              L&apos;account <strong>{user.email}</strong> non è autorizzato.
            </p>
            <Link to="/" style={{ color: '#a78bfa', fontSize: '14px' }}>← Torna all&apos;app</Link>
          </>
        ) : (
          <>
            <p style={{ color: '#86efac', fontSize: '14px', marginBottom: '16px' }}>
              Accesso admin disponibile per <strong>{user.email}</strong>
            </p>
            <a
              href="/admin"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '14px',
                background: '#7c3aed',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Apri pannello Admin →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
