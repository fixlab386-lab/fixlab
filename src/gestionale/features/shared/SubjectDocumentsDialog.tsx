import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActiveStudio } from '../../../hooks/useActiveStudio'
import { loadSubjectDocuments } from '../../../lib/loadStudioCatalog'
import { useOpenDocumentFlow } from '../../lib/openDocumentFlow'
import { ALL_DOCUMENT_TYPE_LABELS } from '../documenti/constants'
import type { DocRecord } from '../../../types'
import { formatDataIt } from '../vendita-banco/utils'
import type { SubjectDocumentsDialogTarget } from '../../lib/useSubjectDocumentActions'
import '../../theme/clienti-section.css'

type Props = {
  target: SubjectDocumentsDialogTarget
  onClose: () => void
}

export default function SubjectDocumentsDialog({ target, onClose }: Props) {
  const { studioId } = useActiveStudio()
  const { openEdit } = useOpenDocumentFlow()
  const [documents, setDocuments] = useState<DocRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!studioId || !target.subjectId) {
      setDocuments([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void loadSubjectDocuments(studioId, target.subjectId)
      .then(all => {
        if (!cancelled) setDocuments(all)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, target.subjectId])

  const linked = useMemo(() => {
    const name = target.subjectName.trim().toLowerCase()
    return documents
      .filter(d => {
        if (d.status === 'cancelled') return false
        if (target.subjectId && d.subjectId === target.subjectId) return true
        if (!d.subjectId && name && d.subjectName?.trim().toLowerCase() === name) return true
        return false
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [documents, target.subjectId, target.subjectName])

  const title =
    target.subjectType === 'client' ? 'Documenti del cliente' : 'Documenti del fornitore'

  const handleOpen = (doc: DocRecord) => {
    onClose()
    openEdit(doc)
  }

  return createPortal(
    <div className="clienti-dialog-overlay subject-documents-overlay" role="presentation">
      <div
        className="clienti-dialog subject-documents-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-documents-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="clienti-dialog__titlebar">
          <span id="subject-documents-title">{title}</span>
          <button type="button" className="clienti-icon-btn clienti-icon-btn--close" onClick={onClose} title="Chiudi">
            ✕
          </button>
        </div>

        <div className="subject-documents-dialog__subtitle">{target.subjectName}</div>

        <div className="subject-documents-dialog__body">
          {loading ? <p className="gestionale-detail-panel__empty-msg">Caricamento documenti…</p> : null}
          {!loading && linked.length === 0 ? (
            <p className="gestionale-detail-panel__empty-msg">Nessun documento collegato a questo soggetto.</p>
          ) : null}
          {!loading && linked.length > 0 ? (
            <ul className="gestionale-device-history subject-documents-dialog__list">
              {linked.map(doc => (
                <li key={doc.id}>
                  <button
                    type="button"
                    className="gestionale-device-history__item"
                    onClick={() => handleOpen(doc)}
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
          ) : null}
        </div>

        <div className="clienti-dialog__footer subject-documents-dialog__footer">
          <button type="button" className="clienti-dialog__btn clienti-dialog__btn--primary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
