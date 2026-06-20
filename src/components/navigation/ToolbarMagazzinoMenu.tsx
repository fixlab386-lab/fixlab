import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import ToolbarIcon from './ToolbarIcons'
import '../../theme/gestionale-new-menu.css'

const MENU_MIN_WIDTH = 180

type MagazzinoMenuItem = {
  id: string
  label: string
  icon: string
  to: string
}

const MAGAZZINO_MENU: MagazzinoMenuItem[] = [
  { id: 'movimenti', label: 'Movimenti', icon: '📋', to: '/movimenti' },
  { id: 'situazione', label: 'Situazione', icon: '📊', to: '/movimenti?tab=situazione' },
  { id: 'inventario', label: 'Inventario', icon: '🧮', to: '/movimenti?op=rettifica' },
]

type Props = {
  active?: boolean
}

export default function ToolbarMagazzinoMenu({ active = false }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 250)
  }, [cancelClose])

  const openMenu = useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose])

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => () => cancelClose(), [cancelClose])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return

    const updatePosition = () => {
      const anchor = rootRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_MIN_WIDTH - 8))
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 1,
        left,
        minWidth: MENU_MIN_WIDTH,
        zIndex: 14000,
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
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const handlePick = (to: string) => {
    close()
    navigate(to)
  }

  const menu =
    open ?
      createPortal(
        <div
          ref={menuRef}
          className="gestionale-toolbar-new__menu gestionale-toolbar-doc__menu gestionale-toolbar-doc__menu--fixed"
          style={menuStyle}
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {MAGAZZINO_MENU.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="gestionale-toolbar-new__item"
              onClick={() => handlePick(item.to)}
            >
              <span className="gestionale-toolbar-new__item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div
      className="gestionale-toolbar-doc"
      ref={rootRef}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`gestionale-toolbar__item gestionale-toolbar-doc__trigger${open || active ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => handlePick('/movimenti')}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Magazzino"
      >
        <span className="gestionale-toolbar__icon" aria-hidden="true">
          <ToolbarIcon id="magazzino" />
        </span>
        <span className="gestionale-toolbar__label">Magazzino</span>
      </button>
      {menu}
    </div>
  )
}
