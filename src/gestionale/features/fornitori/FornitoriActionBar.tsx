import { useEffect, useRef, useState } from 'react'
import { COMUNICAZIONI_ITEMS, STAMPA_ITEMS, UTILITA_ITEMS } from './constants'

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
    <div className="clienti-dropdown" ref={ref}>
      <button type="button" className="clienti-actionbar__btn" disabled={disabled} onClick={() => setOpen(v => !v)}>
        {label}
        <span className="caret">▼</span>
      </button>
      {open ? (
        <div className="clienti-dropdown__menu clienti-dropdown__menu--up">
          {items.map(item => (
            <button
              key={item}
              type="button"
              className="clienti-dropdown__item"
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
  hasMultiSelection: boolean
  onNuovo: () => void
  onDuplica: () => void
  onElimina: () => void
  onComunicazione: (tipo: string) => void
  onStampa: (tipo: string) => void
  onEtichette: () => void
  onExcel: () => void
  onModificaSelez: () => void
  onUtilita: (tipo: string) => void
}

export default function FornitoriActionBar({
  hasSelection,
  hasMultiSelection,
  onNuovo,
  onDuplica,
  onElimina,
  onComunicazione,
  onStampa,
  onEtichette,
  onExcel,
  onModificaSelez,
  onUtilita,
}: Props) {
  return (
    <div className="clienti-actionbar">
      <div className="clienti-actionbar__group">
        <button type="button" className="clienti-actionbar__btn" onClick={onNuovo}>
          <span style={{ color: '#2e7d32' }}>+</span> Nuovo
        </button>
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection} onClick={onDuplica}>
          Duplica
        </button>
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection} onClick={onElimina}>
          <span style={{ color: '#c62828' }}>🗑</span> Elimina
        </button>
      </div>
      <div className="clienti-actionbar__group">
        <DropdownBtn label="🖨 Stampa" items={STAMPA_ITEMS} onPick={onStampa} />
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection} onClick={onEtichette}>
          🏷 Etichette
        </button>
        <button type="button" className="clienti-actionbar__btn" onClick={onExcel}>
          📊 Excel
        </button>
        <DropdownBtn label="💬 Comunicaz." items={COMUNICAZIONI_ITEMS} onPick={onComunicazione} disabled={!hasSelection} />
        <button type="button" className="clienti-actionbar__btn" disabled={!hasMultiSelection} onClick={onModificaSelez}>
          ✏ Modifica selez.
        </button>
        <DropdownBtn label="⚡ Utilità" items={UTILITA_ITEMS} onPick={onUtilita} />
      </div>
    </div>
  )
}
