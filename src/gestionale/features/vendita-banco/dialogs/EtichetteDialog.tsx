import { useMemo } from 'react'
import type { RigaDocumento } from '../types'
import { WinButton } from '../WinControls'

type Props = {
  righe: RigaDocumento[]
  onPrint: () => void
  onClose: () => void
}

export default function EtichetteDialog({ righe, onPrint, onClose }: Props) {
  const items = useMemo(
    () => righe.filter(r => r.descrizione.trim() && r.cod.trim()).map(r => `${r.cod} (${Math.max(1, Math.round(r.qta))} etichetta)`),
    [righe],
  )

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--md">
        <div className="vb-dialog__titlebar">
          <span>Stampa</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vb-dialog__body">
          <div className="vb-dialog__field">
            <label className="vb-field__label" htmlFor="etichette-modello">
              Modello di stampa
            </label>
            <select id="etichette-modello" className="vb-select" defaultValue="Etichette indici 3x8">
              <option>Etichette indici 3x8</option>
              <option>Etichette indici 2x7</option>
              <option>Etichette prezzo</option>
            </select>
          </div>
          <div className="vb-etichette-list">
            <p className="vb-field__label">Articoli</p>
            {items.length ? (
              <ul>
                {items.map(line => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="vb-muted">Nessun articolo con codice.</p>
            )}
          </div>
        </div>
        <div className="vb-dialog__footer">
          <WinButton onClick={onPrint} disabled={!items.length}>
            🖨 Stampa
          </WinButton>
          <WinButton onClick={onClose}>✕ Chiudi</WinButton>
        </div>
      </div>
    </div>
  )
}
