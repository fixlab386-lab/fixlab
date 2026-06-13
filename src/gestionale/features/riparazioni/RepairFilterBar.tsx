import { REPAIR_PRIORITIES, REPAIR_STATUSES } from './constants'

type Props = {
  statusFilter: string
  priorityFilter: string
  statusCounts: Partial<Record<string, number>>
  activeCount: number
  totalCount: number
  onStatusFilterChange: (value: string) => void
  onPriorityFilterChange: (value: string) => void
  onClearFilters: () => void
}

export default function RepairFilterBar({
  statusFilter,
  priorityFilter,
  statusCounts,
  activeCount,
  totalCount,
  onStatusFilterChange,
  onPriorityFilterChange,
  onClearFilters,
}: Props) {
  const hasActiveFilters = statusFilter !== 'active' || priorityFilter !== 'all'

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
      </div>
      <div className="gestionale-page__filter-bar">
        <label className="gestionale-page__filter-label" htmlFor="riparazioni-priority-filter">
          Priorità
        </label>
        <select
          id="riparazioni-priority-filter"
          className="gestionale-page__filter-select"
          value={priorityFilter}
          onChange={e => onPriorityFilterChange(e.target.value)}
        >
          <option value="all">Tutte</option>
          {Object.entries(REPAIR_PRIORITIES).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        {hasActiveFilters || priorityFilter !== 'all' ? (
          <button type="button" className="gestionale-page__filter-clear" onClick={onClearFilters}>
            Azzera filtri
          </button>
        ) : null}
      </div>
    </div>
  )
}
