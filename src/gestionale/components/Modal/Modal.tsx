import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
  width?: number | string
  footer?: ReactNode
}

export default function Modal({ title, children, onClose, width = 420, footer }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="gestionale-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="gestionale-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestionale-modal-title"
        style={{ width }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="gestionale-modal__titlebar">
          <span id="gestionale-modal-title">{title}</span>
          <button type="button" className="gestionale-modal__close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <div className="gestionale-modal__body">{children}</div>
        {footer ? <div className="gestionale-modal__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
