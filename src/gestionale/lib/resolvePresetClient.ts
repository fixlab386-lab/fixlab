import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import type { Client } from '../../types'

/** Cliente per preset documento: cache locale, altrimenti fetch Firestore. */
export async function resolvePresetClient(
  clientId: string,
  cachedClients: Client[],
): Promise<Client | null> {
  const cached = cachedClients.find(c => c.id === clientId)
  if (cached) return cached
  const snap = await getDoc(doc(db, 'clients', clientId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Client
}
