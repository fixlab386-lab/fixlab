import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type DropdownItem = {
  id: string
  label?: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  separator?: boolean
}

type MenuPos = {
  top: number
  left: number
  minWidth: number
}

type Props = {
  label: ReactNode
  items: DropdownItem[]
  className?: string
  disabled?: boolean
}

const MENU_MAX_HEIGHT = 280
const ITEM_HEIGHT = 26
const HOVER_CLOSE_DELAY_MS = 120

export default function WinDropdownMenu({ label, items, className, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)

  const itemCount = items.filter(i => !i.separator).length
  const menuHeight = Math.min(MENU_MAX_HEIGHT, Math.max(itemCount, 1) * ITEM_HEIGHT + 8)

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS)
  }, [cancelClose])

  const handleOpen = useCallback(() => {
    if (disabled) return
    cancelClose()
    setOpen(true)
  }, [cancelClose, disabled])

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPos(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openDown = spaceBelow >= menuHeight || spaceBelow >= spaceAbove
    const top = openDown ? rect.bottom + 2 : Math.max(8, rect.top - menuHeight - 2)
    const left = Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)
    setMenuPos({
      top,
      left: Math.max(8, left),
      minWidth: Math.max(rect.width, 220),
    })
  }, [open, menuHeight, items.length])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => cancelClose(), [cancelClose])

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            className="vb-dropdown__menu vb-dropdown__menu--fixed"
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
              maxHeight: MENU_MAX_HEIGHT,
              zIndex: 30000,
            }}
            onMouseEnter={handleOpen}
            onMouseLeave={scheduleClose}
          >
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
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={`vb-dropdown${className ? ` ${className}` : ''}`}
      ref={rootRef}
      onMouseEnter={handleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={buttonRef}
        type="button"
        className="vb-btn vb-btn--menu"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {label}
        <span className="vb-btn__caret">▼</span>
      </button>
      {menu}
    </div>
  )
}
