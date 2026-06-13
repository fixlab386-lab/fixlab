import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { useOnboardingContext } from '../../contexts/OnboardingContext'
import { shouldShowOnboardingWizard } from '../../lib/studioOnboarding'
import OnboardingWizard from './OnboardingWizard'

const SESSION_DISMISS_PREFIX = 'fixlab-onboarding-dismissed:'

function sessionDismissKey(studioId: string) {
  return `${SESSION_DISMISS_PREFIX}${studioId}`
}

export default function OnboardingGate() {
  const { userProfile, loading: authLoading } = useAuth()
  const { activeStudioId, loading: studioLoading } = useActiveStudio()
  const { forceOpen, clearForceOpen } = useOnboardingContext()
  const studioId = activeStudioId ?? ''

  const [studioData, setStudioData] = useState<Record<string, unknown> | undefined>(undefined)
  const [loadingStudio, setLoadingStudio] = useState(true)
  const [sessionDismissed, setSessionDismissed] = useState(false)

  useEffect(() => {
    if (!studioId) {
      setStudioData(undefined)
      setLoadingStudio(false)
      return
    }

    setSessionDismissed(sessionStorage.getItem(sessionDismissKey(studioId)) === '1')
    setLoadingStudio(true)

    getDoc(doc(db, 'studios', studioId))
      .then(snap => setStudioData(snap.exists() ? snap.data() : undefined))
      .finally(() => setLoadingStudio(false))
  }, [studioId])

  const handleSkip = () => {
    if (studioId) {
      sessionStorage.setItem(sessionDismissKey(studioId), '1')
    }
    setSessionDismissed(true)
    clearForceOpen()
  }

  const handleComplete = () => {
    if (studioId) {
      sessionStorage.removeItem(sessionDismissKey(studioId))
    }
    clearForceOpen()
    setStudioData(prev => ({ ...prev, onboardingCompleted: true }))
  }

  if (authLoading || studioLoading || loadingStudio || !studioId) return null

  const shouldShow = forceOpen || (!sessionDismissed && shouldShowOnboardingWizard(studioData))
  if (!shouldShow) return null

  return (
    <OnboardingWizard
      studioId={studioId}
      studioData={studioData}
      fallbackEmail={userProfile?.email ?? ''}
      onSkip={handleSkip}
      onComplete={handleComplete}
    />
  )
}
