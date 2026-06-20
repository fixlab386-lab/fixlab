import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import '../../../theme/gestionale-dialog.css'
import '../../theme/movimenti-section.css'

type Props = {
  initialFrom?: string
  initialTo?: string
  onConfirm: (from: string, to: string) => void
  onClose: () => void
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DateRangeDialog({ initialFrom, initialTo, onConfirm, onClose }: Props) {
  const [from, setFrom] = useState(initialFrom || todayIso())
  const [to, setTo] = useState(initialTo || todayIso())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="gestionale-dialog-overlay magazzino-dialog-overlay" onClick={onClose}>
      <div
        className="gestionale-dialog-card date-range-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Filtra intervallo date"
        onClick={e => e.stopPropagation()}
      >
        <div className="date-range-dialog__title">
          <span>Filtra intervallo date</span>
          <button type="button" className="date-range-dialog__close" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>

        <div className="date-range-dialog__body">
          <label className="date-range-dialog__row">
            <span>Da...</span>
            <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
          </label>
          <label className="date-range-dialog__row">
            <span>a...</span>
            <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          </label>
        </div>

        <div className="date-range-dialog__footer">
          <button
            type="button"
            className="date-range-dialog__btn date-range-dialog__btn--primary"
            onClick={() => onConfirm(from, to)}
          >
            OK
          </button>
          <button type="button" className="date-range-dialog__btn" onClick={onClose}>
            Annulla
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
