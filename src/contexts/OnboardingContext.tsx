import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type OnboardingContextValue = {
  /** Riapre il wizard manualmente (es. da Impostazioni in futuro). */
  reopenOnboarding: () => void
  forceOpen: boolean
  clearForceOpen: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [forceOpen, setForceOpen] = useState(false)

  const reopenOnboarding = useCallback(() => setForceOpen(true), [])
  const clearForceOpen = useCallback(() => setForceOpen(false), [])

  const value = useMemo(
    () => ({ reopenOnboarding, forceOpen, clearForceOpen }),
    [reopenOnboarding, forceOpen, clearForceOpen],
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) {
    throw new Error('useOnboardingContext deve essere usato dentro OnboardingProvider')
  }
  return ctx
}

/** Safe hook per uso futuro in Impostazioni — non lancia se il provider manca. */
export function useOnboardingReopen(): (() => void) | null {
  const ctx = useContext(OnboardingContext)
  return ctx?.reopenOnboarding ?? null
}
