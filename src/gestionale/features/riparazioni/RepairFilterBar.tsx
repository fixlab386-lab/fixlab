import { REPAIR_STATUSES } from './constants'

type Props = {
  statusFilter: string
  statusCounts: Partial<Record<string, number>>
  activeCount: number
  totalCount: number
  onStatusFilterChange: (value: string) => void
  onClearFilters: () => void
}

export default function RepairFilterBar({
  statusFilter,
  statusCounts,
  activeCount,
  totalCount,
  onStatusFilterChange,
  onClearFilters,
}: Props) {
  const hasActiveFilters = statusFilter !== 'all'

  return (
    <div className="gestionale-page__filter-bar gestionale-page__filter-bar--stacked">
      <div className="gestionale-device-filter-chips">
        <button
          type="button"
          className={`gestionale-device-filter-chip${statusFilter === 'active' ? ' gestionale-device-filter-chip--active' : ''}`}
          onClick={() => onStatusFilterChange('active')}
        >
          Attive ({activeCount})
        </button>
        {REPAIR_STATUSES.map(st => {
          const count = statusCounts[st.key] ?? 0
          if (count === 0 && statusFilter !== st.key) return null
          return (
            <button
              key={st.key}
              type="button"
              className={`gestionale-device-filter-chip${statusFilter === st.key ? ' gestionale-device-filter-chip--active' : ''}`}
              onClick={() => onStatusFilterChange(st.key)}
            >
              {st.label} ({count})
            </button>
          )
        })}
        <button
          type="button"
          className={`gestionale-device-filter-chip${statusFilter === 'all' ? ' gestionale-device-filter-chip--active' : ''}`}
          onClick={() => onStatusFilterChange('all')}
        >
          Tutte ({totalCount})
        </button>
        {hasActiveFilters ? (
          <button type="button" className="gestionale-page__filter-clear" onClick={onClearFilters}>
            Azzera filtri
          </button>
        ) : null}
      </div>
    </div>
  )
}
