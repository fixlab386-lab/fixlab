import { useMemo, useState } from 'react'
import { STAMPA_SORGENTI_CARTA, STAMPA_STAMPANTI } from '../constants'
import { getStampaModelli, type StampaModello } from '../../../../lib/stampaModelli'
import CaricaModelloDialog from './CaricaModelloDialog'
import { WinButton, WinField, WinInput, WinSelect } from '../WinControls'

export type StampaDocumentScope =
  | 'vendita_banco'
  | 'ordine_cliente'
  | 'ordine_fornitore'
  | 'preventivo'
  | 'rapporto_intervento'
  | 'ddt'
  | 'fattura'
  | 'fattura_proforma'
  | 'fattura_acconto'
  | 'fattura_accomp'

type Props = {
  scope?: StampaDocumentScope
  studioData?: Record<string, unknown>
  onClose: () => void
  onPreview: (copie: number, modello?: StampaModello) => void
  onPrint: (copie: number, modello?: StampaModello) => void
  onPdf: (copie: number, modello?: StampaModello) => void
  onEmail?: (copie: number, modello?: StampaModello) => void
  onWhatsApp?: (copie: number, modello?: StampaModello) => void
  /** @deprecated La personalizzazione avviene ora dal dialog "Carica modello". */
  onPersonalizzaTemplate?: () => void
}

export default function StampaDialog({
  scope = 'vendita_banco',
  studioData,
  onClose,
  onPreview,
  onPrint,
  onPdf,
  onEmail,
  onWhatsApp,
}: Props) {
  const [modelli, setModelli] = useState<StampaModello[]>(() => getStampaModelli(scope))
  const [modelloId, setModelloId] = useState<string>(() => modelli[0]?.id ?? '')
  const [stampante, setStampante] = useState<string>(STAMPA_STAMPANTI[2])
  const [copie, setCopie] = useState(1)
  const [sorgente, setSorgente] = useState<string>(STAMPA_SORGENTI_CARTA[0])
  const [showCaricaModello, setShowCaricaModello] = useState(false)

  const modello = useMemo(() => modelli.find(m => m.id === modelloId) ?? modelli[0], [modelli, modelloId])

  const handleProprietaStampante = () => {
    window.alert(
      `Stampante selezionata: ${stampante}\nSorgente carta: ${sorgente}\nCopie: ${copie}\n\nPer modificare le impostazioni hardware usa il pannello di controllo del sistema operativo.`,
    )
  }

  const handleEmail = () => {
    if (onEmail) {
      onEmail(copie, modello)
      return
    }
    window.alert('Per inviare il documento via e-mail genera prima il PDF, quindi allegalo dal tuo client di posta.')
  }

  const handleWhatsApp = () => {
    if (onWhatsApp) {
      onWhatsApp(copie, modello)
      return
    }
    window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="vb-dialog-overlay oc-stampa-overlay" role="dialog" aria-modal="true" style={{ zIndex: 24000 }}>
        <div className="vb-dialog vb-dialog--stampa">
          <div className="vb-stampa-header">
            <div>
              <h2 className="vb-stampa-header__title">Stampa</h2>
              <p className="vb-stampa-header__subtitle">Seleziona il modello ed imposta le preferenze di stampa</p>
            </div>
            <span className="vb-stampa-header__icon" aria-hidden="true">
              🖨
            </span>
          </div>

          <div className="vb-dialog__body vb-dialog__body--stampa">
            <div className="vb-dialog__field">
              <WinField label="Modello di stampa" htmlFor="stampa-modello">
                <div className="vb-row">
                  <WinSelect
                    id="stampa-modello"
                    className="vb-input--flex"
                    value={modelloId}
                    onChange={e => setModelloId(e.target.value)}
                  >
                    {modelli.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </WinSelect>
                  <WinButton onClick={() => setShowCaricaModello(true)}>Personalizza…</WinButton>
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

          <div className="vb-dialog__footer vb-dialog__footer--stampa">
            <WinButton onClick={() => onPreview(copie, modello)}>🔍 Anteprima</WinButton>
            <WinButton onClick={() => onPrint(copie, modello)}>🖨 Stampa</WinButton>
            <WinButton onClick={handleEmail}>✉ e-mail</WinButton>
            <WinButton onClick={handleWhatsApp}>
              <span className="vb-stampa-wa">✆</span> WhatsApp
            </WinButton>
            <WinButton onClick={() => onPdf(copie, modello)}>📄 Pdf</WinButton>
            <WinButton onClick={() => alert('Guida stampa.')}>?</WinButton>
            <WinButton onClick={onClose}>✕ Chiudi</WinButton>
          </div>
        </div>
      </div>

      {showCaricaModello ? (
        <CaricaModelloDialog
          scope={scope}
          studioData={studioData}
          initialSelectedId={modelloId}
          onClose={() => {
            setModelli(getStampaModelli(scope))
            setShowCaricaModello(false)
          }}
          onSelect={m => {
            const refreshed = getStampaModelli(scope)
            setModelli(refreshed)
            setModelloId(m.id)
            setShowCaricaModello(false)
          }}
        />
      ) : null}
    </>
  )
}
