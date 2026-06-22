import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import type { StudioLiveSubscribe } from './useStudioLiveQuery'
import { FIRESTORE_LIVE_WINDOW, FIRESTORE_PAGE_SIZE } from '../lib/firestoreScale'

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
 * Carica l'intero archivio dello studio (pagine Firestore) e mantiene sync live sui record recenti.
 */
export function useStudioPagedLiveQuery<T extends { id: string }>(
  studioId: string | null | undefined,
  listen: StudioLiveSubscribe<T>,
  fetchPage: FetchPageFn<T>,
  enabled = true,
  liveWindow = FIRESTORE_LIVE_WINDOW,
  pageSize = FIRESTORE_PAGE_SIZE,
) {
  const [items, setItems] = useState<T[]>([])
  const [syncing, setSyncing] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [archiveLoaded, setArchiveLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generationRef = useRef(0)

  const loadAllPages = useCallback(
    async (sid: string, gen: number) => {
      setLoadingMore(true)
      const byId = new Map<string, T>()
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null

      try {
        for (;;) {
          const { items: page, lastDoc, hasMore } = await fetchPage(sid, cursor, pageSize)
          for (const item of page) byId.set(item.id, item)
          if (!hasMore || page.length === 0) break
          cursor = lastDoc
        }

        if (generationRef.current !== gen) return
        setItems(Array.from(byId.values()))
        setArchiveLoaded(true)
        setError(null)
      } catch (err) {
        if (generationRef.current !== gen) return
        setError('Impossibile caricare i dati.')
        console.warn('FIXLab: caricamento archivio fallito.', err)
      } finally {
        if (generationRef.current === gen) {
          setLoadingMore(false)
          setSyncing(false)
        }
      }
    },
    [fetchPage, pageSize],
  )

  useEffect(() => {
    if (!enabled || !studioId) {
      setItems([])
      setSyncing(false)
      setArchiveLoaded(false)
      setLoadingMore(false)
      setError(null)
      return
    }

    const gen = ++generationRef.current
    setSyncing(true)
    setArchiveLoaded(false)
    setError(null)

    void loadAllPages(studioId, gen)

    const unsub = listen(
      studioId,
      liveBatch => {
        if (generationRef.current !== gen) return
        setItems(prev => {
          const map = new Map(prev.map(i => [i.id, i]))
          for (const item of liveBatch) map.set(item.id, item)
          return Array.from(map.values())
        })
        setError(null)
      },
      err => {
        if (generationRef.current !== gen) return
        console.warn('FIXLab: listener paginato fallito.', err)
        if (!archiveLoaded) {
          setError('Impossibile sincronizzare i dati.')
        }
      },
      liveWindow,
    )

    return () => {
      unsub()
    }
  }, [studioId, listen, enabled, liveWindow, loadAllPages])

  const loadMore = useCallback(() => {
    if (!studioId || archiveLoaded || loadingMore) return
    void loadAllPages(studioId, generationRef.current)
  }, [studioId, archiveLoaded, loadingMore, loadAllPages])

  return {
    data: items,
    syncing,
    loadingMore,
    hasMore: !archiveLoaded,
    error,
    loadMore,
    showInitialSpinner: syncing && items.length === 0,
  }
}
