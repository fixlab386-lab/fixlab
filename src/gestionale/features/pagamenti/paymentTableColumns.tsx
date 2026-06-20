import type { DataTableColumn } from '../../../components/ui'
import type { Payment, PaymentResource } from '../../../types'
import { resolvePaymentResourceName } from '../../lib/paymentResources'
import { formatPaymentDate } from './utils'

function formatEuro(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`
}

export function createPaymentTableColumns(
  resources: PaymentResource[],
  onToggleSettled: (p: Payment) => void,
  onSubjectClick?: (p: Payment) => void,
  onDescriptionClick?: (p: Payment) => void,
): DataTableColumn<Payment>[] {
  return [
    {
      id: 'date',
      header: 'Data',
      width: 88,
      sortable: true,
      accessor: p => p.date,
      render: p => (
        <span className={!p.settled ? 'pagamenti-cell-date--due' : undefined}>{formatPaymentDate(p.date)}</span>
      ),
    },
    {
      id: 'resource',
      header: 'Risorsa',
      width: 110,
      sortable: true,
      accessor: p => resolvePaymentResourceName(p, resources),
      render: p => resolvePaymentResourceName(p, resources),
    },
    {
      id: 'subject',
      header: 'Soggetto',
      minWidth: 120,
      sortable: true,
      accessor: p => p.subjectName,
      render: p =>
        p.subjectName ? (
          <button type="button" className="pagamenti-cell-link" onClick={e => { e.stopPropagation(); onSubjectClick?.(p) }}>
            {p.subjectName}
          </button>
        ) : (
          '—'
        ),
    },
    {
      id: 'description',
      header: 'Descrizione',
      minWidth: 140,
      sortable: true,
      accessor: p => p.description,
      render: p => (
        <button type="button" className="pagamenti-cell-link" onClick={e => { e.stopPropagation(); onDescriptionClick?.(p) }}>
          {p.description}
        </button>
      ),
    },
    {
      id: 'paymentMethod',
      header: 'Modalità pagamento',
      width: 120,
      sortable: true,
      accessor: p => p.paymentMethod,
      render: p => p.paymentMethod || '—',
    },
    {
      id: 'amountIn',
      header: 'Entrate',
      width: 96,
      align: 'right',
      sortable: true,
      accessor: p => p.amountIn ?? 0,
      render: p => (p.amountIn && p.amountIn > 0 ? <span className="pagamenti-cell-in">{formatEuro(p.amountIn)}</span> : ''),
    },
    {
      id: 'amountOut',
      header: 'Uscite',
      width: 96,
      align: 'right',
      sortable: true,
      accessor: p => p.amountOut ?? 0,
      render: p => (p.amountOut && p.amountOut > 0 ? <span className="pagamenti-cell-out">{formatEuro(p.amountOut)}</span> : ''),
    },
    {
      id: 'settled',
      header: 'Saldato',
      width: 56,
      align: 'center',
      sortable: true,
      accessor: p => (p.settled ? 1 : 0),
      render: p => (
        <span className="pagamenti-cell-settled">
          <input
            type="checkbox"
            checked={p.settled}
            onChange={e => {
              e.stopPropagation()
              onToggleSettled(p)
            }}
            onClick={e => e.stopPropagation()}
            aria-label={p.settled ? 'Saldato' : 'Da saldare'}
          />
        </span>
      ),
    },
  ]
}
