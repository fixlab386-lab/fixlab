import { WinButton } from '../WinControls'

type Props = {
  onSmartphone: () => void
  onScan: () => void
  onImport: () => void
  onClose: () => void
}

export default function AllegatiDialog({ onSmartphone, onScan, onImport, onClose }: Props) {
  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md">
        <div className="vb-dialog__titlebar">
          <span>Allegati</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body vb-allegati">
          <WinButton className="vb-allegati__btn" onClick={onSmartphone}>
            Da smartphone/e-mail
          </WinButton>
          <WinButton className="vb-allegati__btn" onClick={onScan}>
            Scansiona
          </WinButton>
          <WinButton className="vb-allegati__btn" onClick={onImport}>
            Importa
          </WinButton>
        </div>
        <div className="vb-dialog__footer vb-dialog__footer--center">
          <WinButton onClick={onClose}>Chiudi</WinButton>
        </div>
      </div>
    </div>
  )
}
