import { useEffect, useRef } from 'react'

type MacInstallDialogProps = {
  open: boolean
  downloadUrl: string
  version: string
  onClose: () => void
  onConfirmDownload: () => void
}

export default function MacInstallDialog({
  open,
  downloadUrl,
  version,
  onClose,
  onConfirmDownload,
}: MacInstallDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const handleDownload = () => {
    onConfirmDownload()
    window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div className="welcome-mac-dialog__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-mac-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-mac-dialog-title"
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className="welcome-mac-dialog__close" onClick={onClose} aria-label="Chiudi">
          ×
        </button>

        <div className="welcome-mac-dialog__header">
          <span className="welcome-mac-dialog__icon" aria-hidden="true">
            🍎
          </span>
          <div>
            <h2 id="welcome-mac-dialog-title">Installare FixLab su Mac</h2>
            <p className="welcome-mac-dialog__subtitle">
              L&apos;app non è ancora verificata da Apple — è normale. Segui questi passaggi una sola volta.
              {version ? ` Versione ${version}.` : ''}
            </p>
          </div>
        </div>

        <ol className="welcome-mac-dialog__steps">
          <li>
            <strong>Scarica il file</strong>
            <span>Clicca il pulsante in basso: si scarica <code>FixLab-mac.dmg</code>.</span>
          </li>
          <li>
            <strong>Installa l&apos;app</strong>
            <span>Apri il .dmg e trascina <strong>FixLab</strong> nella cartella <strong>Applicazioni</strong>.</span>
          </li>
          <li>
            <strong>Prima apertura (importante)</strong>
            <span>
              macOS potrebbe dire che l&apos;app «non può essere aperta». Vai in <strong>Applicazioni</strong>,
              fai <strong>tasto destro</strong> su FixLab → <strong>Apri</strong> → conferma con <strong>Apri</strong>.
            </span>
          </li>
          <li>
            <strong>Pronto</strong>
            <span>Dalle volte successive apri FixLab normalmente, come qualsiasi altra app.</span>
          </li>
        </ol>

        <div className="welcome-mac-dialog__note">
          Compatibile con Mac Intel e Apple Silicon (M1, M2, M3). Stessi dati e account della versione web.
        </div>

        <div className="welcome-mac-dialog__actions">
          <button type="button" className="auth-btn auth-btn--secondary" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="auth-btn" onClick={handleDownload}>
            Ho capito — avvia download
          </button>
        </div>
      </div>
    </div>
  )
}
