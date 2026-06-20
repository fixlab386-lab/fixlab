import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import AuthShell, { AuthError, AuthInfo, AuthFormHeader } from '../components/auth/AuthShell'
import {
  clearVerificationCodeRequestMark,
  hasRecentVerificationCodeRequest,
  markVerificationCodeRequested,
  mapVerificationError,
  reloadAuthUser,
  requestEmailVerificationCode,
  sendFirebaseVerificationEmail,
  verifyEmailCode,
} from '../lib/emailVerification'
import { needsEmailVerification } from '../lib/auth'
import '../theme/auth.css'

async function clearEmailVerificationPending(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { emailVerificationPending: false })
}

export default function VerifyEmail() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [linkFallbackAvailable, setLinkFallbackAvailable] = useState(false)
  const [initialSendDone, setInitialSendDone] = useState(false)
  const navigate = useNavigate()

  const sendCode = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user) return
      setLoading(true)
      setError('')
      setInfo('')
      try {
        const result = await requestEmailVerificationCode()
        if (result.verified) {
          await clearEmailVerificationPending(user.uid)
          clearVerificationCodeRequestMark(user.uid)
          navigate('/', { replace: true })
          return
        }
        if (result.sent) {
          markVerificationCodeRequested(user.uid)
          setInfo(`Codice inviato a ${user.email}. Controlla anche lo spam e inserisci le 6 cifre qui sotto.`)
          setCooldown(60)
          setLinkFallbackAvailable(true)
        } else if (result.fallback) {
          setLinkFallbackAvailable(true)
          setInfo(
            'Invio codice via email non disponibile al momento. Usa il pulsante «Invia link di verifica» oppure riprova tra poco.',
          )
        }
      } catch (err: unknown) {
        const message = mapVerificationError(err)
        if (message.includes('Attendi')) {
          const match = message.match(/(\d+)/)
          if (match) setCooldown(Number(match[1]))
        }
        setError(message)
        setLinkFallbackAvailable(true)
        if (!options?.force && hasRecentVerificationCodeRequest(user.uid)) {
          setInfo('Se hai già ricevuto un codice, inseriscilo qui sotto. Altrimenti attendi il countdown e premi «Reinvia codice».')
        }
      } finally {
        setLoading(false)
        setInitialSendDone(true)
      }
    },
    [user, navigate],
  )

  const sendLink = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      await sendFirebaseVerificationEmail()
      setLinkFallbackAvailable(true)
      setInfo(
        'Link di verifica inviato. Aprilo dal telefono o dal PC (si apre nel browser), poi torna qui e premi «Ho verificato via link».',
      )
      setCooldown(60)
    } catch (err: unknown) {
      setError(mapVerificationError(err))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (!needsEmailVerification(user, userProfile)) {
      navigate('/', { replace: true })
      return
    }
    if (initialSendDone) return
    if (hasRecentVerificationCodeRequest(user.uid)) {
      setInitialSendDone(true)
      setLinkFallbackAvailable(true)
      setInfo(`Inserisci il codice a 6 cifre inviato a ${user.email}, oppure richiedine uno nuovo.`)
      return
    }
    void sendCode()
  }, [user, userProfile, authLoading, navigate, sendCode, initialSendDone])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const finishVerification = async () => {
    if (user) {
      await clearEmailVerificationPending(user.uid)
      clearVerificationCodeRequestMark(user.uid)
    }
    navigate('/', { replace: true })
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length !== 6) {
      setError('Inserisci il codice a 6 cifre.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await verifyEmailCode(code.trim())
      await reloadAuthUser()
      await finishVerification()
    } catch (err: unknown) {
      setError(mapVerificationError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerified = async () => {
    setLoading(true)
    setError('')
    try {
      const verified = await reloadAuthUser()
      if (verified) {
        await finishVerification()
      } else {
        setInfo('Email non ancora verificata. Controlla la posta, apri il link nel browser o inserisci il codice.')
      }
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
      heroEyebrow="Verifica email"
      heroTitle="Attiva il tuo account FixLab in pochi secondi"
    >
      <AuthFormHeader
        title="Verifica la tua email"
        subtitle={`Riceverai un codice a 6 cifre su ${user.email}. Inseriscilo qui per attivare l'account.`}
      />

      {info ? <AuthInfo>{info}</AuthInfo> : null}

      <form onSubmit={handleVerify} className="auth-form">
        <div className="auth-field auth-field--last">
          <label className="auth-label">Codice a 6 cifre</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            className="auth-input auth-code-input"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoComplete="one-time-code"
          />
        </div>

        <AuthError message={error} />

        <button type="submit" disabled={loading || code.length !== 6} className="auth-btn">
          {loading ? 'Verifica...' : 'Verifica codice'}
        </button>

        <button
          type="button"
          disabled={loading || cooldown > 0}
          className="auth-btn auth-btn--secondary"
          onClick={() => void sendCode({ force: true })}
        >
          {cooldown > 0 ? `Reinvia codice (${cooldown}s)` : 'Reinvia codice'}
        </button>

        {linkFallbackAvailable ? (
          <>
            <button type="button" disabled={loading || cooldown > 0} className="auth-btn auth-btn--secondary" onClick={() => void sendLink()}>
              {cooldown > 0 ? `Invia link (${cooldown}s)` : 'Invia link di verifica'}
            </button>
            <button type="button" disabled={loading} className="auth-btn auth-btn--secondary" onClick={() => void handleCheckVerified()}>
              Ho verificato via link
            </button>
          </>
        ) : null}

        <button type="button" disabled={loading} className="auth-btn auth-btn--secondary" onClick={() => void handleLogout()}>
          Torna al login
        </button>
      </form>
    </AuthShell>
  )
}
