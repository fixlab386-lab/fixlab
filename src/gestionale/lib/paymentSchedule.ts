import type { DocRecord, Payment } from '../../types'
import { buildScadenzario } from '../features/vendita-banco/utils'
import { addPayment, getPayments } from '../../lib/firestore'

export function paymentPayloadsFromDocument(
  doc: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Omit<Payment, 'id' | 'createdAt'>[] {
  const method = doc.paymentMethod || doc.paymentTerms
  if (!method || doc.totalDocument <= 0) return []

  const scadenze = buildScadenzario(method, doc.totalDocument, doc.date)
  const isPurchase = doc.subjectType === 'supplier'

  return scadenze.map(s => ({
    studioId: doc.studioId,
    date: s.data,
    resource: isPurchase ? ('banca' as const) : ('cassa_contanti' as const),
    subjectType: doc.subjectType,
    subjectId: doc.subjectId,
    subjectName: doc.subjectName,
    description: `${doc.fullNumber} — ${s.descrizione}`,
    paymentMethod: method,
    amountIn: isPurchase ? undefined : s.importo,
    amountOut: isPurchase ? s.importo : undefined,
    settled: false,
    linkedDocumentType: doc.type,
    linkedDocumentNumber: doc.fullNumber,
  }))
}

export async function emitPaymentsForDocument(
  documentId: string,
  doc: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<number> {
  const rows = paymentPayloadsFromDocument(doc)
  for (const row of rows) {
    await addPayment({ ...row, linkedDocumentId: documentId })
  }
  return rows.length
}

export async function emitPaymentsForDocumentIfNeeded(
  studioId: string,
  documentId: string,
  doc: Omit<DocRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<number> {
  const existing = await getPayments(studioId)
  if (existing.some(p => p.linkedDocumentId === documentId)) return 0
  return emitPaymentsForDocument(documentId, doc)
}
