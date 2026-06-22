import { getFirestore, FieldValue, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { num, str, type EasyfattExtract } from './firebirdClient'
import { AdminBatchWriter, IMPORT_PROGRESS_EVERY } from './batchWriter'
import {
  buildFullNumber,
  docYear,
  fallbackRows,
  isPurchaseType,
  isTruthyFlag,
  mapDocType,
  mergeDocumentLinks,
  parseDocDate,
  pickPrimaryConclusionLink,
  resolveImportedStatus,
  rowsForDocument,
} from './documentMapping'

const db = getFirestore('fixlab')
const DUP_PAGE_SIZE = 400

export type ClientDupIndex = {
  count: number
  vat: Set<string>
  code: Set<string>
  name: Set<string>
  codeToId: Map<string, string>
  nameToId: Map<string, string>
}

export type SupplierDupIndex = {
  count: number
  vat: Set<string>
  code: Set<string>
  name: Set<string>
  codeToId: Map<string, string>
  nameToId: Map<string, string>
}

type ProductDupIndex = {
  count: number
  code: Set<string>
  barcode: Set<string>
}

type DocumentDupIndex = {
  count: number
  keys: Set<string>
}

async function countStudioCollection(collectionName: string, studioId: string): Promise<number> {
  const snap = await db.collection(collectionName).where('studioId', '==', studioId).count().get()
  return snap.data().count
}

async function paginateStudioCollection(
  collectionName: string,
  studioId: string,
  onDoc: (id: string, data: DocumentData) => void,
  orderField = 'createdAt',
): Promise<number> {
  let count = 0
  let lastDoc: QueryDocumentSnapshot | undefined
  for (;;) {
    let q = db
      .collection(collectionName)
      .where('studioId', '==', studioId)
      .orderBy(orderField, 'desc')
      .limit(DUP_PAGE_SIZE)
    if (lastDoc) q = q.startAfter(lastDoc)
    const snap = await q.get()
    if (snap.empty) break
    for (const d of snap.docs) {
      onDoc(d.id, d.data())
      count++
    }
    if (snap.docs.length < DUP_PAGE_SIZE) break
    lastDoc = snap.docs[snap.docs.length - 1]
  }
  return count
}

export async function loadClientDupIndex(studioId: string): Promise<ClientDupIndex> {
  const index: ClientDupIndex = {
    count: 0,
    vat: new Set(),
    code: new Set(),
    name: new Set(),
    codeToId: new Map(),
    nameToId: new Map(),
  }
  index.count = await paginateStudioCollection('clients', studioId, (id, c) => {
    const vat = String(c.vatNumber ?? '').toLowerCase()
    if (vat) index.vat.add(vat)
    if (c.code) {
      index.code.add(String(c.code))
      index.codeToId.set(String(c.code), id)
    }
    const name = String(c.name ?? '').toLowerCase()
    if (name) {
      index.name.add(name)
      index.nameToId.set(name, id)
    }
  })
  return index
}

export async function loadSupplierDupIndex(studioId: string): Promise<SupplierDupIndex> {
  const index: SupplierDupIndex = {
    count: 0,
    vat: new Set(),
    code: new Set(),
    name: new Set(),
    codeToId: new Map(),
    nameToId: new Map(),
  }
  index.count = await paginateStudioCollection('suppliers', studioId, (id, s) => {
    const vat = String(s.vatNumber ?? '').toLowerCase()
    if (vat) index.vat.add(vat)
    if (s.code) {
      index.code.add(String(s.code))
      index.codeToId.set(String(s.code), id)
    }
    const name = String(s.name ?? '').toLowerCase()
    if (name) {
      index.name.add(name)
      index.nameToId.set(name, id)
    }
  })
  return index
}

async function loadProductDupIndex(studioId: string): Promise<ProductDupIndex> {
  const index: ProductDupIndex = { count: 0, code: new Set(), barcode: new Set() }
  index.count = await paginateStudioCollection('products', studioId, (_id, p) => {
    if (p.code) index.code.add(String(p.code))
    const barcode = String(p.barcode ?? '')
    if (barcode) index.barcode.add(barcode)
  })
  return index
}

async function loadDocumentDupIndex(studioId: string): Promise<DocumentDupIndex> {
  const index: DocumentDupIndex = { count: 0, keys: new Set() }
  index.count = await paginateStudioCollection('documents', studioId, (_id, d) => {
    const type = String(d.type ?? '')
    const fullNumber = String(d.fullNumber ?? '')
    const year = Number(d.documentYear)
    if (type && fullNumber && Number.isFinite(year)) {
      index.keys.add(`${type}|${fullNumber}|${year}`)
    }
  })
  return index
}

function registerClient(index: ClientDupIndex, payload: DocumentData, id?: string): void {
  index.count++
  const vat = String(payload.vatNumber ?? '').toLowerCase()
  if (vat) index.vat.add(vat)
  if (payload.code) {
    index.code.add(String(payload.code))
    if (id) index.codeToId.set(String(payload.code), id)
  }
  const name = String(payload.name ?? '').toLowerCase()
  if (name) {
    index.name.add(name)
    if (id) index.nameToId.set(name, id)
  }
}

function registerSupplier(index: SupplierDupIndex, payload: DocumentData, id?: string): void {
  index.count++
  const vat = String(payload.vatNumber ?? '').toLowerCase()
  if (vat) index.vat.add(vat)
  if (payload.code) {
    index.code.add(String(payload.code))
    if (id) index.codeToId.set(String(payload.code), id)
  }
  const name = String(payload.name ?? '').toLowerCase()
  if (name) {
    index.name.add(name)
    if (id) index.nameToId.set(name, id)
  }
}

function registerProduct(index: ProductDupIndex, payload: DocumentData): void {
  index.count++
  if (payload.code) index.code.add(String(payload.code))
  const barcode = String(payload.barcode ?? '')
  if (barcode) index.barcode.add(barcode)
}

function registerDocument(index: DocumentDupIndex, payload: DocumentData): void {
  index.count++
  const type = String(payload.type ?? '')
  const fullNumber = String(payload.fullNumber ?? '')
  const year = Number(payload.documentYear)
  if (type && fullNumber && Number.isFinite(year)) {
    index.keys.add(`${type}|${fullNumber}|${year}`)
  }
}

export type DaneaImportOptions = {
  importClients: boolean
  importSuppliers: boolean
  importProducts: boolean
  importDocuments: boolean
  skipDuplicates: boolean
}

export type DaneaImportResult = {
  imported: { clients: number; suppliers: number; products: number; documents: number }
  skipped: { clients: number; suppliers: number; products: number; documents: number }
  errors: string[]
}

type JobUpdater = (patch: Record<string, unknown>) => Promise<void>

function tokens(...parts: (string | undefined)[]): string[] {
  const set = new Set<string>()
  for (const p of parts) {
    const s = (p ?? '').trim().toLowerCase()
    if (!s) continue
    set.add(s)
    for (const w of s.split(/\s+/)) {
      if (w.length >= 2) set.add(w)
    }
  }
  return [...set]
}

export function resolveSubjectId(
  subjectType: 'client' | 'supplier',
  codAnagr: string,
  subjectName: string,
  clientIndex: ClientDupIndex,
  supplierIndex: SupplierDupIndex,
): string | undefined {
  const code = codAnagr.trim()
  if (code) {
    const byCode = subjectType === 'client' ? clientIndex.codeToId.get(code) : supplierIndex.codeToId.get(code)
    if (byCode) return byCode
  }
  const name = subjectName.trim().toLowerCase()
  if (!name) return undefined
  return subjectType === 'client' ? clientIndex.nameToId.get(name) : supplierIndex.nameToId.get(name)
}

export async function importEasyfattExtract(
  studioId: string,
  data: EasyfattExtract,
  options: DaneaImportOptions,
  updateJob: JobUpdater,
): Promise<DaneaImportResult> {
  const result: DaneaImportResult = {
    imported: { clients: 0, suppliers: 0, products: 0, documents: 0 },
    skipped: { clients: 0, suppliers: 0, products: 0, documents: 0 },
    errors: [],
  }

  const needsDupCheck = options.skipDuplicates
  await updateJob({ status: 'running', message: 'Caricamento indice duplicati esistenti…' })
  const needClientIndex = options.importDocuments || options.importClients
  const needSupplierIndex = options.importDocuments || options.importSuppliers

  const [
    clientIndex,
    supplierIndex,
    productIndex,
    documentIndex,
  ] = await Promise.all([
    needClientIndex
      ? loadClientDupIndex(studioId)
      : Promise.resolve({
          count: 0,
          vat: new Set<string>(),
          code: new Set<string>(),
          name: new Set<string>(),
          codeToId: new Map<string, string>(),
          nameToId: new Map<string, string>(),
        }),
    needSupplierIndex
      ? loadSupplierDupIndex(studioId)
      : Promise.resolve({
          count: 0,
          vat: new Set<string>(),
          code: new Set<string>(),
          name: new Set<string>(),
          codeToId: new Map<string, string>(),
          nameToId: new Map<string, string>(),
        }),
    options.importProducts
      ? needsDupCheck
        ? loadProductDupIndex(studioId)
        : countStudioCollection('products', studioId).then(count => ({
            count,
            code: new Set<string>(),
            barcode: new Set<string>(),
          }))
      : Promise.resolve({ count: 0, code: new Set<string>(), barcode: new Set<string>() }),
    options.importDocuments
      ? needsDupCheck
        ? loadDocumentDupIndex(studioId)
        : countStudioCollection('documents', studioId).then(count => ({
            count,
            keys: new Set<string>(),
          }))
      : Promise.resolve({ count: 0, keys: new Set<string>() }),
  ])

  const dupClient = (vat: string, code: string, name: string) => {
    if (!needsDupCheck) return false
    const v = vat.toLowerCase()
    const n = name.toLowerCase()
    if (v && clientIndex.vat.has(v)) return true
    if (code && clientIndex.code.has(code)) return true
    if (n && clientIndex.name.has(n)) return true
    return false
  }

  const dupSupplier = (vat: string, code: string, name: string) => {
    if (!needsDupCheck) return false
    const v = vat.toLowerCase()
    const n = name.toLowerCase()
    if (v && supplierIndex.vat.has(v)) return true
    if (code && supplierIndex.code.has(code)) return true
    if (n && supplierIndex.name.has(n)) return true
    return false
  }

  const dupProduct = (code: string, barcode: string) => {
    if (!needsDupCheck) return false
    if (code && productIndex.code.has(code)) return true
    if (barcode && productIndex.barcode.has(barcode)) return true
    return false
  }

  const dupDoc = (type: string, fullNumber: string, year: number) =>
    needsDupCheck && documentIndex.keys.has(`${type}|${fullNumber}|${year}`)

  const total =
    (options.importClients ? data.clients.length : 0) +
    (options.importSuppliers ? data.suppliers.length : 0) +
    (options.importProducts ? data.products.length : 0) +
    (options.importDocuments ? data.documents.length : 0)
  let done = 0
  const writer = new AdminBatchWriter()

  const tick = async (phase: string, message: string, force = false) => {
    if (!force && done > 0 && done % IMPORT_PROGRESS_EVERY !== 0 && done !== total) return
    await updateJob({ status: 'running', phase, done, total, message })
  }

  if (options.importClients) {
    for (const row of data.clients) {
      try {
        const code = str(row.CodAnagr)
        const name = str(row.Nome)
        if (!name) {
          result.skipped.clients++
          done++
          continue
        }
        if (options.skipDuplicates && dupClient(str(row.PartitaIva), code, name)) {
          result.skipped.clients++
          done++
          continue
        }
        const payload = {
          studioId,
          code: code || String(clientIndex.count + 1).padStart(4, '0'),
          type: 'client',
          name,
          phone: str(row.Telefono) || undefined,
          cellPhone: str(row.Cell) || undefined,
          fax: str(row.Fax) || undefined,
          email: str(row.Email) || undefined,
          vatNumber: str(row.PartitaIva) || undefined,
          fiscalCode: str(row.CodFiscale) || undefined,
          address: str(row.Indirizzo) || undefined,
          city: str(row.Citta) || undefined,
          province: str(row.Prov) || undefined,
          cap: str(row.Cap) || undefined,
          nation: 'Italia',
          paymentMethod: str(row.Pagamento) || undefined,
          notes: str(row.Note) || undefined,
          searchTokens: tokens(code, name, str(row.PartitaIva), str(row.Email)),
          totalSpent: 0,
          repairsCount: 0,
          createdAt: FieldValue.serverTimestamp(),
        }
        const id = await writer.set('clients', payload)
        registerClient(clientIndex, payload, id)
        result.imported.clients++
      } catch (err) {
        result.errors.push(`Cliente: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      await tick('clients', `Clienti ${done}/${total}`)
    }
    await writer.flush()
  }

  if (options.importSuppliers) {
    for (const row of data.suppliers) {
      try {
        const code = str(row.CodAnagr)
        const name = str(row.Nome)
        if (!name) {
          result.skipped.suppliers++
          done++
          continue
        }
        if (options.skipDuplicates && dupSupplier(str(row.PartitaIva), code, name)) {
          result.skipped.suppliers++
          done++
          continue
        }
        const payload = {
          studioId,
          code: code || String(supplierIndex.count + 1).padStart(4, '0'),
          name,
          phone: str(row.Telefono) || undefined,
          cellPhone: str(row.Cell) || undefined,
          email: str(row.Email) || undefined,
          vatNumber: str(row.PartitaIva) || undefined,
          fiscalCode: str(row.CodFiscale) || undefined,
          address: str(row.Indirizzo) || undefined,
          city: str(row.Citta) || undefined,
          province: str(row.Prov) || undefined,
          cap: str(row.Cap) || undefined,
          paymentMethod: str(row.Pagamento) || undefined,
          notes: str(row.Note) || undefined,
          searchTokens: tokens(code, name, str(row.PartitaIva)),
          createdAt: FieldValue.serverTimestamp(),
        }
        const id = await writer.set('suppliers', payload)
        registerSupplier(supplierIndex, payload, id)
        result.imported.suppliers++
      } catch (err) {
        result.errors.push(`Fornitore: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      await tick('suppliers', `Fornitori ${done}/${total}`)
    }
    await writer.flush()
  }

  if (options.importProducts) {
    for (const row of data.products) {
      try {
        const code = str(row.CodArticolo)
        const name = str(row.Desc)
        if (!name) {
          result.skipped.products++
          done++
          continue
        }
        const barcode = str(row.CodBarre)
        if (options.skipDuplicates && dupProduct(code, barcode)) {
          result.skipped.products++
          done++
          continue
        }
        const price = num(row.PrezzoListino1 ?? row.Prezzo)
        const stock = num(row.Giacenza)
        const payload = {
          studioId,
          code: code || String(productIndex.count + 1).padStart(4, '0'),
          name,
          barcode: barcode || undefined,
          brand: str(row.Produttore) || undefined,
          categoryName: str(row.Categoria) || undefined,
          typology: 'with_stock',
          unitOfMeasure: str(row.UM) || 'pz',
          price,
          prices: { privati: price },
          stock,
          notes: str(row.Note) || undefined,
          searchTokens: tokens(code, name, barcode),
          createdAt: FieldValue.serverTimestamp(),
        }
        await writer.set('products', payload)
        registerProduct(productIndex, payload)
        result.imported.products++
      } catch (err) {
        result.errors.push(`Prodotto: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      await tick('products', `Prodotti ${done}/${total}`)
    }
    await writer.flush()
  }

  if (options.importDocuments) {
    const docLinks = mergeDocumentLinks(data.documentLinks)
    const importedDocs: Array<{
      idDoc: number
      firestoreId: string
      type: string
      date: string
    }> = []
    const docMeta = new Map<number, { date: string; type: string }>()
    for (const row of data.documents) {
      const idDoc = num(row.IDDoc)
      if (idDoc <= 0) continue
      docMeta.set(idDoc, {
        date: parseDocDate(row.DataDoc),
        type: mapDocType(str(row.TipoDocNome), str(row.TipoDoc)),
      })
    }

    for (const row of data.documents) {
      try {
        const idDoc = num(row.IDDoc)
        const typeLabel = str(row.TipoDocNome)
        const type = mapDocType(typeLabel, str(row.TipoDoc))
        const number = Math.round(num(row.NumDoc))
        const date = parseDocDate(row.DataDoc)
        const numeraz = str(row.Numeraz)
        const year = docYear(date)
        const fullNumber = buildFullNumber(number, date, numeraz)
        const subjectName = str(row.SoggettoNome) || '—'
        const subjectType = isPurchaseType(type) ? 'supplier' : 'client'
        if (options.skipDuplicates && dupDoc(type, fullNumber, year)) {
          result.skipped.documents++
          done++
          continue
        }

        const totalDocument = num(row.TotDoc)
        const totalNet = num(row.TotNetto) || totalDocument
        const totalVat = num(row.TotIva)
        let rows = rowsForDocument(idDoc, data.documentRows)
        if (rows.length === 0) {
          rows = fallbackRows(totalDocument, totalNet, totalVat)
        }

        const codAnagr = str(row.CodAnagr)
        const subjectId = resolveSubjectId(subjectType, codAnagr, subjectName, clientIndex, supplierIndex)
        const cancelled = isTruthyFlag(row.Annullato)
        const hasConclusion = idDoc > 0 && Boolean(pickPrimaryConclusionLink(idDoc, docLinks, docMeta))
        const status = resolveImportedStatus(cancelled, hasConclusion)

        const payload = {
          studioId,
          type,
          number,
          numbering: numeraz || undefined,
          fullNumber,
          date,
          documentYear: year,
          subjectType,
          subjectId,
          subjectName,
          rows,
          totalNet,
          totalVat,
          totalDocument,
          paymentMethod: str(row.Pagamento) || undefined,
          status,
          stockCommitted: true,
          internalNotes: 'Importato da Danea Easyfatt (.bef)',
          createdAt: FieldValue.serverTimestamp(),
        }
        const firestoreId = await writer.set('documents', payload)
        registerDocument(documentIndex, payload)
        result.imported.documents++
        if (idDoc > 0) {
          importedDocs.push({ idDoc, firestoreId, type, date })
        }
      } catch (err) {
        result.errors.push(`Documento: ${err instanceof Error ? err.message : 'errore'}`)
      }
      done++
      await tick('documents', `Documenti ${done}/${total}`)
    }
    await writer.flush()

    await updateJob({ status: 'running', phase: 'documents', message: 'Collegamento ordini e conclusioni…' })
    const idDocToFirestore = new Map(importedDocs.map(d => [d.idDoc, d.firestoreId]))
    const typeByIdDoc = new Map(importedDocs.map(d => [d.idDoc, d.type]))

    for (const { idDoc, firestoreId } of importedDocs) {
      const link = pickPrimaryConclusionLink(idDoc, docLinks, docMeta)
      if (!link) continue
      const destFirestoreId = idDocToFirestore.get(link.destIdDoc)
      if (!destFirestoreId) continue
      const destType = typeByIdDoc.get(link.destIdDoc) || docMeta.get(link.destIdDoc)?.type
      const sourceType = typeByIdDoc.get(idDoc) || docMeta.get(idDoc)?.type
      if (!destType || !sourceType) continue

      try {
        await writer.update('documents', firestoreId, {
          linkedDocumentId: destFirestoreId,
          linkedDocumentType: destType,
          status: 'completed',
          updatedAt: FieldValue.serverTimestamp(),
        })
        await writer.update('documents', destFirestoreId, {
          linkedDocumentId: firestoreId,
          linkedDocumentType: sourceType,
          updatedAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        result.errors.push(`Collegamento doc ${idDoc}: ${err instanceof Error ? err.message : 'errore'}`)
      }
    }
    await writer.flush()
  }

  await tick('done', 'Importazione completata.', true)
  return result
}

export function countExtract(data: EasyfattExtract): {
  clients: number
  suppliers: number
  products: number
  documents: number
} {
  return {
    clients: data.clients.length,
    suppliers: data.suppliers.length,
    products: data.products.length,
    documents: data.documents.length,
  }
}

export function isExtractEmpty(data: EasyfattExtract): boolean {
  const c = countExtract(data)
  return c.clients + c.suppliers + c.products + c.documents === 0
}
