import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { countDocumentsByType, countStudioDocuments } from '../../../lib/firestorePagination'
import { filterEnabledDocumentTypes } from '../../../lib/printTemplates'
import {
  ACTIVE_DOCUMENT_LABELS,
  ACTIVE_DOCUMENT_TYPES,
  DOCUMENT_HUB_GROUPS,
  type ActiveDocumentType,
} from './constants'

type Props = {
  embedded?: boolean
}

export default function DocumentiHub({ embedded: _embedded = false }: Props) {
  const { loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()
  const navigate = useNavigate()
  const [counts, setCounts] = useState<Record<ActiveDocumentType, number>>(
    () => Object.fromEntries(ACTIVE_DOCUMENT_TYPES.map(t => [t, 0])) as Record<ActiveDocumentType, number>,
  )
  const [total, setTotal] = useState(0)
  const [studioData, setStudioData] = useState<Record<string, unknown> | null>(null)
  const [syncing, setSyncing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!studioId) {
      setSyncing(false)
      return
    }
    let cancelled = false
    setSyncing(true)
    Promise.all([
      Promise.all(ACTIVE_DOCUMENT_TYPES.map(async type => [type, await countDocumentsByType(studioId, type)] as const)),
      countStudioDocuments(studioId),
      getDoc(doc(db, 'studios', studioId)),
    ])
      .then(([typePairs, docTotal, studioSnap]) => {
        if (cancelled) return
        setCounts(Object.fromEntries(typePairs) as Record<ActiveDocumentType, number>)
        setTotal(docTotal)
        setStudioData(studioSnap.exists() ? studioSnap.data() : null)
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare i documenti.')
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

  const hubGroups = useMemo(
    () =>
      DOCUMENT_HUB_GROUPS.map(group => ({
        ...group,
        types: filterEnabledDocumentTypes(studioData ?? undefined, group.types),
      })).filter(group => group.types.length > 0),
    [studioData],
  )

  const handleSelect = (type: ActiveDocumentType) => {
    navigate(`/documenti/tipo/${type}`)
  }

  if (authLoading) {
    return <div className="documenti-hub__loading">Caricamento profilo…</div>
  }

  if (!studioId) {
    return <div className="documenti-hub__loading">Studio non disponibile.</div>
  }

  return (
    <div className="documenti-hub gestionale-page" data-tutorial="page-documenti">
      {syncing && total > 0 ? <div className="gestionale-sync-badge" aria-live="polite">Sincronizzazione…</div> : null}
      {syncing && total === 0 ? <div className="documenti-hub__loading">Caricamento documenti…</div> : null}
      {error ? <div className="documenti-hub__error">{error}</div> : null}

      <div className="documenti-hub__intro">
        <p>
          Scegli il tipo di documento da visualizzare. Totale archivio:{' '}
          <strong>{syncing && total === 0 ? '…' : total}</strong> documenti.
        </p>
      </div>

      <div className="documenti-hub__body">
        {hubGroups.map(group => (
          <section key={group.title} className="documenti-hub__group">
            <h2 className="documenti-hub__group-title">{group.title}</h2>
            <div className="documenti-hub__tiles">
              {group.types.map(type => (
                <button
                  key={type}
                  type="button"
                  className="documenti-hub__tile"
                  onClick={() => handleSelect(type)}
                >
                  <span className="documenti-hub__tile-label">{ACTIVE_DOCUMENT_LABELS[type]}</span>
                  <span className="documenti-hub__tile-count">
                    {syncing && counts[type] === 0 && total === 0
                      ? '…'
                      : `${counts[type]} ${counts[type] === 1 ? 'documento' : 'documenti'}`}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
