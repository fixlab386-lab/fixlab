import { functions } from '../firebase'
import { callCallableWithAuth } from './cloudFunctions'
import type { Subscription } from '../types'

export type StudioAdminSummary = {
  id: string
  name: string
  email: string
  ownerId: string
  subscription?: Subscription
  isActive?: boolean
  createdAt?: string | null
  lastLoginAt?: string | null
  counts: {
    products: number
    clients: number
    documents: number
    repairs: number
    suppliers: number
    payments: number
  }
}

export async function fetchAllStudios(): Promise<StudioAdminSummary[]> {
  const res = await callCallableWithAuth<Record<string, never>, { studios: StudioAdminSummary[] }>(
    functions,
    'getAllStudios',
    {},
  )
  return res.studios
}

export async function callExtendSubscription(params: {
  studioId: string
  months: number
  paymentAmount?: number
  paymentMethod?: Subscription['paymentMethod']
  plan?: Subscription['plan']
  status?: Subscription['status']
}): Promise<Subscription> {
  const res = await callCallableWithAuth<typeof params, { subscription: Subscription }>(
    functions,
    'extendSubscription',
    params,
  )
  return res.subscription
}

export async function callUpdateStudioSubscription(
  studioId: string,
  patch: Partial<Subscription>,
): Promise<Subscription> {
  const res = await callCallableWithAuth<
    { studioId: string; patch: Partial<Subscription> },
    { subscription: Subscription }
  >(functions, 'updateStudioSubscription', { studioId, patch })
  return res.subscription
}

export async function callImpersonateUser(targetUid: string): Promise<{ token: string; targetEmail: string }> {
  return callCallableWithAuth<{ targetUid: string }, { token: string; targetEmail: string }>(
    functions,
    'impersonateUser',
    { targetUid },
  )
}

export async function callDeleteStudioComplete(
  studioId: string,
): Promise<{ deletedCounts: Record<string, number> }> {
  return callCallableWithAuth<
    { studioId: string; confirmText: string },
    { deletedCounts: Record<string, number> }
  >(functions, 'deleteStudioComplete', { studioId, confirmText: 'ELIMINA' })
}

export async function callSetSuperAdmin(): Promise<void> {
  await callCallableWithAuth(functions, 'setSuperAdmin', {})
}
