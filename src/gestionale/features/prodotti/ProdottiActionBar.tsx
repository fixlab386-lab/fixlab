import { useEffect, useRef, useState } from 'react'
import { STAMPA_ITEMS, UTILITA_ITEMS } from './constants'

function DropdownBtn({
  label,
  items,
  onPick,
  disabled,
}: {
  label: React.ReactNode
  items: readonly string[]
  onPick: (item: string) => void
  disabled?: boolean
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
      <button type="button" className="prodotti-actionbar__btn" disabled={disabled} onClick={() => setOpen(v => !v)}>
        {label}
        <span className="caret">▼</span>
      </button>
      {open ? (
        <div className="prodotti-dropdown__menu">
          {items.map(item => (
            <button
              key={item}
              type="button"
              className="prodotti-dropdown__item"
              onClick={() => {
                onPick(item)
                setOpen(false)
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type Props = {
  hasSelection: boolean
  isEditing: boolean
  onNuovo: () => void
  onDuplica: () => void
  onElimina: () => void
  onSalva: () => void
  onAnnulla: () => void
  onStampa: (tipo: string) => void
  onEtichette: () => void
  onExcel: () => void
  onAggiornaListini: () => void
  onModificaSelez: () => void
  onUtilita: (tipo: string) => void
}

export default function ProdottiActionBar({
  hasSelection,
  isEditing,
  onNuovo,
  onDuplica,
  onElimina,
  onSalva,
  onAnnulla,
  onStampa,
  onEtichette,
  onExcel,
  onAggiornaListini,
  onModificaSelez,
  onUtilita,
}: Props) {
  return (
    <div className="prodotti-actionbar">
      <div className="prodotti-actionbar__group">
        <button type="button" className="prodotti-actionbar__btn" onClick={onNuovo}>
          <span style={{ color: '#228b22' }}>+</span> Nuovo
        </button>
        <button type="button" className="prodotti-actionbar__btn" disabled={!hasSelection} onClick={onDuplica}>
          Duplica
        </button>
        <button type="button" className="prodotti-actionbar__btn" disabled={!hasSelection} onClick={onElimina}>
          <span style={{ color: '#c00' }}>🗑</span> Elimina
        </button>
        <DropdownBtn label={<><span>🖨</span> Stampa</>} items={STAMPA_ITEMS} onPick={onStampa} />
        <button type="button" className="prodotti-actionbar__btn" onClick={onEtichette}>
          Etichette
        </button>
        {isEditing ? (
          <>
            <button type="button" className="prodotti-actionbar__btn" onClick={onSalva}>
              <span>💾</span> Salva
            </button>
            <button type="button" className="prodotti-actionbar__btn" onClick={onAnnulla}>
              <span style={{ color: '#4a90d9' }}>↩</span> Annulla
            </button>
          </>
        ) : null}
      </div>
      <div className="prodotti-actionbar__group">
        <button type="button" className="prodotti-actionbar__btn" onClick={onExcel}>
          Excel
        </button>
        <button type="button" className="prodotti-actionbar__btn" onClick={onAggiornaListini}>
          Aggiorna listini
        </button>
        <button type="button" className="prodotti-actionbar__btn" onClick={onModificaSelez}>
          Modifica selez.
        </button>
        <DropdownBtn label="Utilità" items={UTILITA_ITEMS} onPick={onUtilita} />
      </div>
    </div>
  )
}
