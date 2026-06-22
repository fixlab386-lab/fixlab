import { useRef, useState } from 'react'
import { FixedDropdownPanel, useDropdownDismiss } from '../../components/FixedDropdown'
import { COLONNE_DEF } from './constants'
import type { ColonnaId } from './types'

type Props = {
  colonneVisibili: Record<ColonnaId, boolean>
  onChange: (next: Record<ColonnaId, boolean>) => void
}

export default function ProdottiColonneMenu({ colonneVisibili, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDropdownDismiss(open, ref, () => setOpen(false))

  return (
    <div className="prodotti-dropdown" ref={ref}>
      <button type="button" className="prodotti-topbar__btn" onClick={() => setOpen(v => !v)}>
        Colonne <span style={{ fontSize: 9 }}>▼</span>
      </button>
      <FixedDropdownPanel
        open={open}
        anchorRef={ref}
        direction="down"
        align="right"
        menuClassName="prodotti-dropdown__menu prodotti-dropdown__menu--fixed"
      >
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
      </FixedDropdownPanel>
    </div>
  )
}
