import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { buildExportFilename, exportRowsToXlsx } from '../../../lib/exportExcel'
import {
  aggregateAnalisi,
  formatValue,
  loadAnalisiDataset,
  sortBuckets,
  type AnalisiBucket,
  type AnalisiDataset,
  type SortMode,
} from './analisiAggregation'
import {
  ANALISI_ALL_DIMENSIONS,
  ANALISI_BASE_PERIODS,
  ANALISI_CALC_OPTIONS,
  ANALISI_DIMENSION_LABELS,
  ANALISI_KIND_LABELS,
  ANALISI_PERIOD_QUICK,
  ANALISI_PRIMARY_DIMENSIONS,
  isAltroPeriod,
  lastMonths,
  periodSelectionLabel,
  type AnalisiCalc,
  type AnalisiDimension,
  type AnalisiKind,
  type AnalisiPeriod,
} from './analisiTypes'
import AnalisiBarChart from './AnalisiBarChart'
import AnalisiPieChart from './AnalisiPieChart'
import AnalisiPortalMenu from './AnalisiPortalMenu'
import '../../theme/analisi.css'

const VALID_KINDS: AnalisiKind[] = ['vendite', 'acquisti', 'flussi']

export default function AnalisiPage() {
  const [searchParams] = useSearchParams()
  const kindParam = searchParams.get('kind') as AnalisiKind | null
  const analisiKind: AnalisiKind = kindParam && VALID_KINDS.includes(kindParam) ? kindParam : 'vendite'
  const { studioId } = useActiveStudio()

  const [dataset, setDataset] = useState<AnalisiDataset | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [period, setPeriod] = useState<AnalisiPeriod>('tutti')
  const [periodMonth, setPeriodMonth] = useState<{ year: number; month: number } | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [dimension, setDimension] = useState<AnalisiDimension>('mese')
  const [calc, setCalc] = useState<AnalisiCalc>('totDovuto')
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar')
  const [sortMode, setSortMode] = useState<SortMode>('natural')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const [subjectFilter, setSubjectFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')

  const [showPeriodAltro, setShowPeriodAltro] = useState(false)
  const [showAltro, setShowAltro] = useState(false)
  const [showCalcMenu, setShowCalcMenu] = useState(false)
  const [showInterval, setShowInterval] = useState(false)
  const [intervalFrom, setIntervalFrom] = useState('')
  const [intervalTo, setIntervalTo] = useState(() => new Date().toISOString().slice(0, 10))

  const periodAltroBtnRef = useRef<HTMLButtonElement>(null)
  const dimAltroBtnRef = useRef<HTMLButtonElement>(null)
  const calcBtnRef = useRef<HTMLButtonElement>(null)

  const months = useMemo(() => lastMonths(13), [])

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setDataset(null)
    void loadAnalisiDataset(studioId, analisiKind)
      .then(ds => {
        if (!cancelled) setDataset(ds)
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare i dati per l’analisi.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, analisiKind])

  useEffect(() => {
    setSubjectFilter('')
    setProductFilter('')
    setAgentFilter('')
    setSelectedKey(null)
  }, [analisiKind])

  const filterOptions = useMemo(() => {
    if (!dataset) return { subjects: [], products: [], agents: [] }
    const subjects = new Map<string, string>()
    const products = new Map<string, string>()
    const agents = new Set<string>()
    for (const doc of dataset.documents) {
      if (doc.subjectId && doc.subjectName) subjects.set(doc.subjectId, doc.subjectName)
      const client = doc.subjectId ? dataset.clientsById.get(doc.subjectId) : undefined
      const agent = (doc.agentName || client?.agent || '').trim()
      if (agent) agents.add(agent)
      for (const row of doc.rows || []) {
        if (row.productId) {
          const name = dataset.productsById.get(row.productId)?.name || row.description
          if (name) products.set(row.productId, name)
        }
      }
    }
    return {
      subjects: Array.from(subjects, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'it')),
      products: Array.from(products, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'it')),
      agents: Array.from(agents).sort((a, b) => a.localeCompare(b, 'it')),
    }
  }, [dataset])

  const result = useMemo(() => {
    if (!dataset) return { buckets: [] as AnalisiBucket[], total: 0, count: 0, max: 0 }
    return aggregateAnalisi(dataset, {
      kind: analisiKind,
      dimension,
      calc,
      period,
      periodYear: periodMonth?.year,
      periodMonth: periodMonth?.month,
      customFrom,
      customTo,
      subjectId: subjectFilter || null,
      productId: productFilter || null,
      agent: agentFilter || null,
    })
  }, [
    dataset, analisiKind, dimension, calc, period, periodMonth, customFrom, customTo,
    subjectFilter, productFilter, agentFilter,
  ])

  const sortedBuckets = useMemo(
    () => sortBuckets(result.buckets, dimension, sortMode),
    [result.buckets, dimension, sortMode],
  )

  const dimensionLabel = ANALISI_DIMENSION_LABELS[dimension]
  const calcLabel = ANALISI_CALC_OPTIONS.find(o => o.id === calc)?.label ?? 'Valore'
  const altroPeriodActive = isAltroPeriod(period)
  const periodAltroLabel = altroPeriodActive
    ? periodSelectionLabel({ period, year: periodMonth?.year, month: periodMonth?.month, customFrom, customTo })
    : 'Altro…'

  const handleSelectDimension = (dim: AnalisiDimension) => {
    setDimension(dim)
    setShowAltro(false)
    setSelectedKey(null)
  }

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

  const handleOrdina = () => {
    setSortMode(prev =>
      prev === 'natural' ? 'valueDesc' : prev === 'valueDesc' ? 'valueAsc' : prev === 'valueAsc' ? 'alpha' : 'natural',
    )
  }

  const handleExcel = () => {
    if (sortedBuckets.length === 0) return
    exportRowsToXlsx({
      rows: sortedBuckets,
      columns: [
        { header: dimensionLabel, value: r => r.label },
        { header: calcLabel, value: r => r.value },
        { header: 'N. doc.', value: r => r.count },
      ],
      filename: buildExportFilename(`analisi_${analisiKind}`, dimensionLabel),
      sheetName: ANALISI_KIND_LABELS[analisiKind].slice(0, 31),
    })
  }

  const sortModeLabel: Record<SortMode, string> = {
    natural: 'Ordine naturale',
    valueDesc: 'Valore ↓',
    valueAsc: 'Valore ↑',
    alpha: 'Alfabetico',
  }

  return (
    <div className="analisi-page">
      <div className="analisi-page__topbar">
        <span className="analisi-page__topbar-title">{ANALISI_KIND_LABELS[analisiKind]}</span>
        <span className="analisi-page__topbar-right">Seleziona</span>
      </div>

      <div className="analisi-body">
        <div className="analisi-main">
          {/* Colonna sinistra: elenco valori */}
          <div className="analisi-list">
            <div className="analisi-list__head">
              <span className="analisi-list__head-dim">{dimensionLabel}</span>
              <span className="analisi-list__head-val">{calcLabel}</span>
            </div>
            <div className="analisi-list__rows">
              {sortedBuckets.map(b => (
                <button
                  type="button"
                  key={b.key}
                  className={`analisi-list__row${selectedKey === b.key ? ' analisi-list__row--active' : ''}`}
                  onClick={() => setSelectedKey(b.key)}
                >
                  <span className="analisi-list__row-label" title={b.label}>{b.label}</span>
                  <span className={`analisi-list__row-val${b.negative ? ' analisi-list__row-val--neg' : ''}`}>
                    {formatValue(b.value, calc)}
                  </span>
                </button>
              ))}
              {!loading && sortedBuckets.length === 0 ? <div className="analisi-list__empty">Nessun dato</div> : null}
            </div>
            <div className="analisi-list__foot">
              <span>{result.count.toLocaleString('it-IT')} voci</span>
              <span className="analisi-list__foot-total">{formatValue(result.total, calc)}</span>
            </div>
          </div>

          {/* Centro: grafico */}
          <div className="analisi-graph">
            {loading ? (
              <div className="analisi-graph__loading">Caricamento dati…</div>
            ) : error ? (
              <div className="analisi-graph__error">{error}</div>
            ) : viewMode === 'pie' ? (
              <AnalisiPieChart buckets={sortedBuckets} calc={calc} />
            ) : (
              <AnalisiBarChart buckets={sortedBuckets} calc={calc} axisLabel={dimensionLabel} />
            )}
          </div>

          {/* Destra: sidebar filtri */}
          <div className="analisi-sidebar">
            <section className="analisi-side-section">
              <h3 className="analisi-side-section__title">Periodo</h3>
              <div className="analisi-side-section__options">
                {ANALISI_BASE_PERIODS.map(opt => (
                  <label key={opt.id} className="analisi-radio">
                    <input
                      type="radio"
                      name="analisi-period"
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
                      name="analisi-period"
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
              <h3 className="analisi-side-section__title">Analisi per</h3>
              <div className="analisi-side-section__options">
                {ANALISI_PRIMARY_DIMENSIONS.map(opt => (
                  <label key={opt.id} className="analisi-radio">
                    <input
                      type="radio"
                      name="analisi-dim"
                      checked={dimension === opt.id}
                      onChange={() => handleSelectDimension(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
                <div className="analisi-altro">
                  <label className="analisi-radio">
                    <input
                      type="radio"
                      name="analisi-dim"
                      checked={!ANALISI_PRIMARY_DIMENSIONS.some(o => o.id === dimension)}
                      onChange={() => setShowAltro(true)}
                    />
                    <button
                      ref={dimAltroBtnRef}
                      type="button"
                      className="analisi-altro__btn"
                      onClick={() => setShowAltro(v => !v)}
                    >
                      {ANALISI_PRIMARY_DIMENSIONS.some(o => o.id === dimension) ? 'Altro…' : `${dimensionLabel} ▾`}
                    </button>
                  </label>
                  <AnalisiPortalMenu
                    open={showAltro}
                    anchorRef={dimAltroBtnRef}
                    onClose={() => setShowAltro(false)}
                    className="analisi-altro__menu analisi-altro__menu--fixed"
                    width={200}
                  >
                    {ANALISI_ALL_DIMENSIONS.map(opt => (
                      <button
                        type="button"
                        key={opt.id}
                        role="menuitem"
                        className={`analisi-altro__item${dimension === opt.id ? ' analisi-altro__item--active' : ''}`}
                        onClick={() => handleSelectDimension(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </AnalisiPortalMenu>
                </div>
              </div>
            </section>

            <section className="analisi-side-section">
              <h3 className="analisi-side-section__title">Calcola</h3>
              <div className="analisi-side-select">
                <button
                  ref={calcBtnRef}
                  type="button"
                  className="analisi-side-select__btn"
                  onClick={() => setShowCalcMenu(v => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={showCalcMenu}
                >
                  {calcLabel}
                  <span aria-hidden="true">▾</span>
                </button>
                <AnalisiPortalMenu
                  open={showCalcMenu}
                  anchorRef={calcBtnRef}
                  onClose={() => setShowCalcMenu(false)}
                  className="analisi-side-select__menu analisi-side-select__menu--fixed"
                  width={200}
                  role="listbox"
                >
                  {ANALISI_CALC_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.id}
                      role="option"
                      aria-selected={calc === opt.id}
                      className={`analisi-side-select__item${calc === opt.id ? ' analisi-side-select__item--active' : ''}`}
                      onClick={() => {
                        setCalc(opt.id)
                        setShowCalcMenu(false)
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </AnalisiPortalMenu>
              </div>
            </section>

            <section className="analisi-side-section">
              <h3 className="analisi-side-section__title">Mostra</h3>
              <div className="analisi-side-section__options">
                <select className="analisi-side-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                  <option value="">{analisiKind === 'acquisti' ? 'Tutti i fornitori' : 'Tutti i clienti'}</option>
                  {filterOptions.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select className="analisi-side-filter" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                  <option value="">Tutti i prodotti</option>
                  {filterOptions.products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select className="analisi-side-filter" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
                  <option value="">Tutti gli agenti</option>
                  {filterOptions.agents.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Barra azioni in basso */}
      <div className="gestionale-mdi-window__actionbar analisi-actionbar">
        <button type="button" className="gestionale-mdi-window__action-btn" onClick={handleOrdina}>
          ⇅ Ordina
          <span className="analisi-actionbar__hint">{sortModeLabel[sortMode]}</span>
        </button>
        <button
          type="button"
          className={`gestionale-mdi-window__action-btn${viewMode === 'pie' ? ' gestionale-mdi-window__action-btn--on' : ''}`}
          onClick={() => setViewMode(v => (v === 'pie' ? 'bar' : 'pie'))}
        >
          🥧 Torta
        </button>
        <button type="button" className="gestionale-mdi-window__action-btn" onClick={() => window.print()}>
          🖨 Stampa
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
            setDimension('mese')
            setCalc('totDovuto')
            setSubjectFilter('')
            setProductFilter('')
            setAgentFilter('')
            setSortMode('natural')
            setViewMode('bar')
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
    </div>
  )
}
