import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MovementPeriod, MovementPeriodPreset } from './constants'
import { IT_MONTHS } from './constants'
import { isPrimaryPeriodPreset, movementPeriodLabel } from './utils'
import DateRangeDialog from './DateRangeDialog'

const PRIMARY_PRESETS: { value: MovementPeriodPreset; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'current_month', label: 'Mese corrente' },
  { value: 'last_month', label: 'Mese scorso' },
  { value: 'current_year', label: 'Anno corrente' },
  { value: 'last_year', label: 'Anno scorso' },
]

const ALTRO_PRESETS: { value: MovementPeriodPreset; label: string }[] = [
  { value: 'today', label: 'Oggi' },
  { value: 'yesterday', label: 'Ieri' },
  { value: 'current_week', label: 'Settimana corrente' },
  { value: 'last_week', label: 'Settimana scorsa' },
  { value: 'current_quarter', label: 'Trimestre corrente' },
  { value: 'last_quarter', label: 'Trimestre scorso' },
]

/** Ultimi 13 mesi (mese corrente + 12 precedenti), come in Danea. */
function recentMonths(now = new Date()): { year: number; month: number; label: string }[] {
  const out: { year: number; month: number; label: string }[] = []
  for (let i = 0; i < 13; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth(), label: `${IT_MONTHS[d.getMonth()]} ${d.getFullYear()}` })
  }
  return out
}

type Props = {
  period: MovementPeriod
  onChange: (period: MovementPeriod) => void
}

export default function PeriodoFilter({ period, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const altroRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const closeTimer = useRef<number | null>(null)

  const showsCustomRow = !isPrimaryPeriodPreset(period)
  const customLabel = movementPeriodLabel(period)

  const MENU_WIDTH = 188

  const positionMenu = () => {
    const anchor = altroRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    // Altezza reale del menu se già montato, altrimenti stima.
    const menuHeight = menuRef.current?.offsetHeight ?? 470
    // Apre verso sinistra, sovrapponendosi alla griglia come in Danea.
    // Sovrappone di 2px il bordo della sidebar così non c'è spazio vuoto tra
    // il pulsante «Altro...» e il menu (altrimenti l'hover si interrompe).
    const left = Math.max(8, rect.left - MENU_WIDTH + 2)
    const maxTop = Math.max(8, window.innerHeight - menuHeight - 8)
    const top = Math.min(rect.top, maxTop)
    setMenuPos(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }

  const cancelClose = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setMenuOpen(false), 250)
  }

  const openMenu = () => {
    cancelClose()
    positionMenu()
    setMenuOpen(true)
  }

  useEffect(() => () => cancelClose(), [])

  useLayoutEffect(() => {
    if (menuOpen) positionMenu()
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        altroRef.current?.contains(e.target as Node)
      ) {
        return
      }
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onScroll = () => positionMenu()
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [menuOpen])

  const choosePreset = (preset: MovementPeriodPreset) => {
    onChange({ kind: 'preset', preset })
    setMenuOpen(false)
  }

  const chooseMonth = (year: number, month: number) => {
    onChange({ kind: 'month', year, month })
    setMenuOpen(false)
  }

  const isActivePreset = (preset: MovementPeriodPreset) =>
    period.kind === 'preset' && period.preset === preset
  const isActiveMonth = (year: number, month: number) =>
    period.kind === 'month' && period.year === year && period.month === month

  return (
    <div className="movimenti-sidebar__section">
      <h3 className="movimenti-sidebar__title">Periodo</h3>

      {PRIMARY_PRESETS.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`movimenti-sidebar__item${isActivePreset(opt.value) ? ' movimenti-sidebar__item--active' : ''}`}
          onClick={() => choosePreset(opt.value)}
        >
          <span className="movimenti-sidebar__bullet" aria-hidden="true" />
          {opt.label}
        </button>
      ))}

      {showsCustomRow ? (
        <button
          type="button"
          className="movimenti-sidebar__item movimenti-sidebar__item--active"
          onClick={openMenu}
        >
          <span className="movimenti-sidebar__bullet" aria-hidden="true" />
          {customLabel}
        </button>
      ) : null}

      <button
        ref={altroRef}
        type="button"
        className={`movimenti-sidebar__item movimenti-sidebar__item--altro${menuOpen ? ' movimenti-sidebar__item--open' : ''}`}
        onClick={openMenu}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="movimenti-sidebar__bullet" aria-hidden="true" />
        Altro...
      </button>

      {menuOpen && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              className="movimenti-period-menu"
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {ALTRO_PRESETS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  className={`movimenti-period-menu__item${isActivePreset(opt.value) ? ' movimenti-period-menu__item--active' : ''}`}
                  onClick={() => choosePreset(opt.value)}
                >
                  {opt.label}
                </button>
              ))}

              <div className="movimenti-period-menu__sep" />

              {recentMonths().map(m => (
                <button
                  key={`${m.year}-${m.month}`}
                  type="button"
                  role="menuitem"
                  className={`movimenti-period-menu__item${isActiveMonth(m.year, m.month) ? ' movimenti-period-menu__item--active' : ''}`}
                  onClick={() => chooseMonth(m.year, m.month)}
                >
                  {m.label}
                </button>
              ))}

              <div className="movimenti-period-menu__sep" />

              <button
                type="button"
                role="menuitem"
                className={`movimenti-period-menu__item${period.kind === 'range' ? ' movimenti-period-menu__item--active' : ''}`}
                onClick={() => {
                  setMenuOpen(false)
                  setRangeOpen(true)
                }}
              >
                Da... a...
              </button>
            </div>,
            document.body,
          )
        : null}

      {rangeOpen ? (
        <DateRangeDialog
          initialFrom={period.kind === 'range' ? period.from : undefined}
          initialTo={period.kind === 'range' ? period.to : undefined}
          onConfirm={(from, to) => {
            onChange({ kind: 'range', from, to })
            setRangeOpen(false)
          }}
          onClose={() => setRangeOpen(false)}
        />
      ) : null}
    </div>
  )
}
