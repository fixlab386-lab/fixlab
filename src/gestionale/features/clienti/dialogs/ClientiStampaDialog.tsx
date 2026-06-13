import { useState } from 'react'

const STAMPANTI = ['(Predefinita di sistema)', 'Microsoft Print to PDF', 'Adobe PDF'] as const
const SORGENTI = ['Automatica', 'Vassoio 1', 'Vassoio 2'] as const

type Props = {
  modelli: string[]
  modelloDefault: string
  onClose: () => void
  onAnteprima: (modello: string, copie: number) => void
  onStampa: (modello: string, copie: number) => void
}

export default function ClientiStampaDialog({ modelli, modelloDefault, onClose, onAnteprima, onStampa }: Props) {
  const [modello, setModello] = useState(modelloDefault)
  const [stampante, setStampante] = useState<string>(STAMPANTI[0])
  const [copie, setCopie] = useState(1)
  const [sorgente, setSorgente] = useState<string>(SORGENTI[0])

  return (
    <div className="clienti-dialog-overlay" role="dialog" aria-modal="true">
      <div className="clienti-dialog clienti-dialog--lg">
        <div className="clienti-dialog__titlebar">
          Stampa — Seleziona il modello ed imposta le preferenze di stampa
          <button type="button" className="clienti-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="clienti-dialog__body">
          <div className="clienti-field">
            <label className="clienti-field__label">Modello di stampa</label>
            <div className="clienti-row">
              <select className="clienti-select" style={{ flex: 1 }} value={modello} onChange={e => setModello(e.target.value)}>
                {modelli.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button type="button" className="clienti-dialog__btn" onClick={() => {
                const v = window.prompt('Piè di pagina personalizzato:', sessionStorage.getItem('fixlab-print-footer') ?? '')
                if (v !== null) sessionStorage.setItem('fixlab-print-footer', v)
              }}>
                Personalizza…
              </button>
            </div>
          </div>
          <div className="clienti-field">
            <label className="clienti-field__label">Stampante</label>
            <div className="clienti-row">
              <select className="clienti-select" style={{ flex: 1 }} value={stampante} onChange={e => setStampante(e.target.value)}>
                {STAMPANTI.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button type="button" className="clienti-dialog__btn" title="Simulazione driver di sistema" onClick={() => window.alert('Proprietà stampante: usa le impostazioni di stampa del browser/sistema operativo.')}>
                Proprietà…
              </button>
            </div>
          </div>
          <div className="clienti-row">
            <div className="clienti-field">
              <label className="clienti-field__label">Numero copie</label>
              <div className="clienti-row">
                <button type="button" className="clienti-dialog__btn" onClick={() => setCopie(c => Math.max(1, c - 1))}>
                  −
                </button>
                <input
                  className="clienti-input clienti-input--short"
                  type="number"
                  min={1}
                  value={copie}
                  onChange={e => setCopie(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <button type="button" className="clienti-dialog__btn" onClick={() => setCopie(c => c + 1)}>
                  +
                </button>
              </div>
            </div>
            <div className="clienti-field" style={{ flex: 1 }}>
              <label className="clienti-field__label">Sorgente carta</label>
              <select className="clienti-select" value={sorgente} onChange={e => setSorgente(e.target.value)}>
                {SORGENTI.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="clienti-dialog__footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="clienti-dialog__btn" onClick={() => onAnteprima(modello, copie)}>
              🔍 Anteprima
            </button>
            <button type="button" className="clienti-dialog__btn" onClick={() => onStampa(modello, copie)}>
              🖨 Stampa
            </button>
          </div>
          <button type="button" className="clienti-dialog__btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
