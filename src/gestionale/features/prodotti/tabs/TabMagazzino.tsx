import type { Prodotto } from '../types'
import { aggiornaMagazzinoDisponibile } from '../utils'

type Props = {
  prodotto: Prodotto
  onChange: (p: Prodotto) => void
  onCarica: () => void
  onScarica: () => void
  onRettifica: () => void
}

export default function TabMagazzino({ prodotto, onChange, onCarica, onScarica, onRettifica }: Props) {
  const m = prodotto.magazzino
  if (!m) {
    return <div className="prodotti-empty-scheda">Magazzino non disponibile per questa tipologia.</div>
  }

  const patchMag = (patch: Partial<typeof m>) => {
    const next = aggiornaMagazzinoDisponibile({ ...m, ...patch })
    onChange({ ...prodotto, magazzino: next })
  }

  return (
    <div>
      <div className="prodotti-row" style={{ marginBottom: 8 }}>
        <button type="button" className="prodotti-actionbar__btn" onClick={onCarica}>
          Carica
        </button>
        <button type="button" className="prodotti-actionbar__btn" onClick={onScarica}>
          Scarica
        </button>
        <button type="button" className="prodotti-actionbar__btn" onClick={onRettifica}>
          Rettifica
        </button>
      </div>

      <div className="prodotti-row">
        <div className="prodotti-field">
          <label className="prodotti-field__label">Ordine multiplo di</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={m.ordineMultiplo}
            onChange={e => patchMag({ ordineMultiplo: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">U.m.</label>
          <input className="prodotti-input prodotti-input--short" readOnly value={prodotto.um} />
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">Scorta minima</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={m.scortaMinima}
            onChange={e => patchMag({ scortaMinima: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Ubicazione</label>
          <input
            className="prodotti-input"
            value={m.ubicazione}
            onChange={e => patchMag({ ubicazione: e.target.value })}
          />
        </div>
      </div>

      <div className="prodotti-magazzino-stato">
        <div className="prodotti-magazzino-stato__item">
          <strong>Giacenza</strong>
          {m.giacenza}
        </div>
        <div className="prodotti-magazzino-stato__item">
          <strong>Q.tà impegnata</strong>
          {m.impegnata}
        </div>
        <div className="prodotti-magazzino-stato__item">
          <strong>Q.tà ordinata</strong>
          {m.ordinata}
        </div>
        <div className="prodotti-magazzino-stato__item">
          <strong>Q.tà disponibile</strong>
          {m.disponibile}
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, marginTop: 8 }}>Movimenti</div>
      <table className="prodotti-movimenti-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo Doc.</th>
            <th>Numero</th>
            <th>Ragione Sociale</th>
            <th>Q.tà</th>
            <th>Valore</th>
          </tr>
        </thead>
        <tbody>
          {m.movimenti.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center' }}>
                Nessun movimento
              </td>
            </tr>
          ) : (
            m.movimenti.map((mv, i) => (
              <tr key={i}>
                <td>{mv.data}</td>
                <td>{mv.tipoDoc}</td>
                <td>{mv.numero}</td>
                <td>{mv.ragioneSociale}</td>
                <td>{mv.qta}</td>
                <td>{mv.valore.toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
