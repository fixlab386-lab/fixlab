import { useRef, useState } from 'react'
import { FixedDropdownMenu } from '../../../components/FixedDropdown'
import { LISTINI_GLOBALI, LISTINI_PRINCIPALI, LISTINI_REGOLE_DEFAULT, TIPOLOGIE_PRODOTTO, TIPOLOGIA_LABELS, UNITA_MISURA } from '../constants'
import type { Prodotto } from '../types'
import { listinoLabel } from '../utils'
import type { Category } from '../../../../types'
import CategoryCascadePicker from '../../../components/CategoryCascadePicker'
import type { CategorySelection } from '../../../lib/categoryUtils'
import { DaneaFormGroupTitle, DaneaFormLinks, DaneaFormRow } from '../../../components/DaneaFormRow'

type Props = {
  prodotto: Prodotto
  categories: Category[]
  prezziEspansi: boolean
  onChange: (p: Prodotto) => void
  onTogglePrezzi: () => void
  onPrezziMenu: (azione: string) => void
  onCategorie: () => void
  onImmagine: () => void
}

export default function TabCaratteristiche({
  prodotto,
  categories,
  prezziEspansi,
  onChange,
  onTogglePrezzi,
  onPrezziMenu,
  onCategorie,
}: Props) {
  const patch = (patch: Partial<Prodotto>) => onChange({ ...prodotto, ...patch })
  const patchPrezzo = (listinoId: string, valore: number) => {
    const prezzi = prodotto.prezzi.map(p => (p.listinoId === listinoId ? { ...p, valore } : p))
    onChange({ ...prodotto, prezzi })
  }

  const applyCategory = (selection: CategorySelection) => {
    onChange({
      ...prodotto,
      categoria: selection.categoria,
      sottocategoria: selection.sottocategoria,
      categoryPath: selection.categoryPath,
      categoryId: selection.categoryId,
      subcategoryId: selection.subcategoryId,
    })
  }

  const leafId = prodotto.subcategoryId || prodotto.categoryId || ''

  return (
    <div className="danea-form">
      <DaneaFormRow label="Cod. prodotto">
        <input className="prodotti-input prodotti-input--short prodotti-input--readonly" readOnly value={prodotto.codProdotto} />
      </DaneaFormRow>

      <DaneaFormRow label="Descrizione">
        <textarea className="prodotti-textarea" rows={3} value={prodotto.descrizione} onChange={e => patch({ descrizione: e.target.value })} />
      </DaneaFormRow>

      <DaneaFormRow label="Tipologia">
        <select className="prodotti-select prodotti-select--combo" value={prodotto.tipologia} onChange={e => patch({ tipologia: e.target.value as Prodotto['tipologia'] })}>
          {TIPOLOGIE_PRODOTTO.map(t => (
            <option key={t} value={t}>
              {TIPOLOGIA_LABELS[t]}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormRow label="Categoria">
        <CategoryCascadePicker categories={categories} leafId={leafId} onChange={applyCategory} onManage={onCategorie} />
      </DaneaFormRow>

      <DaneaFormRow label="U.m.">
        <select className="prodotti-select prodotti-select--combo prodotti-input--short" value={prodotto.um} onChange={e => patch({ um: e.target.value })}>
          {UNITA_MISURA.map(u => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </DaneaFormRow>

      <DaneaFormGroupTitle>Listini prezzo</DaneaFormGroupTitle>

      <div className="prodotti-listini-block">
        {LISTINI_PRINCIPALI.map(id => {
          const lbl = listinoLabel(id)
          const prezzo = prodotto.prezzi.find(p => p.listinoId === id)
          return (
            <DaneaFormRow key={id} label={lbl} wideLabel>
              <input
                className="prodotti-input"
                type="number"
                step="0.01"
                value={prezzo?.valore ?? 0}
                onChange={e => patchPrezzo(id, parseFloat(e.target.value) || 0)}
              />
            </DaneaFormRow>
          )
        })}

        <DaneaFormLinks>
          <button type="button" className="prodotti-link" onClick={onTogglePrezzi}>
            Prezzi…
          </button>
          <FixedDropdownMenu
            wrapperClass="prodotti-dropdown prodotti-dropdown--inline"
            btnClass="danea-form__edit-btn"
            menuClass="prodotti-dropdown__menu prodotti-dropdown__menu--fixed"
            itemClass="prodotti-dropdown__item"
            label="▼"
            items={['Impostazioni', 'Opzioni applicazione']}
            onPick={onPrezziMenu}
            direction="down"
            align="left"
            minWidth={200}
            showCaret={false}
          />
        </DaneaFormLinks>

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

      <DaneaFormRow label="Note">
        <textarea className="prodotti-textarea" rows={4} value={prodotto.note} onChange={e => patch({ note: e.target.value })} />
      </DaneaFormRow>

      {prodotto.tipologia === 'ArtTaglieColori' ? (
        <DaneaFormRow label="Taglie/colori">
          <textarea
            className="prodotti-textarea"
            rows={3}
            placeholder="Taglia | Colore | Codice"
            value={prodotto.variantiTagliaColore || ''}
            onChange={e => patch({ variantiTagliaColore: e.target.value })}
          />
        </DaneaFormRow>
      ) : null}

      {prodotto.tipologia === 'ArtLottiSeriali' ? (
        <DaneaFormRow label="Lotti/seriali">
          <textarea className="prodotti-textarea" rows={3} value={prodotto.lottiSeriali || ''} onChange={e => patch({ lottiSeriali: e.target.value })} />
        </DaneaFormRow>
      ) : null}
    </div>
  )
}
