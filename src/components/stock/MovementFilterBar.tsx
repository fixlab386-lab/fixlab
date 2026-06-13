import type { Product } from '../../types'
import ToolButton from '../ui/ToolButton'
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPES } from './constants'
import type { MovementPeriodFilter } from './utils'

const PERIOD_OPTIONS: { value: MovementPeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'current_month', label: 'Mese corrente' },
  { value: 'last_month', label: 'Mese scorso' },
  { value: 'current_year', label: 'Anno corrente' },
  { value: 'last_year', label: 'Anno scorso' },
]

type Props = {
  period: MovementPeriodFilter
  typeFilter: string
  productFilter: string
  products: Product[]
  onPeriodChange: (v: MovementPeriodFilter) => void
  onTypeFilterChange: (v: string) => void
  onProductFilterChange: (v: string) => void
  onClear: () => void
}

export default function MovementFilterBar({
  period,
  typeFilter,
  productFilter,
  products,
  onPeriodChange,
  onTypeFilterChange,
  onProductFilterChange,
  onClear,
}: Props) {
  const active = period !== 'all' || typeFilter !== 'all' || productFilter !== 'all'

  return (
    <div className="gestionale-page__filter-bar gestionale-page__filter-bar--stacked">
      <div className="gestionale-page__filter-bar">
        <label className="gestionale-page__filter-label" htmlFor="mov-filter-period">
          Periodo
        </label>
        <select
          id="mov-filter-period"
          className="gestionale-page__filter-select"
          value={period}
          onChange={e => onPeriodChange(e.target.value as MovementPeriodFilter)}
        >
          {PERIOD_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="gestionale-page__filter-label" htmlFor="mov-filter-type">
          Tipo
        </label>
        <select
          id="mov-filter-type"
          className="gestionale-page__filter-select"
          value={typeFilter}
          onChange={e => onTypeFilterChange(e.target.value)}
        >
          <option value="all">Tutti i tipi</option>
          {MOVEMENT_TYPES.map(t => (
            <option key={t} value={t}>
              {MOVEMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <label className="gestionale-page__filter-label" htmlFor="mov-filter-product">
          Prodotto
        </label>
        <select
          id="mov-filter-product"
          className="gestionale-page__filter-select"
          value={productFilter}
          onChange={e => onProductFilterChange(e.target.value)}
        >
          <option value="all">Tutti i prodotti</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.code ? `[${p.code}] ` : ''}
              {p.name}
            </option>
          ))}
        </select>
        {active ? <ToolButton label="Azzera filtri" onClick={onClear} /> : null}
      </div>
    </div>
  )
}
