import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../lib/exportExcel'
import type { DocRecord } from '../../types'
import { DOCUMENT_STATUS_LABELS } from './constants'
import { documentTypeLabel, formatDocDate } from './utils'

const DOCUMENT_EXCEL_COLUMNS: ExcelColumn<DocRecord>[] = [
  { header: 'Numero', value: row => row.fullNumber },
  { header: 'Data', value: row => formatDocDate(row.date) },
  { header: 'Tipo', value: row => documentTypeLabel(row.type) },
  { header: 'Cliente/Soggetto', value: row => row.subjectName },
  { header: 'Totale', value: row => row.totalDocument },
  { header: 'Stato', value: row => DOCUMENT_STATUS_LABELS[row.status] ?? row.status },
]

/** Sola lettura: esporta i documenti passati (già filtrati dall'elenco corrente). */
export function exportDocumentsExcel(rows: DocRecord[], archiveName: string): void {
  exportRowsToXlsx({
    rows,
    columns: DOCUMENT_EXCEL_COLUMNS,
    filename: buildExportFilename('documenti', archiveName),
    sheetName: 'Documenti',
  })
}

export { DOCUMENT_EXCEL_COLUMNS }
