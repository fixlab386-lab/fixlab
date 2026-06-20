import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useActiveStudio } from './useActiveStudio'
import { resolveStudioFeatures } from '../lib/studioFeatures'
import { DEFAULT_STUDIO_FEATURES } from '../lib/studioOnboarding'
import type { StudioFeatures } from '../types'

export function useStudioFeatures() {
  const { activeStudioId, loading: studioLoading } = useActiveStudio()
  const [features, setFeatures] = useState<StudioFeatures>(DEFAULT_STUDIO_FEATURES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeStudioId) {
      setFeatures(DEFAULT_STUDIO_FEATURES)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = onSnapshot(
      doc(db, 'studios', activeStudioId),
      snap => {
        setFeatures(resolveStudioFeatures(snap.exists() ? snap.data() : undefined))
        setLoading(false)
      },
      () => {
        setFeatures(DEFAULT_STUDIO_FEATURES)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [activeStudioId])

  return {
    features,
    loading: studioLoading || loading,
    isEnabled: (key: keyof StudioFeatures) => Boolean(features[key]),
  }
}
