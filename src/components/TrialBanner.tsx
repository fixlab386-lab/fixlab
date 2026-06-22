type Props = {
  daysLeft: number
}

export default function TrialBanner({ daysLeft }: Props) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: 'rgba(99, 102, 241, 0.12)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
        color: 'var(--text-primary, #e4e4e7)',
        fontSize: '13px',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <span>
        🔵 Stai usando il periodo di prova gratuito. Hai{' '}
        <strong>{daysLeft}</strong> {daysLeft === 1 ? 'giorno' : 'giorni'} rimanenti.
      </span>
    </div>
  )
}
