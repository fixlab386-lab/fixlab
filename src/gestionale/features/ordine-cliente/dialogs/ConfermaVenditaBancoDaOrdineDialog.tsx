import { useState } from 'react'
import { WinButton } from '../../vendita-banco/WinControls'

type Props = {
  onConfirm: (mettiRigheQtaZero: boolean) => void
  onClose: () => void
}

export default function ConfermaVenditaBancoDaOrdineDialog({ onConfirm, onClose }: Props) {
  const [mettiQtaZero, setMettiQtaZero] = useState(false)

  return (
    <div className="vb-dialog-overlay" style={{ zIndex: 24000 }} role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md">
        <div className="vb-dialog__titlebar">
          <span>FIXLab</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body oc-conferma-vb">
          <div className="oc-conferma-vb__icon" aria-hidden="true">
            ?
          </div>
          <p className="oc-conferma-vb__question">
            Vuoi creare un documento di tipo &apos;Vendita al banco&apos; a partire da questo?
          </p>
          <p className="oc-conferma-vb__hint">
            (Per evadere parzialmente l&apos;ordine, rimuovi le righe in eccesso o diminuisci le quantità nel nuovo
            documento.)
          </p>
          <label className="vb-radio oc-conferma-vb__check">
            <input type="checkbox" checked={mettiQtaZero} onChange={e => setMettiQtaZero(e.target.checked)} />
            In &apos;Vendita al banco&apos; metti righe con Q.tà=0 (utile per consegne di una minima parte delle voci
            presenti)
          </label>
        </div>
        <div className="vb-dialog__footer">
          <WinButton onClick={() => onConfirm(mettiQtaZero)}>OK</WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
          <WinButton onClick={onClose}>?</WinButton>
        </div>
      </div>
    </div>
  )
}
