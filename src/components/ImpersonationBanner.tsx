const IMPERSONATION_KEY = 'fixlab_impersonation_studio'

export function setImpersonationStudioName(name: string): void {
  try {
    sessionStorage.setItem(IMPERSONATION_KEY, name)
  } catch {
    /* ignore */
  }
}

export function getImpersonationStudioName(): string | null {
  try {
    return sessionStorage.getItem(IMPERSONATION_KEY)
  } catch {
    return null
  }
}

export function clearImpersonationStudioName(): void {
  try {
    sessionStorage.removeItem(IMPERSONATION_KEY)
  } catch {
    /* ignore */
  }
}

type Props = {
  studioName?: string
}

export default function ImpersonationBanner({ studioName }: Props) {
  const stored = getImpersonationStudioName()
  const label = stored || studioName
  if (!label) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: '#7c3aed',
        color: '#fff',
        fontSize: '13px',
        fontWeight: 500,
        zIndex: 99999,
      }}
    >
      <span>⚠️ Stai visualizzando come: <strong>{label}</strong></span>
      <button
        type="button"
        onClick={() => window.close()}
        style={{
          padding: '4px 12px',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '6px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Torna all&apos;admin
      </button>
    </div>
  )
}
