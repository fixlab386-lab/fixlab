import type { Payment, PaymentResource } from '../../../types'
import type { PaymentPeriodFilter, PaymentStatusFilter } from './utils'
import { PAYMENT_STATUS_LABELS } from './constants'
import { computePaymentSummary } from '../../lib/paymentResources'

const PERIOD_OPTIONS: { value: PaymentPeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'next_month', label: 'Mese prossimo' },
  { value: 'current_month', label: 'Mese corrente' },
  { value: 'last_month', label: 'Mese scorso' },
  { value: 'current_year', label: 'Anno corrente' },
  { value: 'last_year', label: 'Anno scorso' },
]

type Props = {
  period: PaymentPeriodFilter
  statusFilter: PaymentStatusFilter
  resourceFilter: string
  subjectFilter: string
  resources: PaymentResource[]
  payments: Payment[]
  onPeriodChange: (v: PaymentPeriodFilter) => void
  onStatusFilterChange: (v: PaymentStatusFilter) => void
  onResourceFilterChange: (v: string) => void
  onSubjectFilterChange: (v: string) => void
}

export default function PagamentiSidebar({
  period,
  statusFilter,
  resourceFilter,
  subjectFilter,
  resources,
  payments,
  onPeriodChange,
  onStatusFilterChange,
  onResourceFilterChange,
  onSubjectFilterChange,
}: Props) {
  const summary = computePaymentSummary(payments, resources)
  const initialBalance = resources.reduce((s, r) => s + (r.initialBalance || 0), 0)
  const finalBalance = initialBalance + summary.balance

  const subjects = Array.from(
    new Map(
      payments
        .filter(p => p.subjectId && p.subjectName)
        .map(p => [p.subjectId!, { id: p.subjectId!, name: p.subjectName!, type: p.subjectType }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'it'))

  return (
    <aside className="pagamenti-sidebar" data-tutorial="pagamenti-filters">
      <div className="pagamenti-sidebar__section">
        <h3 className="pagamenti-sidebar__title">Periodo</h3>
        {PERIOD_OPTIONS.map(opt => (
          <label key={opt.value} className="pagamenti-sidebar__radio">
            <input
              type="radio"
              name="pay-period"
              checked={period === opt.value}
              onChange={() => onPeriodChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="pagamenti-sidebar__section">
        <h3 className="pagamenti-sidebar__title">Stato</h3>
        {(
          [
            { value: 'all' as const, label: 'Tutti' },
            { value: 'to_settle' as const, label: PAYMENT_STATUS_LABELS.to_settle },
            { value: 'settled' as const, label: PAYMENT_STATUS_LABELS.settled },
          ] as const
        ).map(opt => (
          <label key={opt.value} className="pagamenti-sidebar__radio">
            <input
              type="radio"
              name="pay-status"
              checked={statusFilter === opt.value}
              onChange={() => onStatusFilterChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="pagamenti-sidebar__section">
        <h3 className="pagamenti-sidebar__title">Mostra solo</h3>
        <label className="pagamenti-sidebar__select-label">
          Risorsa
          <select
            className="pagamenti-sidebar__select"
            value={resourceFilter}
            onChange={e => onResourceFilterChange(e.target.value)}
          >
            <option value="all">— Tutte —</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="pagamenti-sidebar__select-label">
          Soggetto
          <select
            className="pagamenti-sidebar__select"
            value={subjectFilter}
            onChange={e => onSubjectFilterChange(e.target.value)}
          >
            <option value="all">— Tutti —</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id!}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pagamenti-sidebar__section pagamenti-sidebar__saldo">
        <h3 className="pagamenti-sidebar__title">Saldo</h3>
        <div className="pagamenti-sidebar__saldo-row">
          <span>Iniziale</span>
          <strong>€ {initialBalance.toFixed(2)}</strong>
        </div>
        <div className="pagamenti-sidebar__saldo-row">
          <span>Finale</span>
          <strong className={finalBalance >= 0 ? 'pagamenti-sidebar__saldo--pos' : 'pagamenti-sidebar__saldo--neg'}>
            € {finalBalance.toFixed(2)}
          </strong>
        </div>
      </div>
    </aside>
  )
}
