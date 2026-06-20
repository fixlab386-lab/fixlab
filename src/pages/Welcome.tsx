import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell, { AuthFormHeader } from '../components/auth/AuthShell'
import {
  getDesktopDownloadUrl,
  ramCompatibility,
  saveWelcomeChoice,
  type WelcomeOs,
  type WelcomeRam,
} from '../lib/welcomeChoice'
import '../theme/auth.css'
import '../theme/welcome.css'

type Step = 'choose' | 'desktop' | 'web'

export default function Welcome() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('choose')
  const [os, setOs] = useState<WelcomeOs>('windows')
  const [ram, setRam] = useState<WelcomeRam>(8)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    void getDesktopDownloadUrl().then(({ url, version }) => {
      setDownloadUrl(url)
      setAppVersion(version)
    })
  }, [])

  const finishWeb = () => {
    saveWelcomeChoice({ mode: 'web' })
    navigate('/login', { replace: true })
  }

  const finishDesktop = () => {
    saveWelcomeChoice({ mode: 'desktop', os, ramGb: ram })
  }

  const ramStatus = ramCompatibility(ram)

  if (step === 'choose') {
    return (
      <AuthShell
        heroEyebrow="Benvenuto in FixLab"
        heroTitle="Scegli come lavorare: app desktop o browser web"
        heroSubtitle="La prima volta ti guidiamo nella scelta più adatta al tuo laboratorio."
      >
        <AuthFormHeader
          title="Come vuoi usare FixLab?"
          subtitle="Puoi cambiare idea in qualsiasi momento: l'app web e quella desktop condividono gli stessi dati."
        />
        <div className="welcome-panel">
          <div className="welcome-cards">
            <button type="button" className="welcome-card" onClick={() => setStep('desktop')}>
              <span className="welcome-card__icon" aria-hidden="true">
                💻
              </span>
              <span className="welcome-card__body">
                <h3>Scarica l'app desktop</h3>
                <p>Consigliata per uso quotidiano in negozio. Installazione su Windows con aggiornamenti automatici.</p>
              </span>
            </button>
            <button type="button" className="welcome-card" onClick={() => setStep('web')}>
              <span className="welcome-card__icon" aria-hidden="true">
                🌐
              </span>
              <span className="welcome-card__body">
                <h3>Accedi dal browser web</h3>
                <p>Nessuna installazione: entra da PC, tablet o smartphone con email e password.</p>
              </span>
            </button>
          </div>
          <p className="welcome-footer-link">
            Hai già un account?{' '}
            <Link to="/login" onClick={() => saveWelcomeChoice({ mode: 'web' })}>
              Accedi direttamente
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  if (step === 'web') {
    return (
      <AuthShell
        heroEyebrow="FixLab Web"
        heroTitle="Gestionale sempre online, ovunque ti trovi"
        heroSubtitle="Stesso account e stessi dati dell'app desktop."
      >
        <AuthFormHeader
          title="Accedi dal browser"
          subtitle="Apri FixLab da Chrome, Edge o Firefox. Consigliato una connessione stabile e schermo da almeno 1280 px."
        />
        <div className="welcome-panel">
          <ul className="welcome-specs">
            <li>Browser aggiornato (Chrome, Edge, Firefox, Safari)</li>
            <li>Connessione internet attiva</li>
            <li>Risoluzione consigliata: 1280×720 o superiore</li>
          </ul>
          <div className="welcome-actions">
            <button type="button" className="auth-btn" onClick={finishWeb}>
              Continua al login web
            </button>
            <button type="button" className="welcome-back" onClick={() => setStep('choose')}>
              ← Torna indietro
            </button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heroEyebrow="FixLab Desktop"
      heroTitle="Installa l'app sul tuo PC e lavora come un gestionale classico"
      heroSubtitle="Auto-aggiornamento incluso: alla riapertura FixLab si aggiorna da solo."
    >
      <AuthFormHeader
        title="Configura il download"
        subtitle="Indica sistema operativo e memoria RAM: ti diciamo se il PC è adatto e avvii il download."
      />
      <div className="welcome-panel">
        <div>
          <span className="welcome-section-label">Sistema operativo</span>
          <div className="welcome-options">
            <button
              type="button"
              className={`welcome-option${os === 'windows' ? ' welcome-option--active' : ''}`}
              onClick={() => setOs('windows')}
            >
              Windows 10 / 11
            </button>
            <button
              type="button"
              className={`welcome-option${os === 'mac' ? ' welcome-option--active' : ''}`}
              onClick={() => setOs('mac')}
            >
              macOS
              <span className="welcome-badge">Presto</span>
            </button>
          </div>
        </div>

        <div>
          <span className="welcome-section-label">Memoria RAM del PC</span>
          <div className="welcome-options">
            {([4, 8, 16] as WelcomeRam[]).map(value => (
              <button
                key={value}
                type="button"
                className={`welcome-option${ram === value ? ' welcome-option--active' : ''}`}
                onClick={() => setRam(value)}
              >
                {value === 16 ? '16 GB o più' : `${value} GB`}
              </button>
            ))}
          </div>
        </div>

        {os === 'mac' ? (
          <div className="welcome-note welcome-note--info">
            La versione macOS è in arrivo. Nel frattempo puoi usare FixLab dal browser web con lo stesso account.
          </div>
        ) : ramStatus === 'warn' ? (
          <div className="welcome-note welcome-note--warn">
            Con 4 GB FixLab può funzionare, ma consigliamo almeno <strong>8 GB di RAM</strong> per un uso fluido con magazzino e documenti aperti.
          </div>
        ) : ramStatus === 'ok' ? (
          <div className="welcome-note welcome-note--ok">
            Ottimo: con 8 GB il tuo PC è adatto a FixLab desktop per l'uso quotidiano in laboratorio.
          </div>
        ) : (
          <div className="welcome-note welcome-note--ok">
            Configurazione ideale: avrai prestazioni eccellenti anche con molte finestre e documenti aperti.
          </div>
        )}

        {os === 'windows' ? (
          <ul className="welcome-specs">
            <li>Windows 10 o 11 a 64 bit</li>
            <li>Spazio disco: circa 300 MB</li>
            <li>Connessione internet per login e sincronizzazione</li>
            {appVersion ? <li>Versione disponibile: {appVersion}</li> : null}
          </ul>
        ) : null}

        <div className="welcome-actions">
          {os === 'windows' && downloadUrl ? (
            <a
              href={downloadUrl}
              className="auth-btn"
              style={{ textAlign: 'center', textDecoration: 'none' }}
              onClick={() => finishDesktop()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Scarica FixLab per Windows
            </a>
          ) : (
            <button type="button" className="auth-btn auth-btn--secondary" onClick={finishWeb}>
              Usa FixLab dal browser
            </button>
          )}
          {os === 'windows' ? (
            <button
              type="button"
              className="auth-btn auth-btn--secondary"
              onClick={() => {
                finishDesktop()
                navigate('/login', { replace: true })
              }}
            >
              Ho già scaricato — vai al login web
            </button>
          ) : null}
          <button type="button" className="welcome-back" onClick={() => setStep('choose')}>
            ← Torna indietro
          </button>
        </div>
      </div>
    </AuthShell>
  )
}
