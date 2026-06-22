type Props = {
  daysLeft: number
  onDismiss?: () => void
}

const SESSION_KEY = 'fixlab_subscription_banner_dismissed'

export function isSubscriptionBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissSubscriptionBanner(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

export default function SubscriptionBanner({ daysLeft, onDismiss }: Props) {
  const handleDismiss = () => {
    dismissSubscriptionBanner()
    onDismiss?.()
  }

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)',
        borderBottom: '1px solid #f59e0b',
        color: '#78350f',
        fontSize: '13px',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        zIndex: 900,
      }}
    >
      <span>
        ⚠️ Il tuo abbonamento scade tra <strong>{daysLeft}</strong>{' '}
        {daysLeft === 1 ? 'giorno' : 'giorni'}.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Chiudi avviso"
        style={{
          padding: '4px 10px',
          background: 'transparent',
          border: '1px solid #d97706',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#92400e',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
