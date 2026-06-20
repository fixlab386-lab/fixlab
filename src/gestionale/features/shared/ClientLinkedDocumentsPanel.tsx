import { useEffect, useMemo, useState } from 'react'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { loadSubjectDocuments } from '../../../lib/loadStudioCatalog'
import { useOpenDocumentFlow } from '../../lib/openDocumentFlow'
import { ALL_DOCUMENT_TYPE_LABELS } from '../documenti/constants'
import type { DocRecord, DocumentType } from '../../../types'
import { formatDataIt } from '../vendita-banco/utils'

type Props = {
  clientId?: string
  clientName?: string
  emptyHint?: string
  documentType?: DocumentType
  highlightDocumentId?: string
}

export default function ClientLinkedDocumentsPanel({
  clientId,
  clientName,
  emptyHint,
  documentType,
  highlightDocumentId,
}: Props) {
  const { studioId } = useActiveStudio()
  const { openEdit } = useOpenDocumentFlow()
  const [documents, setDocuments] = useState<DocRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studioId || !clientId) {
      setDocuments([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void loadSubjectDocuments(studioId, clientId)
      .then(all => {
        if (cancelled) return
        setDocuments(all)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, clientId])

  const linked = useMemo(() => {
    if (!clientId && !clientName?.trim()) return []
    const name = clientName?.trim().toLowerCase() ?? ''
    return documents
      .filter(d => {
        if (d.status === 'cancelled') return false
        if (documentType && d.type !== documentType) return false
        if (clientId && d.subjectId === clientId) return true
        if (!d.subjectId && name && d.subjectName?.trim().toLowerCase() === name) return true
        return false
      })
      .sort((a, b) => {
        if (highlightDocumentId) {
          if (a.id === highlightDocumentId) return -1
          if (b.id === highlightDocumentId) return 1
        }
        return b.date.localeCompare(a.date)
      })
  }, [documents, clientId, clientName, documentType, highlightDocumentId])

  if (!clientId && !clientName?.trim()) {
    return <p className="gestionale-detail-panel__empty-msg">Nessun cliente collegato.</p>
  }

  if (loading) {
    return <p className="gestionale-detail-panel__empty-msg">Caricamento documenti…</p>
  }

  if (linked.length === 0) {
    return (
      <p className="gestionale-detail-panel__empty-msg">
        {emptyHint ?? 'Nessun documento collegato a questo cliente.'}
      </p>
    )
  }

  return (
    <ul className="gestionale-device-history">
      {linked.map(doc => (
        <li key={doc.id}>
          <button
            type="button"
            className={`gestionale-device-history__item${doc.id === highlightDocumentId ? ' gestionale-device-history__item--highlight' : ''}`}
            onClick={() => openEdit(doc)}
          >
            <div className="gestionale-device-history__main">
              <span className="gestionale-device-history__problem">
                {ALL_DOCUMENT_TYPE_LABELS[doc.type] || doc.type} {doc.fullNumber}
              </span>
              <span className="gestionale-device-history__meta">
                {formatDataIt(doc.date)} · {doc.status}
              </span>
            </div>
            <span className="gestionale-device-history__amount">€ {(doc.totalDocument || 0).toFixed(2)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
