import * as XLSX from 'xlsx'

export type ExcelColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

/** Segmento sicuro per nomi file (archivio, entità, ecc.). */
export function sanitizeFilenameSegment(value: string): string {
  const trimmed = value.trim() || 'export'
  return trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
}

/** Pattern: `{prefix}_{etichetta}_{YYYY-MM-DD}.xlsx` */
export function buildExportFilename(prefix: string, label: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  return `${sanitizeFilenameSegment(prefix)}_${sanitizeFilenameSegment(label)}_${day}.xlsx`
}

function cellValue(value: string | number | boolean | null | undefined): string | number | boolean {
  if (value === null || value === undefined) return ''
  return value
}

/**
 * Esporta righe in .xlsx e avvia il download nel browser.
 * Riutilizzabile: passa `columns` specifiche per ogni lista.
 */
export function exportRowsToXlsx<T>(options: {
  rows: T[]
  columns: ExcelColumn<T>[]
  filename: string
  sheetName?: string
}): void {
  const { rows, columns, filename, sheetName = 'Dati' } = options
  const matrix = [
    columns.map(column => column.header),
    ...rows.map(row => columns.map(column => cellValue(column.value(row)))),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(matrix)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
