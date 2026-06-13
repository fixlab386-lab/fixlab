import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../lib/exportExcel'
import type { Client } from '../../types'

const CLIENT_EXCEL_COLUMNS: ExcelColumn<Client>[] = [
  { header: 'Denominazione', value: row => row.name },
  { header: 'Codice', value: row => row.code ?? '' },
  { header: 'Telefono', value: row => row.phone },
  { header: 'Cell.', value: row => row.cellPhone ?? '' },
  { header: 'Email', value: row => row.email ?? '' },
  { header: 'P.IVA', value: row => row.vatNumber ?? '' },
  { header: 'CF', value: row => row.fiscalCode ?? '' },
  { header: 'Indirizzo', value: row => row.address ?? '' },
  { header: 'CAP', value: row => row.cap ?? '' },
  { header: 'Città', value: row => row.city ?? '' },
  { header: 'Prov.', value: row => row.province ?? '' },
]

/** Sola lettura: esporta i clienti passati (già filtrati dall'elenco corrente). */
export function exportClientsExcel(rows: Client[], archiveName: string): void {
  exportRowsToXlsx({
    rows,
    columns: CLIENT_EXCEL_COLUMNS,
    filename: buildExportFilename('clienti', archiveName),
    sheetName: 'Clienti',
  })
}

export { CLIENT_EXCEL_COLUMNS }
