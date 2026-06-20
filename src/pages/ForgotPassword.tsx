import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { auth } from '../firebase'
import AuthShell, { AuthError, AuthInfo, AuthFooter, AuthFormHeader } from '../components/auth/AuthShell'
import { mapAuthError } from '../lib/auth'
import '../theme/auth.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      setError(mapAuthError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      heroEyebrow="Recupero accesso"
      heroTitle="Riprendi il controllo del tuo account FixLab"
    >
      <AuthFormHeader
        title="Recupera password"
        subtitle="Inserisci l'email del tuo account: ti invieremo un link per reimpostare la password."
      />

      {sent ? (
        <AuthInfo>
          Se l&apos;email è registrata, riceverai a breve le istruzioni per reimpostare la password. Controlla anche lo spam.
        </AuthInfo>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field auth-field--last">
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="email@esempio.com"
              autoComplete="email"
            />
          </div>

          <AuthError message={error} />

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Invio...' : 'Invia link di recupero'}
          </button>
        </form>
      )}

      <AuthFooter>
        <Link to="/login">Torna al login</Link>
      </AuthFooter>
    </AuthShell>
  )
}
