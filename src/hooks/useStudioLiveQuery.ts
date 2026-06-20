import { useEffect, useState } from 'react'

export type StudioLiveSubscribe<T> = (
  studioId: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void,
  maxItems?: number,
) => () => void

/**
 * Sottoscrizione Firestore in tempo reale per una collezione dello studio attivo.
 * Si aggiorna automaticamente quando un altro dispositivo modifica gli stessi dati.
 */
export function useStudioLiveQuery<T>(
  studioId: string | null | undefined,
  subscribe: StudioLiveSubscribe<T> | null,
  enabled = true,
  maxItems?: number,
): { data: T[]; loading: boolean; syncing: boolean; error: string | null } {
  const [data, setData] = useState<T[]>([])
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !studioId || !subscribe) {
      setData([])
      setSyncing(false)
      setError(null)
      return
    }

    let firstSnapshot = true
    setSyncing(true)
    setError(null)

    const unsub = subscribe(
      studioId,
      items => {
        setData(items)
        setError(null)
        if (firstSnapshot) {
          firstSnapshot = false
          setSyncing(false)
        }
      },
      err => {
        setError('Impossibile sincronizzare i dati in tempo reale.')
        console.warn('FIXLab: listener Firestore fallito.', err)
        if (firstSnapshot) {
          firstSnapshot = false
          setSyncing(false)
        }
      },
      maxItems,
    )

    return () => {
      unsub()
    }
  }, [studioId, subscribe, enabled, maxItems])

  return { data, loading: syncing && data.length === 0, syncing, error }
}
