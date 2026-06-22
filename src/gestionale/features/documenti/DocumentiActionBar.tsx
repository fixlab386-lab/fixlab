import ActionBarDropdown from '../../components/ActionBarDropdown'
import { DOCUMENTI_UTILITA_ITEMS } from './constants'

type Props = {
  hasSelection: boolean
  canDelete: boolean
  onNuovo: () => void
  onModifica: () => void
  onDuplica: () => void
  onElimina: () => void
  onStampa: () => void
  onExcel: () => void
  onUtilita: (tipo: string) => void
}

export default function DocumentiActionBar({
  hasSelection,
  canDelete,
  onNuovo,
  onModifica,
  onDuplica,
  onElimina,
  onStampa,
  onExcel,
  onUtilita,
}: Props) {
  return (
    <div className="documenti-actionbar" data-tutorial="documenti-toolbar">
      <div className="documenti-actionbar__group">
        <button type="button" className="documenti-actionbar__btn" onClick={onNuovo}>
          <span className="documenti-actionbar__icon documenti-actionbar__icon--new">+</span>
          Nuovo
        </button>
        <button type="button" className="documenti-actionbar__btn" disabled={!hasSelection} onClick={onModifica}>
          <span className="documenti-actionbar__icon">✏</span>
          Modifica
        </button>
        <button type="button" className="documenti-actionbar__btn" disabled={!hasSelection} onClick={onDuplica}>
          <span className="documenti-actionbar__icon">📄</span>
          Duplica
        </button>
        <button type="button" className="documenti-actionbar__btn" disabled={!canDelete} onClick={onElimina}>
          <span className="documenti-actionbar__icon documenti-actionbar__icon--danger">✕</span>
          Elimina
        </button>
        <button type="button" className="documenti-actionbar__btn" disabled={!hasSelection} onClick={onStampa}>
          <span className="documenti-actionbar__icon">🖨</span>
          Stampa
        </button>
        <button type="button" className="documenti-actionbar__btn" disabled>
          <span className="documenti-actionbar__icon">🏷</span>
          Etichette
        </button>
        <button type="button" className="documenti-actionbar__btn" onClick={onExcel}>
          <span className="documenti-actionbar__icon">📊</span>
          Excel
        </button>
        <ActionBarDropdown label="⚡ Utilità" items={DOCUMENTI_UTILITA_ITEMS} onPick={onUtilita} />
      </div>
    </div>
  )
}
