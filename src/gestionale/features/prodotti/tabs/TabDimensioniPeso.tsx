import { UM_DIMENSIONI, UM_PESO, UM_VOLUME } from '../constants'
import type { Prodotto } from '../types'

type Props = {
  prodotto: Prodotto
  onChange: (p: Prodotto) => void
}

export default function TabDimensioniPeso({ prodotto, onChange }: Props) {
  const dim = prodotto.dimensioni || {
    larghezza: 0,
    altezza: 0,
    profondita: 0,
    volume: 0,
    umDim: 'cm',
    peso: 0,
    pesoLordo: 0,
    umPeso: 'kg',
  }

  const patchDim = (patch: Partial<typeof dim>) =>
    onChange({ ...prodotto, dimensioni: { ...dim, ...patch } })

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 11, color: '#1a5fb4', marginBottom: 6 }}>Dimensioni</div>
      <div className="prodotti-row">
        <div className="prodotti-field">
          <label className="prodotti-field__label">Larghezza</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={dim.larghezza || ''}
            onChange={e => patchDim({ larghezza: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <span style={{ fontSize: 11, paddingBottom: 8 }}>netto/lordo</span>
        <div className="prodotti-field">
          <label className="prodotti-field__label">U.m.</label>
          <select
            className="prodotti-select prodotti-select--combo prodotti-input--short"
            value={dim.umDim}
            onChange={e => patchDim({ umDim: e.target.value })}
          >
            {UM_DIMENSIONI.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prodotti-row">
        <div className="prodotti-field">
          <label className="prodotti-field__label">Altezza</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={dim.altezza || ''}
            onChange={e => patchDim({ altezza: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">Profondità</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={dim.profondita || ''}
            onChange={e => patchDim({ profondita: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">Volume</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={dim.volume || ''}
            onChange={e => patchDim({ volume: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">U.m.</label>
          <select className="prodotti-select prodotti-select--combo prodotti-input--short" defaultValue="cdm">
            {UM_VOLUME.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#1a5fb4', margin: '10px 0 6px' }}>Peso</div>
      <div className="prodotti-row">
        <div className="prodotti-field">
          <label className="prodotti-field__label">U.m.</label>
          <select
            className="prodotti-select prodotti-select--combo prodotti-input--short"
            value={dim.umPeso}
            onChange={e => patchDim({ umPeso: e.target.value })}
          >
            {UM_PESO.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">Peso</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={dim.peso || ''}
            onChange={e => patchDim({ peso: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <span style={{ fontSize: 11, paddingBottom: 8 }}>netto/lordo</span>
        <div className="prodotti-field">
          <label className="prodotti-field__label">Peso lordo</label>
          <input
            className="prodotti-input prodotti-input--short"
            type="number"
            value={dim.pesoLordo || ''}
            onChange={e => patchDim({ pesoLordo: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  )
}
