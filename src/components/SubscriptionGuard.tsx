import { useEffect, useState, type ReactNode } from 'react'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { hasAdminAccess } from '../lib/adminAccess'
import { useActiveStudio } from '../hooks/useActiveStudio'
import { usePaymentConfig } from '../hooks/usePaymentConfig'
import ExpiredScreen from './ExpiredScreen'
import SubscriptionBanner, { isSubscriptionBannerDismissed } from './SubscriptionBanner'
import TrialBanner from './TrialBanner'
import ImpersonationBanner from './ImpersonationBanner'
import {
  createTrialSubscription,
  resolveSubscriptionState,
  todayYmd,
} from '../lib/subscription'
import type { Subscription } from '../types'

type Props = {
  children: ReactNode
}

export default function SubscriptionGuard({ children }: Props) {
  const { isSuperAdmin, isImpersonating, loading: authLoading, user } = useAuth()
  const { activeStudioId, archives, loading: studioLoading } = useActiveStudio()
  const { config: paymentConfig, loading: configLoading } = usePaymentConfig()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [studioName, setStudioName] = useState('')
  const [studioLoadingLocal, setStudioLoadingLocal] = useState(true)
  const [bannerDismissed, setBannerDismissed] = useState(isSubscriptionBannerDismissed())
  const [trialInitDone, setTrialInitDone] = useState(false)

  const studioId = activeStudioId ?? ''

  useEffect(() => {
    if (!studioId || authLoading) {
      setStudioLoadingLocal(false)
      return
    }

    setStudioLoadingLocal(true)
    const unsub = onSnapshot(
      doc(db, 'studios', studioId),
      snap => {
        if (!snap.exists()) {
          setSubscription(null)
          setStudioName('')
          setStudioLoadingLocal(false)
          return
        }
        const data = snap.data()
        setStudioName(String(data.name ?? ''))
        setSubscription((data.subscription as Subscription | undefined) ?? null)
        setStudioLoadingLocal(false)
      },
      () => {
        setStudioLoadingLocal(false)
      },
    )
    return unsub
  }, [studioId, authLoading])

  useEffect(() => {
    if (isSuperAdmin || !studioId || trialInitDone || configLoading || studioLoadingLocal) return
    if (subscription) {
      setTrialInitDone(true)
      return
    }

    const initTrial = async () => {
      const trial = createTrialSubscription(paymentConfig)
      await updateDoc(doc(db, 'studios', studioId), {
        subscription: trial,
        isActive: true,
        lastLoginAt: serverTimestamp(),
      })
      setTrialInitDone(true)
    }

    void initTrial().catch(err => {
      console.warn('FIXLab: init trial subscription non riuscita.', err)
      setTrialInitDone(true)
    })
  }, [
    isSuperAdmin,
    studioId,
    subscription,
    trialInitDone,
    configLoading,
    studioLoadingLocal,
    paymentConfig,
  ])

  useEffect(() => {
    if (!studioId || isSuperAdmin) return
    void updateDoc(doc(db, 'studios', studioId), { lastLoginAt: serverTimestamp() }).catch(() => {
      /* best effort */
    })
  }, [studioId, isSuperAdmin])

  if (authLoading || studioLoading || studioLoadingLocal) {
    return <>{children}</>
  }

  const isAdminUser = hasAdminAccess({ email: user?.email, isSuperAdminClaim: isSuperAdmin })

  if (isAdminUser && !isImpersonating) {
    return <>{children}</>
  }

  if (isImpersonating) {
    return (
      <>
        <ImpersonationBanner studioName={studioName || archives.find(a => a.studioId === studioId)?.name} />
        {children}
      </>
    )
  }

  const state = resolveSubscriptionState(subscription, todayYmd())

  if (state?.isBlocked) {
    return <ExpiredScreen subscription={state.subscription} studioName={studioName} />
  }

  const showExpiringBanner = state?.isExpiring && !bannerDismissed
  const showTrialBanner = state?.isTrial && state.daysLeft >= 0

  return (
    <>
      {showExpiringBanner && (
        <SubscriptionBanner
          daysLeft={state!.daysLeft}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      {showTrialBanner && !showExpiringBanner && (
        <TrialBanner daysLeft={state!.daysLeft} />
      )}
      {children}
    </>
  )
}
