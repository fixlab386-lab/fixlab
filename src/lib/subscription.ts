import type { PaymentConfig, Subscription } from '../types'

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  iban: '',
  ibanHolder: '',
  bankName: '',
  paypalLink: '',
  satispayId: '',
  whatsappNumber: '',
  supportEmail: 'supporto@miapps.it',
  trialDays: 30,
  monthlyPrice: 19,
  yearlyPrice: 200,
}

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const from = new Date(`${fromYmd}T00:00:00Z`).getTime()
  const to = new Date(`${toYmd}T00:00:00Z`).getTime()
  return Math.round((to - from) / (1000 * 60 * 60 * 24))
}

export function createTrialSubscription(config?: Partial<PaymentConfig>): Subscription {
  const trialDays = config?.trialDays ?? DEFAULT_PAYMENT_CONFIG.trialDays
  const monthlyPrice = config?.monthlyPrice ?? DEFAULT_PAYMENT_CONFIG.monthlyPrice
  const yearlyPrice = config?.yearlyPrice ?? DEFAULT_PAYMENT_CONFIG.yearlyPrice
  const start = todayYmd()
  const expiry = addDaysYmd(start, trialDays)

  return {
    plan: 'trial',
    status: 'trial',
    startDate: start,
    expiryDate: expiry,
    trialEndsAt: expiry,
    paymentFrequency: 'yearly',
    monthlyPrice,
    yearlyPrice,
    autoRenew: false,
  }
}

export type ResolvedSubscriptionState = {
  subscription: Subscription
  daysLeft: number
  isBlocked: boolean
  isExpiring: boolean
  isTrial: boolean
  effectiveStatus: Subscription['status']
}

export function resolveSubscriptionState(
  subscription: Subscription | undefined | null,
  today = todayYmd(),
): ResolvedSubscriptionState | null {
  if (!subscription) return null

  const daysLeft = daysBetween(today, subscription.expiryDate)
  const suspended = subscription.status === 'suspended'
  const expiredByDate = daysLeft < 0

  let effectiveStatus = subscription.status
  if (suspended) {
    effectiveStatus = 'suspended'
  } else if (expiredByDate) {
    effectiveStatus = 'expired'
  } else if (subscription.status === 'trial' || subscription.plan === 'trial') {
    effectiveStatus = 'trial'
  } else if (daysLeft <= 15) {
    effectiveStatus = 'expiring'
  } else {
    effectiveStatus = 'active'
  }

  const isBlocked = suspended || expiredByDate
  const isExpiring = !isBlocked && daysLeft <= 15 && daysLeft >= 0
  const isTrial = effectiveStatus === 'trial'

  return {
    subscription,
    daysLeft,
    isBlocked,
    isExpiring,
    isTrial,
    effectiveStatus,
  }
}

export function subscriptionStatusLabel(status: Subscription['status']): string {
  switch (status) {
    case 'active':
      return 'Attivo'
    case 'trial':
      return 'Trial'
    case 'expiring':
      return 'In scadenza'
    case 'expired':
      return 'Scaduto'
    case 'suspended':
      return 'Sospeso'
    default:
      return status
  }
}

export function subscriptionStatusEmoji(status: Subscription['status']): string {
  switch (status) {
    case 'active':
      return '🟢'
    case 'trial':
      return '🔵'
    case 'expiring':
      return '🟡'
    case 'expired':
      return '🔴'
    case 'suspended':
      return '⚫'
    default:
      return '⚪'
  }
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)
}
