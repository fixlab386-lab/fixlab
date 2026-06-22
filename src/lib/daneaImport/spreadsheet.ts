import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import type { ParsedSpreadsheet } from './types'

/** Estensioni supportate (validazione dopo la scelta del file). */
export const SPREADSHEET_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.ods'] as const

/**
 * Non usare sul file picker: su Windows/Electron il filtro `accept` spesso
 * impedisce di selezionare i .ods anche se l'estensione è elencata.
 * La validazione avviene dopo la scelta con {@link isSpreadsheetImportFile}.
 */
export const SPREADSHEET_IMPORT_ACCEPT = ''

export function isSpreadsheetFileName(fileName: string): boolean {
  const lower = fileName.trim().toLowerCase()
  return SPREADSHEET_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export function isOdsFileName(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith('.ods')
}

export function isSpreadsheetImportFile(file: File): boolean {
  if (isSpreadsheetFileName(file.name)) return true
  const mime = (file.type || '').toLowerCase()
  return (
    mime.includes('spreadsheet') ||
    mime.includes('ms-excel') ||
    mime === 'text/csv' ||
    mime === 'application/csv'
  )
}

export function spreadsheetImportRejectionMessage(fileName: string): string {
  return `Formato non supportato (${fileName}). Seleziona un file Excel (.xlsx, .xls), CSV o OpenDocument (.ods) esportato da Danea Easyfatt.`
}

function detectSpreadsheetBufferKind(buffer: ArrayBuffer, fileName: string): 'binary' | 'csv' {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.ods')) return 'binary'
  const head = new Uint8Array(buffer.slice(0, 4))
  // ZIP (xlsx, ods) o OLE (xls)
  if (head[0] === 0x50 && head[1] === 0x4b) return 'binary'
  if (head[0] === 0xd0 && head[1] === 0xcf) return 'binary'
  return 'csv'
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value).trim()
}

function parseCsvText(text: string, fileName: string): ParsedSpreadsheet {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) {
    return { fileName, headers: [], rows: [] }
  }
  const sep = lines[0].includes(';') ? ';' : ','
  const rawHeaders = lines[0].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
  const headers = rawHeaders.map(normalizeHeader)
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    for (let h = 0; h < headers.length; h++) {
      if (!headers[h]) continue
      row[headers[h]] = cols[h] ?? ''
    }
    if (Object.values(row).some(v => v.trim())) rows.push(row)
  }
  return { fileName, headers, rows }
}

function parseXlsxBuffer(buffer: ArrayBuffer, fileName: string): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: 'array' })
  return matrixToParsedSpreadsheet(workbook, fileName)
}

function matrixToParsedSpreadsheet(
  workbook: XLSX.WorkBook,
  fileName: string,
): ParsedSpreadsheet {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { fileName, headers: [], rows: [] }
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })
  return matrixToParsedSpreadsheetFromRows(matrix, fileName)
}

function matrixToParsedSpreadsheetFromRows(
  matrix: (string | number | boolean | null)[][],
  fileName: string,
): ParsedSpreadsheet {
  if (matrix.length < 2) return { fileName, headers: [], rows: [] }

  const rawHeaders = (matrix[0] ?? []).map(cellToString)
  const headers = rawHeaders.map(normalizeHeader)
  const rows: Record<string, string>[] = []
  for (let i = 1; i < matrix.length; i++) {
    const cols = matrix[i] ?? []
    const row: Record<string, string> = {}
    for (let h = 0; h < headers.length; h++) {
      if (!headers[h]) continue
      row[headers[h]] = cellToString(cols[h])
    }
    if (Object.values(row).some(v => v.trim())) rows.push(row)
  }
  return { fileName, headers, rows }
}

/** Parser OpenDocument (.ods) — usato per export Danea/LibreOffice se SheetJS non basta. */
async function parseOdsZipBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedSpreadsheet> {
  const zip = await JSZip.loadAsync(buffer)
  const content = await zip.file('content.xml')?.async('text')
  if (!content) return { fileName, headers: [], rows: [] }

  const doc = new DOMParser().parseFromString(content, 'application/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) return { fileName, headers: [], rows: [] }

  const table = doc.getElementsByTagName('table:table')[0]
  if (!table) return { fileName, headers: [], rows: [] }

  const matrix: string[][] = []
  const tableRows = table.getElementsByTagName('table:table-row')
  for (let r = 0; r < tableRows.length; r++) {
    const rowEl = tableRows[r]
    if (!rowEl) continue
    const cells = rowEl.getElementsByTagName('table:table-cell')
    const cols: string[] = []
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c]
      if (!cell) continue
      const repeat = Math.max(1, Number.parseInt(cell.getAttribute('table:number-columns-repeated') || '1', 10) || 1)
      const value = (cell.textContent ?? '').trim()
      for (let n = 0; n < repeat; n++) cols.push(value)
    }
    if (cols.some(v => v.trim())) matrix.push(cols)
  }

  return matrixToParsedSpreadsheetFromRows(matrix, fileName)
}

function hasParsedData(parsed: ParsedSpreadsheet): boolean {
  return parsed.headers.length > 0 && parsed.rows.length > 0
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer()
  const name = file.name.trim()
  const kind = detectSpreadsheetBufferKind(buffer, name)

  if (isOdsFileName(name) || (kind === 'binary' && isOdsZipBuffer(buffer))) {
    try {
      const fromSheetJs = parseXlsxBuffer(buffer, name)
      if (hasParsedData(fromSheetJs)) return fromSheetJs
    } catch {
      /* fallback ODS nativo sotto */
    }
    try {
      const fromOds = await parseOdsZipBuffer(buffer, name)
      if (hasParsedData(fromOds)) return fromOds
    } catch {
      /* prova altre strategie sotto */
    }
  }

  if (kind === 'binary') {
    try {
      const parsed = parseXlsxBuffer(buffer, name)
      if (parsed.headers.length > 0 || parsed.rows.length > 0) return parsed
    } catch {
      /* prova CSV sotto */
    }
  }

  const text = new TextDecoder('utf-8').decode(buffer)
  const csvParsed = parseCsvText(text, name)
  if (csvParsed.headers.length > 0) return csvParsed
  if (kind === 'binary') return parseXlsxBuffer(buffer, name)
  return csvParsed
}

function isOdsZipBuffer(buffer: ArrayBuffer): boolean {
  const head = new Uint8Array(buffer.slice(0, 2))
  if (head[0] !== 0x50 || head[1] !== 0x4b) return false
  return true
}

export function findColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const norm = normalizeHeader(candidate)
    const exact = headers.find(h => h === norm)
    if (exact) return exact
  }
  for (const candidate of candidates) {
    const norm = normalizeHeader(candidate)
    const partial = headers.find(h => h.includes(norm) || norm.includes(h))
    if (partial) return partial
  }
  return null
}

export function getCell(row: Record<string, string>, headers: string[], candidates: string[]): string {
  const key = findColumn(headers, candidates)
  if (!key) return ''
  return (row[key] ?? '').trim()
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}
