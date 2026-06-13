import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../../lib/exportExcel'
import { resolvePaymentResourceName } from '../../lib/paymentResources'
import type { Payment, PaymentResource } from '../../../types'
import { PAYMENT_STATUS_LABELS } from './constants'
import { formatPaymentDate, linkedDocumentLabel, paymentAmount } from './utils'

function paymentExcelColumns(resources: PaymentResource[]): ExcelColumn<Payment>[] {
  return [
    { header: 'Data', value: row => formatPaymentDate(row.date) },
    { header: 'Soggetto', value: row => row.subjectName ?? '' },
    { header: 'Importo', value: row => paymentAmount(row) },
    { header: 'Risorsa', value: row => resolvePaymentResourceName(row, resources) },
    { header: 'Metodo', value: row => row.paymentMethod ?? '' },
    { header: 'Documento', value: row => linkedDocumentLabel(row) },
    { header: 'Stato', value: row => (row.settled ? PAYMENT_STATUS_LABELS.settled : PAYMENT_STATUS_LABELS.to_settle) },
    { header: 'Descrizione', value: row => row.description },
  ]
}

/** Sola lettura: esporta i pagamenti passati (già filtrati dall'elenco corrente). */
export function exportPaymentsExcel(
  rows: Payment[],
  resources: PaymentResource[],
  archiveName: string,
): void {
  exportRowsToXlsx({
    rows,
    columns: paymentExcelColumns(resources),
    filename: buildExportFilename('pagamenti', archiveName),
    sheetName: 'Pagamenti',
  })
}
