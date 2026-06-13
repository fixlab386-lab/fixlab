import { LISTINI_GLOBALI, LISTINI_PRINCIPALI, LISTINI_REGOLE_DEFAULT, TIPOLOGIE_PRODOTTO, TIPOLOGIA_LABELS, UNITA_MISURA } from '../constants'
import type { Prodotto } from '../types'
import { listinoLabel } from '../utils'

type Props = {
  prodotto: Prodotto
  categorie: string[]
  sottocategorie: string[]
  prezziEspansi: boolean
  onChange: (p: Prodotto) => void
  onTogglePrezzi: () => void
  onPrezziMenu: (azione: string) => void
  onCategorie: () => void
  onAllegati: () => void
  onImmagine: () => void
}

export default function TabCaratteristiche({
  prodotto,
  categorie,
  sottocategorie,
  prezziEspansi,
  onChange,
  onTogglePrezzi,
  onPrezziMenu,
  onCategorie,
  onAllegati,
  onImmagine,
}: Props) {
  const patch = (patch: Partial<Prodotto>) => onChange({ ...prodotto, ...patch })
  const patchPrezzo = (listinoId: string, valore: number) => {
    const prezzi = prodotto.prezzi.map(p => (p.listinoId === listinoId ? { ...p, valore } : p))
    onChange({ ...prodotto, prezzi })
  }

  return (
    <div>
      <div className="prodotti-field">
        <label className="prodotti-field__label">Cod. prodotto</label>
        <input
          className="prodotti-input prodotti-input--short prodotti-input--readonly"
          readOnly
          value={prodotto.codProdotto}
        />
      </div>

      <div className="prodotti-field">
        <label className="prodotti-field__label">Descrizione</label>
        <textarea
          className="prodotti-textarea"
          rows={3}
          value={prodotto.descrizione}
          onChange={e => patch({ descrizione: e.target.value })}
        />
      </div>

      <div className="prodotti-row">
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Tipologia</label>
          <select
            className="prodotti-select prodotti-select--combo"
            value={prodotto.tipologia}
            onChange={e => patch({ tipologia: e.target.value as Prodotto['tipologia'] })}
          >
            {TIPOLOGIE_PRODOTTO.map(t => (
              <option key={t} value={t}>
                {TIPOLOGIA_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prodotti-row">
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Categoria</label>
          <select
            className="prodotti-select prodotti-select--combo"
            value={prodotto.categoria}
            onChange={e => patch({ categoria: e.target.value, sottocategoria: '' })}
          >
            <option value="" />
            {categorie.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="prodotti-field" style={{ flex: 1 }}>
          <label className="prodotti-field__label">Sottocategoria</label>
          <div className="prodotti-row" style={{ gap: 2 }}>
            <select
              className="prodotti-select prodotti-select--combo"
              style={{ flex: 1 }}
              value={prodotto.sottocategoria}
              onChange={e => patch({ sottocategoria: e.target.value })}
            >
              <option value="" />
              {sottocategorie.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" className="prodotti-btn-dots" title="Categorie prodotti" onClick={onCategorie}>
              …
            </button>
          </div>
        </div>
        <div className="prodotti-field">
          <label className="prodotti-field__label">U.m.</label>
          <select
            className="prodotti-select prodotti-select--combo prodotti-input--short"
            value={prodotto.um}
            onChange={e => patch({ um: e.target.value })}
          >
            {UNITA_MISURA.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="prodotti-listini-block">
        {LISTINI_PRINCIPALI.map(id => {
          const lbl = listinoLabel(id)
          const prezzo = prodotto.prezzi.find(p => p.listinoId === id)
          return (
            <div key={id} className="prodotti-listini-row">
              <span className="prodotti-field__label">{lbl}</span>
              <select className="prodotti-select prodotti-select--combo" disabled value={id}>
                <option>{lbl}</option>
              </select>
              <input
                className="prodotti-input"
                type="number"
                step="0.01"
                value={prezzo?.valore ?? 0}
                onChange={e => patchPrezzo(id, parseFloat(e.target.value) || 0)}
              />
            </div>
          )
        })}

        <div className="prodotti-row" style={{ alignItems: 'center', marginTop: 4 }}>
          <button type="button" className="prodotti-link" onClick={onTogglePrezzi}>
            Prezzi…
          </button>
          <button
            type="button"
            className="prodotti-actionbar__btn"
            style={{ padding: '2px 6px', fontSize: 10 }}
            onClick={() => {
              const azione = prompt('Menu Prezzi: Impostazioni | Opzioni applicazione', 'Impostazioni')
              if (azione) onPrezziMenu(azione)
            }}
          >
            ▼
          </button>
        </div>

        {prezziEspansi ? (
          <div className="prodotti-prezzi-panel">
            {LISTINI_GLOBALI.map(l => (
              <div key={l.id} className="prodotti-prezzi-panel__row">
                [{l.label}] {LISTINI_REGOLE_DEFAULT[l.id] ?? '+0%'}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="prodotti-field">
        <label className="prodotti-field__label">Note</label>
        <textarea
          className="prodotti-textarea"
          rows={5}
          style={{ minHeight: 80 }}
          value={prodotto.note}
          onChange={e => patch({ note: e.target.value })}
        />
      </div>

      {prodotto.tipologia === 'ArtTaglieColori' ? (
        <div className="prodotti-field">
          <label className="prodotti-field__label">Varianti taglia/colore</label>
          <textarea
            className="prodotti-textarea"
            rows={3}
            placeholder="Taglia | Colore | Codice"
            value={prodotto.variantiTagliaColore || ''}
            onChange={e => patch({ variantiTagliaColore: e.target.value })}
          />
        </div>
      ) : null}

      {prodotto.tipologia === 'ArtLottiSeriali' ? (
        <div className="prodotti-field">
          <label className="prodotti-field__label">Lotti / seriali</label>
          <textarea
            className="prodotti-textarea"
            rows={3}
            value={prodotto.lottiSeriali || ''}
            onChange={e => patch({ lottiSeriali: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  )
}
