import { buildExportFilename, exportRowsToXlsx, type ExcelColumn } from '../../lib/exportExcel'
import type { Product } from '../../types'
import { DEFAULT_VAT_PERCENT } from './constants'

const PRODUCT_EXCEL_COLUMNS: ExcelColumn<Product>[] = [
  { header: 'Codice', value: row => row.code },
  { header: 'Barcode', value: row => row.barcode ?? '' },
  { header: 'Descrizione', value: row => row.name },
  { header: 'Categoria', value: row => row.categoryName },
  { header: 'Marca', value: row => row.brand },
  { header: 'Modello', value: row => row.model },
  { header: 'Prezzo', value: row => row.prices?.privati ?? row.price },
  { header: 'Giacenza', value: row => row.stock },
  { header: 'IVA %', value: () => DEFAULT_VAT_PERCENT },
]

export function exportProductsExcel(rows: Product[], archiveName: string): void {
  exportRowsToXlsx({
    rows,
    columns: PRODUCT_EXCEL_COLUMNS,
    filename: buildExportFilename('prodotti', archiveName),
    sheetName: 'Prodotti',
  })
}
