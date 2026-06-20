import { callCallableWithAuth } from './cloudFunctions'
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

  const data = await callCallableWithAuth<Record<string, never>, SyncStudioClaimsResponse>(
    functions,
    'syncStudioClaims',
    {},
  )
  await user.getIdToken(true)
  return data.studioIds ?? []
}
