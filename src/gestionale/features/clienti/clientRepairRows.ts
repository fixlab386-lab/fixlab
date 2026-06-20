import type { DocRecord, Repair } from '../../../types'
import { repairStatusLabel, formatRepairDate } from '../riparazioni/utils'

export type ClientRepairRow = {
  id: string
  repair?: Repair
  ordine?: DocRecord
  ticketLabel: string
  ordineLabel: string
  statusLabel: string
  device: string
  problem: string
  total: number
  dateLabel: string
}

function isRepairOrdine(doc: DocRecord): boolean {
  if (doc.type !== 'ordine_cliente') return false
  return Boolean(
    doc.repairId ||
      doc.deviceNotes?.trim() ||
      doc.deviceImei?.trim() ||
      doc.deviceLockCode?.trim() ||
      doc.deviceAccount?.trim(),
  )
}

function deviceFromRepair(repair: Repair): string {
  return [repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ').trim()
}

function deviceFromOrdine(doc: DocRecord): string {
  const fromNotes = doc.deviceNotes?.split('\n')[0]?.trim()
  if (fromNotes) return fromNotes
  return doc.deviceImei?.trim() || '—'
}

function problemFromRepair(repair: Repair): string {
  return repair.problem || repair.diagnosis || repair.notes || '—'
}

function problemFromOrdine(doc: DocRecord): string {
  return doc.deviceNotes?.trim() || doc.internalNotes?.trim() || '—'
}

/** Unisce ticket riparazione e ordini cliente collegati per la scheda cliente. */
export function buildClientRepairRows(repairs: Repair[], documents: DocRecord[]): ClientRepairRow[] {
  const ordini = documents.filter(isRepairOrdine)
  const ordineById = new Map(ordini.map(o => [o.id, o]))
  const usedOrdineIds = new Set<string>()
  const rows: ClientRepairRow[] = []

  for (const repair of repairs) {
    const ordine =
      (repair.linkedDocumentId ? ordineById.get(repair.linkedDocumentId) : undefined) ||
      ordini.find(o => o.repairId === repair.id)
    if (ordine) usedOrdineIds.add(ordine.id)

    rows.push({
      id: repair.id,
      repair,
      ordine,
      ticketLabel: repair.ticketNumber || '—',
      ordineLabel: ordine ? ordine.fullNumber : '—',
      statusLabel: repairStatusLabel(repair.status),
      device: deviceFromRepair(repair) || (ordine ? deviceFromOrdine(ordine) : '—'),
      problem: problemFromRepair(repair),
      total: repair.totalCost || ordine?.totalDocument || 0,
      dateLabel: formatRepairDate(repair.createdAt),
    })
  }

  for (const ordine of ordini) {
    if (usedOrdineIds.has(ordine.id)) continue
    rows.push({
      id: `ordine-${ordine.id}`,
      ordine,
      ticketLabel: '—',
      ordineLabel: ordine.fullNumber,
      statusLabel: ordine.status,
      device: deviceFromOrdine(ordine),
      problem: problemFromOrdine(ordine),
      total: ordine.totalDocument || 0,
      dateLabel: ordine.date.split('-').reverse().join('/'),
    })
  }

  return rows.sort((a, b) => {
    const ta = a.repair?.createdAt
    const da = ta instanceof Date ? ta.getTime() : Date.parse(a.ordine?.date || '') || 0
    const tb = b.repair?.createdAt
    const db = tb instanceof Date ? tb.getTime() : Date.parse(b.ordine?.date || '') || 0
    return db - da
  })
}
