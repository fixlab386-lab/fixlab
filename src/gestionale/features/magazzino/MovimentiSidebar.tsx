import type { MovementPeriod, MovementStatusFilter } from './constants'
import { MOVEMENT_STATUS_LABELS } from './constants'
import type { StockMovement } from '../../../types'
import PeriodoFilter from './PeriodoFilter'

const STATUS_OPTIONS: { value: MovementStatusFilter; label: string }[] = (
  Object.entries(MOVEMENT_STATUS_LABELS) as [MovementStatusFilter, string][]
).map(([value, label]) => ({ value, label }))

type Props = {
  period: MovementPeriod
  statusFilter: MovementStatusFilter
  productFilter: string
  subjectFilter: string
  movements: StockMovement[]
  catalogSubjects?: { id: string; name: string }[]
  catalogProducts?: { id: string; code: string; name: string }[]
  onPeriodChange: (v: MovementPeriod) => void
  onStatusFilterChange: (v: MovementStatusFilter) => void
  onProductFilterChange: (v: string) => void
  onSubjectFilterChange: (v: string) => void
}

export default function MovimentiSidebar({
  period,
  statusFilter,
  productFilter,
  subjectFilter,
  movements,
  catalogSubjects = [],
  catalogProducts = [],
  onPeriodChange,
  onStatusFilterChange,
  onProductFilterChange,
  onSubjectFilterChange,
}: Props) {
  const subjects = Array.from(
    new Map(
      [
        ...movements
          .filter(m => m.subjectId && m.subjectName)
          .map(m => [m.subjectId!, { id: m.subjectId!, name: m.subjectName! }] as const),
        ...catalogSubjects.map(s => [s.id, { id: s.id, name: s.name }] as const),
      ],
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'it'))

  const productOptions = Array.from(
    new Map(
      [
        ...movements
          .filter(m => m.productId && m.productName)
          .map(
            m =>
              [m.productId!, { id: m.productId!, code: m.productCode || '', name: m.productName! }] as const,
          ),
        ...catalogProducts.map(p => [p.id, { id: p.id, code: p.code, name: p.name }] as const),
      ],
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'it'))

  return (
    <aside className="movimenti-sidebar" data-tutorial="movimenti-filters">
      <PeriodoFilter period={period} onChange={onPeriodChange} />

      <div className="movimenti-sidebar__section">
        <h3 className="movimenti-sidebar__title">Stato</h3>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`movimenti-sidebar__item${statusFilter === opt.value ? ' movimenti-sidebar__item--active' : ''}`}
            onClick={() => onStatusFilterChange(opt.value)}
          >
            <span className="movimenti-sidebar__bullet" aria-hidden="true" />
            {opt.label}
          </button>
        ))}
      </div>

      <div className="movimenti-sidebar__section movimenti-sidebar__section--last">
        <h3 className="movimenti-sidebar__title">Mostra solo</h3>
        <div className="movimenti-sidebar__select-label">
          Cliente / Fornitore
          <div className="movimenti-sidebar__select-row">
            <select
              className="movimenti-sidebar__select"
              value={subjectFilter}
              onChange={e => onSubjectFilterChange(e.target.value)}
            >
              <option value="all">— Tutti —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="movimenti-sidebar__reset"
              title="Mostra tutti"
              aria-label="Mostra tutti i clienti / fornitori"
              disabled={subjectFilter === 'all'}
              onClick={() => onSubjectFilterChange('all')}
            >
              ↻
            </button>
          </div>
        </div>
        <div className="movimenti-sidebar__select-label">
          Prodotto
          <div className="movimenti-sidebar__select-row">
            <select
              className="movimenti-sidebar__select"
              value={productFilter}
              onChange={e => onProductFilterChange(e.target.value)}
            >
              <option value="all">— Tutti —</option>
              {productOptions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="movimenti-sidebar__reset"
              title="Mostra tutti"
              aria-label="Mostra tutti i prodotti"
              disabled={productFilter === 'all'}
              onClick={() => onProductFilterChange('all')}
            >
              ↻
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
