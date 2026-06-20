import { useState, useEffect, useCallback } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import AuthShell, {
  AuthDivider,
  AuthError,
  AuthFooter,
  AuthFormHeader,
  AuthLegalLinks,
} from '../components/auth/AuthShell'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import {
  handleGoogleRedirectResult,
  mapAuthError,
  resolvePostAuthPath,
  signInWithGoogle,
} from '../lib/auth'
import '../theme/auth.css'

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="auth-input-toggle"
      onClick={onToggle}
      aria-label={visible ? 'Nascondi password' : 'Mostra password'}
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      await afterAuth()
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      setError(mapAuthError(code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
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
      heroEyebrow="Benvenuto in FixLab"
      heroTitle="Il gestionale per laboratori di riparazione, sempre con te"
      heroSubtitle="Clienti, magazzino, riparazioni, cassa e documenti in un unico posto."
    >
      <AuthFormHeader
        title="Accedi"
        subtitle="Accedi con email e password oppure continua con Google per entrare nel tuo studio."
      />

      <form onSubmit={handleLogin} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="email@esempio.com"
            autoComplete="email"
          />
        </div>
        <div className="auth-field auth-field--last">
          <label className="auth-label" htmlFor="login-password">
            Password
          </label>
          <div className="auth-input-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
          </div>
          <span className="auth-forgot">
            <Link to="/forgot-password">Password dimenticata?</Link>
          </span>
        </div>

        <AuthError message={error} />

        <button type="submit" disabled={loading} className="auth-btn">
          {loading ? 'Accesso...' : 'Accedi'}
        </button>
      </form>

      <AuthDivider />

      <GoogleSignInButton loading={loading} onClick={() => void handleGoogle()} />

      <AuthFooter>
        Non hai un account? <Link to="/register">Registrati</Link>
        <AuthLegalLinks />
      </AuthFooter>
    </AuthShell>
  )
}
