import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const db = getFirestore('fixlab')
const SUPER_ADMIN_EMAILS = ['studio@gmail.com', 'samuelelazzaro78@gmail.com']

function isSuperAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const normalized = email.toLowerCase()
  return SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === normalized)
}

const TENANT_COLLECTIONS = [
  'categories',
  'products',
  'repairs',
  'clients',
  'suppliers',
  'documents',
  'payments',
  'paymentResources',
  'stockMovements',
  'devices',
  'agents',
  'warehouses',
  'priceLists',
] as const

const COUNT_COLLECTIONS = ['products', 'clients', 'documents', 'repairs', 'suppliers', 'payments'] as const

type SubscriptionPlan = 'trial' | 'starter' | 'pro'
type SubscriptionStatus = 'trial' | 'active' | 'expiring' | 'expired' | 'suspended'
type PaymentMethod = 'bonifico' | 'paypal' | 'satispay' | 'altro'

type SubscriptionData = {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  startDate: string
  expiryDate: string
  trialEndsAt?: string
  lastPaymentDate?: string
  lastPaymentAmount?: number
  paymentMethod?: PaymentMethod
  paymentFrequency: 'monthly' | 'yearly'
  monthlyPrice: number
  yearlyPrice: number
  notes?: string
  autoRenew: boolean
}

function assertSuperAdmin(request: { auth?: { uid: string; token?: Record<string, unknown> } }): string {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }
  if (request.auth.token?.superAdmin === true) {
    return request.auth.uid
  }
  const email = request.auth.token?.email
  if (typeof email === 'string' && isSuperAdminEmail(email)) {
    return request.auth.uid
  }
  throw new HttpsError('permission-denied', 'Solo il Super Admin può eseguire questa operazione.')
}

function formatDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addMonthsYmd(ymd: string, months: number): string {
  const [y, m, day] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, day))
  return formatDateYmd(dt)
}

function resolveOwnerId(studioData: Record<string, unknown>, studioId: string): string {
  const ownerId = studioData.ownerId as string | undefined
  return ownerId || studioId
}

async function deleteCollectionByStudioId(collectionName: string, studioId: string): Promise<number> {
  let deleted = 0
  const col = db.collection(collectionName)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.where('studioId', '==', studioId).limit(400).get()
    if (snap.empty) break
    const batch = db.batch()
    snap.docs.forEach(docSnap => {
      batch.delete(docSnap.ref)
      deleted += 1
    })
    await batch.commit()
  }
  return deleted
}

async function deleteStorageFolder(studioId: string): Promise<number> {
  const bucket = getStorage().bucket()
  const prefix = `studios/${studioId}/`
  const [files] = await bucket.getFiles({ prefix })
  if (files.length === 0) return 0
  await Promise.all(files.map(file => file.delete().catch(() => undefined)))
  return files.length
}

async function deleteMembershipsForStudio(studioId: string): Promise<number> {
  let deleted = 0
  const snap = await db.collection('memberships').where('studioId', '==', studioId).get()
  if (snap.empty) return 0
  const batch = db.batch()
  snap.docs.forEach(docSnap => {
    batch.delete(docSnap.ref)
    deleted += 1
  })
  await batch.commit()
  return deleted
}

async function countByStudio(collectionName: string, studioId: string): Promise<number> {
  const snap = await db.collection(collectionName).where('studioId', '==', studioId).count().get()
  return snap.data().count
}

/** Imposta custom claim superAdmin sull'utente autenticato (email autorizzata). */
export const setSuperAdmin = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const caller = await getAuth().getUser(request.auth.uid)
  if (!isSuperAdminEmail(caller.email) && caller.customClaims?.superAdmin !== true) {
    throw new HttpsError('permission-denied', 'Account non autorizzato come Super Admin.')
  }

  const existing = (caller.customClaims ?? {}) as Record<string, unknown>
  await getAuth().setCustomUserClaims(caller.uid, { ...existing, superAdmin: true })

  return { success: true, uid: caller.uid, email: caller.email ?? '' }
})

/** Genera custom token per impersonare un utente (solo superAdmin). */
export const impersonateUser = onCall({ region: 'europe-west1' }, async request => {
  assertSuperAdmin(request)
  const { targetUid } = request.data as { targetUid?: string }
  if (!targetUid || typeof targetUid !== 'string') {
    throw new HttpsError('invalid-argument', 'targetUid obbligatorio.')
  }

  const targetUser = await getAuth().getUser(targetUid).catch(() => null)
  if (!targetUser) {
    throw new HttpsError('not-found', 'Utente target non trovato.')
  }

  const token = await getAuth().createCustomToken(targetUid, { impersonatedBy: request.auth!.uid })
  return { token, targetUid, targetEmail: targetUser.email ?? '' }
})

/** Elimina studio completo: Firestore tenant + Storage + Auth + memberships. */
export const deleteStudioComplete = onCall({ region: 'europe-west1' }, async request => {
  assertSuperAdmin(request)
  const { studioId, confirmText } = request.data as { studioId?: string; confirmText?: string }
  if (!studioId || typeof studioId !== 'string') {
    throw new HttpsError('invalid-argument', 'studioId obbligatorio.')
  }
  if (confirmText !== 'ELIMINA') {
    throw new HttpsError('failed-precondition', 'Conferma non valida: scrivi ELIMINA.')
  }

  const studioRef = db.collection('studios').doc(studioId)
  const studioSnap = await studioRef.get()
  if (!studioSnap.exists) {
    throw new HttpsError('not-found', 'Studio non trovato.')
  }

  const studioData = studioSnap.data() as Record<string, unknown>
  const ownerUid = resolveOwnerId(studioData, studioId)

  const deletedCounts: Record<string, number> = {}
  for (const name of TENANT_COLLECTIONS) {
    deletedCounts[name] = await deleteCollectionByStudioId(name, studioId)
  }
  deletedCounts.memberships = await deleteMembershipsForStudio(studioId)
  deletedCounts.adminNotes = await deleteCollectionByStudioId('adminNotes', studioId)
  deletedCounts.storageFiles = await deleteStorageFolder(studioId)

  await studioRef.delete()

  const userRef = db.collection('users').doc(ownerUid)
  const userSnap = await userRef.get()
  let authUserDeleted = 0

  if (userSnap.exists) {
    const profile = userSnap.data() as {
      memberships?: Array<{ studioId: string }>
      studioId?: string
    }
    const remainingMemberships = (profile.memberships ?? []).filter(m => m.studioId !== studioId)
    const isPrimaryStudio = profile.studioId === studioId
    const hasOtherStudios = remainingMemberships.length > 0

    if (isPrimaryStudio && !hasOtherStudios) {
      await userRef.delete()
      try {
        await getAuth().deleteUser(ownerUid)
        authUserDeleted = 1
      } catch {
        authUserDeleted = 0
      }
    } else if (hasOtherStudios || !isPrimaryStudio) {
      await userRef.update({ memberships: remainingMemberships })
    } else if (isPrimaryStudio) {
      await userRef.delete()
      try {
        await getAuth().deleteUser(ownerUid)
        authUserDeleted = 1
      } catch {
        authUserDeleted = 0
      }
    }
  } else {
    try {
      await getAuth().deleteUser(ownerUid)
      authUserDeleted = 1
    } catch {
      authUserDeleted = 0
    }
  }

  deletedCounts.authUser = authUserDeleted

  return { success: true, studioId, deletedCounts }
})

export type StudioAdminSummary = {
  id: string
  name: string
  email: string
  ownerId: string
  subscription?: SubscriptionData
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

/** Elenco studi con conteggi aggregati (solo superAdmin). */
export const getAllStudios = onCall({ region: 'europe-west1' }, async request => {
  assertSuperAdmin(request)

  const studiosSnap = await db.collection('studios').get()
  const studios: StudioAdminSummary[] = []

  for (const docSnap of studiosSnap.docs) {
    const data = docSnap.data() as Record<string, unknown>
    const studioId = docSnap.id
    const counts: StudioAdminSummary['counts'] = {
      products: 0,
      clients: 0,
      documents: 0,
      repairs: 0,
      suppliers: 0,
      payments: 0,
    }

    await Promise.all(
      COUNT_COLLECTIONS.map(async name => {
        counts[name] = await countByStudio(name, studioId)
      }),
    )

    const createdAtRaw = data.createdAt as { toDate?: () => Date } | undefined
    const lastLoginRaw = data.lastLoginAt as { toDate?: () => Date } | undefined

    studios.push({
      id: studioId,
      name: String(data.name ?? ''),
      email: String(data.email ?? ''),
      ownerId: resolveOwnerId(data, studioId),
      subscription: data.subscription as SubscriptionData | undefined,
      isActive: data.isActive as boolean | undefined,
      createdAt: createdAtRaw?.toDate?.()?.toISOString?.() ?? null,
      lastLoginAt: lastLoginRaw?.toDate?.()?.toISOString?.() ?? null,
      counts,
    })
  }

  studios.sort((a, b) => a.name.localeCompare(b.name, 'it'))
  return { studios, total: studios.length }
})

/** Estende abbonamento studio (solo superAdmin). */
export const extendSubscription = onCall({ region: 'europe-west1' }, async request => {
  assertSuperAdmin(request)

  const {
    studioId,
    months,
    paymentAmount,
    paymentMethod,
    plan,
    status,
  } = request.data as {
    studioId?: string
    months?: number
    paymentAmount?: number
    paymentMethod?: PaymentMethod
    plan?: SubscriptionPlan
    status?: SubscriptionStatus
  }

  if (!studioId || typeof studioId !== 'string') {
    throw new HttpsError('invalid-argument', 'studioId obbligatorio.')
  }
  if (!months || typeof months !== 'number' || months < 1 || months > 36) {
    throw new HttpsError('invalid-argument', 'months deve essere tra 1 e 36.')
  }

  const studioRef = db.collection('studios').doc(studioId)
  const studioSnap = await studioRef.get()
  if (!studioSnap.exists) {
    throw new HttpsError('not-found', 'Studio non trovato.')
  }

  const data = studioSnap.data() as Record<string, unknown>
  const today = formatDateYmd(new Date())
  const current = (data.subscription as SubscriptionData | undefined) ?? {
    plan: 'starter' as SubscriptionPlan,
    status: 'active' as SubscriptionStatus,
    startDate: today,
    expiryDate: today,
    paymentFrequency: 'yearly' as const,
    monthlyPrice: 19,
    yearlyPrice: 200,
    autoRenew: false,
  }

  const baseDate =
    current.expiryDate && current.expiryDate >= today ? current.expiryDate : today
  const newExpiry = addMonthsYmd(baseDate, months)

  const nextSubscription: SubscriptionData = {
    ...current,
    plan: plan ?? (current.plan === 'trial' ? 'starter' : current.plan),
    status: status ?? 'active',
    expiryDate: newExpiry,
    lastPaymentDate: today,
    lastPaymentAmount: typeof paymentAmount === 'number' ? paymentAmount : current.lastPaymentAmount,
    paymentMethod: paymentMethod ?? current.paymentMethod,
  }

  await studioRef.update({
    subscription: nextSubscription,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await db.collection('subscriptionPayments').add({
    studioId,
    studioName: String(data.name ?? ''),
    amount: paymentAmount ?? 0,
    paymentMethod: paymentMethod ?? 'altro',
    months,
    paidAt: today,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { success: true, subscription: nextSubscription }
})

/** Aggiorna subscription (sospendi, riattiva, cambia piano) — solo superAdmin. */
export const updateStudioSubscription = onCall({ region: 'europe-west1' }, async request => {
  assertSuperAdmin(request)

  const { studioId, patch } = request.data as {
    studioId?: string
    patch?: Partial<SubscriptionData>
  }

  if (!studioId || !patch || typeof patch !== 'object') {
    throw new HttpsError('invalid-argument', 'studioId e patch obbligatori.')
  }

  const studioRef = db.collection('studios').doc(studioId)
  const studioSnap = await studioRef.get()
  if (!studioSnap.exists) {
    throw new HttpsError('not-found', 'Studio non trovato.')
  }

  const data = studioSnap.data() as Record<string, unknown>
  const current = (data.subscription as SubscriptionData | undefined) ?? {
    plan: 'trial' as SubscriptionPlan,
    status: 'trial' as SubscriptionStatus,
    startDate: formatDateYmd(new Date()),
    expiryDate: formatDateYmd(new Date()),
    paymentFrequency: 'yearly' as const,
    monthlyPrice: 19,
    yearlyPrice: 200,
    autoRenew: false,
  }

  const nextSubscription: SubscriptionData = { ...current, ...patch }
  const today = formatDateYmd(new Date())
  const isActive =
    nextSubscription.status !== 'suspended' &&
    nextSubscription.status !== 'expired' &&
    nextSubscription.expiryDate >= today

  await studioRef.update({
    subscription: nextSubscription,
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { success: true, subscription: nextSubscription, isActive }
})
