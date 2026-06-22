import { UM_DIMENSIONI, UM_PESO, UM_VOLUME } from '../constants'
import type { Prodotto } from '../types'
import { DaneaFormGroupTitle, DaneaFormRow } from '../../../components/DaneaFormRow'

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

  const patchDim = (patch: Partial<typeof dim>) => onChange({ ...prodotto, dimensioni: { ...dim, ...patch } })

  return (
    <div className="danea-form">
      <DaneaFormGroupTitle>Dimensioni</DaneaFormGroupTitle>

      <DaneaFormRow label="Larghezza">
        <input className="prodotti-input prodotti-input--short" type="number" value={dim.larghezza || ''} onChange={e => patchDim({ larghezza: parseFloat(e.target.value) || 0 })} />
      </DaneaFormRow>

      <DaneaFormRow label="U.m. dim.">
        <select className="prodotti-select prodotti-select--combo prodotti-input--short" value={dim.umDim} onChange={e => patchDim({ umDim: e.target.value })}>
          {UM_DIMENSIONI.map(u => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Altezza">
        <input className="prodotti-input prodotti-input--short" type="number" value={dim.altezza || ''} onChange={e => patchDim({ altezza: parseFloat(e.target.value) || 0 })} />
      </DaneaFormRow>

      <DaneaFormRow label="Profondità">
        <input className="prodotti-input prodotti-input--short" type="number" value={dim.profondita || ''} onChange={e => patchDim({ profondita: parseFloat(e.target.value) || 0 })} />
      </DaneaFormRow>

      <DaneaFormRow label="Volume">
        <input className="prodotti-input prodotti-input--short" type="number" value={dim.volume || ''} onChange={e => patchDim({ volume: parseFloat(e.target.value) || 0 })} />
      </DaneaFormRow>

      <DaneaFormRow label="U.m. vol.">
        <select
          className="prodotti-select prodotti-select--combo prodotti-input--short"
          value={dim.umVol ?? 'cdm'}
          onChange={e => patchDim({ umVol: e.target.value })}
        >
          {UM_VOLUME.map(u => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormGroupTitle>Peso</DaneaFormGroupTitle>

      <DaneaFormRow label="U.m. peso">
        <select className="prodotti-select prodotti-select--combo prodotti-input--short" value={dim.umPeso} onChange={e => patchDim({ umPeso: e.target.value })}>
          {UM_PESO.map(u => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Peso netto">
        <input className="prodotti-input prodotti-input--short" type="number" value={dim.peso || ''} onChange={e => patchDim({ peso: parseFloat(e.target.value) || 0 })} />
      </DaneaFormRow>

      <DaneaFormRow label="Peso lordo">
        <input className="prodotti-input prodotti-input--short" type="number" value={dim.pesoLordo || ''} onChange={e => patchDim({ pesoLordo: parseFloat(e.target.value) || 0 })} />
      </DaneaFormRow>
    </div>
  )
}
