import type { DocRecord, DocumentRow } from '../../../types'
import type { ActiveDocumentType } from './constants'
import { INCLUDABLE_FROM } from './constants'
import { calcDocumentRow } from './documentLineUtils'

export type InclusionMode = 'dettagliata' | 'raggruppata' | 'sintetica'

export function getIncludableDocuments(
  all: DocRecord[],
  targetType: ActiveDocumentType,
  subjectId: string,
  subjectType: 'client' | 'supplier',
): DocRecord[] {
  const allowed = INCLUDABLE_FROM[targetType] || []
  if (!subjectId || allowed.length === 0) return []
  return all.filter(
    d =>
      d.subjectId === subjectId &&
      d.subjectType === subjectType &&
      allowed.includes(d.type) &&
      d.status !== 'cancelled' &&
      d.status !== 'draft',
  )
}

export function mergeIncludedRows(
  existing: DocumentRow[],
  source: DocRecord,
  mode: InclusionMode = 'dettagliata',
): DocumentRow[] {
  const base = existing.filter(r => r.description.trim())
  if (mode === 'dettagliata') {
    const copied = source.rows
      .filter(r => r.description.trim())
      .map(r => calcDocumentRow({ ...r, id: crypto.randomUUID() }))
    return [...base, ...copied]
  }

  if (mode === 'sintetica') {
    const total = source.totalDocument || 0
    if (total <= 0) return base
    const row = calcDocumentRow({
      id: crypto.randomUUID(),
      productCode: '',
      description: `Inclusione ${source.fullNumber}`,
      quantity: 1,
      unitOfMeasure: 'pz',
      unitPrice: total,
      discount: 0,
      vatRate: 22,
      totalNet: 0,
      total: 0,
    })
    return [...base, row]
  }

  // raggruppata: una riga per aliquota IVA
  const byVat = new Map<number, number>()
  for (const r of source.rows.filter(x => x.description.trim())) {
    const line = calcDocumentRow(r)
    byVat.set(line.vatRate, (byVat.get(line.vatRate) || 0) + line.total)
  }
  const grouped = [...byVat.entries()].map(([vatRate, gross]) =>
    calcDocumentRow({
      id: crypto.randomUUID(),
      productCode: '',
      description: `Inclusione ${source.fullNumber} (IVA ${vatRate}%)`,
      quantity: 1,
      unitOfMeasure: 'pz',
      unitPrice: gross,
      discount: 0,
      vatRate,
      totalNet: 0,
      total: 0,
    }),
  )
  return [...base, ...grouped]
}

export function applyInclusionSideEffects(
  target: {
    paymentMethod?: string
    paymentNotes?: string
    internalNotes?: string
    shippingDescription?: string
  },
  source: DocRecord,
  opts: { copyPayment?: boolean; copyNotes?: boolean; copyShipping?: boolean },
): typeof target {
  const next = { ...target }
  if (opts.copyPayment) {
    if (source.paymentMethod) next.paymentMethod = source.paymentMethod
    if (source.paymentNotes) next.paymentNotes = source.paymentNotes
  }
  if (opts.copyNotes && source.internalNotes) {
    next.internalNotes = [next.internalNotes, source.internalNotes].filter(Boolean).join('\n')
  }
  if (opts.copyShipping && source.shippingDescription) {
    next.shippingDescription = source.shippingDescription
  }
  return next
}
