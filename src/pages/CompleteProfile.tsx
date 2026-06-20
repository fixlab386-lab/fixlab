import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import AuthShell, { AuthError, AuthFormHeader } from '../components/auth/AuthShell'
import { createStudioProfile, isGoogleProvider, mapAuthError, resolvePostAuthPath } from '../lib/auth'
import '../theme/auth.css'

export default function CompleteProfile() {
  const { user, loading: authLoading } = useAuth()
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (user.displayName) setName(user.displayName)
    if (user.email) {
      const localPart = user.email.split('@')[0] || ''
      setShopName(prev => prev || `Studio ${localPart}`)
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) return
    setLoading(true)
    setError('')
    try {
      await createStudioProfile(user.uid, user.email, name.trim(), shopName.trim(), {
        emailVerificationPending: !isGoogleProvider(user),
      })
      navigate(await resolvePostAuthPath(user), { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      setError(code === 'permission-denied' ? 'Creazione profilo bloccata dalle regole di sicurezza.' : mapAuthError(code))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>FIXLab...</div>
      </div>
    )
  }

  return (
    <AuthShell
      heroEyebrow="Quasi fatto"
      heroTitle="Completa il tuo profilo e inizia a usare FixLab"
    >
      <AuthFormHeader
        title="Completa il profilo"
        subtitle="Ultimo passaggio: indica nome e negozio per creare il tuo studio FixLab."
      />

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Il tuo nome</label>
          <input type="text" className="auth-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Mario Rossi" />
        </div>
        <div className="auth-field auth-field--last">
          <label className="auth-label">Nome negozio</label>
          <input type="text" className="auth-input" value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="Es. TechFix Milano" />
        </div>

        <AuthError message={error} />

        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? 'Creazione...' : 'Completa registrazione'}
        </button>

        <button type="button" disabled={loading} className="auth-btn auth-btn--secondary" onClick={() => void handleLogout()}>
          Torna al login
        </button>
      </form>
    </AuthShell>
  )
}
