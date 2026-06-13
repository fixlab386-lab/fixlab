import { useEffect, useRef, useState } from 'react'
import { COLONNE_DEF } from './constants'
import type { ColonnaId } from './types'

type Props = {
  colonneVisibili: Record<ColonnaId, boolean>
  onChange: (next: Record<ColonnaId, boolean>) => void
}

export default function ProdottiColonneMenu({ colonneVisibili, onChange }: Props) {
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
        Colonne <span style={{ fontSize: 9 }}>▼</span>
      </button>
      {open ? (
        <div className="prodotti-dropdown__menu" style={{ bottom: 'auto', top: '100%' }}>
          {COLONNE_DEF.map(col => (
            <label key={col.id} className="prodotti-dropdown__check">
              <input
                type="checkbox"
                checked={colonneVisibili[col.id]}
                onChange={e => onChange({ ...colonneVisibili, [col.id]: e.target.checked })}
              />
              {col.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
