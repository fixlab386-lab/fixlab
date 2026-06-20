import { useAppUpdate } from '../contexts/AppUpdateContext'
import '../theme/app-update-banner.css'

export default function AppUpdateBanner() {
  const { banner, applyUpdate, dismissBanner } = useAppUpdate()

  if (!banner.visible) return null

  const canDismiss = banner.kind === 'web' || (banner.kind === 'desktop' && banner.canApply)

  return (
    <div className="app-update-banner" role="status" aria-live="polite">
      <div className="app-update-banner__inner">
        <div className="app-update-banner__text">
          <strong className="app-update-banner__title">Aggiornamento disponibile</strong>
          <span className="app-update-banner__message">{banner.message}</span>
          {banner.progress != null && banner.progress < 100 ? (
            <div className="app-update-banner__progress" aria-hidden="true">
              <div
                className="app-update-banner__progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, banner.progress))}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="app-update-banner__actions">
          {banner.canApply ? (
            <button type="button" className="app-update-banner__btn app-update-banner__btn--primary" onClick={() => void applyUpdate()}>
              {banner.applyLabel}
            </button>
          ) : null}
          {canDismiss ? (
            <button type="button" className="app-update-banner__btn app-update-banner__btn--ghost" onClick={dismissBanner}>
              Più tardi
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
