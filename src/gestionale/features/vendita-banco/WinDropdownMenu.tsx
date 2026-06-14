import { useEffect, useRef, useState, type ReactNode } from 'react'

export type DropdownItem = {
  id: string
  label?: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  separator?: boolean
}

type Props = {
  label: ReactNode
  items: DropdownItem[]
  className?: string
  disabled?: boolean
}

export default function WinDropdownMenu({ label, items, className, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className={`vb-dropdown${className ? ` ${className}` : ''}`} ref={ref}>
      <button
        type="button"
        className="vb-btn vb-btn--menu"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
      >
        {label}
        <span className="vb-btn__caret">▼</span>
      </button>
      {open ? (
        <div className="vb-dropdown__menu" role="menu">
          {items.map(item =>
            item.separator ? (
              <div key={item.id} className="vb-dropdown__separator" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="vb-dropdown__item"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  setOpen(false)
                }}
              >
                <span className="vb-dropdown__item-label">{item.label}</span>
                {item.shortcut ? <span className="vb-dropdown__shortcut">{item.shortcut}</span> : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}
