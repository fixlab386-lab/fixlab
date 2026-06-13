import { useEffect, useMemo, useState } from 'react'
import type { Client } from '../../types'
import type { StudioArchive } from '../../lib/studioMemberships'
import {
  executeMoveClientToStudio,
  MOVE_CLIENT_CONFIRM_TEXT,
  previewMoveClientToStudio,
  type MoveClientCounts,
  type MoveClientPreviewResult,
} from '../../lib/moveClientToStudio'
import { FormField, ToolButton } from '../ui'
import '../../theme/gestionale-dialog.css'

type Props = {
  client: Client
  sourceStudioId: string
  archives: StudioArchive[]
  onClose: () => void
  onMoved: (result: { targetStudioId: string; clientName: string }) => void
}

function CountsSummary({ counts }: { counts: MoveClientCounts }) {
  return (
    <ul className="gestionale-dialog-hint" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
      <li>{counts.repairs} riparazioni</li>
      <li>{counts.documents} documenti</li>
      <li>{counts.payments} pagamenti</li>
      <li>{counts.devices} dispositivi</li>
      <li>{counts.repairPhotos} foto riparazioni (migrate in Storage)</li>
      <li>
        {counts.stockMovementsStayingInSource} movimenti magazzino restano nell&apos;archivio di origine (traccia
        contabile)
      </li>
    </ul>
  )
}

export default function MoveClientToArchiveDialog({ client, sourceStudioId, archives, onClose, onMoved }: Props) {
  const targetOptions = useMemo(
    () => archives.filter(a => a.studioId !== sourceStudioId),
    [archives, sourceStudioId],
  )

  const [targetStudioId, setTargetStudioId] = useState(targetOptions[0]?.studioId ?? '')
  const [preview, setPreview] = useState<MoveClientPreviewResult | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!targetStudioId && targetOptions[0]) {
      setTargetStudioId(targetOptions[0].studioId)
    }
  }, [targetOptions, targetStudioId])

  useEffect(() => {
    if (!targetStudioId) {
      setPreview(null)
      return
    }

    let cancelled = false
    setBusy(true)
    setError('')
    void previewMoveClientToStudio({
      clientId: client.id,
      sourceStudioId,
      targetStudioId,
    })
      .then(result => {
        if (!cancelled) setPreview(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPreview(null)
          setError(err instanceof Error ? err.message : 'Anteprima non disponibile.')
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })

    return () => {
      cancelled = true
    }
  }, [client.id, sourceStudioId, targetStudioId])

  const targetName = targetOptions.find(a => a.studioId === targetStudioId)?.name ?? targetStudioId

  const handleExecute = async () => {
    if (!targetStudioId || !preview?.withinLimits) return
    setBusy(true)
    setError('')
    try {
      const result = await executeMoveClientToStudio({
        clientId: client.id,
        sourceStudioId,
        targetStudioId,
        confirmText,
      })
      onMoved({ targetStudioId, clientName: result.clientName })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Spostamento non riuscito.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gestionale-dialog-overlay gestionale-theme" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gestionale-dialog-card gestionale-dialog-card--wide" role="dialog" aria-labelledby="move-client-title">
        <header className="gestionale-dialog-card__header">
          <h2 id="move-client-title" className="gestionale-dialog-card__title">
            Sposta cliente in altro archivio
          </h2>
        </header>
        <div className="gestionale-dialog-card__body">
          <p className="gestionale-dialog-hint" style={{ marginTop: 0 }}>
            Stai per spostare <strong>{client.name}</strong> dall&apos;archivio corrente verso un altro. I dati
            scompaiono dall&apos;origine e compaiono nella destinazione. L&apos;operazione non è banale da annullare.
          </p>

          {error ? (
            <div className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ marginBottom: 10 }}>
              {error}
            </div>
          ) : null}

          <FormField label="Archivio di destinazione" htmlFor="move-target-studio" required>
            <select
              id="move-target-studio"
              className="gestionale-form-field__input"
              value={targetStudioId}
              onChange={e => {
                setTargetStudioId(e.target.value)
                setConfirmText('')
              }}
              disabled={busy || targetOptions.length === 0}
            >
              {targetOptions.map(a => (
                <option key={a.studioId} value={a.studioId}>
                  {a.name}
                  {a.isPrimary ? ' (principale)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          {busy && !preview ? <p className="gestionale-dialog-hint">Calcolo anteprima…</p> : null}

          {preview ? (
            <div className="gestionale-settings-info-box" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Riepilogo spostamento → {targetName}</div>
              <CountsSummary counts={preview.counts} />
              {!preview.withinLimits && preview.limitMessage ? (
                <p className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ marginTop: 10 }}>
                  {preview.limitMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          {preview?.withinLimits ? (
            <div style={{ marginTop: 14 }}>
              <FormField
                label={`Conferma digitando ${MOVE_CLIENT_CONFIRM_TEXT}`}
                htmlFor="move-confirm-text"
                required
              >
                <input
                  id="move-confirm-text"
                  className="gestionale-form-field__input"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={MOVE_CLIENT_CONFIRM_TEXT}
                  autoComplete="off"
                  disabled={busy}
                />
              </FormField>
            </div>
          ) : null}
        </div>
        <footer className="gestionale-dialog-card__footer">
          <button type="button" className="gestionale-dialog-btn" onClick={onClose} disabled={busy}>
            Annulla
          </button>
          <ToolButton
            label="Sposta definitivamente"
            variant="danger"
            onClick={() => void handleExecute()}
            disabled={
              busy ||
              !preview?.withinLimits ||
              confirmText !== MOVE_CLIENT_CONFIRM_TEXT ||
              !targetStudioId
            }
          />
        </footer>
      </div>
    </div>
  )
}
