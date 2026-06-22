import { getNextAnagraficaCode, getNextProductCode } from '../firestore'
import { clienteToClientPayload } from '../../gestionale/features/clienti/types'
import { fornitoreToSupplierPayload } from '../../gestionale/features/fornitori/types'
import { prodottoToProductPayload } from '../../gestionale/features/prodotti/types'
import { classifySpreadsheet, isDaneaArchiveFile } from './detectEntityType'
import { extractFilesFromBef } from './befClientExtract'
import { ensureCategoryPath, loadStudioCategories } from './categoryBootstrap'
import {
  mapRowToCliente,
  mapRowToFornitore,
  mapRowToProdotto,
  pickCode,
  sampleLabelsFromSheet,
} from './mapRows'
import {
  parseDocumentsFromSheet,
  parsedDaneaToDocRecord,
  sampleDocumentLabelsFromSheet,
  type ParsedDaneaDocument,
} from './mapDocuments'
import { documentYearFromDate } from '../../gestionale/features/documenti/utils'
import { parseSpreadsheetFile } from './spreadsheet'
import {
  ClientBatchWriter,
  DocumentBatchWriter,
  IMPORT_PROGRESS_EVERY,
  ProductBatchWriter,
  SupplierBatchWriter,
} from './batchWrite'
import {
  dupClient,
  dupDocument,
  dupProduct,
  dupSupplier,
  loadClientDupIndex,
  loadDocumentDupIndex,
  loadProductDupIndex,
  loadSupplierDupIndex,
  registerClient,
  registerDocument,
  registerProduct,
  registerSupplier,
  type ClientDupIndex,
  type DocumentDupIndex,
  type ProductDupIndex,
  type SupplierDupIndex,
} from './dupIndex'
import type {
  ClassifiedFile,
  DaneaImportOptions,
  DaneaImportPreview,
  DaneaImportProgress,
  DaneaImportResult,
} from './types'

const emptyClientIndex = (): ClientDupIndex => ({
  count: 0,
  vat: new Set(),
  code: new Set(),
  name: new Set(),
  nameToId: new Map(),
})

const emptySupplierIndex = (): SupplierDupIndex => ({
  count: 0,
  vat: new Set(),
  code: new Set(),
  name: new Set(),
  nameToId: new Map(),
})

const emptyProductIndex = (): ProductDupIndex => ({
  count: 0,
  code: new Set(),
  barcode: new Set(),
})

const emptyDocumentIndex = (): DocumentDupIndex => ({
  count: 0,
  keys: new Set(),
})

function findSubjectId(
  name: string,
  subjectType: 'client' | 'supplier',
  clientIndex: ClientDupIndex,
  supplierIndex: SupplierDupIndex,
): string | undefined {
  const n = name.trim().toLowerCase()
  if (!n) return undefined
  return subjectType === 'client' ? clientIndex.nameToId.get(n) : supplierIndex.nameToId.get(n)
}

async function expandArchiveFiles(files: File[]): Promise<{ spreadsheets: File[]; hasArchive: boolean }> {
  const spreadsheets: File[] = []
  let hasArchive = false
  for (const file of files) {
    if (!isDaneaArchiveFile(file)) {
      spreadsheets.push(file)
      continue
    }
    hasArchive = true
    const extracted = await extractFilesFromBef(file)
    spreadsheets.push(...extracted.spreadsheets)
    if (!extracted.spreadsheets.length && isDaneaArchiveFile(file)) {
      /* .bef/.eft senza Excel interno → import cloud */
    }
  }
  return { spreadsheets, hasArchive }
}

export async function buildDaneaImportPreview(files: File[]): Promise<DaneaImportPreview> {
  const classified: ClassifiedFile[] = []
  const { spreadsheets, hasArchive } = await expandArchiveFiles(files)

  for (const file of spreadsheets) {
    if (isDaneaArchiveFile(file)) continue
    const parsed = await parseSpreadsheetFile(file)
    classified.push(classifySpreadsheet(parsed))
  }

  const previewFiles = classified.map(file => {
    let rowCount = file.rows.length
    let sampleLabels: string[] = []
    if (file.entityType === 'documents') {
      rowCount = parseDocumentsFromSheet(file).length
      sampleLabels = sampleDocumentLabelsFromSheet(file)
    } else if (
      file.entityType === 'clients' ||
      file.entityType === 'suppliers' ||
      file.entityType === 'products'
    ) {
      sampleLabels = sampleLabelsFromSheet(file, file.entityType)
    }
    return {
      fileName: file.fileName,
      entityType: file.entityType,
      rowCount,
      sampleLabels,
    }
  })

  return {
    files: previewFiles,
    totals: {
      clients: classified.filter(f => f.entityType === 'clients').reduce((s, f) => s + f.rows.length, 0),
      suppliers: classified.filter(f => f.entityType === 'suppliers').reduce((s, f) => s + f.rows.length, 0),
      products: classified.filter(f => f.entityType === 'products').reduce((s, f) => s + f.rows.length, 0),
      documents: classified
        .filter(f => f.entityType === 'documents')
        .reduce((s, f) => s + parseDocumentsFromSheet(f).length, 0),
    },
    hasBef: hasArchive,
  }
}

export async function parseImportFiles(files: File[]): Promise<ClassifiedFile[]> {
  const result: ClassifiedFile[] = []
  const { spreadsheets } = await expandArchiveFiles(files)
  for (const file of spreadsheets) {
    if (isDaneaArchiveFile(file)) continue
    const parsed = await parseSpreadsheetFile(file)
    result.push(classifySpreadsheet(parsed))
  }
  return result
}

export async function runDaneaImport(
  studioId: string,
  classified: ClassifiedFile[],
  options: DaneaImportOptions,
  onProgress?: (progress: DaneaImportProgress) => void,
  preParsedDocuments?: ParsedDaneaDocument[],
): Promise<DaneaImportResult> {
  const result: DaneaImportResult = {
    imported: { clients: 0, suppliers: 0, products: 0, documents: 0 },
    skipped: { clients: 0, suppliers: 0, products: 0, documents: 0 },
    errors: [],
  }

  const needsDupCheck = options.skipDuplicates
  onProgress?.({ phase: 'index', done: 0, total: 0, message: 'Caricamento indice duplicati esistenti…' })

  const needClientIndex = options.importDocuments || (options.importClients && needsDupCheck)
  const needSupplierIndex = options.importDocuments || (options.importSuppliers && needsDupCheck)

  const [clientIndex, supplierIndex, productIndex, documentIndex] = await Promise.all([
    needClientIndex ? loadClientDupIndex(studioId) : Promise.resolve(emptyClientIndex()),
    needSupplierIndex ? loadSupplierDupIndex(studioId) : Promise.resolve(emptySupplierIndex()),
    options.importProducts && needsDupCheck
      ? loadProductDupIndex(studioId)
      : Promise.resolve(emptyProductIndex()),
    options.importDocuments && needsDupCheck
      ? loadDocumentDupIndex(studioId)
      : Promise.resolve(emptyDocumentIndex()),
  ])

  let categories = await loadStudioCategories(studioId)
  let nextAnagCodeNum = Number(await getNextAnagraficaCode(studioId)) || 1

  const clientFiles = classified.filter(f => f.entityType === 'clients')
  const supplierFiles = classified.filter(f => f.entityType === 'suppliers')
  const productFiles = classified.filter(f => f.entityType === 'products')

  const documentFiles = classified.filter(f => f.entityType === 'documents')
  const parsedDocuments =
    preParsedDocuments ??
    (options.importDocuments ? documentFiles.flatMap(f => parseDocumentsFromSheet(f)) : [])

  const clientRows = options.importClients ? clientFiles.flatMap(f => f.rows.map(row => ({ row, headers: f.headers }))) : []
  const supplierRows = options.importSuppliers
    ? supplierFiles.flatMap(f => f.rows.map(row => ({ row, headers: f.headers })))
    : []
  const productRows = options.importProducts
    ? productFiles.flatMap(f => f.rows.map(row => ({ row, headers: f.headers })))
    : []

  const totalSteps = clientRows.length + supplierRows.length + productRows.length + parsedDocuments.length
  let done = 0

  const tick = (phase: DaneaImportProgress['phase'], message: string, force = false) => {
    if (!force && done > 0 && done % IMPORT_PROGRESS_EVERY !== 0 && done !== totalSteps) return
    onProgress?.({ phase, done, total: totalSteps, message })
  }

  if (options.importClients) {
    const writer = new ClientBatchWriter()
    for (const { row, headers } of clientRows) {
      try {
        const code = pickCode(row, headers, String(nextAnagCodeNum).padStart(4, '0'))
        const cliente = mapRowToCliente(row, headers, code)
        if (!cliente) {
          result.skipped.clients++
          done++
          continue
        }
        if (
          needsDupCheck &&
          dupClient(clientIndex, cliente.partitaIva, cliente.codice, cliente.sedeOperativa.denominazione)
        ) {
          result.skipped.clients++
          done++
          tick('clients', `Clienti: ${done}/${totalSteps}`)
          continue
        }
        const payload = clienteToClientPayload(cliente, studioId)
        const id = await writer.add(payload)
        registerClient(clientIndex, {
          id,
          vatNumber: payload.vatNumber,
          code: payload.code,
          name: payload.name,
        })
        result.imported.clients++
        if (!pickCode(row, headers, '')) nextAnagCodeNum++
      } catch (err) {
        result.errors.push(`Cliente: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      tick('clients', `Clienti: ${done}/${totalSteps}`)
    }
    await writer.flush()
  }

  if (options.importSuppliers) {
    const writer = new SupplierBatchWriter()
    for (const { row, headers } of supplierRows) {
      try {
        const code = pickCode(row, headers, String(nextAnagCodeNum).padStart(4, '0'))
        const fornitore = mapRowToFornitore(row, headers, code)
        if (!fornitore) {
          result.skipped.suppliers++
          done++
          continue
        }
        if (
          needsDupCheck &&
          dupSupplier(
            supplierIndex,
            fornitore.partitaIva,
            fornitore.codice,
            fornitore.sedeOperativa.denominazione,
          )
        ) {
          result.skipped.suppliers++
          done++
          tick('suppliers', `Fornitori: ${done}/${totalSteps}`)
          continue
        }
        const payload = fornitoreToSupplierPayload(fornitore, studioId)
        const id = await writer.add(payload)
        registerSupplier(supplierIndex, {
          id,
          vatNumber: payload.vatNumber,
          code: payload.code,
          name: payload.name,
        })
        result.imported.suppliers++
        if (!pickCode(row, headers, '')) nextAnagCodeNum++
      } catch (err) {
        result.errors.push(`Fornitore: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      tick('suppliers', `Fornitori: ${done}/${totalSteps}`)
    }
    await writer.flush()
  }

  if (options.importProducts) {
    let nextProductCodeNum = Number(await getNextProductCode(studioId)) || 1
    const writer = new ProductBatchWriter()
    for (const { row, headers } of productRows) {
      try {
        const fallbackCode = String(nextProductCodeNum).padStart(4, '0')
        const prodotto = mapRowToProdotto(row, headers, studioId, fallbackCode)
        if (!prodotto) {
          result.skipped.products++
          done++
          continue
        }
        if (
          needsDupCheck &&
          dupProduct(productIndex, prodotto.codProdotto, prodotto.dettagli.codBarre)
        ) {
          result.skipped.products++
          done++
          tick('products', `Prodotti: ${done}/${totalSteps}`)
          continue
        }
        if (prodotto.categoryPath) {
          const resolved = await ensureCategoryPath(studioId, prodotto.categoryPath, categories)
          categories = resolved.categories
          prodotto.categoryId = resolved.categoryId
          prodotto.subcategoryId = resolved.subcategoryId
          prodotto.categoryPath = resolved.categoryPath
          prodotto.categoria = resolved.categoryPath.split(' » ')[0] ?? prodotto.categoria
          prodotto.sottocategoria =
            resolved.categoryPath.split(' » ').slice(-1)[0] ?? prodotto.sottocategoria
        }
        await writer.add(prodottoToProductPayload(prodotto, categories))
        registerProduct(productIndex, {
          code: prodotto.codProdotto,
          barcode: prodotto.dettagli.codBarre,
        })
        result.imported.products++
        if (!pickCode(row, headers, '')) nextProductCodeNum++
      } catch (err) {
        result.errors.push(`Prodotto: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      tick('products', `Prodotti: ${done}/${totalSteps}`)
    }
    await writer.flush()
  }

  if (options.importDocuments) {
    const writer = new DocumentBatchWriter()
    for (const parsed of parsedDocuments) {
      try {
        const year = documentYearFromDate(parsed.date)
        if (needsDupCheck && dupDocument(documentIndex, parsed.type, parsed.fullNumber, year)) {
          result.skipped.documents++
          done++
          tick('documents', `Documenti: ${done}/${totalSteps}`)
          continue
        }
        const subjectId = findSubjectId(parsed.subjectName, parsed.subjectType, clientIndex, supplierIndex)
        const payload = parsedDaneaToDocRecord(parsed, studioId, subjectId)
        if (preParsedDocuments) {
          payload.internalNotes = 'Importato da Danea Easyfatt (.DefXml)'
        }
        await writer.add(payload)
        registerDocument(documentIndex, parsed.type, parsed.fullNumber, year)
        result.imported.documents++
      } catch (err) {
        result.errors.push(`Documento ${parsed.fullNumber}: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      tick('documents', `Documenti: ${done}/${totalSteps}`)
    }
    await writer.flush()
  }

  onProgress?.({ phase: 'done', done: totalSteps, total: totalSteps, message: 'Importazione completata.' })
  return result
}
