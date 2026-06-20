import type { Payment, PaymentExpenseLine } from '../../../types'
import type { PaymentResource } from '../../../types'
import { resourceTypeToLegacy } from '../../lib/paymentResources'
import { paymentFlowType } from './utils'

export type PagamentoDettaglioTabId = 'righe' | 'pagamento' | 'note' | 'indirizzi' | 'opzioni'

export const PAGAMENTO_DETTAGLIO_TABS: { id: PagamentoDettaglioTabId; label: string }[] = [
  { id: 'righe', label: 'Righe registrazione' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'note', label: 'Note' },
  { id: 'indirizzi', label: 'Indirizzi' },
  { id: 'opzioni', label: 'Opzioni' },
]

export const CONTI_SPESE = [
  { codice: '52', label: 'Valori Bollati' },
  { codice: '60', label: 'Acquisti' },
  { codice: '62', label: 'Spese varie' },
  { codice: '63', label: 'Servizi' },
  { codice: '68', label: 'Altre spese' },
] as const

export const SPESE_DESCRIZIONI_PREDEFINITE = [
  'Acquisto valori bollati / francobolli',
  'Spese postali',
  'Spese bancarie',
  'Materiali di consumo',
  'Altro…',
] as const

export interface PagamentoDettaglioState {
  paymentId: string
  subjectType?: 'client' | 'supplier'
  subjectId?: string
  subjectName?: string
  registrationDate: string
  protocolNumber: number
  numbering: string
  expenseDescription: string
  documentProtected: boolean
  internalComment: string
  expenseLines: PaymentExpenseLine[]
  dueDate: string
  settledDate: string
  resourceId: string
  paymentMethod: string
  amountIn: number
  amountOut: number
  settled: boolean
  linkedDocumentId?: string
  linkedDocumentNumber?: string
  notes?: string
  intestatarioIndirizzo: string
  intestatarioCap: string
  intestatarioCitta: string
  intestatarioProv: string
}

export function pagamentoDettaglioTitle(p: Payment): string {
  if (paymentFlowType(p) === 'out') return 'Reg. spese fuori campo Iva'
  return 'Pagamento'
}

export function defaultExpenseLine(p: Payment): PaymentExpenseLine {
  const conto = CONTI_SPESE[0]
  return {
    id: crypto.randomUUID(),
    importoNetto: p.amountOut || p.amountIn || 0,
    contoCodice: conto.codice,
    contoDescrizione: conto.label,
    descrizione: p.description || '',
  }
}

export function paymentToDettaglioState(p: Payment, resources: PaymentResource[]): PagamentoDettaglioState {
  const resourceId =
    p.resourceId || resources.find(r => r.name === p.resourceName)?.id || resources[0]?.id || ''
  const lines =
    p.expenseLines && p.expenseLines.length > 0 ? p.expenseLines.map(l => ({ ...l })) : [defaultExpenseLine(p)]

  return {
    paymentId: p.id,
    subjectType: p.subjectType,
    subjectId: p.subjectId,
    subjectName: p.subjectName,
    registrationDate: p.registrationDate || p.settledDate || p.date,
    protocolNumber: p.protocolNumber ?? 1,
    numbering: p.paymentNumbering || '',
    expenseDescription: p.expenseDescription || p.description || '',
    documentProtected: p.documentProtected ?? p.settled,
    internalComment: p.internalComment || p.notes || '',
    expenseLines: lines,
    dueDate: p.date,
    settledDate: p.settledDate || p.date,
    resourceId,
    paymentMethod: p.paymentMethod || '',
    amountIn: p.amountIn || 0,
    amountOut: p.amountOut || 0,
    settled: p.settled,
    linkedDocumentId: p.linkedDocumentId,
    linkedDocumentNumber: p.linkedDocumentNumber,
    notes: p.notes,
    intestatarioIndirizzo: '',
    intestatarioCap: '',
    intestatarioCitta: '',
    intestatarioProv: '',
  }
}

export function dettaglioTotale(state: PagamentoDettaglioState): number {
  return Math.round(state.expenseLines.reduce((s, l) => s + (l.importoNetto || 0), 0) * 100) / 100
}

export function buildPaymentUpdateFromDettaglio(
  state: PagamentoDettaglioState,
  studioId: string,
  resource: PaymentResource,
): Omit<Payment, 'id' | 'createdAt'> {
  const totale = dettaglioTotale(state)
  const isOut = state.amountOut > 0 || totale > 0
  const primaryDesc =
    state.expenseLines.find(l => l.descrizione.trim())?.descrizione ||
    state.expenseDescription ||
    'Movimento'

  return {
    studioId,
    date: state.dueDate,
    resource: resourceTypeToLegacy(resource.type),
    resourceId: resource.id,
    resourceName: resource.name,
    subjectType: state.subjectType,
    subjectId: state.subjectId || undefined,
    subjectName: state.subjectName || undefined,
    description: primaryDesc,
    paymentMethod: state.paymentMethod || resource.name,
    amountIn: !isOut && state.amountIn > 0 ? state.amountIn : isOut ? undefined : totale || undefined,
    amountOut: isOut ? totale || state.amountOut : undefined,
    settled: state.settled,
    settledDate: state.settled ? state.settledDate || state.dueDate : undefined,
    linkedDocumentId: state.linkedDocumentId || undefined,
    linkedDocumentNumber: state.linkedDocumentNumber || undefined,
    notes: state.notes || undefined,
    registrationDate: state.registrationDate,
    protocolNumber: state.protocolNumber,
    paymentNumbering: state.numbering || undefined,
    expenseDescription: state.expenseDescription || undefined,
    internalComment: state.internalComment || undefined,
    documentProtected: state.documentProtected,
    expenseLines: state.expenseLines,
  }
}
