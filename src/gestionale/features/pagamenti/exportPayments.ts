import type { Payment, PaymentResource } from '../../../types'
import { resolvePaymentResourceName } from '../../lib/paymentResources'
import { PAYMENT_FLOW_LABELS, PAYMENT_STATUS_LABELS } from './constants'
import { formatPaymentAmount, formatPaymentDate, linkedDocumentLabel, paymentFlowType } from './utils'

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportPaymentsCsv(
  rows: Payment[],
  resources: PaymentResource[],
  filename = 'prima-nota-pagamenti.csv',
) {
  const headers = [
    'Data',
    'Tipo',
    'Descrizione',
    'Cliente/Fornitore',
    'Risorsa',
    'Importo',
    'Stato',
    'Documento',
    'Note',
  ]
  const lines = [
    headers.join(','),
    ...rows.map(p =>
      [
        formatPaymentDate(p.date),
        PAYMENT_FLOW_LABELS[paymentFlowType(p)],
        p.description,
        p.subjectName || '',
        resolvePaymentResourceName(p, resources),
        formatPaymentAmount(p),
        p.settled ? PAYMENT_STATUS_LABELS.settled : PAYMENT_STATUS_LABELS.to_settle,
        linkedDocumentLabel(p),
        p.notes || '',
      ]
        .map(v => csvEscape(String(v)))
        .join(','),
    ),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
