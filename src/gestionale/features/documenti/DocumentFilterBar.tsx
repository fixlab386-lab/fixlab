import ToolButton from '../../../components/ui/ToolButton'
import { ACTIVE_DOCUMENT_LABELS, ACTIVE_DOCUMENT_TYPES, DOCUMENT_STATUS_LABELS } from './constants'

type Props = {
  typeFilter: string
  statusFilter: string
  dateFrom: string
  dateTo: string
  onTypeFilterChange: (v: string) => void
  onStatusFilterChange: (v: string) => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onClear: () => void
}

export default function DocumentFilterBar({
  typeFilter,
  statusFilter,
  dateFrom,
  dateTo,
  onTypeFilterChange,
  onStatusFilterChange,
  onDateFromChange,
  onDateToChange,
  onClear,
}: Props) {
  const active =
    typeFilter !== 'all' || statusFilter !== 'all' || Boolean(dateFrom) || Boolean(dateTo)

  return (
    <div className="gestionale-page__filter-bar gestionale-page__filter-bar--stacked">
      <div className="gestionale-page__filter-bar">
        <label className="gestionale-page__filter-label" htmlFor="doc-filter-type">
          Tipo
        </label>
        <select
          id="doc-filter-type"
          className="gestionale-page__filter-select"
          value={typeFilter}
          onChange={e => onTypeFilterChange(e.target.value)}
        >
          <option value="all">Tutti i tipi</option>
          {ACTIVE_DOCUMENT_TYPES.map(t => (
            <option key={t} value={t}>
              {ACTIVE_DOCUMENT_LABELS[t]}
            </option>
          ))}
        </select>
        <label className="gestionale-page__filter-label" htmlFor="doc-filter-status">
          Stato
        </label>
        <select
          id="doc-filter-status"
          className="gestionale-page__filter-select"
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value)}
        >
          <option value="all">Tutti</option>
          {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="gestionale-page__filter-bar">
        <label className="gestionale-page__filter-label" htmlFor="doc-filter-from">
          Dal
        </label>
        <input
          id="doc-filter-from"
          type="date"
          className="gestionale-page__filter-select"
          value={dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
        />
        <label className="gestionale-page__filter-label" htmlFor="doc-filter-to">
          Al
        </label>
        <input
          id="doc-filter-to"
          type="date"
          className="gestionale-page__filter-select"
          value={dateTo}
          onChange={e => onDateToChange(e.target.value)}
        />
        {active ? <ToolButton label="Azzera filtri" onClick={onClear} /> : null}
      </div>
    </div>
  )
}
