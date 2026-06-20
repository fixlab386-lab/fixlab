import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AnalisiKind } from '../../gestionale/features/analisi/analisiTypes'
import ToolbarIcon from './ToolbarIcons'
import '../../theme/gestionale-new-menu.css'
import '../../theme/gestionale-analisi-menu.css'

type Props = {
  active?: boolean
}

const MENU_ITEMS: { id: AnalisiKind; label: string; icon: string; tone: 'vendite' | 'acquisti' | 'flussi' }[] = [
  { id: 'vendite', label: 'Vendite', icon: '➜', tone: 'vendite' },
  { id: 'acquisti', label: 'Acquisti', icon: '➜', tone: 'acquisti' },
  { id: 'flussi', label: 'Flussi', icon: '●', tone: 'flussi' },
]

export default function ToolbarAnalisiMenu({ active = false }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }, [cancelClose])

  useEffect(() => () => cancelClose(), [cancelClose])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handlePick = (kind: AnalisiKind) => {
    cancelClose()
    setOpen(false)
    navigate(`/analisi?kind=${kind}`)
  }

  return (
    <div
      className="gestionale-toolbar-analisi"
      ref={rootRef}
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`gestionale-toolbar__item gestionale-toolbar-analisi__trigger${open || active ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => {
          cancelClose()
          setOpen(false)
          navigate('/analisi?kind=vendite')
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Analisi vendite (passa col mouse per Acquisti / Flussi)"
      >
        <span className="gestionale-toolbar__icon" aria-hidden="true">
          <ToolbarIcon id="analisi" />
        </span>
        <span className="gestionale-toolbar__label">Analisi</span>
      </button>

      {open ? (
        <div
          className="gestionale-toolbar-new__menu gestionale-toolbar-analisi__menu"
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {MENU_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="gestionale-toolbar-new__item"
              onClick={() => handlePick(item.id)}
            >
              <span
                className={`gestionale-toolbar-analisi__icon gestionale-toolbar-analisi__icon--${item.tone}`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
