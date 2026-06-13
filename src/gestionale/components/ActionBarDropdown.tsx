import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const MENU_MIN_WIDTH = 280

type Props = {
  label: ReactNode
  items: readonly string[]
  onPick: (item: string) => void
  disabled?: boolean
}

export default function ActionBarDropdown({ label, items, onPick, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !ref.current) return

    const updatePosition = () => {
      const anchor = ref.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const left = Math.max(8, Math.min(rect.right - MENU_MIN_WIDTH, window.innerWidth - MENU_MIN_WIDTH - 8))
      setMenuStyle({
        position: 'fixed',
        left,
        bottom: window.innerHeight - rect.top + 4,
        top: 'auto',
        minWidth: MENU_MIN_WIDTH,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

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
        <div className="clienti-dropdown__menu clienti-dropdown__menu--fixed" style={menuStyle}>
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
