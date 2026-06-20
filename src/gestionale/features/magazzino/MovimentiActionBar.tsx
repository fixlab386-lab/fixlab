type Props = {
  hasSelection: boolean
  canDelete: boolean
  onCarica: () => void
  onScarica: () => void
  onRettifica: () => void
  onModifica: () => void
  onElimina: () => void
  onStampa: () => void
  onExcel: () => void
}

export default function MovimentiActionBar({
  hasSelection,
  canDelete,
  onCarica,
  onScarica,
  onRettifica,
  onModifica,
  onElimina,
  onStampa,
  onExcel,
}: Props) {
  return (
    <div className="movimenti-actionbar" data-tutorial="movimenti-toolbar">
      <div className="movimenti-actionbar__group">
        <button type="button" className="movimenti-actionbar__btn" onClick={onCarica}>
          <span className="movimenti-actionbar__icon movimenti-actionbar__icon--load">+</span>
          Carica
        </button>
        <button type="button" className="movimenti-actionbar__btn" onClick={onScarica}>
          <span className="movimenti-actionbar__icon movimenti-actionbar__icon--unload">−</span>
          Scarica
        </button>
        <button type="button" className="movimenti-actionbar__btn" onClick={onRettifica}>
          <span className="movimenti-actionbar__icon movimenti-actionbar__icon--adjust">↻</span>
          Rettifica
        </button>
        <button type="button" className="movimenti-actionbar__btn" disabled={!hasSelection} onClick={onModifica}>
          <span className="movimenti-actionbar__icon">✏</span>
          Modifica
        </button>
        <button type="button" className="movimenti-actionbar__btn" disabled={!canDelete} onClick={onElimina}>
          <span className="movimenti-actionbar__icon movimenti-actionbar__icon--danger">✕</span>
          Elimina
        </button>
      </div>
      <div className="movimenti-actionbar__group">
        <button type="button" className="movimenti-actionbar__btn" onClick={onStampa}>
          <span className="movimenti-actionbar__icon">🖨</span>
          Stampa
        </button>
        <button type="button" className="movimenti-actionbar__btn" onClick={onExcel}>
          <span className="movimenti-actionbar__icon">📊</span>
          Excel
        </button>
      </div>
    </div>
  )
}
