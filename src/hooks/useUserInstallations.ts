import { useCallback, useEffect, useState } from 'react'
import {
  getCurrentInstallationId,
  listenUserInstallations,
  removeUserInstallation,
  type UserInstallation,
} from '../lib/userInstallations'

export function useUserInstallations(userId: string | null | undefined) {
  const [installations, setInstallations] = useState<UserInstallation[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const currentInstallationId = getCurrentInstallationId()

  useEffect(() => {
    if (!userId) {
      setInstallations([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = listenUserInstallations(userId, next => {
      setInstallations(next)
      setLoading(false)
    })
    return () => unsub()
  }, [userId])

  const revokeInstallation = useCallback(
    async (installationId: string) => {
      if (!userId) return
      await removeUserInstallation(userId, installationId)
    },
    [userId],
  )

  return {
    installations,
    loading,
    currentInstallationId,
    revokeInstallation,
  }
}
