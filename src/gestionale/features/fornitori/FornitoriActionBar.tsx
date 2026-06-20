import { STAMPA_ITEMS, UTILITA_ITEMS } from './constants'
import ActionBarDropdown from '../../components/ActionBarDropdown'

type Props = {
  hasSelection: boolean
  hasMultiSelection: boolean
  onNuovo: () => void
  onDuplica: () => void
  onElimina: () => void
  onStampa: (tipo: string) => void
  onEtichette: () => void
  onExcel: () => void
  onModificaSelez: () => void
  onUtilita: (tipo: string) => void
}

export default function FornitoriActionBar({
  hasSelection,
  hasMultiSelection,
  onNuovo,
  onDuplica,
  onElimina,
  onStampa,
  onEtichette,
  onExcel,
  onModificaSelez,
  onUtilita,
}: Props) {
  return (
    <div className="clienti-actionbar">
      <div className="clienti-actionbar__group">
        <button type="button" className="clienti-actionbar__btn" onClick={onNuovo}>
          <span style={{ color: '#2e7d32' }}>+</span> Nuovo
        </button>
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection} onClick={onDuplica}>
          Duplica
        </button>
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection} onClick={onElimina}>
          <span style={{ color: '#c62828' }}>🗑</span> Elimina
        </button>
      </div>
      <div className="clienti-actionbar__group">
        <ActionBarDropdown label="🖨 Stampa" items={STAMPA_ITEMS} onPick={onStampa} />
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection} onClick={onEtichette}>
          🏷 Etichette
        </button>
        <button type="button" className="clienti-actionbar__btn" onClick={onExcel}>
          📊 Excel
        </button>
        <button type="button" className="clienti-actionbar__btn" disabled={!hasSelection}>
          ✉ Comunicaz.
        </button>
        <button type="button" className="clienti-actionbar__btn" disabled={!hasMultiSelection} onClick={onModificaSelez}>
          ✏ Modifica selez.
        </button>
        <ActionBarDropdown label="⚡ Utilità" items={UTILITA_ITEMS} onPick={onUtilita} />
      </div>
    </div>
  )
}
