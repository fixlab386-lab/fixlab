import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MOVEMENT_TYPE_LABELS } from './constants'
import { formatMovementDate, linkedDocumentLabel } from './utils'
import type { StockMovement } from '../../../types'
import '../../../theme/gestionale-dialog.css'
import '../../theme/movimenti-section.css'

type Props = {
  movement: StockMovement
  onClose: () => void
  onOpenDocument?: (documentId: string) => void
}

function movementTitle(m: StockMovement): string {
  const base = MOVEMENT_TYPE_LABELS[m.type] || 'Movimento'
  const cause = linkedDocumentLabel(m)
  if (m.linkedDocumentId && cause !== '—') {
    return `${base} magazzino (generato da ${cause})`
  }
  return `${base} magazzino`
}

export default function MovimentoDettaglioModal({ movement, onClose, onOpenDocument }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const readOnly = Boolean(movement.linkedDocumentId)
  const qty =
    movement.loaded ??
    movement.unloaded ??
    movement.committed ??
    movement.incoming ??
    movement.adjustTo ??
    movement.adjustDelta ??
    0

  return createPortal(
    <div className="gestionale-dialog-overlay magazzino-dialog-overlay" onClick={onClose}>
      <div
        className="gestionale-dialog-card operazione-magazzino"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="operazione-magazzino__header">
          <span className="operazione-magazzino__header-icon" aria-hidden="true">
            {movement.type === 'unload' ? '📤' : '📥'}
          </span>
          <div className="operazione-magazzino__header-text">
            <h2>{movementTitle(movement)}</h2>
            {readOnly ? <p>Movimento non modificabile</p> : <p>Dettaglio movimento di magazzino</p>}
          </div>
        </div>

        {readOnly ? <div className="movimento-dettaglio__readonly">Movimento collegato a un documento.</div> : null}

        <div className="movimento-dettaglio__grid">
          <label className="operazione-magazzino__field">
            {movement.subjectType === 'client' ? 'Destinatario merce' : 'Provenienza merce'}
            <input value={movement.subjectName || '—'} disabled readOnly />
          </label>
          <label className="operazione-magazzino__field">
            Data operazione
            <input type="text" value={formatMovementDate(movement.date)} disabled readOnly />
          </label>
        </div>

        <div className="movimento-dettaglio__product-row">
          <label>
            Codice
            <input value={movement.productCode} disabled readOnly />
          </label>
          <label>
            Cod. prod. fornitore
            <input value="—" disabled readOnly />
          </label>
          <label>
            Prodotto
            <input value={movement.productName} disabled readOnly />
          </label>
          <label>
            Q.tà (pz)
            <input value={String(qty)} disabled readOnly />
          </label>
          <label>
            {movement.type === 'load' ? 'Costo unitario' : 'Prezzo unitario'}
            <input value="—" disabled readOnly />
          </label>
        </div>

        <label className="operazione-magazzino__field" style={{ padding: '0 16px 12px' }}>
          Causale
          {movement.linkedDocumentId && onOpenDocument ? (
            <button
              type="button"
              className="movimenti-cell-link"
              onClick={() => onOpenDocument(movement.linkedDocumentId!)}
            >
              {linkedDocumentLabel(movement)}
            </button>
          ) : (
            <input value={movement.cause || '—'} disabled readOnly />
          )}
        </label>

        <div className="operazione-magazzino__footer">
          <button type="button" className="gestionale-dialog-btn gestionale-dialog-btn--primary" onClick={onClose}>
            OK
          </button>
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="gestionale-dialog-btn" disabled>
            ?
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
