import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppWindows } from '../../../contexts/AppWindowsContext'
import DocumentiHub from './DocumentiHub'
import DocumentiSection from './DocumentiSection'
import { ACTIVE_DOCUMENT_LIST_LABELS } from './constants'
import '../../../theme/gestionale-mdi-window.css'
import '../../theme/documenti-hub.css'

export default function DocumentiWindow() {
  const { documentiOpen, documentiType, closeDocumenti, backDocumentiHub } = useAppWindows()

  useEffect(() => {
    if (!documentiOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDocumenti()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [documentiOpen, closeDocumenti])

  if (!documentiOpen) return null

  const title = documentiType ? ACTIVE_DOCUMENT_LIST_LABELS[documentiType] : 'Documenti'

  return createPortal(
    <div
      className="gestionale-mdi-backdrop"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) closeDocumenti()
      }}
    >
      <div
        className="gestionale-mdi-window gestionale-mdi-window--documenti"
        role="dialog"
        aria-modal="true"
        aria-labelledby="documenti-window-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="gestionale-mdi-window__titlebar">
          {documentiType ? (
            <button
              type="button"
              className="gestionale-mdi-window__title-btn documenti-window__back"
              onClick={backDocumentiHub}
              title="Torna ai tipi documento"
            >
              ←
            </button>
          ) : (
            <span className="gestionale-mdi-window__title-icon" aria-hidden="true">
              📄
            </span>
          )}
          <span id="documenti-window-title" className="gestionale-mdi-window__title-text">
            {title}
          </span>
          <button
            type="button"
            className="gestionale-mdi-window__title-btn gestionale-mdi-window__title-btn--close"
            onClick={closeDocumenti}
            title="Chiudi"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <div className="gestionale-mdi-window__body documenti-window__body">
          {documentiType ? (
            <DocumentiSection lockedType={documentiType} embedded onBack={backDocumentiHub} />
          ) : (
            <DocumentiHub embedded />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
