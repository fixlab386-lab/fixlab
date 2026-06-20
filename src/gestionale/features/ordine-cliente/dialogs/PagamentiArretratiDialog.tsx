import { useState } from 'react'
import { formatEuro } from '../../vendita-banco/utils'
import { WinButton } from '../../vendita-banco/WinControls'
import type { OverduePaymentRow } from '../clientOverduePayments'
import { setArretratiWarningHidden } from '../clientOverduePayments'

type Props = {
  clientName: string
  rows: OverduePaymentRow[]
  onConfirm: () => void
  onClose: () => void
}

export default function PagamentiArretratiDialog({ clientName, rows, onConfirm, onClose }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const total = rows.reduce((acc, r) => acc + r.amount, 0)

  const handleOk = () => {
    if (dontShowAgain) setArretratiWarningHidden(true)
    onConfirm()
  }

  return (
    <div className="vb-dialog-overlay oc-arretrati-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md oc-arretrati-dialog">
        <div className="vb-dialog__titlebar">
          <span>FIXLab</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body oc-arretrati">
          <div className="oc-arretrati__icon" aria-hidden="true">
            ⚠
          </div>
          <div className="oc-arretrati__content">
            <p className="oc-arretrati__question">
              &quot;{clientName}&quot; ha dei pagamenti arretrati non ancora saldati: Vuoi procedere comunque?
            </p>
            <div className="oc-arretrati__list-wrap">
              <ul className="oc-arretrati__list">
                {rows.map(row => (
                  <li key={row.id}>
                    <span className="oc-arretrati__amount">{formatEuro(row.amount)}</span>
                    <span className="oc-arretrati__meta">
                      scadenza {row.dueDateLabel}
                      {row.description ? ` — ${row.description}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="oc-arretrati__total">(Totale: {formatEuro(total)})</p>
            </div>
            <label className="vb-radio oc-arretrati__hide">
              <input type="checkbox" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} />
              Non mostrare più questo messaggio
            </label>
          </div>
        </div>
        <div className="vb-dialog__footer">
          <WinButton onClick={handleOk}>OK</WinButton>
          <WinButton onClick={onClose}>Annulla</WinButton>
        </div>
      </div>
    </div>
  )
}
