import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../lib/exportExcel'
import type { Supplier } from '../../types'

const SUPPLIER_EXCEL_COLUMNS: ExcelColumn<Supplier>[] = [
  { header: 'Codice', value: row => row.code },
  { header: 'Denominazione', value: row => row.name },
  { header: 'P.IVA', value: row => row.vatNumber ?? '' },
  { header: 'CF', value: row => row.fiscalCode ?? '' },
  { header: 'Telefono', value: row => row.phone ?? '' },
  { header: 'Cell.', value: row => row.cellPhone ?? '' },
  { header: 'Email', value: row => row.email ?? '' },
  { header: 'Indirizzo', value: row => row.address ?? '' },
  { header: 'CAP', value: row => row.cap ?? '' },
  { header: 'Città', value: row => row.city ?? '' },
  { header: 'Prov.', value: row => row.province ?? '' },
]

export function exportSuppliersExcel(rows: Supplier[], archiveName: string): void {
  exportRowsToXlsx({
    rows,
    columns: SUPPLIER_EXCEL_COLUMNS,
    filename: buildExportFilename('fornitori', archiveName),
    sheetName: 'Fornitori',
  })
}
