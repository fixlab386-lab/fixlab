import type { PaymentResource } from '../../types'
import ToolButton from '../ui/ToolButton'
import { PAYMENT_FLOW_LABELS, PAYMENT_STATUS_LABELS } from './constants'
import type { PaymentFlowFilter, PaymentPeriodFilter, PaymentStatusFilter } from './utils'

const PERIOD_OPTIONS: { value: PaymentPeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'current_month', label: 'Mese corrente' },
  { value: 'last_month', label: 'Mese scorso' },
  { value: 'current_year', label: 'Anno corrente' },
  { value: 'last_year', label: 'Anno scorso' },
]

type Props = {
  period: PaymentPeriodFilter
  flowFilter: PaymentFlowFilter
  statusFilter: PaymentStatusFilter
  resourceFilter: string
  resources: PaymentResource[]
  onPeriodChange: (v: PaymentPeriodFilter) => void
  onFlowFilterChange: (v: PaymentFlowFilter) => void
  onStatusFilterChange: (v: PaymentStatusFilter) => void
  onResourceFilterChange: (v: string) => void
  onClear: () => void
}

export default function PaymentFilterBar({
  period,
  flowFilter,
  statusFilter,
  resourceFilter,
  resources,
  onPeriodChange,
  onFlowFilterChange,
  onStatusFilterChange,
  onResourceFilterChange,
  onClear,
}: Props) {
  const active =
    period !== 'all' ||
    flowFilter !== 'all' ||
    statusFilter !== 'all' ||
    resourceFilter !== 'all'

  return (
    <div className="gestionale-page__filter-bar gestionale-page__filter-bar--stacked">
      <div className="gestionale-page__filter-bar">
        <label className="gestionale-page__filter-label" htmlFor="pay-filter-period">
          Periodo
        </label>
        <select
          id="pay-filter-period"
          className="gestionale-page__filter-select"
          value={period}
          onChange={e => onPeriodChange(e.target.value as PaymentPeriodFilter)}
        >
          {PERIOD_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="gestionale-page__filter-label" htmlFor="pay-filter-flow">
          Tipo
        </label>
        <select
          id="pay-filter-flow"
          className="gestionale-page__filter-select"
          value={flowFilter}
          onChange={e => onFlowFilterChange(e.target.value as PaymentFlowFilter)}
        >
          <option value="all">Tutti</option>
          <option value="in">{PAYMENT_FLOW_LABELS.in}</option>
          <option value="out">{PAYMENT_FLOW_LABELS.out}</option>
        </select>
        <label className="gestionale-page__filter-label" htmlFor="pay-filter-status">
          Stato
        </label>
        <select
          id="pay-filter-status"
          className="gestionale-page__filter-select"
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value as PaymentStatusFilter)}
        >
          <option value="all">Tutti</option>
          <option value="settled">{PAYMENT_STATUS_LABELS.settled}</option>
          <option value="to_settle">{PAYMENT_STATUS_LABELS.to_settle}</option>
        </select>
        <label className="gestionale-page__filter-label" htmlFor="pay-filter-resource">
          Risorsa
        </label>
        <select
          id="pay-filter-resource"
          className="gestionale-page__filter-select"
          value={resourceFilter}
          onChange={e => onResourceFilterChange(e.target.value)}
        >
          <option value="all">Tutte le risorse</option>
          {resources.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {active ? <ToolButton label="Azzera filtri" onClick={onClear} /> : null}
      </div>
    </div>
  )
}
