import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase'

type SyncStudioClaimsResponse = {
  studioIds: string[]
}

/**
 * Sincronizza custom claim studioIds (server legge memberships/) e forza refresh JWT.
 * Chiamare dopo login, creazione/rimozione archivio, cambio archivio attivo.
 */
export async function syncStudioClaimsAndRefreshToken(): Promise<string[]> {
  const user = auth.currentUser
  if (!user) return []

  const call = httpsCallable<void, SyncStudioClaimsResponse>(functions, 'syncStudioClaims')
  const { data } = await call()
  await user.getIdToken(true)
  return data.studioIds ?? []
}
