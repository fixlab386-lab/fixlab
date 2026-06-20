import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import type { StudioLiveSubscribe } from './useStudioLiveQuery'
import { FIRESTORE_LIVE_WINDOW, FIRESTORE_PAGE_SIZE, FIRESTORE_SOFT_CAP } from '../lib/firestoreScale'

type FetchPageFn<T> = (
  studioId: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
  pageSize: number,
) => Promise<{
  items: T[]
  lastDoc: QueryDocumentSnapshot<DocumentData> | null
  hasMore: boolean
}>

/**
 * Finestra live (sync multi-dispositivo) + pagine storiche on demand.
 * L'UI mostra subito la shell; i dati arrivano senza bloccare l'intera pagina.
 */
export function useStudioPagedLiveQuery<T extends { id: string }>(
  studioId: string | null | undefined,
  listen: StudioLiveSubscribe<T>,
  fetchPage: FetchPageFn<T>,
  enabled = true,
  liveWindow = FIRESTORE_LIVE_WINDOW,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  const [liveItems, setLiveItems] = useState<T[]>([])
  const [olderItems, setOlderItems] = useState<T[]>([])
  const [syncing, setSyncing] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)

  const [softCapReached, setSoftCapReached] = useState(false)

  useEffect(() => {
    if (!enabled || !studioId) {
      setLiveItems([])
      setOlderItems([])
      setSyncing(false)
      setHasMore(false)
      setSoftCapReached(false)
      cursorRef.current = null
      return
    }

    let first = true
    setSyncing(true)
    setError(null)
    setOlderItems([])
    setSoftCapReached(false)
    cursorRef.current = null

    const unsub = listen(
      studioId,
      items => {
        setLiveItems(items)
        setError(null)
        if (first) {
          first = false
          setSyncing(false)
          setHasMore(items.length >= liveWindow)
        }
      },
      err => {
        setError('Impossibile sincronizzare i dati.')
        console.warn('FIXLab: listener paginato fallito.', err)
        if (first) {
          first = false
          setSyncing(false)
        }
      },
      liveWindow,
    )

    return () => {
      unsub()
      cursorRef.current = null
    }
  }, [studioId, listen, enabled, liveWindow])

  const data = useMemo(() => {
    const map = new Map<string, T>()
    for (const item of olderItems) map.set(item.id, item)
    for (const item of liveItems) map.set(item.id, item)
    return Array.from(map.values())
  }, [olderItems, liveItems])

  const truncated = (liveItems.length >= liveWindow && olderItems.length === 0) || softCapReached

  const loadMore = useCallback(async () => {
    if (!studioId || loadingMore || softCapReached) return
    setLoadingMore(true)
    try {
      const { items, lastDoc, hasMore: more } = await fetchPage(studioId, cursorRef.current, pageSize)
      cursorRef.current = lastDoc
      setHasMore(more && items.length > 0)
      if (items.length) {
        setOlderItems(prev => {
          const ids = new Set(prev.map(i => i.id))
          const merged = [...prev, ...items.filter(i => !ids.has(i.id))]
          if (merged.length + liveItems.length >= FIRESTORE_SOFT_CAP) {
            setSoftCapReached(true)
            setHasMore(false)
            return merged.slice(0, FIRESTORE_SOFT_CAP)
          }
          return merged
        })
      } else {
        setHasMore(false)
      }
      setError(null)
    } catch {
      setError('Impossibile caricare altri record.')
    } finally {
      setLoadingMore(false)
    }
  }, [studioId, loadingMore, softCapReached, fetchPage, pageSize, liveItems.length])

  // Auto-caricamento dello storico in background: senza più il pulsante «Carica altri»
  // garantiamo comunque l'accesso a tutti i record (fino al soft cap) come fa Danea.
  useEffect(() => {
    if (!enabled || !studioId) return
    if (syncing || loadingMore) return
    if (!hasMore || softCapReached) return
    void loadMore()
  }, [enabled, studioId, syncing, loadingMore, hasMore, softCapReached, loadMore])

  return {
    data,
    syncing,
    loadingMore,
    hasMore,
    truncated,
    error,
    loadMore,
    showInitialSpinner: syncing && data.length === 0,
  }
}
