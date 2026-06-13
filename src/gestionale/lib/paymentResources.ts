import type { Payment, PaymentResource, PaymentResourceType } from '../../types'

export const LEGACY_RESOURCE_LABELS: Record<Payment['resource'], string> = {
  cassa_contanti: 'Cassa contanti',
  banca: 'Banca',
  pos: 'POS',
  altro: 'Altro',
}

export const RESOURCE_TYPE_LABELS: Record<PaymentResourceType, string> = {
  cash: 'Cassa',
  bank: 'Banca',
  card: 'Carta',
}

export function resourceTypeToLegacy(type: PaymentResourceType): Payment['resource'] {
  if (type === 'cash') return 'cassa_contanti'
  if (type === 'card') return 'pos'
  if (type === 'bank') return 'banca'
  return 'altro'
}

export function resolvePaymentResourceName(
  payment: Payment,
  resources: PaymentResource[],
): string {
  if (payment.resourceName) return payment.resourceName
  if (payment.resourceId) {
    const r = resources.find(x => x.id === payment.resourceId)
    if (r) return r.name
  }
  return LEGACY_RESOURCE_LABELS[payment.resource] || payment.resource
}

export function resolvePaymentResourceId(
  payment: Payment,
  resources: PaymentResource[],
): string | undefined {
  if (payment.resourceId) return payment.resourceId
  const legacyType: PaymentResourceType | undefined =
    payment.resource === 'cassa_contanti'
      ? 'cash'
      : payment.resource === 'pos'
        ? 'card'
        : payment.resource === 'banca'
          ? 'bank'
          : undefined
  if (!legacyType) return undefined
  return resources.find(r => r.type === legacyType)?.id
}

export type PaymentSummary = {
  totalIn: number
  totalOut: number
  balance: number
  byResource: { resourceId: string; name: string; in: number; out: number; balance: number }[]
}

export function computePaymentSummary(
  payments: Payment[],
  resources: PaymentResource[],
): PaymentSummary {
  let totalIn = 0
  let totalOut = 0
  const map = new Map<string, { in: number; out: number }>()

  for (const p of payments) {
    const inAmt = p.amountIn || 0
    const outAmt = p.amountOut || 0
    totalIn += inAmt
    totalOut += outAmt

    const rid = resolvePaymentResourceId(p, resources) || '_legacy'
    const prev = map.get(rid) || { in: 0, out: 0 }
    map.set(rid, { in: prev.in + inAmt, out: prev.out + outAmt })
  }

  const byResource = resources.map(r => {
    const sums = map.get(r.id) || { in: 0, out: 0 }
    const initial = r.initialBalance || 0
    return {
      resourceId: r.id,
      name: r.name,
      in: sums.in,
      out: sums.out,
      balance: initial + sums.in - sums.out,
    }
  })

  const legacy = map.get('_legacy')
  if (legacy && (legacy.in > 0 || legacy.out > 0)) {
    byResource.push({
      resourceId: '_legacy',
      name: 'Altro / legacy',
      in: legacy.in,
      out: legacy.out,
      balance: legacy.in - legacy.out,
    })
  }

  return {
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
    byResource: byResource.filter(r => r.in > 0 || r.out > 0 || (resources.find(x => x.id === r.resourceId)?.initialBalance ?? 0) !== 0),
  }
}

export function getDefaultResource(resources: PaymentResource[]): PaymentResource | undefined {
  return resources.find(r => r.isDefault) || resources[0]
}
