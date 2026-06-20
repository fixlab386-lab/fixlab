import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { registerUserInstallation, USER_INSTALLATION_HEARTBEAT_MS } from '../lib/userInstallations'

/** Registra e aggiorna periodicamente l'installazione corrente su Firestore. */
export default function UserInstallationSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.uid) return

    let cancelled = false

    const beat = () => {
      if (cancelled) return
      void registerUserInstallation(user.uid).catch(err => {
        console.warn('FIXLab: registrazione installazione non riuscita.', err)
      })
    }

    beat()
    const timer = window.setInterval(beat, USER_INSTALLATION_HEARTBEAT_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') beat()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user?.uid])

  return null
}
