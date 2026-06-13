import { useEffect, useRef, useState } from 'react'
import { COLONNE_DEF } from './constants'
import type { ColonnaId } from './types'

type Props = {
  visible: Record<ColonnaId, boolean>
  onChange: (v: Record<ColonnaId, boolean>) => void
}

export default function FornitoriColonneMenu({ visible, onChange }: Props) {
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
      <button type="button" className="gestionale-section-header__action-btn" onClick={() => setOpen(v => !v)}>
        Colonne ▼
      </button>
      {open ? (
        <div className="clienti-dropdown__menu clienti-dropdown__menu--down">
          {COLONNE_DEF.map(col => (
            <label key={col.id} className="clienti-dropdown__check">
              <input
                type="checkbox"
                checked={visible[col.id]}
                onChange={e => onChange({ ...visible, [col.id]: e.target.checked })}
              />
              {col.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}
