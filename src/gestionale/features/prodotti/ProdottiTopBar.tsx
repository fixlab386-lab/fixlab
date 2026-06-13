import { useEffect, useRef, useState } from 'react'
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

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="prodotti-dropdown" ref={ref}>
      <button type="button" className="prodotti-topbar__btn" onClick={() => setOpen(v => !v)}>
        Raggruppa <span style={{ fontSize: 9 }}>▼</span>
      </button>
      {open ? (
        <div className="prodotti-dropdown__menu" style={{ bottom: 'auto', top: '100%' }}>
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
              {RAGGRUPPA_LABELS[c]}
            </button>
          ))}
          <button type="button" className="prodotti-dropdown__item" onClick={() => alert('Altri gruppi…')}>
            Altri gruppi…
          </button>
          <label className="prodotti-dropdown__check" style={{ borderTop: '1px solid #ccc', marginTop: 4 }}>
            <input type="checkbox" checked={mostraTotali} onChange={e => onMostraTotali(e.target.checked)} />
            Mostra totali parziali
          </label>
        </div>
      ) : null}
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
      <button
        type="button"
        className={`prodotti-topbar__btn${filtraAttivo ? ' prodotti-topbar__btn--active' : ''}`}
        onClick={onFiltra}
      >
        Filtra
      </button>
      <button
        type="button"
        className={`prodotti-topbar__btn${selectionMode ? ' prodotti-topbar__btn--active' : ''}`}
        onClick={onSelezione}
      >
        Selezione
      </button>
      <ProdottiColonneMenu colonneVisibili={colonneVisibili} onChange={onColonne} />
    </div>
  )
}
