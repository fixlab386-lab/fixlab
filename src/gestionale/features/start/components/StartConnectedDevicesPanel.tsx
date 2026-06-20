import { useMemo } from 'react'
import { useAuth } from '../../../../hooks/useAuth'
import { useActiveStudio } from '../../../../hooks/useActiveStudio'
import { useUserInstallations } from '../../../../hooks/useUserInstallations'
import {
  formatInstallationLastSeen,
  installationDisplayName,
  isInstallationActive,
} from '../../../../lib/userInstallations'
import { ToolButton } from '../../../../components/ui'

type Props = {
  variant?: 'full' | 'sidebar'
}

export default function StartConnectedDevicesPanel({ variant = 'full' }: Props) {
  const { user } = useAuth()
  const { memberships } = useActiveStudio()
  const { installations, loading, currentInstallationId, revokeInstallation } = useUserInstallations(user?.uid)

  const now = Date.now()
  const activeCount = useMemo(
    () => installations.filter(i => isInstallationActive(i.lastSeenAt, now)).length,
    [installations, now],
  )
  const otherInstallations = installations.filter(i => i.id !== currentInstallationId)
  const hasOtherDevices = otherInstallations.length > 0
  const multiArchiveReady = memberships.length > 1

  const isSidebar = variant === 'sidebar'

  return (
    <section
      className={`gestionale-start-devices${isSidebar ? ' gestionale-start-devices--sidebar' : ' gestionale-start-panel gestionale-start-panel--wide'}`}
      data-tutorial="start-dispositivi"
    >
      <h2 className={isSidebar ? 'gestionale-start-sidebar__title' : 'gestionale-start-panel__title'}>
        Dispositivi collegati
      </h2>

      {!isSidebar ? (
        <p className="gestionale-start-devices__hint">
          Dove hai aperto FixLab con questo account — app desktop o browser.
        </p>
      ) : null}

      <div className={`gestionale-start-devices__summary${isSidebar ? ' gestionale-start-devices__summary--compact' : ''}`}>
        <div className="gestionale-start-devices__stat">
          <span className="gestionale-start-devices__stat-value">{loading ? '…' : installations.length}</span>
          <span className="gestionale-start-devices__stat-label">installazioni</span>
        </div>
        <div className="gestionale-start-devices__stat">
          <span className="gestionale-start-devices__stat-value">{loading ? '…' : activeCount}</span>
          <span className="gestionale-start-devices__stat-label">attive ora</span>
        </div>
        {!isSidebar ? (
          <div className="gestionale-start-devices__stat">
            <span className="gestionale-start-devices__stat-value">{memberships.length}</span>
            <span className="gestionale-start-devices__stat-label">archivi</span>
          </div>
        ) : null}
      </div>

      {!isSidebar && !loading && hasOtherDevices ? (
        <p className="gestionale-start-devices__notice gestionale-start-devices__notice--ok">
          FixLab risulta aperto anche su {otherInstallations.length}{' '}
          {otherInstallations.length === 1 ? 'altro dispositivo' : 'altri dispositivi'}.
        </p>
      ) : null}

      {!isSidebar && !loading && !hasOtherDevices && installations.length <= 1 ? (
        <p className="gestionale-start-devices__notice">
          Per ora solo questo dispositivo. Accedi da un altro PC o browser con lo stesso account per vederlo qui.
        </p>
      ) : null}

      {!isSidebar ? (
        multiArchiveReady ? (
          <p className="gestionale-start-devices__notice gestionale-start-devices__notice--ok">
            Multi-archivio attivo: {memberships.length} archivi sul tuo account.
          </p>
        ) : (
          <p className="gestionale-start-devices__notice">
            Multi-utente team — in arrivo. Oggi puoi già usare lo stesso account su più dispositivi.
          </p>
        )
      ) : null}

      {isSidebar && !loading && hasOtherDevices ? (
        <p className="gestionale-start-devices__sidebar-note">
          Aperto anche su {otherInstallations.length}{' '}
          {otherInstallations.length === 1 ? 'altro dispositivo' : 'altri dispositivi'}.
        </p>
      ) : null}

      <ul className={`gestionale-start-devices__list${isSidebar ? ' gestionale-start-devices__list--sidebar' : ''}`}>
        {loading ? (
          <li className="gestionale-start-devices__item gestionale-start-devices__item--muted">Caricamento dispositivi…</li>
        ) : installations.length === 0 ? (
          <li className="gestionale-start-devices__item gestionale-start-devices__item--muted">
            Nessuna installazione registrata ancora.
          </li>
        ) : (
          installations.map(installation => {
            const isCurrent = installation.id === currentInstallationId
            const active = isInstallationActive(installation.lastSeenAt, now)
            return (
              <li
                key={installation.id}
                className={`gestionale-start-devices__item${isCurrent ? ' gestionale-start-devices__item--current' : ''}`}
              >
                <div className="gestionale-start-devices__item-main">
                  <div className="gestionale-start-devices__item-title">
                    {installationDisplayName(installation)}
                    {isCurrent ? <span className="gestionale-start-devices__badge">Questo dispositivo</span> : null}
                  </div>
                  <div className="gestionale-start-devices__item-meta">
                    <span>v{installation.appVersion}</span>
                    <span>·</span>
                    <span>
                      {active ? 'Attivo adesso' : `Ultimo accesso: ${formatInstallationLastSeen(installation.lastSeenAt, now)}`}
                    </span>
                  </div>
                </div>
                {!isCurrent ? (
                  <ToolButton
                    label="Rimuovi"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm('Rimuovere questo dispositivo dall’elenco?')) {
                        void revokeInstallation(installation.id)
                      }
                    }}
                  />
                ) : null}
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
