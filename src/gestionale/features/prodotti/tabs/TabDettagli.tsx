import { ALIQUOTE_IVA, GARANZIE, RICHIESTE } from '../constants'
import type { Prodotto } from '../types'

type Props = {
  prodotto: Prodotto
  fornitori: string[]
  produttori: string[]
  onChange: (p: Prodotto) => void
  onCodiciAggiuntivi: () => void
  onComponenti: () => void
}

export default function TabDettagli({
  prodotto,
  fornitori,
  produttori,
  onChange,
  onCodiciAggiuntivi,
  onComponenti,
}: Props) {
  const d = prodotto.dettagli
  const patchDet = (patch: Partial<typeof d>) =>
    onChange({ ...prodotto, dettagli: { ...d, ...patch } })

  return (
    <div>
      <div className="prodotti-row">
        <div className="prodotti-field">
          <label className="prodotti-field__label">Aliquota Iva</label>
          <select
            className="prodotti-select prodotti-select--combo prodotti-input--short"
            value={d.aliquotaIva}
            onChange={e => patchDet({ aliquotaIva: e.target.value })}
          >
            {ALIQUOTE_IVA.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prodotti-row" style={{ alignItems: 'center' }}>
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Cod. a barre</label>
          <input
            className="prodotti-input"
            value={d.codBarre}
            onChange={e => patchDet({ codBarre: e.target.value })}
          />
        </div>
        <button type="button" className="prodotti-link" style={{ marginBottom: 6 }} onClick={onCodiciAggiuntivi}>
          Codici aggiuntivi…
        </button>
      </div>

      <div className="prodotti-row">
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Fornitore</label>
          <select
            className="prodotti-select prodotti-select--combo"
            value={d.fornitore}
            onChange={e => patchDet({ fornitore: e.target.value })}
          >
            <option value="" />
            {fornitori.map(f => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Produttore</label>
          <select
            className="prodotti-select prodotti-select--combo"
            value={d.produttore}
            onChange={e => patchDet({ produttore: e.target.value })}
          >
            <option value="" />
            {produttori.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prodotti-row" style={{ alignItems: 'center' }}>
        <label className="prodotti-check">
          <input
            type="checkbox"
            checked={d.artAssemblato}
            onChange={e => patchDet({ artAssemblato: e.target.checked })}
          />
          Art. assemblato
        </label>
        <button type="button" className="prodotti-dialog__btn" onClick={onComponenti} disabled={!d.artAssemblato}>
          Inserisci componenti…
        </button>
      </div>

      <label className="prodotti-check">
        <input
          type="checkbox"
          checked={d.mostraVenditaTouch}
          onChange={e => patchDet({ mostraVenditaTouch: e.target.checked })}
        />
        Mostra in vendita touch
      </label>

      <div className="prodotti-row">
        <div className="prodotti-field">
          <label className="prodotti-field__label">Garanzia</label>
          <select
            className="prodotti-select prodotti-select--combo"
            value={d.garanzia}
            onChange={e => patchDet({ garanzia: e.target.value })}
          >
            <option value="" />
            {GARANZIE.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">Richiesta</label>
          <select
            className="prodotti-select prodotti-select--combo"
            value={d.richiesta}
            onChange={e => patchDet({ richiesta: e.target.value })}
          >
            <option value="" />
            {RICHIESTE.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Ubicazione</label>
          <input
            className="prodotti-input"
            value={d.ubicazione}
            onChange={e => patchDet({ ubicazione: e.target.value })}
          />
        </div>
      </div>

      <div className="prodotti-field">
        <label className="prodotti-field__label">Note</label>
        <textarea className="prodotti-textarea" rows={2} value={prodotto.note} readOnly />
      </div>

      <div style={{ fontWeight: 700, fontSize: 11, color: '#1a5fb4', margin: '8px 0 4px' }}>Info fornitore</div>
      <div className="prodotti-row">
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Cod. prod. fornit.</label>
          <input
            className="prodotti-input"
            value={d.codProdFornitore}
            onChange={e => patchDet({ codProdFornitore: e.target.value })}
          />
        </div>
        <div className="prodotti-field" style={{ flex: 2 }}>
          <label className="prodotti-field__label">Note fornitura</label>
          <input
            className="prodotti-input"
            value={d.noteFornitura}
            onChange={e => patchDet({ noteFornitura: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
