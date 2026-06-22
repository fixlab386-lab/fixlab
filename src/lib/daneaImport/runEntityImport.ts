import { classifySpreadsheet } from './detectEntityType'
import { parseDefXmlFile, isDefXmlImportFile } from './defXml'
import { parseSpreadsheetFile } from './spreadsheet'
import { runDaneaImport } from './runImport'
import type { DaneaEntityType, DaneaImportProgress, DaneaImportResult } from './types'

const ENTITY_LABEL: Record<DaneaEntityType, string> = {
  clients: 'clienti',
  suppliers: 'fornitori',
  products: 'prodotti',
  documents: 'documenti',
  unknown: 'record',
  bef: 'record',
}

export function formatEntityImportResult(entity: DaneaEntityType, result: DaneaImportResult): string {
  const label = ENTITY_LABEL[entity]
  const imported =
    entity === 'clients'
      ? result.imported.clients
      : entity === 'suppliers'
        ? result.imported.suppliers
        : entity === 'products'
          ? result.imported.products
          : entity === 'documents'
            ? result.imported.documents
            : 0
  const skipped =
    entity === 'clients'
      ? result.skipped.clients
      : entity === 'suppliers'
        ? result.skipped.suppliers
        : entity === 'products'
          ? result.skipped.products
          : entity === 'documents'
            ? result.skipped.documents
            : 0

  let msg = `Importati ${imported} ${label}`
  if (skipped) msg += ` (${skipped} saltati)`
  if (result.errors.length) msg += `. ${result.errors.length} avvisi.`
  return msg
}

export async function importEntityFromSpreadsheet(
  studioId: string,
  file: File,
  entity: 'clients' | 'suppliers' | 'products' | 'documents',
  onProgress?: (progress: DaneaImportProgress) => void,
): Promise<DaneaImportResult> {
  const options = {
    importClients: entity === 'clients',
    importSuppliers: entity === 'suppliers',
    importProducts: entity === 'products',
    importDocuments: entity === 'documents',
    skipDuplicates: true,
  }

  if (entity === 'documents' && isDefXmlImportFile(file)) {
    const parsedDocs = await parseDefXmlFile(file)
    if (!parsedDocs.length) {
      throw new Error('Nessun documento trovato nel file Easyfatt-Xml (.DefXml).')
    }
    return runDaneaImport(studioId, [], options, onProgress, parsedDocs)
  }

  const parsed = await parseSpreadsheetFile(file)
  if (!parsed.headers.length || !parsed.rows.length) {
    const ext = file.name.trim().toLowerCase()
    if (ext.endsWith('.ods')) {
      throw new Error(
        'Il file .ods non contiene righe leggibili. Apri il file in LibreOffice e verifica che abbia intestazioni e dati, poi salvalo di nuovo come .ods.',
      )
    }
    throw new Error('File vuoto o senza righe dati.')
  }
  const classified = classifySpreadsheet(parsed)

  return runDaneaImport(
    studioId,
    [{ ...classified, entityType: entity, confidence: 10 }],
    options,
    onProgress,
  )
}
