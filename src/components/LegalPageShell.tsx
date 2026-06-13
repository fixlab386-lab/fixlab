import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import PageHeader from './page/PageHeader'
import { PLATFORM_PROVIDER_CONTACT, platformProviderMailto } from '../legal/platformContact'

type LegalPageShellProps = {
  title: string
  /** Una riga che spiega a cosa serve il documento (stesso linguaggio delle altre pagine). */
  subtitle?: string
  /** Link opzionale al documento gemello (es. Privacy ↔ Cookie). */
  siblingNav?: { to: string; label: string }
  children: ReactNode
}

export function LegalPageShell({ title, subtitle, siblingNav, children }: LegalPageShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px 20px 48px',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <PageHeader
          eyebrow="FIXLAB · Documentazione"
          title={title}
          subtitle={
            subtitle ??
            'Testo informativo: non sostituisce una consulenza legale. Tienilo allineato a ruoli, utilizzatori e trattamenti reali dei dati.'
          }
          actions={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <Link to="/" className="fixlab-btn fixlab-btn--secondary" style={{ textDecoration: 'none' }}>
                Home app
              </Link>
              <Link to="/login" className="fixlab-btn fixlab-btn--secondary" style={{ textDecoration: 'none' }}>
                Login
              </Link>
              {siblingNav ? (
                <Link to={siblingNav.to} className="fixlab-btn fixlab-btn--secondary" style={{ textDecoration: 'none' }}>
                  {siblingNav.label}
                </Link>
              ) : null}
            </div>
          }
        />
        <article style={{ fontSize: '14px', lineHeight: 1.65, color: 'var(--text-secondary)', marginTop: '28px' }}>{children}</article>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '28px', lineHeight: 1.55 }}>
          <strong>Fornitore piattaforma</strong> — {PLATFORM_PROVIDER_CONTACT.displayName}:{' '}
          <a href={platformProviderMailto} style={{ color: 'var(--accent)' }}>
            {PLATFORM_PROVIDER_CONTACT.email}
          </a>
          {' · '}
          <a href={PLATFORM_PROVIDER_CONTACT.phoneHref} style={{ color: 'var(--accent)' }}>
            {PLATFORM_PROVIDER_CONTACT.phoneDisplay}
          </a>
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px', lineHeight: 1.5 }}>
          Documento informativo di supporto. Distingue tra fornitore dello strumento (FIXLab) e professionista che inserisce i dati dei
          clienti in laboratorio. Aggiorna i testi quando cambiano ruoli, numero di utilizzatori o obblighi legali; per dubbi specifici
          rivolgiti a un professionista (es. legale o commercialista).
        </p>
      </div>
    </div>
  )
}
