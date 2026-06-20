import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { AuthDivider, AuthError, AuthFooter, AuthFormHeader, AuthLegalLinks } from '../components/auth/AuthShell'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import {
  handleGoogleRedirectResult,
  mapAuthError,
  registerWithEmail,
  resolvePostAuthPath,
  signInWithGoogle,
} from '../lib/auth'
import { auth } from '../firebase'
import '../theme/auth.css'

export default function Register() {
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const afterAuth = useCallback(async () => {
    const user = auth.currentUser
    if (!user) return
    navigate(await resolvePostAuthPath(user))
  }, [navigate])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const result = await handleGoogleRedirectResult()
        if (cancelled || !result?.user) return
        await afterAuth()
      } catch (err: unknown) {
        if (!cancelled) {
          const code = (err as { code?: string })?.code || ''
          setError(mapAuthError(code))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [afterAuth])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedPrivacy) {
      setError("È necessario accettare l'informativa privacy per registrarsi.")
      return
    }
    setLoading(true)
    setError('')
    try {
      await registerWithEmail(email, password, name, shopName)
      navigate('/verify-email')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      if (code === 'permission-denied') {
        setError('Registrazione bloccata: controlla le regole di sicurezza Firestore.')
      } else {
        setError(mapAuthError(code))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!acceptedPrivacy) {
      setError("Accetta l'informativa privacy prima di continuare con Google.")
      return
    }
    setLoading(true)
    setError('')
    try {
      const cred = await signInWithGoogle()
      if (cred?.user) await afterAuth()
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      setError(mapAuthError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heroEyebrow="Inizia con FixLab"
      heroTitle="Crea il tuo studio e gestisci tutto da un unico hub"
      heroSubtitle="Registrazione rapida con Google o email per attivare clienti, magazzino e documenti."
    >
      <AuthFormHeader
        title="Crea il tuo account"
        subtitle="Registrati con Google o con email e password. Creeremo lo studio e il profilo amministratore."
      />

      <label className="auth-checkbox">
        <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} />
        <span>
          Dichiaro di aver letto l&apos;
          <Link to="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            informativa privacy
          </Link>{' '}
          e la{' '}
          <Link to="/cookie" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            cookie policy
          </Link>
          .
        </span>
      </label>

      <GoogleSignInButton loading={loading} onClick={() => void handleGoogle()} label="Registrati con Google" />

      <AuthDivider />

      <form onSubmit={handleRegister} className="auth-form" style={{ marginTop: 0 }}>
        <div className="auth-field">
          <label className="auth-label">Il tuo nome</label>
          <input type="text" className="auth-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Mario Rossi" />
        </div>
        <div className="auth-field">
          <label className="auth-label">Nome negozio</label>
          <input type="text" className="auth-input" value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="Es. TechFix Milano" />
        </div>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input type="email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@esempio.com" autoComplete="email" />
        </div>
        <div className="auth-field auth-field--last">
          <label className="auth-label">Password</label>
          <input type="password" className="auth-input" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimo 6 caratteri" autoComplete="new-password" />
        </div>

        <AuthError message={error} />

        <button type="submit" disabled={loading || !acceptedPrivacy} className="auth-btn">
          {loading ? 'Registrazione...' : 'Crea account'}
        </button>
      </form>

      <AuthFooter>
        Hai già un account? <Link to="/login">Accedi</Link>
        <AuthLegalLinks />
      </AuthFooter>
    </AuthShell>
  )
}
