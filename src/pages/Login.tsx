import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate, Link } from 'react-router-dom'
import PageHeader from '../components/page/PageHeader'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch {
      setError('Email o password errati')
    } finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '36px 32px' }}>
        <PageHeader
          eyebrow="FIXLAB"
          title="Accedi"
          subtitle="Inserisci email e password dello studio: dopo l’accesso torni alla dashboard con riparazioni e magazzino."
        />
        <form onSubmit={handleLogin} style={{ marginTop: '28px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="email@esempio.com" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="••••••••" />
          </div>
          {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Non hai un account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Registrati</Link>
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