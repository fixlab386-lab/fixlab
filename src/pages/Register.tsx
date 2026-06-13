import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useNavigate, Link } from 'react-router-dom'
import PageHeader from '../components/page/PageHeader'

export default function Register() {
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedPrivacy) {
      setError("È necessario accettare l'informativa privacy per registrarsi.")
      return
    }
    setLoading(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const uid = cred.user.uid
      await setDoc(doc(db, 'studios', uid), { name: shopName, email, createdAt: serverTimestamp() })
      await setDoc(doc(db, 'users', uid), {
        studioId: uid,
        email,
        name,
        role: 'admin',
        lang: 'it',
        memberships: [{ studioId: uid, role: 'owner' }],
        defaultStudioId: uid,
        createdAt: serverTimestamp(),
      })
      navigate('/')
    } catch (err: any) {
      const code = err?.code || ''
      if (code === 'auth/email-already-in-use') setError('Questa email è già registrata.')
      else if (code === 'auth/weak-password') setError('Password troppo debole (minimo 6 caratteri).')
      else if (code === 'auth/invalid-email') setError('Indirizzo email non valido.')
      else if (code === 'permission-denied') setError('Registrazione bloccata: controlla le regole di sicurezza Firestore nella console Firebase.')
      else setError('Registrazione non riuscita. Riprova tra poco.')
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '36px 32px' }}>
        <PageHeader
          eyebrow="FIXLAB"
          title="Crea il tuo account"
          subtitle="Compila nome, negozio e credenziali, poi accetta privacy e cookie: creiamo lo studio e il tuo profilo amministratore."
        />

        <form onSubmit={handleRegister} style={{ marginTop: '28px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>IL TUO NOME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inp} placeholder="Mario Rossi" />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>NOME NEGOZIO</label>
            <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} required style={inp} placeholder="Es. TechFix Milano" />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="email@esempio.com" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="Minimo 6 caratteri" />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', cursor: 'pointer', lineHeight: 1.45 }}>
            <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--accent)', flexShrink: 0 }} />
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

          {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>}

          <button type="submit" disabled={loading || !acceptedPrivacy} style={{ width: '100%', padding: '11px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !acceptedPrivacy ? 0.55 : 1 }}>
            {loading ? 'Registrazione...' : 'Crea account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Hai già un account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Accedi</Link>
          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '11px' }}>
              Privacy
            </Link>
            <Link to="/cookie" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '11px' }}>
              Cookie
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}