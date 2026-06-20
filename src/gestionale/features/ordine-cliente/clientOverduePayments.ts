import type { Payment } from '../../../types'
import { formatDataIt } from '../vendita-banco/utils'

export type OverduePaymentRow = {
  id: string
  amount: number
  dueDate: string
  dueDateLabel: string
  description: string
}

const HIDE_ARRETRATI_KEY = 'fixlab-hide-arretrati-cliente'

export function isArretratiWarningHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_ARRETRATI_KEY) === '1'
  } catch {
    return false
  }
}

export function setArretratiWarningHidden(hidden: boolean): void {
  try {
    if (hidden) localStorage.setItem(HIDE_ARRETRATI_KEY, '1')
    else localStorage.removeItem(HIDE_ARRETRATI_KEY)
  } catch {
    /* ignore */
  }
}

export function getClientOverduePayments(payments: Payment[], clientId: string): OverduePaymentRow[] {
  const today = new Date().toISOString().slice(0, 10)
  return payments
    .filter(p => p.subjectId === clientId && !p.settled && p.date < today)
    .map(p => {
      const amount = (p.amountIn ?? 0) - (p.amountOut ?? 0)
      const docRef = p.linkedDocumentNumber ? ` — ${p.linkedDocumentNumber}` : ''
      return {
        id: p.id,
        amount,
        dueDate: p.date,
        dueDateLabel: formatDataIt(p.date),
        description: `${p.description || 'Pagamento'}${docRef}`,
      }
    })
    .filter(p => Math.abs(p.amount) > 0.001)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function overduePaymentsTotal(rows: OverduePaymentRow[]): number {
  return Math.round(rows.reduce((acc, r) => acc + r.amount, 0) * 100) / 100
}
