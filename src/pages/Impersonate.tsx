import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { signInWithCustomToken } from 'firebase/auth'
import { auth } from '../firebase'
import { setImpersonationStudioName } from '../components/ImpersonationBanner'

export default function Impersonate() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Accesso in corso...')

  useEffect(() => {
    const token = params.get('token')
    const studio = params.get('studio')
    if (!token) {
      setError('Token mancante.')
      return
    }

    if (studio) setImpersonationStudioName(studio)

    void signInWithCustomToken(auth, token)
      .then(() => {
        setStatus('Accesso completato. Reindirizzamento...')
        navigate('/', { replace: true })
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Accesso non riuscito.')
      })
  }, [params, navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f12',
        color: '#e4e4e7',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {error ? (
          <>
            <div style={{ color: '#fca5a5', marginBottom: '12px' }}>{error}</div>
            <button type="button" onClick={() => window.close()} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              Chiudi finestra
            </button>
          </>
        ) : (
          <div style={{ color: '#a78bfa' }}>{status}</div>
        )}
      </div>
    </div>
  )
}
