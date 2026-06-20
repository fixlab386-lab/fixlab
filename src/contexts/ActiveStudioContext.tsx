import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  ensureLegacyMembership,
  fetchStudioArchives,
  normalizeMemberships,
  persistDefaultStudioId,
  resolveInitialActiveStudioId,
  writeActiveStudioToStorage,
  type StudioArchive,
} from '../lib/studioMemberships'
import { syncStudioClaimsAndRefreshToken } from '../lib/syncStudioClaims'
import type { UserStudioMembershipRef } from '../types'

export type ActiveStudioContextValue = {
  activeStudioId: string | null
  legacyStudioId: string
  archives: StudioArchive[]
  memberships: UserStudioMembershipRef[]
  loading: boolean
  setActiveStudioId: (studioId: string) => void
  refreshArchives: () => Promise<void>
  setMemberships: (next: UserStudioMembershipRef[]) => void
}

export const ActiveStudioContext = createContext<ActiveStudioContextValue | null>(null)

export function ActiveStudioProvider({ children }: { children: ReactNode }) {
  const { userProfile, loading: authLoading } = useAuth()
  const userId = userProfile?.id ?? ''
  const legacyStudioId = userProfile?.studioId ?? ''

  const [memberships, setMemberships] = useState<UserStudioMembershipRef[]>([])
  const [archives, setArchives] = useState<StudioArchive[]>([])
  const [activeStudioId, setActiveStudioIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshArchives = useCallback(async () => {
    if (!userId || !legacyStudioId) {
      setArchives([])
      return
    }
    const list = await fetchStudioArchives({ userId, legacyStudioId, memberships })
    setArchives(list)
  }, [userId, legacyStudioId, memberships])

  useEffect(() => {
    if (authLoading) return
    if (!userId || !legacyStudioId) {
      setMemberships([])
      setArchives([])
      setActiveStudioIdState(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const optimisticMemberships = normalizeMemberships(userProfile?.memberships, legacyStudioId)
    const optimisticStudioId = resolveInitialActiveStudioId({
      userId,
      legacyStudioId,
      defaultStudioId: userProfile?.defaultStudioId,
      memberships: optimisticMemberships,
    })
    setMemberships(optimisticMemberships)
    setActiveStudioIdState(optimisticStudioId)
    writeActiveStudioToStorage(userId, optimisticStudioId)

    const init = async () => {
      try {
        const normalized = await ensureLegacyMembership({
          userId,
          legacyStudioId,
          currentMemberships: userProfile?.memberships,
        })
        if (cancelled) return
        setMemberships(normalized)

        await syncStudioClaimsAndRefreshToken().catch(err => {
          console.warn('FIXLab: sync custom claims Storage non riuscita all\'avvio archivi.', err)
        })
        if (cancelled) return

        const resolved = resolveInitialActiveStudioId({
          userId,
          legacyStudioId,
          defaultStudioId: userProfile?.defaultStudioId,
          memberships: normalized,
        })
        setActiveStudioIdState(resolved)
        writeActiveStudioToStorage(userId, resolved)

        const list = await fetchStudioArchives({
          userId,
          legacyStudioId,
          memberships: normalized,
        })
        if (!cancelled) setArchives(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [authLoading, userId, legacyStudioId, userProfile?.memberships, userProfile?.defaultStudioId])

  const setActiveStudioId = useCallback(
    (studioId: string) => {
      if (!userId) return
      setActiveStudioIdState(studioId)
      writeActiveStudioToStorage(userId, studioId)
      void persistDefaultStudioId(userId, studioId).catch(() => {
        /* profilo non aggiornato: localStorage resta valido */
      })
      void syncStudioClaimsAndRefreshToken().catch(err => {
        console.warn('FIXLab: sync custom claims Storage non riuscita al cambio archivio.', err)
      })
    },
    [userId],
  )

  const value = useMemo(
    () => ({
      activeStudioId,
      legacyStudioId,
      archives,
      memberships,
      loading: authLoading || loading,
      setActiveStudioId,
      refreshArchives,
      setMemberships,
    }),
    [
      activeStudioId,
      legacyStudioId,
      archives,
      memberships,
      authLoading,
      loading,
      setActiveStudioId,
      refreshArchives,
    ],
  )

  return <ActiveStudioContext.Provider value={value}>{children}</ActiveStudioContext.Provider>
}
