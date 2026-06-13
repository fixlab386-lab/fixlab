import { WinButton } from '../WinControls'
import type { DocumentAttachment } from '../../../../lib/documentAttachments'

type Props = {
  attachments?: DocumentAttachment[]
  uploading?: boolean
  onSmartphone: () => void
  onScan: () => void
  onImport: () => void
  onOpen?: (attachment: DocumentAttachment) => void
  onDelete?: (attachment: DocumentAttachment) => void
  onClose: () => void
}

export default function AllegatiDialog({
  attachments = [],
  uploading = false,
  onSmartphone,
  onScan,
  onImport,
  onOpen,
  onDelete,
  onClose,
}: Props) {
  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md">
        <div className="vb-dialog__titlebar">
          <span>Allegati{attachments.length ? ` (${attachments.length})` : ''}</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body vb-allegati">
          <WinButton className="vb-allegati__btn" onClick={onSmartphone} disabled={uploading}>
            Da smartphone/e-mail
          </WinButton>
          <WinButton className="vb-allegati__btn" onClick={onScan} disabled={uploading}>
            Scansiona
          </WinButton>
          <WinButton className="vb-allegati__btn" onClick={onImport} disabled={uploading}>
            {uploading ? 'Caricamento…' : 'Importa'}
          </WinButton>

          {attachments.length > 0 ? (
            <ul className="vb-allegati__list">
              {attachments.map(item => (
                <li key={item.path} className="vb-allegati__item">
                  <button type="button" className="vb-link vb-allegati__open" onClick={() => onOpen?.(item)}>
                    📎 {item.name}
                  </button>
                  <button type="button" className="vb-allegati__delete" title="Elimina" onClick={() => onDelete?.(item)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vb-muted">Nessun allegato. Usa Importa o Scansiona per aggiungere file.</p>
          )}
        </div>
        <div className="vb-dialog__footer vb-dialog__footer--center">
          <WinButton onClick={onClose}>Chiudi</WinButton>
        </div>
      </div>
    </div>
  )
}
