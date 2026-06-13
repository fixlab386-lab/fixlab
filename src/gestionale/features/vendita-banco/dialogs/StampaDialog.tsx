import { useMemo, useState } from 'react'
import { STAMPA_MODELLI, STAMPA_SORGENTI_CARTA, STAMPA_STAMPANTI } from '../constants'
import { addCustomStampaModello, getCustomStampaModelli } from '../../../../lib/userPrefs'
import { WinButton, WinField, WinInput, WinSelect } from '../WinControls'

type Props = {
  onClose: () => void
  onPreview: (copie: number) => void
  onPrint: (copie: number) => void
  onPdf: (copie: number) => void
  onEmail: (copie: number) => void
  onWhatsApp: (copie: number) => void
}

export default function StampaDialog({
  onClose,
  onPreview,
  onPrint,
  onPdf,
  onEmail,
  onWhatsApp,
}: Props) {
  const [modello, setModello] = useState<string>(STAMPA_MODELLI[0])
  const [stampante, setStampante] = useState<string>(STAMPA_STAMPANTI[1])
  const [copie, setCopie] = useState(1)
  const [sorgente, setSorgente] = useState<string>(STAMPA_SORGENTI_CARTA[0])
  const [customModelli, setCustomModelli] = useState<string[]>(() => getCustomStampaModelli('vendita_banco'))

  const modelli = useMemo(() => [...STAMPA_MODELLI, ...customModelli], [customModelli])

  const handlePersonalizzaModello = () => {
    const label = window.prompt('Nome del modello di stampa personalizzato:')
    if (!label?.trim()) return
    const next = addCustomStampaModello('vendita_banco', label)
    setCustomModelli(next)
    setModello(label.trim())
  }

  const handleProprietaStampante = () => {
    window.alert(
      `Stampante selezionata: ${stampante}\nSorgente carta: ${sorgente}\nCopie: ${copie}\n\nPer modificare le impostazioni hardware usa il pannello di controllo del sistema operativo.`,
    )
  }

  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--lg">
        <div className="vb-dialog__titlebar">
          <span>Stampa — Seleziona il modello ed imposta le preferenze di stampa</span>
          <button type="button" className="vb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vb-dialog__body">
          <div className="vb-dialog__field">
            <WinField label="Modello di stampa" htmlFor="stampa-modello">
              <div className="vb-row">
                <WinSelect id="stampa-modello" className="vb-input--flex" value={modello} onChange={e => setModello(e.target.value)}>
                  {modelli.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </WinSelect>
                <WinButton onClick={handlePersonalizzaModello}>Personalizza…</WinButton>
              </div>
            </WinField>
          </div>

          <div className="vb-dialog__field">
            <WinField label="Stampante" htmlFor="stampa-stampante">
              <div className="vb-row">
                <WinSelect
                  id="stampa-stampante"
                  className="vb-input--flex"
                  value={stampante}
                  onChange={e => setStampante(e.target.value)}
                >
                  {STAMPA_STAMPANTI.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </WinSelect>
                <WinButton onClick={handleProprietaStampante}>Proprietà…</WinButton>
              </div>
            </WinField>
          </div>

          <div className="vb-dialog__row2">
            <WinField label="Numero copie" htmlFor="stampa-copie">
              <div className="vb-row vb-row--center">
                <WinButton onClick={() => setCopie(c => Math.max(1, c - 1))}>−</WinButton>
                <WinInput
                  id="stampa-copie"
                  type="number"
                  min={1}
                  style={{ width: 56, textAlign: 'center' }}
                  value={copie}
                  onChange={e => setCopie(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <WinButton onClick={() => setCopie(c => c + 1)}>+</WinButton>
              </div>
            </WinField>

            <WinField label="Sorgente carta" htmlFor="stampa-sorgente">
              <WinSelect id="stampa-sorgente" value={sorgente} onChange={e => setSorgente(e.target.value)}>
                {STAMPA_SORGENTI_CARTA.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </WinSelect>
            </WinField>
          </div>
        </div>

        <div className="vb-dialog__footer">
          <WinButton onClick={() => onPreview(copie)}>🔍 Anteprima</WinButton>
          <WinButton onClick={() => onPrint(copie)}>🖨 Stampa</WinButton>
          <WinButton onClick={() => onEmail(copie)}>✉ e-mail</WinButton>
          <WinButton onClick={() => onWhatsApp(copie)}>🟢 WhatsApp</WinButton>
          <WinButton onClick={() => onPdf(copie)}>📄 Pdf</WinButton>
          <WinButton onClick={() => alert('Guida stampa.')}>?</WinButton>
          <WinButton onClick={onClose}>✕ Chiudi</WinButton>
        </div>
      </div>
    </div>
  )
}
