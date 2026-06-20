import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudioFeatures } from './useStudioFeatures'
import type { StudioFeatures } from '../types'

/** Reindirizza alla Start se la funzionalità non è attiva nello studio. */
export function useRequireStudioFeature(feature: keyof StudioFeatures) {
  const navigate = useNavigate()
  const { features, loading, isEnabled } = useStudioFeatures()

  useEffect(() => {
    if (loading) return
    if (!isEnabled(feature)) {
      navigate('/', { replace: true })
    }
  }, [feature, features, isEnabled, loading, navigate])

  return { enabled: isEnabled(feature), loading }
}
