import { LegalPageShell } from '../components/LegalPageShell'
import { PLATFORM_PROVIDER_CONTACT, platformProviderMailto } from '../legal/platformContact'

const linkStyle = { color: 'var(--accent)' } as const

export default function CookiePolicy() {
  const C = PLATFORM_PROVIDER_CONTACT
  return (
    <LegalPageShell
      title="Cookie policy"
      subtitle="Panoramica su cookie, storage locale e tecnologie simili usate da FIXLab (sessione, preferenze, PWA)."
      siblingNav={{ to: '/privacy', label: 'Privacy' }}
    >
      <p>
        Questa cookie policy illustra quali tecnologie di memorizzazione locale o identificativi possono essere usati dall&apos;App
        FIXLab, in coerenza con la direttiva ePrivacy e il GDPR. Il <strong>fornitore della piattaforma</strong> e il{' '}
        <strong>professionista che usa il gestionale</strong> possono coincidere o meno; in questa fase il servizio è pensato per{' '}
        <strong>un solo professionista</strong> che utilizza l&apos;App.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>1. Cosa intendiamo per &quot;cookie&quot;</h2>
      <p>
        Oltre ai cookie HTTP classici, l&apos;App e i worker del browser possono usare <strong>localStorage</strong>,{' '}
        <strong>sessionStorage</strong>, <strong>IndexedDB</strong> e cache del <strong>Service Worker</strong> (PWA) per finalità
        descritte di seguito.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>2. Tabella sintetica</h2>
      <div style={{ overflowX: 'auto', marginTop: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid var(--border-primary)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid var(--border-primary)' }}>Nome / ambito</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid var(--border-primary)' }}>Tipologia</th>
              <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid var(--border-primary)' }}>Finalità</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>Firebase Authentication</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>Tecnici / necessari</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>
                Sessione utente, token di sicurezza, persistenza login (es. IndexedDB / cookie di dominio Google secondo configurazione SDK).
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>Firestore / Storage</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>Tecnici / necessari</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>
                Recupero e sincronizzazione dati gestionali tramite API Google Firebase.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>fixlab_cookie_consent_v1</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>Tecnici / necessari</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>
                Memorizza la versione dell&apos;informativa (campo <code style={{ fontSize: '12px' }}>policyVersion</code>, allineato
                all&apos;app) e le scelte di consenso (necessari / funzionali / misurazione).
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>fixlab-theme</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>Funzionali</td>
              <td style={{ padding: '10px', borderBottom: '1px solid var(--border-primary)', verticalAlign: 'top' }}>
                Ricorda il tema chiaro/scuro. Scritto solo se accetti le categorie funzionali nelle preferenze cookie.
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', verticalAlign: 'top' }}>Service Worker (PWA)</td>
              <td style={{ padding: '10px', verticalAlign: 'top' }}>Tecnici / necessari</td>
              <td style={{ padding: '10px', verticalAlign: 'top' }}>
                Cache risorse statiche e aggiornamenti versione app; migliora disponibilità offline limitata delle shell.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>3. Gestione delle preferenze</h2>
      <p>
        Dal banner o dal link &quot;Preferenze cookie&quot; nel footer (dopo il login) puoi modificare le categorie non strettamente
        necessarie. Il pulsante &quot;Solo necessari&quot; mantiene attivi unicamente i trattamenti indispensabili all&apos;uso del
        gestionale e alla sicurezza.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>4. Browser</h2>
      <p>
        Puoi cancellare o bloccare le tecnologie di memorizzazione anche dalle impostazioni del browser; ciò può compromettere login o
        funzioni dell&apos;App.
      </p>

      <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginTop: '28px', marginBottom: '10px' }}>5. Contatti</h2>
      <p>
        Per domande su questa cookie policy relative alla piattaforma FIXLab: <strong>{C.displayName}</strong>,{' '}
        <a href={platformProviderMailto} style={linkStyle}>
          {C.email}
        </a>
        , tel.{' '}
        <a href={C.phoneHref} style={linkStyle}>
          {C.phoneDisplay}
        </a>
        .
      </p>
    </LegalPageShell>
  )
}
