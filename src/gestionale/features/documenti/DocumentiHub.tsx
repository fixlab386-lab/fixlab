import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { getDocuments } from '../../../lib/firestore'
import type { DocRecord } from '../../../types'
import { SectionHeader } from '../../../components/ui'
import {
  ACTIVE_DOCUMENT_LABELS,
  ACTIVE_DOCUMENT_TYPES,
  DOCUMENT_HUB_GROUPS,
  type ActiveDocumentType,
} from './constants'
import '../../theme/documenti-hub.css'

function countByType(documents: DocRecord[]): Record<ActiveDocumentType, number> {
  const counts = Object.fromEntries(ACTIVE_DOCUMENT_TYPES.map(t => [t, 0])) as Record<ActiveDocumentType, number>
  for (const doc of documents) {
    if (doc.type in counts) counts[doc.type as ActiveDocumentType] += 1
  }
  return counts
}

export default function DocumentiHub() {
  const { loading: authLoading } = useAuth()
  const { studioId } = useActiveStudio()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!studioId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getDocuments(studioId)
      .then(data => {
        if (!cancelled) setDocuments(data)
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare i documenti.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, studioId])

  const counts = useMemo(() => countByType(documents), [documents])
  const total = documents.length

  if (authLoading || loading) {
    return <div className="gestionale-page gestionale-datatable__empty">Caricamento documenti…</div>
  }

  if (!studioId) {
    return <div className="gestionale-page gestionale-datatable__empty">Studio non disponibile.</div>
  }

  return (
    <div className="gestionale-page documenti-hub" data-tutorial="page-documenti">
      {error ? <div className="gestionale-page__banner gestionale-page__banner--error">{error}</div> : null}

      <SectionHeader title="Documenti" showSearch={false} />

      <div className="documenti-hub__intro">
        <p>
          Scegli il tipo di documento da visualizzare. Totale archivio: <strong>{total}</strong> documenti.
        </p>
      </div>

      <div className="documenti-hub__body">
        {DOCUMENT_HUB_GROUPS.map(group => (
          <section key={group.title} className="documenti-hub__group">
            <h2 className="documenti-hub__group-title">{group.title}</h2>
            <div className="documenti-hub__tiles">
              {group.types.map(type => (
                <button
                  key={type}
                  type="button"
                  className="documenti-hub__tile"
                  onClick={() => navigate(`/documenti/tipo/${type}`)}
                >
                  <span className="documenti-hub__tile-label">{ACTIVE_DOCUMENT_LABELS[type]}</span>
                  <span className="documenti-hub__tile-count">
                    {counts[type]} {counts[type] === 1 ? 'documento' : 'documenti'}
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
