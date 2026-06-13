import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useCookieConsent, COOKIE_CONSENT_POLICY_VERSION } from '../contexts/CookieConsentContext'

const btnPrimary: CSSProperties = {
  padding: '10px 16px',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSecondary: CSSProperties = {
  ...btnPrimary,
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-secondary)',
}

const btnGhost: CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--accent)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export default function CookieConsentBanner() {
  const { consent, settingsOpen, openSettings, closeSettings, acceptNecessaryOnly, acceptAll, saveCustom } = useCookieConsent()
  const [functional, setFunctional] = useState(true)
  const [analytics, setAnalytics] = useState(false)

  const showBanner = consent === null
  const showPanel = showBanner || settingsOpen

  useEffect(() => {
    if (settingsOpen && consent) {
      setFunctional(consent.functional)
      setAnalytics(consent.analytics)
    }
  }, [settingsOpen, consent])

  if (!showPanel) return null

  const customizeMode = settingsOpen

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fixlab-cookie-title"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        padding: '16px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          maxWidth: '720px',
          margin: '0 auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '14px',
          padding: '18px 20px',
          boxShadow: '0 -8px 40px var(--shadow)',
        }}
      >
        <h2 id="fixlab-cookie-title" style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px' }}>
          {customizeMode && consent ? 'Preferenze privacy e cookie' : customizeMode ? 'Personalizza cookie' : 'Cookie e dati personali'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px' }}>
          Usiamo tecnologie necessarie per l&apos;accesso e il gestionale (Firebase / Google), memorizzazione locale per preferenze
          opzionali e, se acconsenti, spazio per future statistiche anonime. Dettagli nella{' '}
          <Link to="/privacy" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Privacy
          </Link>{' '}
          e nella{' '}
          <Link to="/cookie" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Cookie policy
          </Link>
          . Informativa v{COOKIE_CONSENT_POLICY_VERSION}.
        </p>

        {customizeMode ? (
          <div style={{ marginBottom: '14px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'default', marginBottom: '10px' }}>
              <input type="checkbox" checked disabled style={{ marginTop: '3px', accentColor: 'var(--accent)' }} />
              <span>
                <strong>Strettamente necessari</strong> — autenticazione, database, hosting, sicurezza. Sempre attivi.
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', marginBottom: '10px' }}>
              <input type="checkbox" checked={functional} onChange={e => setFunctional(e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--accent)' }} />
              <span>
                <strong>Funzionali / preferenze</strong> — salvataggio tema chiaro/scuro sul dispositivo.
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} style={{ marginTop: '3px', accentColor: 'var(--accent)' }} />
              <span>
                <strong>Misurazione / statistiche</strong> — per eventuali strumenti di analisi in futuro (oggi non attivi).
              </span>
            </label>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {!customizeMode ? (
            <>
              <button type="button" onClick={acceptNecessaryOnly} style={btnSecondary}>
                Solo necessari
              </button>
              <button type="button" onClick={acceptAll} style={btnPrimary}>
                Accetta tutto
              </button>
              <button
                type="button"
                onClick={() => {
                  setFunctional(true)
                  setAnalytics(false)
                  openSettings()
                }}
                style={btnGhost}
              >
                Personalizza
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => saveCustom(functional, analytics)} style={btnPrimary}>
                Salva preferenze
              </button>
              <button
                type="button"
                onClick={() => {
                  closeSettings()
                }}
                style={btnSecondary}
              >
                {consent ? 'Annulla' : 'Indietro'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
