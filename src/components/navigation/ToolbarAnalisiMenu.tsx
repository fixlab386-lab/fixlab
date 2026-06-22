import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AnalisiKind } from '../../gestionale/features/analisi/analisiTypes'
import ToolbarIcon from './ToolbarIcons'
import '../../theme/gestionale-new-menu.css'
import '../../theme/gestionale-analisi-menu.css'

const MENU_MIN_WIDTH = 150

type Props = {
  active?: boolean
}

const MENU_ITEMS: { id: AnalisiKind; label: string; tone: 'vendite' | 'acquisti' | 'flussi' }[] = [
  { id: 'vendite', label: 'Vendite', tone: 'vendite' },
  { id: 'acquisti', label: 'Acquisti', tone: 'acquisti' },
  { id: 'flussi', label: 'Flussi', tone: 'flussi' },
]

function AnalisiMenuIcon({ tone }: { tone: 'vendite' | 'acquisti' | 'flussi' }) {
  if (tone === 'flussi') {
    return (
      <span className="gestionale-toolbar-analisi__icon gestionale-toolbar-analisi__icon--flussi" aria-hidden="true">
        €
      </span>
    )
  }
  return (
    <span
      className={`gestionale-toolbar-analisi__icon gestionale-toolbar-analisi__icon--${tone}`}
      aria-hidden="true"
    >
      ➜
    </span>
  )
}

export default function ToolbarAnalisiMenu({ active = false }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
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
    closeTimer.current = window.setTimeout(() => setOpen(false), 180)
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
      const centeredLeft = rect.left + rect.width / 2 - MENU_MIN_WIDTH / 2
      const left = Math.max(8, Math.min(centeredLeft, window.innerWidth - MENU_MIN_WIDTH - 8))
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 2,
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, close])

  const handlePick = (kind: AnalisiKind) => {
    cancelClose()
    close()
    navigate(`/analisi?kind=${kind}`)
  }

  const isAnalisiRoute = location.pathname === '/analisi' || location.pathname.startsWith('/analisi/')
  const currentKind = new URLSearchParams(location.search).get('kind') as AnalisiKind | null

  return (
    <div
      className="gestionale-toolbar-analisi"
      ref={rootRef}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`gestionale-toolbar__item gestionale-toolbar-analisi__trigger${open || active || isAnalisiRoute ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => handlePick(currentKind && MENU_ITEMS.some(i => i.id === currentKind) ? currentKind : 'vendite')}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Analisi (passa col mouse per Vendite, Acquisti, Flussi)"
      >
        <span className="gestionale-toolbar__icon" aria-hidden="true">
          <ToolbarIcon id="analisi" />
        </span>
        <span className="gestionale-toolbar__label">Analisi</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className="gestionale-toolbar-new__menu gestionale-toolbar-analisi__menu"
              style={menuStyle}
              role="menu"
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`gestionale-toolbar-new__item${isAnalisiRoute && currentKind === item.id ? ' gestionale-toolbar-new__item--active' : ''}`}
                  onClick={() => handlePick(item.id)}
                >
                  <AnalisiMenuIcon tone={item.tone} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
