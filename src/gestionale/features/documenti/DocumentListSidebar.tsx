import { useMemo, useRef, useState } from 'react'
import type { DocRecord } from '../../../types'
import AnalisiPortalMenu from '../analisi/AnalisiPortalMenu'
import {
  ANALISI_BASE_PERIODS,
  ANALISI_PERIOD_QUICK,
  isAltroPeriod,
  lastMonths,
  periodSelectionLabel,
  type AnalisiPeriod,
} from '../analisi/analisiTypes'
import { subjectLabelForType } from './constants'
import '../../theme/analisi.css'

export type DocumentPeriodState = {
  period: AnalisiPeriod
  periodMonth: { year: number; month: number } | null
  customFrom: string
  customTo: string
}

type Props = {
  documentType: string
  periodState: DocumentPeriodState
  onPeriodStateChange: (next: DocumentPeriodState) => void
  subjectFilter: string
  onSubjectFilterChange: (subjectId: string) => void
  documents: DocRecord[]
}

export default function DocumentListSidebar({
  documentType,
  periodState,
  onPeriodStateChange,
  subjectFilter,
  onSubjectFilterChange,
  documents,
}: Props) {
  const { period, periodMonth, customFrom, customTo } = periodState
  const [showPeriodAltro, setShowPeriodAltro] = useState(false)
  const [showInterval, setShowInterval] = useState(false)
  const [intervalFrom, setIntervalFrom] = useState('')
  const [intervalTo, setIntervalTo] = useState(() => new Date().toISOString().slice(0, 10))
  const periodAltroBtnRef = useRef<HTMLButtonElement>(null)

  const months = useMemo(() => lastMonths(13), [])

  const subjects = Array.from(
    new Map(
      documents
        .filter(d => d.subjectId && d.subjectName)
        .map(d => [d.subjectId!, d.subjectName]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], 'it'))

  const altroPeriodActive = isAltroPeriod(period)
  const periodAltroLabel = altroPeriodActive
    ? periodSelectionLabel({ period, year: periodMonth?.year, month: periodMonth?.month, customFrom, customTo })
    : 'Altro…'

  const patchPeriod = (patch: Partial<DocumentPeriodState>) => {
    onPeriodStateChange({ ...periodState, ...patch })
  }

  const selectQuickPeriod = (p: AnalisiPeriod) => {
    patchPeriod({ period: p, periodMonth: null })
    setShowPeriodAltro(false)
  }

  const selectMonth = (year: number, month: number) => {
    patchPeriod({ period: 'month', periodMonth: { year, month } })
    setShowPeriodAltro(false)
  }

  const openIntervalDialog = () => {
    setShowPeriodAltro(false)
    setIntervalFrom(customFrom || '')
    setIntervalTo(customTo || new Date().toISOString().slice(0, 10))
    setShowInterval(true)
  }

  const confirmInterval = () => {
    patchPeriod({ period: 'custom', periodMonth: null, customFrom: intervalFrom, customTo: intervalTo })
    setShowInterval(false)
  }

  return (
    <>
      <aside className="analisi-sidebar documenti-list-sidebar">
        <section className="analisi-side-section">
          <h3 className="analisi-side-section__title">Periodo</h3>
          <div className="analisi-side-section__options">
            {ANALISI_BASE_PERIODS.map(opt => (
              <label key={opt.id} className="analisi-radio">
                <input
                  type="radio"
                  name="doc-period"
                  checked={period === opt.id}
                  onChange={() => selectQuickPeriod(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
            <div className="analisi-altro">
              <label className="analisi-radio">
                <input
                  type="radio"
                  name="doc-period"
                  checked={altroPeriodActive}
                  onChange={() => setShowPeriodAltro(true)}
                />
                <button
                  ref={periodAltroBtnRef}
                  type="button"
                  className="analisi-altro__btn"
                  onClick={() => setShowPeriodAltro(v => !v)}
                >
                  {periodAltroLabel} ▾
                </button>
              </label>
              <AnalisiPortalMenu
                open={showPeriodAltro}
                anchorRef={periodAltroBtnRef}
                onClose={() => setShowPeriodAltro(false)}
                className="analisi-altro__menu analisi-altro__menu--period analisi-altro__menu--fixed"
                width={168}
              >
                {ANALISI_PERIOD_QUICK.map(opt => (
                  <button
                    type="button"
                    key={opt.id}
                    role="menuitem"
                    className={`analisi-altro__item${period === opt.id ? ' analisi-altro__item--active' : ''}`}
                    onClick={() => selectQuickPeriod(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="analisi-altro__divider" role="separator" />
                {months.map(mo => (
                  <button
                    type="button"
                    key={`${mo.year}-${mo.month}`}
                    role="menuitem"
                    className={`analisi-altro__item${
                      period === 'month' && periodMonth?.year === mo.year && periodMonth?.month === mo.month
                        ? ' analisi-altro__item--active'
                        : ''
                    }`}
                    onClick={() => selectMonth(mo.year, mo.month)}
                  >
                    {mo.label}
                  </button>
                ))}
                <div className="analisi-altro__divider" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className={`analisi-altro__item${period === 'custom' ? ' analisi-altro__item--active' : ''}`}
                  onClick={openIntervalDialog}
                >
                  Da… a…
                </button>
              </AnalisiPortalMenu>
            </div>
          </div>
        </section>

        <section className="analisi-side-section">
          <h3 className="analisi-side-section__title">{subjectLabelForType(documentType)}</h3>
          <div className="analisi-side-section__options">
            <select
              className="analisi-side-filter"
              value={subjectFilter}
              onChange={e => onSubjectFilterChange(e.target.value)}
            >
              <option value="all">— Tutti —</option>
              {subjects.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </section>
      </aside>

      {showInterval ? (
        <div
          className="analisi-interval-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowInterval(false)
          }}
        >
          <div className="analisi-interval" role="dialog" aria-modal="true" aria-label="Filtra intervallo date">
            <div className="analisi-interval__titlebar">
              <span>Filtra intervallo date</span>
              <button
                type="button"
                className="analisi-interval__close"
                onClick={() => setShowInterval(false)}
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>
            <div className="analisi-interval__body">
              <label className="analisi-interval__field">
                <span>Da…</span>
                <input type="date" value={intervalFrom} onChange={e => setIntervalFrom(e.target.value)} />
              </label>
              <label className="analisi-interval__field">
                <span>a…</span>
                <input type="date" value={intervalTo} onChange={e => setIntervalTo(e.target.value)} />
              </label>
            </div>
            <div className="analisi-interval__actions">
              <button type="button" className="analisi-interval__btn analisi-interval__btn--ok" onClick={confirmInterval}>
                OK
              </button>
              <button type="button" className="analisi-interval__btn" onClick={() => setShowInterval(false)}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
