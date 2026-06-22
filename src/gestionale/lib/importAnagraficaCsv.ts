import { addClient, addSupplier } from '../../lib/firestore'
import { parseSpreadsheetFile } from '../../lib/daneaImport/spreadsheet'
import { classifySpreadsheet } from '../../lib/daneaImport/detectEntityType'
import { mapRowToCliente, mapRowToFornitore, pickCode } from '../../lib/daneaImport/mapRows'
import { clienteToClientPayload } from '../features/clienti/types'
import { fornitoreToSupplierPayload } from '../features/fornitori/types'

export type ImportAnagraficaResult = { imported: number; skipped: number; error?: string }

export async function importClientsFromCsv(
  fileOrText: File | string,
  studioId: string,
  getNextCode: () => Promise<string>,
): Promise<ImportAnagraficaResult> {
  const parsed =
    typeof fileOrText === 'string'
      ? await (async () => {
          const blob = new Blob([fileOrText], { type: 'text/csv' })
          return parseSpreadsheetFile(new File([blob], 'import.csv', { type: 'text/csv' }))
        })()
      : await parseSpreadsheetFile(fileOrText)

  if (parsed.rows.length < 1) {
    return { imported: 0, skipped: 0, error: 'File vuoto o senza righe dati.' }
  }

  let imported = 0
  let skipped = 0
  let nextCodeNum = Number(await getNextCode()) || 1

  for (const row of parsed.rows) {
    const code = pickCode(row, parsed.headers, String(nextCodeNum).padStart(4, '0'))
    const cliente = mapRowToCliente(row, parsed.headers, code)
    if (!cliente) {
      skipped++
      continue
    }
    await addClient(clienteToClientPayload(cliente, studioId))
    imported++
    if (!pickCode(row, parsed.headers, '')) nextCodeNum++
  }

  return { imported, skipped }
}

export async function importSuppliersFromCsv(
  fileOrText: File | string,
  studioId: string,
  getNextCode: () => Promise<string>,
): Promise<ImportAnagraficaResult> {
  const parsed =
    typeof fileOrText === 'string'
      ? await (async () => {
          const blob = new Blob([fileOrText], { type: 'text/csv' })
          return parseSpreadsheetFile(new File([blob], 'import.csv', { type: 'text/csv' }))
        })()
      : await parseSpreadsheetFile(fileOrText)

  if (parsed.rows.length < 1) {
    return { imported: 0, skipped: 0, error: 'File vuoto o senza righe dati.' }
  }

  let imported = 0
  let skipped = 0
  let nextCodeNum = Number(await getNextCode()) || 1

  for (const row of parsed.rows) {
    const code = pickCode(row, parsed.headers, String(nextCodeNum).padStart(4, '0'))
    const fornitore = mapRowToFornitore(row, parsed.headers, code)
    if (!fornitore) {
      skipped++
      continue
    }
    await addSupplier(fornitoreToSupplierPayload(fornitore, studioId))
    imported++
    if (!pickCode(row, parsed.headers, '')) nextCodeNum++
  }

  return { imported, skipped }
}

/** @deprecated use importClientsFromCsv with File */
export async function importClientsFromCsvText(
  csvText: string,
  studioId: string,
  getNextCode: () => Promise<string>,
): Promise<ImportAnagraficaResult> {
  return importClientsFromCsv(csvText, studioId, getNextCode)
}

export { classifySpreadsheet }
