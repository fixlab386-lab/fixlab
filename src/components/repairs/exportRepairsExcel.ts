import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../lib/exportExcel'
import type { Repair } from '../../types'
import { REPAIR_STATUS_LABELS } from '../../gestionale/features/riparazioni/constants'

function formatRepairDate(d: unknown): string {
  if (!d) return ''
  let date: Date
  if (d instanceof Date) date = d
  else if (typeof d === 'object' && d !== null && 'toDate' in d)
    date = (d as { toDate: () => Date }).toDate()
  else if (typeof d === 'object' && d !== null && 'seconds' in d)
    date = new Date((d as { seconds: number }).seconds * 1000)
  else date = new Date(d as string)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const REPAIR_EXCEL_COLUMNS: ExcelColumn<Repair>[] = [
  { header: 'Numero', value: row => row.ticketNumber ?? '' },
  { header: 'Cliente', value: row => row.clientName },
  { header: 'Dispositivo', value: row => `${row.deviceBrand} ${row.deviceModel}`.trim() },
  { header: 'Difetto', value: row => row.problem },
  { header: 'Stato', value: row => REPAIR_STATUS_LABELS[row.status] ?? row.status },
  { header: 'Data', value: row => formatRepairDate(row.acceptanceDate || row.createdAt) },
  { header: 'Totale', value: row => row.totalCost },
]

/** Sola lettura: esporta le riparazioni passate (già filtrate dall'elenco corrente). */
export function exportRepairsExcel(rows: Repair[], archiveName: string): void {
  exportRowsToXlsx({
    rows,
    columns: REPAIR_EXCEL_COLUMNS,
    filename: buildExportFilename('riparazioni', archiveName),
    sheetName: 'Riparazioni',
  })
}

export { REPAIR_EXCEL_COLUMNS }
