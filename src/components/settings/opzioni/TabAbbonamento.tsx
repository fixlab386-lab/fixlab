import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { usePaymentConfig } from '../../../hooks/usePaymentConfig'
import {
  formatEuro,
  resolveSubscriptionState,
  subscriptionStatusEmoji,
  subscriptionStatusLabel,
  todayYmd,
} from '../../../lib/subscription'
import type { Subscription } from '../../../types'

export default function TabAbbonamento() {
  const { activeStudioId } = useActiveStudio()
  const { config } = usePaymentConfig()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [studioName, setStudioName] = useState('')

  useEffect(() => {
    if (!activeStudioId) return
    const unsub = onSnapshot(doc(db, 'studios', activeStudioId), snap => {
      if (!snap.exists()) return
      const data = snap.data()
      setStudioName(String(data.name ?? ''))
      setSubscription((data.subscription as Subscription | undefined) ?? null)
    })
    return unsub
  }, [activeStudioId])

  const state = resolveSubscriptionState(subscription, todayYmd())
  const sub = subscription
  const yearlyAmount = formatEuro(config.yearlyPrice || sub?.yearlyPrice || 200)
  const monthlyAmount = formatEuro(config.monthlyPrice || sub?.monthlyPrice || 19)
  const causale = `FIXLab - ${studioName || 'Studio'} - Rinnovo`

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-secondary, #f4f4f5)',
    borderRadius: '10px',
    padding: '16px 20px',
    marginBottom: '16px',
  }

  if (!sub) {
    return <p style={{ color: 'var(--text-muted)' }}>Caricamento abbonamento...</p>
  }

  return (
    <div className="opzioni-section">
      <h2 className="opzioni-section__title">Abbonamento FIXLab</h2>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Piano</div>
            <strong style={{ textTransform: 'capitalize' }}>{sub.plan}</strong>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Stato</div>
            <strong>
              {subscriptionStatusEmoji(state?.effectiveStatus ?? sub.status)}{' '}
              {subscriptionStatusLabel(state?.effectiveStatus ?? sub.status)}
            </strong>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Giorni rimanenti</div>
            <strong>{state?.daysLeft ?? '—'}</strong>
          </div>
        </div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '160px 1fr', gap: '6px', fontSize: '14px' }}>
          <dt style={{ color: 'var(--text-muted)' }}>Data inizio</dt>
          <dd style={{ margin: 0 }}>{sub.startDate}</dd>
          <dt style={{ color: 'var(--text-muted)' }}>Data scadenza</dt>
          <dd style={{ margin: 0 }}>{sub.expiryDate}</dd>
          <dt style={{ color: 'var(--text-muted)' }}>Frequenza</dt>
          <dd style={{ margin: 0 }}>{sub.paymentFrequency === 'monthly' ? 'Mensile' : 'Annuale'}</dd>
          <dt style={{ color: 'var(--text-muted)' }}>Prezzo</dt>
          <dd style={{ margin: 0 }}>
            {monthlyAmount}/mese · {yearlyAmount}/anno
          </dd>
          {sub.lastPaymentDate && (
            <>
              <dt style={{ color: 'var(--text-muted)' }}>Ultimo pagamento</dt>
              <dd style={{ margin: 0 }}>
                {sub.lastPaymentDate} — {formatEuro(sub.lastPaymentAmount ?? 0)}
                {sub.paymentMethod ? ` (${sub.paymentMethod})` : ''}
              </dd>
            </>
          )}
        </dl>
      </div>

      <h3 className="opzioni-section__subtitle">Come pagare</h3>
      <div style={sectionStyle}>
        <p style={{ margin: '0 0 12px', fontSize: '14px' }}>
          Dopo il pagamento, il tuo account verrà rinnovato entro 24 ore.
        </p>

        <div style={{ marginBottom: '14px' }}>
          <strong>💳 Bonifico bancario</strong>
          {config.iban && (
            <>
              <div>IBAN: <code>{config.iban}</code></div>
              {config.ibanHolder && <div>Intestatario: {config.ibanHolder}</div>}
              {config.bankName && <div>Banca: {config.bankName}</div>}
            </>
          )}
          <div>Importo: {yearlyAmount} (annuale) oppure {monthlyAmount} (mensile)</div>
          <div>Causale suggerita: &quot;{causale}&quot;</div>
        </div>

        {config.paypalLink && (
          <div style={{ marginBottom: '14px' }}>
            <strong>💰 PayPal</strong>
            <div>
              <a href={config.paypalLink} target="_blank" rel="noreferrer">{config.paypalLink}</a>
            </div>
          </div>
        )}

        {config.satispayId && (
          <div style={{ marginBottom: '14px' }}>
            <strong>📱 Satispay</strong>
            <div>{config.satispayId}</div>
          </div>
        )}

        {config.supportEmail && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Assistenza: <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>
          </div>
        )}
      </div>
    </div>
  )
}
