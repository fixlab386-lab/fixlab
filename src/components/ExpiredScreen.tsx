import { logoutAndClearSession } from '../lib/logout'
import { usePaymentConfig } from '../hooks/usePaymentConfig'
import { formatEuro } from '../lib/subscription'
import type { Subscription } from '../types'

type Props = {
  subscription: Subscription
  studioName?: string
}

export default function ExpiredScreen({ subscription, studioName }: Props) {
  const { config } = usePaymentConfig()

  const handleLogout = () => {
    void logoutAndClearSession().then(() => {
      window.location.href = '/login'
    })
  }

  const whatsappUrl = config.whatsappNumber
    ? `https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Ciao, vorrei rinnovare l'abbonamento FIXLab per ${studioName ?? 'il mio studio'}.`,
      )}`
    : undefined

  const yearlyAmount = formatEuro(config.yearlyPrice || subscription.yearlyPrice)
  const monthlyAmount = formatEuro(config.monthlyPrice || subscription.monthlyPrice)
  const causale = `FIXLab - ${studioName ?? 'Studio'} - Rinnovo`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--bg-primary, #0B0C0F)',
        color: 'var(--text-primary, #f4f4f5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          background: 'var(--bg-secondary, #16181d)',
          border: '1px solid var(--border, #2a2d35)',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>🔒</div>
        <h1 style={{ margin: '0 0 12px', fontSize: '22px', textAlign: 'center' }}>
          Il tuo abbonamento è scaduto
        </h1>
        <p style={{ margin: '0 0 8px', color: 'var(--text-muted, #a1a1aa)', textAlign: 'center', lineHeight: 1.5 }}>
          Il tuo abbonamento FIXLab è scaduto il{' '}
          <strong style={{ color: 'var(--text-primary, #f4f4f5)' }}>
            {new Date(`${subscription.expiryDate}T12:00:00`).toLocaleDateString('it-IT')}
          </strong>
          .
          <br />
          Per continuare a utilizzare l&apos;app, rinnova il tuo abbonamento.
        </p>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted, #a1a1aa)', textAlign: 'center', fontSize: '13px' }}>
          I tuoi dati sono al sicuro e verranno mantenuti.
        </p>

        <div
          style={{
            background: 'var(--bg-primary, #0B0C0F)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '15px', color: 'var(--accent, #6366f1)' }}>
            Come rinnovare
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>💳 Bonifico bancario</div>
            {config.iban ? (
              <>
                <div>IBAN: <code>{config.iban}</code></div>
                {config.ibanHolder && <div>Intestatario: {config.ibanHolder}</div>}
                {config.bankName && <div>Banca: {config.bankName}</div>}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>IBAN non configurato — contatta il supporto.</div>
            )}
            <div>Importo: {yearlyAmount} (annuale) oppure {monthlyAmount} (mensile)</div>
            <div>Causale: &quot;{causale}&quot;</div>
          </div>

          {config.satispayId && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>📱 Satispay</div>
              <div>{config.satispayId}</div>
            </div>
          )}

          {config.paypalLink && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>💰 PayPal</div>
              <a href={config.paypalLink} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                {config.paypalLink}
              </a>
            </div>
          )}

          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
            Dopo il pagamento, il tuo account verrà riattivato entro 24 ore.
            {config.supportEmail && (
              <>
                {' '}
                Per assistenza:{' '}
                <a href={`mailto:${config.supportEmail}`} style={{ color: 'var(--accent)' }}>
                  {config.supportEmail}
                </a>
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                background: '#25D366',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Contattaci su WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => void handleLogout()}
            style={{
              padding: '10px',
              background: 'transparent',
              border: '1px solid var(--border, #2a2d35)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  )
}
