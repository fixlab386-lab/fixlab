import { useEffect, useRef, useState } from 'react'
import { RAGGRUPPA_CRITERI } from './constants'
import type { RaggruppaCriterio } from './types'

type Props = {
  raggruppa: RaggruppaCriterio
  filtraAttivo: boolean
  selectionMode: boolean
  colonneMenu: React.ReactNode
  onRaggruppaChange: (c: RaggruppaCriterio) => void
  onToggleFiltra: () => void
  onToggleSelezione: () => void
}

export default function FornitoriTopBar({
  raggruppa,
  filtraAttivo,
  selectionMode,
  colonneMenu,
  onRaggruppaChange,
  onToggleFiltra,
  onToggleSelezione,
}: Props) {
  const [showRaggruppa, setShowRaggruppa] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showRaggruppa) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowRaggruppa(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showRaggruppa])

  return (
    <div className="clienti-topbar">
      <div className="clienti-dropdown" ref={ref}>
        <button
          type="button"
          className={`clienti-topbar__btn${raggruppa !== 'Nessuno' ? ' clienti-topbar__btn--active' : ''}`}
          onClick={() => setShowRaggruppa(v => !v)}
        >
          Raggruppa <span className="caret">▼</span>
        </button>
        {showRaggruppa ? (
          <div className="clienti-dropdown__menu clienti-dropdown__menu--down">
            {RAGGRUPPA_CRITERI.map(c => (
              <button
                key={c}
                type="button"
                className="clienti-dropdown__item"
                onClick={() => {
                  onRaggruppaChange(c)
                  setShowRaggruppa(false)
                }}
              >
                {c === raggruppa ? '✓ ' : ''}
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className={`clienti-topbar__btn${filtraAttivo ? ' clienti-topbar__btn--active' : ''}`}
        onClick={onToggleFiltra}
      >
        Filtra
      </button>
      <button
        type="button"
        className={`clienti-topbar__btn${selectionMode ? ' clienti-topbar__btn--active' : ''}`}
        onClick={onToggleSelezione}
      >
        Seleziona
      </button>
      {colonneMenu}
    </div>
  )
}
