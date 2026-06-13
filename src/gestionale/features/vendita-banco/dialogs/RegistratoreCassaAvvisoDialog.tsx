import { REGISTRATORE_CASSA_AVVISO } from '../constants'
import { WinButton } from '../WinControls'

type Props = { onClose: () => void }

export default function RegistratoreCassaAvvisoDialog({ onClose }: Props) {
  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md">
        <div className="vb-dialog__titlebar">
          <span>Registratore di cassa</span>
        </div>
        <div className="vb-dialog__body vb-dialog__body--pre">{REGISTRATORE_CASSA_AVVISO}</div>
        <div className="vb-dialog__footer vb-dialog__footer--center">
          <WinButton onClick={onClose}>OK</WinButton>
        </div>
      </div>
    </div>
  )
}
