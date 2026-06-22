import { useRef, useState } from 'react'
import { FixedDropdownPanel, useDropdownDismiss } from '../../components/FixedDropdown'
import { RAGGRUPPA_CRITERI, RAGGRUPPA_LABELS } from './constants'
import type { RaggruppaCriterio } from './types'
import ProdottiColonneMenu from './ProdottiColonneMenu'
import type { ColonnaId } from './types'

type Props = {
  criterioRaggruppamento: RaggruppaCriterio
  onRaggruppa: (c: RaggruppaCriterio) => void
  filtraAttivo: boolean
  onFiltra: () => void
  selectionMode: boolean
  onSelezione: () => void
  colonneVisibili: Record<ColonnaId, boolean>
  onColonne: (next: Record<ColonnaId, boolean>) => void
  mostraTotali: boolean
  onMostraTotali: (v: boolean) => void
}

function actionBtnClass(active?: boolean) {
  return `prodotti-topbar__btn${active ? ' prodotti-topbar__btn--active' : ''}`
}

function RaggruppaDropdown({
  value,
  onChange,
  mostraTotali,
  onMostraTotali,
}: {
  value: RaggruppaCriterio
  onChange: (c: RaggruppaCriterio) => void
  mostraTotali: boolean
  onMostraTotali: (v: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDropdownDismiss(open, ref, () => setOpen(false))

  return (
    <div className="prodotti-dropdown" ref={ref}>
      <button type="button" className={actionBtnClass(value !== 'Nessuno')} onClick={() => setOpen(v => !v)}>
        Raggruppa <span style={{ fontSize: 9 }}>▼</span>
      </button>
      <FixedDropdownPanel
        open={open}
        anchorRef={ref}
        direction="down"
        align="left"
        menuClassName="prodotti-dropdown__menu prodotti-dropdown__menu--fixed"
      >
        {RAGGRUPPA_CRITERI.map(c => (
          <button
            key={c}
            type="button"
            className="prodotti-dropdown__item"
            onClick={() => {
              onChange(c)
              setOpen(false)
            }}
          >
            {c === value ? '✓ ' : ''}
            {RAGGRUPPA_LABELS[c]}
          </button>
        ))}
        <label className="prodotti-dropdown__check" style={{ borderTop: '1px solid #ccc', marginTop: 4 }}>
          <input type="checkbox" checked={mostraTotali} onChange={e => onMostraTotali(e.target.checked)} />
          Mostra totali parziali
        </label>
      </FixedDropdownPanel>
    </div>
  )
}

export default function ProdottiTopBar({
  criterioRaggruppamento,
  onRaggruppa,
  filtraAttivo,
  onFiltra,
  selectionMode,
  onSelezione,
  colonneVisibili,
  onColonne,
  mostraTotali,
  onMostraTotali,
}: Props) {
  return (
    <div className="prodotti-topbar">
      <RaggruppaDropdown
        value={criterioRaggruppamento}
        onChange={onRaggruppa}
        mostraTotali={mostraTotali}
        onMostraTotali={onMostraTotali}
      />
      <button type="button" className={actionBtnClass(filtraAttivo)} onClick={onFiltra}>
        Filtra
      </button>
      <button type="button" className={actionBtnClass(selectionMode)} onClick={onSelezione}>
        Seleziona
      </button>
      <ProdottiColonneMenu colonneVisibili={colonneVisibili} onChange={onColonne} />
    </div>
  )
}
