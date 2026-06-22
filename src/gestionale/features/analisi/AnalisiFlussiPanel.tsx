import { useMemo, useRef, useState } from 'react'
import {
  aggregateFlussi,
  formatCurrency,
  type AnalisiDataset,
  type FlussiBucket,
} from './analisiAggregation'
import {
  ANALISI_FLUSSI_MODES,
  ANALISI_FLUSSI_PERIODS,
  ANALISI_PERIOD_QUICK,
  isAltroPeriod,
  lastMonths,
  periodSelectionLabel,
  type AnalisiFlussiMode,
  type AnalisiPeriod,
} from './analisiTypes'
import AnalisiFlussiChart from './AnalisiFlussiChart'
import AnalisiPortalMenu from './AnalisiPortalMenu'
import { buildExportFilename, exportRowsToXlsx } from '../../../lib/exportExcel'

type Props = {
  dataset: AnalisiDataset
  loading: boolean
  error: string | null
}

export default function AnalisiFlussiPanel({ dataset, loading, error }: Props) {
  const [period, setPeriod] = useState<AnalisiPeriod>('tutti')
  const [periodMonth, setPeriodMonth] = useState<{ year: number; month: number } | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [mode, setMode] = useState<AnalisiFlussiMode>('pagamenti')
  const [showEntrate, setShowEntrate] = useState(true)
  const [showSaldo, setShowSaldo] = useState(true)
  const [showUscite, setShowUscite] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [onlySettled, setOnlySettled] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [showPeriodAltro, setShowPeriodAltro] = useState(false)
  const [showInterval, setShowInterval] = useState(false)
  const [intervalFrom, setIntervalFrom] = useState('')
  const [intervalTo, setIntervalTo] = useState(() => new Date().toISOString().slice(0, 10))

  const periodAltroBtnRef = useRef<HTMLButtonElement>(null)
  const months = useMemo(() => lastMonths(13), [])

  const filterOptions = useMemo(() => {
    const subjects = new Map<string, string>()
    if (mode === 'pagamenti') {
      for (const p of dataset.payments) {
        if (p.subjectId && p.subjectName) subjects.set(p.subjectId, p.subjectName)
      }
    } else {
      for (const doc of dataset.documents) {
        if (doc.subjectId && doc.subjectName) subjects.set(doc.subjectId, doc.subjectName)
      }
    }
    return Array.from(subjects, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'it'))
  }, [dataset, mode])

  const result = useMemo(
    () =>
      aggregateFlussi(dataset, {
        mode,
        period,
        periodYear: periodMonth?.year,
        periodMonth: periodMonth?.month,
        customFrom,
        customTo,
        subjectId: subjectFilter || null,
        onlySettled,
      }),
    [dataset, mode, period, periodMonth, customFrom, customTo, subjectFilter, onlySettled],
  )

  const altroPeriodActive = isAltroPeriod(period) && !ANALISI_FLUSSI_PERIODS.some(p => p.id === period)
  const periodAltroLabel = altroPeriodActive || period === 'custom' || period === 'month'
    ? periodSelectionLabel({ period, year: periodMonth?.year, month: periodMonth?.month, customFrom, customTo })
    : 'Altro…'

  const selectQuickPeriod = (p: AnalisiPeriod) => {
    setPeriod(p)
    setPeriodMonth(null)
    setShowPeriodAltro(false)
  }

  const selectMonth = (year: number, month: number) => {
    setPeriod('month')
    setPeriodMonth({ year, month })
    setShowPeriodAltro(false)
  }

  const openIntervalDialog = () => {
    setShowPeriodAltro(false)
    setIntervalFrom(customFrom || '')
    setIntervalTo(customTo || new Date().toISOString().slice(0, 10))
    setShowInterval(true)
  }

  const confirmInterval = () => {
    setPeriod('custom')
    setPeriodMonth(null)
    setCustomFrom(intervalFrom)
    setCustomTo(intervalTo)
    setShowInterval(false)
  }

  const handleExcel = () => {
    if (result.buckets.length === 0) return
    exportRowsToXlsx({
      rows: result.buckets,
      columns: [
        { header: 'Mese', value: (r: FlussiBucket) => r.label },
        { header: 'Entrate', value: (r: FlussiBucket) => r.entrate },
        { header: 'Uscite', value: (r: FlussiBucket) => r.uscite },
        { header: 'Saldo', value: (r: FlussiBucket) => r.saldo },
      ],
      filename: buildExportFilename('analisi_flussi', 'Mese'),
      sheetName: 'Flussi',
    })
  }

  return (
    <>
      <div className="analisi-main analisi-main--flussi">
        <div className="analisi-list analisi-list--flussi">
          <div className="analisi-list__head analisi-list__head--flussi">
            <span>Mese</span>
            <span>Entrate</span>
            <span>Uscite</span>
            <span>Saldo</span>
          </div>
          <div className="analisi-list__rows">
            {result.buckets.map(b => (
              <button
                type="button"
                key={b.key}
                className={`analisi-list__row analisi-list__row--flussi${selectedKey === b.key ? ' analisi-list__row--active' : ''}`}
                onClick={() => setSelectedKey(b.key)}
              >
                <span className="analisi-list__row-label">{b.label}</span>
                <span className="analisi-list__row-val">{formatCurrency(b.entrate)}</span>
                <span className="analisi-list__row-val">{formatCurrency(b.uscite)}</span>
                <span className={`analisi-list__row-val${b.saldo < 0 ? ' analisi-list__row-val--neg' : ''}`}>
                  {formatCurrency(b.saldo)}
                </span>
              </button>
            ))}
            {!loading && result.buckets.length === 0 ? <div className="analisi-list__empty">Nessun dato</div> : null}
          </div>
          <div className="analisi-list__foot analisi-list__foot--flussi">
            <span>{result.count.toLocaleString('it-IT')} voci</span>
            <span className="analisi-list__foot-total">{formatCurrency(result.totalEntrate)}</span>
            <span className="analisi-list__foot-total">{formatCurrency(result.totalUscite)}</span>
            <span className={`analisi-list__foot-total${result.totalSaldo < 0 ? ' analisi-list__row-val--neg' : ''}`}>
              {formatCurrency(result.totalSaldo)}
            </span>
          </div>
        </div>

        <div className="analisi-graph">
          {loading ? (
            <div className="analisi-graph__loading">Caricamento dati…</div>
          ) : error ? (
            <div className="analisi-graph__error">{error}</div>
          ) : (
            <AnalisiFlussiChart
              buckets={result.buckets}
              showEntrate={showEntrate}
              showSaldo={showSaldo}
              showUscite={showUscite}
            />
          )}
        </div>

        <div className="analisi-sidebar">
          <section className="analisi-side-section">
            <h3 className="analisi-side-section__title">Periodo</h3>
            <div className="analisi-side-section__options">
              {ANALISI_FLUSSI_PERIODS.map(opt => (
                <label key={opt.id} className="analisi-radio">
                  <input
                    type="radio"
                    name="flussi-period"
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
                    name="flussi-period"
                    checked={altroPeriodActive || period === 'custom' || period === 'month'}
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
            <h3 className="analisi-side-section__title">Analisi</h3>
            <div className="analisi-side-section__options">
              {ANALISI_FLUSSI_MODES.map(opt => (
                <label key={opt.id} className="analisi-radio">
                  <input
                    type="radio"
                    name="flussi-mode"
                    checked={mode === opt.id}
                    onChange={() => {
                      setMode(opt.id)
                      setSubjectFilter('')
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="analisi-side-section">
            <h3 className="analisi-side-section__title">Visualizza</h3>
            <div className="analisi-side-section__options">
              <label className="analisi-radio">
                <input type="checkbox" checked={showEntrate} onChange={e => setShowEntrate(e.target.checked)} />
                <span>Entrate</span>
              </label>
              <label className="analisi-radio">
                <input type="checkbox" checked={showSaldo} onChange={e => setShowSaldo(e.target.checked)} />
                <span>Saldo</span>
              </label>
              <label className="analisi-radio">
                <input type="checkbox" checked={showUscite} onChange={e => setShowUscite(e.target.checked)} />
                <span>Uscite</span>
              </label>
            </div>
          </section>

          <section className="analisi-side-section">
            <h3 className="analisi-side-section__title">Cliente / Fornitore</h3>
            <div className="analisi-side-section__options">
              <select className="analisi-side-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                <option value="">- Tutti -</option>
                {filterOptions.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="analisi-side-section">
            <div className="analisi-side-section__options">
              <label className="analisi-radio">
                <input type="checkbox" checked={onlySettled} onChange={e => setOnlySettled(e.target.checked)} />
                <span>Solo importi già saldati</span>
              </label>
            </div>
          </section>
        </div>
      </div>

      <div className="gestionale-mdi-window__actionbar analisi-actionbar">
        <button type="button" className="gestionale-mdi-window__action-btn" onClick={() => window.print()}>
          🖨 Stampa grafico
        </button>
        <button type="button" className="gestionale-mdi-window__action-btn" onClick={handleExcel}>
          ⊞ Excel
        </button>
        <button
          type="button"
          className="gestionale-mdi-window__action-btn"
          onClick={() => {
            setPeriod('tutti')
            setPeriodMonth(null)
            setCustomFrom('')
            setCustomTo('')
            setMode('pagamenti')
            setShowEntrate(true)
            setShowSaldo(true)
            setShowUscite(true)
            setSubjectFilter('')
            setOnlySettled(false)
          }}
        >
          ⟳ Utilità
        </button>
      </div>

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
              <button type="button" className="analisi-interval__close" onClick={() => setShowInterval(false)} aria-label="Chiudi">
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
