import { FieldValue, type DocumentData } from 'firebase-admin/firestore'
import { AdminBatchWriter } from './batchWriter'
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
import { num, str, type EasyfattExtract } from './firebirdClient'
import {
  resolveSubjectId,
  type ClientDupIndex,
  type SupplierDupIndex,
} from './importRunner'

export type RepairDocRecord = {
  id: string
  type: string
  status: string
  date: string
  number: number
  fullNumber: string
  documentYear?: number
  subjectId?: string
  subjectType: string
  subjectName: string
  totalDocument: number
  linkedDocumentId?: string
  linkedDocumentType?: string
  rows: Array<{ description?: string }>
  internalNotes?: string
}

export type DocumentRepairResult = {
  subjectsLinked: number
  documentLinks: number
  statusesUpdated: number
  documentsUpdated: number
  errors: string[]
}

const CONCLUSION_TYPES: Record<string, string[]> = {
  preventivo: ['ordine_cliente', 'ddt', 'rapporto_intervento', 'fattura', 'vendita_banco'],
  ordine_cliente: ['ddt', 'rapporto_intervento', 'fattura', 'fattura_accomp', 'fattura_acconto', 'fattura_proforma', 'vendita_banco'],
  preventivo_fornitore: ['ordine_fornitore', 'arrivo_merce'],
  ordine_fornitore: ['arrivo_merce'],
  ddt: ['fattura', 'fattura_accomp', 'fattura_acconto', 'vendita_banco'],
  rapporto_intervento: ['ddt', 'fattura', 'fattura_accomp'],
  arrivo_merce: ['reg_fattura_fornitore'],
}

function documentMatchKeys(type: string, number: number, date: string, numeraz?: string): string[] {
  const year = docYear(date)
  const keys = new Set<string>()
  keys.add(`${type}|${buildFullNumber(number, date, numeraz)}|${year}`)
  keys.add(`${type}|${number}/${year}|${year}`)
  if (numeraz) keys.add(`${type}|${number}/${numeraz}|${year}`)
  return [...keys]
}

export function buildDocumentIdIndex(docs: RepairDocRecord[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const doc of docs) {
    const year = doc.documentYear ?? docYear(doc.date)
    index.set(`${doc.type}|${doc.fullNumber}|${year}`, doc.id)
    index.set(`${doc.type}|${doc.number}/${year}|${year}`, doc.id)
    if (doc.fullNumber.includes('/')) {
      const suffix = doc.fullNumber.split('/').slice(1).join('/')
      if (suffix && suffix !== String(year)) {
        index.set(`${doc.type}|${doc.number}/${suffix}|${year}`, doc.id)
      }
    }
  }
  return index
}

function docReferencesSource(child: RepairDocRecord, source: RepairDocRecord): boolean {
  const needles = [
    source.fullNumber,
    `Ordine cliente ${source.number}`,
    `ordine cliente ${source.number}`,
    `Ordine fornitore ${source.number}`,
    `Rif. ${source.fullNumber}`,
    `** Rif.`,
    String(source.number),
  ]
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
  const haystack = [
    child.internalNotes ?? '',
    ...(child.rows ?? []).map(r => r.description ?? ''),
  ]
    .join('\n')
    .toLowerCase()
  return needles.some(n => haystack.includes(n))
}

function scoreConclusion(source: RepairDocRecord, candidate: RepairDocRecord): number {
  if (candidate.id === source.id) return -1
  if (candidate.status === 'cancelled') return -1
  if (source.subjectId && candidate.subjectId && source.subjectId !== candidate.subjectId) return -1
  if (source.subjectId && candidate.subjectId && source.subjectId === candidate.subjectId) {
    // ok
  } else if (source.subjectName.trim().toLowerCase() !== candidate.subjectName.trim().toLowerCase()) {
    return -1
  }

  let score = 0
  if (docReferencesSource(candidate, source)) score += 120
  if (candidate.linkedDocumentId === source.id) score += 100
  if (source.linkedDocumentId === candidate.id) score += 100
  if (candidate.date >= source.date) score += 15
  else score -= 20

  const diff = Math.abs((candidate.totalDocument || 0) - (source.totalDocument || 0))
  const base = Math.max(source.totalDocument || 0, 1)
  if (diff < 0.02) score += 35
  else if (diff / base < 0.05) score += 20
  else if (diff / base < 0.15) score += 5

  return score
}

function pickConclusionCandidate(
  source: RepairDocRecord,
  allDocs: RepairDocRecord[],
): RepairDocRecord | undefined {
  const allowed = CONCLUSION_TYPES[source.type]
  if (!allowed?.length) return undefined
  if (source.status === 'cancelled') return undefined

  const scored = allDocs
    .filter(d => allowed.includes(d.type))
    .map(d => ({ doc: d, score: scoreConclusion(source, d) }))
    .filter(x => x.score >= 25)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.doc
}

export async function repairDocumentsInFirestore(
  docs: RepairDocRecord[],
  clientIndex: ClientDupIndex,
  supplierIndex: SupplierDupIndex,
  writer: AdminBatchWriter,
): Promise<DocumentRepairResult> {
  const result: DocumentRepairResult = {
    subjectsLinked: 0,
    documentLinks: 0,
    statusesUpdated: 0,
    documentsUpdated: 0,
    errors: [],
  }

  const byId = new Map(docs.map(d => [d.id, d]))

  for (const doc of docs) {
    if (doc.subjectId || !doc.subjectName?.trim()) continue
    const subjectType = doc.subjectType === 'supplier' ? 'supplier' : 'client'
    const subjectId = resolveSubjectId(subjectType, '', doc.subjectName, clientIndex, supplierIndex)
    if (!subjectId) continue
    try {
      await writer.update('documents', doc.id, {
        subjectId,
        updatedAt: FieldValue.serverTimestamp(),
      })
      doc.subjectId = subjectId
      result.subjectsLinked++
      result.documentsUpdated++
    } catch (err) {
      result.errors.push(`Cliente/fornitore ${doc.fullNumber}: ${err instanceof Error ? err.message : 'errore'}`)
    }
  }

  const linkedPairs = new Set<string>()

  for (const source of docs) {
    if (source.status === 'cancelled') continue

    let dest: RepairDocRecord | undefined
    if (source.linkedDocumentId) {
      dest = byId.get(source.linkedDocumentId)
    }
    if (!dest) {
      dest = pickConclusionCandidate(source, docs)
    }
    if (!dest || dest.id === source.id) continue

    const pairKey = [source.id, dest.id].sort().join('|')
    if (linkedPairs.has(pairKey)) continue
    linkedPairs.add(pairKey)

    try {
      const sourcePatch: DocumentData = {
        linkedDocumentId: dest.id,
        linkedDocumentType: dest.type,
        status: 'completed',
        updatedAt: FieldValue.serverTimestamp(),
      }
      await writer.update('documents', source.id, sourcePatch)
      source.linkedDocumentId = dest.id
      source.linkedDocumentType = dest.type
      source.status = 'completed'
      result.documentLinks++
      result.statusesUpdated++
      result.documentsUpdated++

      if (!dest.linkedDocumentId || dest.linkedDocumentId === source.id) {
        await writer.update('documents', dest.id, {
          linkedDocumentId: source.id,
          linkedDocumentType: source.type,
          updatedAt: FieldValue.serverTimestamp(),
        })
        dest.linkedDocumentId = source.id
        dest.linkedDocumentType = source.type
        result.documentsUpdated++
      }
    } catch (err) {
      result.errors.push(`Collegamento ${source.fullNumber}: ${err instanceof Error ? err.message : 'errore'}`)
    }
  }

  await writer.flush()
  return result
}

export async function repairDocumentsFromExtract(
  data: EasyfattExtract,
  existingDocs: RepairDocRecord[],
  clientIndex: ClientDupIndex,
  supplierIndex: SupplierDupIndex,
  writer: AdminBatchWriter,
): Promise<DocumentRepairResult> {
  const result: DocumentRepairResult = {
    subjectsLinked: 0,
    documentLinks: 0,
    statusesUpdated: 0,
    documentsUpdated: 0,
    errors: [],
  }

  const idIndex = buildDocumentIdIndex(existingDocs)
  const docLinks = mergeDocumentLinks(data.documentLinks)
  const docMeta = new Map<number, { date: string; type: string }>()
  const idDocToFirestore = new Map<number, string>()

  for (const row of data.documents) {
    const idDoc = num(row.IDDoc)
    if (idDoc <= 0) continue
    const type = mapDocType(str(row.TipoDocNome), str(row.TipoDoc))
    const date = parseDocDate(row.DataDoc)
    docMeta.set(idDoc, { date, type })
  }

  for (const row of data.documents) {
    try {
      const idDoc = num(row.IDDoc)
      const type = mapDocType(str(row.TipoDocNome), str(row.TipoDoc))
      const number = Math.round(num(row.NumDoc))
      const date = parseDocDate(row.DataDoc)
      const numeraz = str(row.Numeraz)
      const keys = documentMatchKeys(type, number, date, numeraz)
      let firestoreId: string | undefined
      for (const key of keys) {
        firestoreId = idIndex.get(key)
        if (firestoreId) break
      }
      if (!firestoreId) continue

      const subjectType = isPurchaseType(type) ? 'supplier' : 'client'
      const subjectName = str(row.SoggettoNome) || '—'
      const codAnagr = str(row.CodAnagr)
      const subjectId = resolveSubjectId(subjectType, codAnagr, subjectName, clientIndex, supplierIndex)

      const totalDocument = num(row.TotDoc)
      const totalNet = num(row.TotNetto) || totalDocument
      const totalVat = num(row.TotIva)
      let rows = rowsForDocument(idDoc, data.documentRows)
      if (rows.length === 0) rows = fallbackRows(totalDocument, totalNet, totalVat)

      const cancelled = isTruthyFlag(row.Annullato)
      const hasConclusion = idDoc > 0 && Boolean(pickPrimaryConclusionLink(idDoc, docLinks, docMeta))
      const status = resolveImportedStatus(cancelled, hasConclusion)

      const patch: DocumentData = {
        rows,
        totalNet,
        totalVat,
        totalDocument,
        status,
        fullNumber: buildFullNumber(number, date, numeraz),
        numbering: numeraz || undefined,
        updatedAt: FieldValue.serverTimestamp(),
      }
      if (subjectId) patch.subjectId = subjectId

      await writer.update('documents', firestoreId, patch)
      result.documentsUpdated++
      if (subjectId) result.subjectsLinked++
      if (status === 'completed') result.statusesUpdated++

      if (idDoc > 0) idDocToFirestore.set(idDoc, firestoreId)
    } catch (err) {
      result.errors.push(`Aggiornamento: ${err instanceof Error ? err.message : 'errore'}`)
    }
  }

  await writer.flush()

  for (const row of data.documents) {
    const idDoc = num(row.IDDoc)
    if (idDoc <= 0) continue
    const firestoreId = idDocToFirestore.get(idDoc)
    if (!firestoreId) continue
    const link = pickPrimaryConclusionLink(idDoc, docLinks, docMeta)
    if (!link) continue
    const destFirestoreId = idDocToFirestore.get(link.destIdDoc)
    if (!destFirestoreId) continue
    const destType = docMeta.get(link.destIdDoc)?.type
    const sourceType = docMeta.get(idDoc)?.type
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
      result.documentLinks++
      result.statusesUpdated++
      result.documentsUpdated += 2
    } catch (err) {
      result.errors.push(`Link ${idDoc}: ${err instanceof Error ? err.message : 'errore'}`)
    }
  }

  await writer.flush()
  return result
}

export function mapFirestoreDoc(id: string, data: DocumentData): RepairDocRecord {
  return {
    id,
    type: String(data.type ?? ''),
    status: String(data.status ?? 'confirmed'),
    date: String(data.date ?? ''),
    number: Number(data.number ?? 0),
    fullNumber: String(data.fullNumber ?? ''),
    documentYear: Number(data.documentYear) || undefined,
    subjectId: data.subjectId ? String(data.subjectId) : undefined,
    subjectType: data.subjectType === 'supplier' ? 'supplier' : 'client',
    subjectName: String(data.subjectName ?? ''),
    totalDocument: Number(data.totalDocument ?? 0),
    linkedDocumentId: data.linkedDocumentId ? String(data.linkedDocumentId) : undefined,
    linkedDocumentType: data.linkedDocumentType ? String(data.linkedDocumentType) : undefined,
    rows: Array.isArray(data.rows) ? (data.rows as Array<{ description?: string }>) : [],
    internalNotes: data.internalNotes ? String(data.internalNotes) : undefined,
  }
}
