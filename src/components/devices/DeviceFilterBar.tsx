import ToolButton from '../ui/ToolButton'
import { DEVICE_STATUSES } from './constants'

type Props = {
  idPrefix: string
  brands: string[]
  statusFilter: string
  brandFilter: string
  statusCounts: Partial<Record<string, number>>
  totalCount: number
  onStatusFilterChange: (value: string) => void
  onBrandFilterChange: (value: string) => void
  onClearFilters: () => void
}

export default function DeviceFilterBar({
  idPrefix,
  brands,
  statusFilter,
  brandFilter,
  statusCounts,
  totalCount,
  onStatusFilterChange,
  onBrandFilterChange,
  onClearFilters,
}: Props) {
  return (
    <div className="gestionale-page__filter-bar gestionale-page__filter-bar--stacked">
      <div className="gestionale-device-filter-chips">
        <button
          type="button"
          className={`gestionale-device-filter-chip${statusFilter === 'all' ? ' gestionale-device-filter-chip--active' : ''}`}
          onClick={() => onStatusFilterChange('all')}
        >
          Tutti ({totalCount})
        </button>
        {DEVICE_STATUSES.map(st => {
          const count = statusCounts[st.key] ?? 0
          if (count === 0) return null
          return (
            <button
              key={st.key}
              type="button"
              className={`gestionale-device-filter-chip${statusFilter === st.key ? ' gestionale-device-filter-chip--active' : ''}`}
              onClick={() => onStatusFilterChange(st.key)}
            >
              {st.emoji} {st.label} ({count})
            </button>
          )
        })}
      </div>
      <div className="gestionale-page__filter-bar">
        <label className="gestionale-page__filter-label" htmlFor={`${idPrefix}-brand-filter`}>
          Marca
        </label>
        <select
          id={`${idPrefix}-brand-filter`}
          className="gestionale-page__filter-select"
          value={brandFilter}
          onChange={e => onBrandFilterChange(e.target.value)}
        >
          <option value="all">Tutte le marche</option>
          {brands.map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        {(statusFilter !== 'all' || brandFilter !== 'all') && (
          <ToolButton label="Azzera filtri" onClick={onClearFilters} />
        )}
      </div>
    </div>
  )
}
