import type { AnomaliaMagazzino } from '../stockCheck'
import { WinButton } from '../WinControls'

type Props = {
  anomalies: AnomaliaMagazzino[]
  onYes: () => void
  onNo: () => void
  onPrint: () => void
}

export default function AnomalieMagazzinoDialog({ anomalies, onYes, onNo, onPrint }: Props) {
  return (
    <div className="vb-dialog-overlay" role="dialog" aria-modal="true">
      <div className="vb-dialog vb-dialog--lg">
        <div className="vb-dialog__titlebar">
          <span>Anomalie magazzino</span>
        </div>
        <div className="vb-dialog__body vb-anomalie">
          <div className="vb-anomalie__icon" aria-hidden="true">
            ⚠
          </div>
          <div className="vb-anomalie__text">
            <p>Sono state riscontrate delle anomalie nel magazzino:</p>
            <p>
              Si vuole comunque procedere ed eseguire la verifica in un secondo momento?
              <br />
              Nei seguenti prodotti la quantità richiesta supera quella in giacenza:
            </p>
            <div className="vb-anomalie__list">
              {anomalies.map(a => (
                <div key={`${a.codice}-${a.descrizione}`}>
                  [{a.codice}] {a.descrizione} (Rich.: {a.richiesta} - Giac.: {a.giacenza})
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="vb-dialog__footer">
          <WinButton onClick={onYes}>Sì</WinButton>
          <WinButton onClick={onNo}>No</WinButton>
          <WinButton onClick={onPrint}>Stampa</WinButton>
        </div>
      </div>
    </div>
  )
}
