import { useState } from 'react'
import { ToolButton } from '../ui'
import { formatUpdateStatusLabel, useDesktopApp } from '../../hooks/useDesktopApp'

export default function DesktopAppInfoSection() {
  const { isDesktop, version, updateStatus, installUpdate, checkForUpdates } = useDesktopApp()
  const [checking, setChecking] = useState(false)

  if (!isDesktop) return null

  const statusLabel = formatUpdateStatusLabel(updateStatus)
  const canInstall = updateStatus?.state === 'downloaded'
  const isError = updateStatus?.state === 'error'

  const handleCheck = async () => {
    setChecking(true)
    try {
      await checkForUpdates()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="gestionale-settings-section">
      <h3 className="gestionale-settings-section__title">App desktop FixLab</h3>
      <p className="gestionale-settings-section__hint">
        Gli aggiornamenti arrivano da GitHub Releases. Se non compare il banner in alto, usa &quot;Controlla
        aggiornamenti&quot; oppure scarica l&apos;installer dalla pagina GitHub del progetto.
      </p>

      <div className="gestionale-settings-desktop-info">
        <div className="gestionale-settings-desktop-info__row">
          <span className="gestionale-settings-desktop-info__label">Versione installata</span>
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
            Avvio controllo aggiornamenti…
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ToolButton
            label={checking ? 'Controllo…' : 'Controlla aggiornamenti'}
            onClick={() => void handleCheck()}
            disabled={checking}
          />
          {canInstall ? (
            <ToolButton label="Riavvia e installa aggiornamento" onClick={() => void installUpdate()} />
          ) : null}
          {isError ? (
            <ToolButton
              label="Scarica installer da GitHub"
              onClick={() => {
                window.open('https://github.com/fixlab386-lab/fixlab/releases/latest', '_blank', 'noopener,noreferrer')
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
