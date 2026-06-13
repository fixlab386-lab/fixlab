import type { DataTableColumn } from '../ui'
import type { Payment, PaymentResource } from '../../types'
import { resolvePaymentResourceName } from '../../lib/paymentResources'
import { PAYMENT_FLOW_LABELS, PAYMENT_STATUS_LABELS } from './constants'
import {
  formatPaymentAmount,
  formatPaymentDate,
  linkedDocumentLabel,
  paymentFlowType,
} from './utils'

export function createPaymentTableColumns(
  resources: PaymentResource[],
): DataTableColumn<Payment>[] {
  return [
    {
      id: 'date',
      header: 'Data',
      width: 88,
      sortable: true,
      accessor: p => p.date,
      render: p => formatPaymentDate(p.date),
    },
    {
      id: 'flow',
      header: 'Tipo',
      width: 72,
      sortable: true,
      accessor: p => paymentFlowType(p),
      render: p => PAYMENT_FLOW_LABELS[paymentFlowType(p)],
    },
    {
      id: 'description',
      header: 'Descrizione',
      minWidth: 140,
      sortable: true,
      accessor: p => p.description,
      render: p => p.description,
    },
    {
      id: 'subject',
      header: 'Cliente/Fornitore',
      minWidth: 120,
      sortable: true,
      accessor: p => p.subjectName,
      render: p => p.subjectName || '—',
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
      id: 'amount',
      header: 'Importo',
      width: 96,
      align: 'right',
      sortable: true,
      accessor: p => (p.amountIn ?? -(p.amountOut ?? 0)),
      render: p => (
        <span style={{ color: paymentFlowType(p) === 'in' ? 'var(--gestionale-link)' : '#a22', fontWeight: 600 }}>
          {formatPaymentAmount(p)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Stato',
      width: 88,
      sortable: true,
      accessor: p => (p.settled ? 'settled' : 'to_settle'),
      render: p => (p.settled ? PAYMENT_STATUS_LABELS.settled : PAYMENT_STATUS_LABELS.to_settle),
    },
    {
      id: 'document',
      header: 'Documento',
      width: 100,
      sortable: false,
      render: p =>
        p.linkedDocumentId || p.linkedDocumentNumber ? (
          <span className="gestionale-datatable__link" title={p.linkedDocumentId}>
            {linkedDocumentLabel(p)}
          </span>
        ) : (
          '—'
        ),
    },
  ]
}
