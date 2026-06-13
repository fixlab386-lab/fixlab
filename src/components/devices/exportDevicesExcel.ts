import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../lib/exportExcel'
import type { Device } from '../../types'
import { DEVICE_STATUSES } from './constants'

function deviceStatusLabel(status: Device['status']): string {
  return DEVICE_STATUSES.find(s => s.key === status)?.label ?? status
}

const DEVICE_EXCEL_COLUMNS: ExcelColumn<Device>[] = [
  { header: 'Cliente', value: row => row.clientName ?? '' },
  { header: 'Tipo', value: row => row.type },
  { header: 'Marca', value: row => row.brand },
  { header: 'Modello', value: row => row.model },
  { header: 'IMEI', value: row => row.imei ?? '' },
  { header: 'Seriale', value: row => row.serial ?? '' },
  { header: 'Stato', value: row => deviceStatusLabel(row.status) },
]

/** Sola lettura: esporta i dispositivi passati (già filtrati dall'elenco corrente). */
export function exportDevicesExcel(rows: Device[], archiveName: string): void {
  exportRowsToXlsx({
    rows,
    columns: DEVICE_EXCEL_COLUMNS,
    filename: buildExportFilename('dispositivi', archiveName),
    sheetName: 'Dispositivi',
  })
}

export { DEVICE_EXCEL_COLUMNS }
