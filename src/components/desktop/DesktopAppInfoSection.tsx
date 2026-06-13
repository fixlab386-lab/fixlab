import { ToolButton } from '../ui'
import { formatUpdateStatusLabel, useDesktopApp } from '../../hooks/useDesktopApp'

export default function DesktopAppInfoSection() {
  const { isDesktop, version, updateStatus, installUpdate } = useDesktopApp()

  if (!isDesktop) return null

  const statusLabel = formatUpdateStatusLabel(updateStatus)
  const canInstall = updateStatus?.state === 'downloaded'

  return (
    <div className="gestionale-settings-section">
      <h3 className="gestionale-settings-section__title">App desktop FixLab</h3>
      <p className="gestionale-settings-section__hint">
        Versione installata e stato degli aggiornamenti automatici da GitHub Releases.
      </p>

      <div className="gestionale-settings-desktop-info">
        <div className="gestionale-settings-desktop-info__row">
          <span className="gestionale-settings-desktop-info__label">Versione</span>
          <span className="gestionale-settings-desktop-info__value">{version ?? '—'}</span>
        </div>

        {statusLabel ? (
          <div
            className={`gestionale-settings-desktop-info__status${
              updateStatus?.state === 'downloaded'
                ? ' gestionale-settings-desktop-info__status--ready'
                : updateStatus?.state === 'error'
                  ? ' gestionale-settings-desktop-info__status--error'
                  : ''
            }`}
          >
            {statusLabel}
          </div>
        ) : (
          <div className="gestionale-settings-desktop-info__status gestionale-settings-desktop-info__status--muted">
            Nessun aggiornamento in corso
          </div>
        )}

        {canInstall ? (
          <ToolButton label="Riavvia e installa aggiornamento" onClick={() => void installUpdate()} />
        ) : null}
      </div>
    </div>
  )
}
