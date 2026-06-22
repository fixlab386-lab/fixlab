import { FixedDropdownMenu } from '../../components/FixedDropdown'
import { STAMPA_ITEMS, UTILITA_ITEMS } from './constants'

const DROPDOWN_PROPS = {
  wrapperClass: 'prodotti-dropdown',
  btnClass: 'prodotti-actionbar__btn',
  menuClass: 'prodotti-dropdown__menu prodotti-dropdown__menu--fixed',
  itemClass: 'prodotti-dropdown__item',
} as const

type Props = {
  hasSelection: boolean
  isEditing: boolean
  onNuovo: () => void
  onDuplica: () => void
  onElimina: () => void
  onSalva: () => void
  onAnnulla: () => void
  onStampa: (tipo: string) => void
  onEtichette: () => void
  onExcel: () => void
  onAggiornaListini: () => void
  onModificaSelez: () => void
  onUtilita: (tipo: string) => void
}

export default function ProdottiActionBar({
  hasSelection,
  isEditing,
  onNuovo,
  onDuplica,
  onElimina,
  onSalva,
  onAnnulla,
  onStampa,
  onEtichette,
  onExcel,
  onAggiornaListini,
  onModificaSelez,
  onUtilita,
}: Props) {
  return (
    <div className="prodotti-actionbar">
      <div className="prodotti-actionbar__group">
        <button type="button" className="prodotti-actionbar__btn" onClick={onNuovo}>
          <span style={{ color: '#228b22' }}>+</span> Nuovo
        </button>
        <button type="button" className="prodotti-actionbar__btn" disabled={!hasSelection} onClick={onDuplica}>
          Duplica
        </button>
        <button type="button" className="prodotti-actionbar__btn" disabled={!hasSelection} onClick={onElimina}>
          <span style={{ color: '#c00' }}>🗑</span> Elimina
        </button>
        <FixedDropdownMenu
          {...DROPDOWN_PROPS}
          label={<><span>🖨</span> Stampa</>}
          items={STAMPA_ITEMS}
          onPick={onStampa}
          direction="up"
          align="left"
        />
        <button type="button" className="prodotti-actionbar__btn" onClick={onEtichette}>
          Etichette
        </button>
        {isEditing ? (
          <>
            <button type="button" className="prodotti-actionbar__btn" onClick={onSalva}>
              <span>💾</span> Salva
            </button>
            <button type="button" className="prodotti-actionbar__btn" onClick={onAnnulla}>
              <span style={{ color: '#4a90d9' }}>↩</span> Annulla
            </button>
          </>
        ) : null}
      </div>
      <div className="prodotti-actionbar__group">
        <button type="button" className="prodotti-actionbar__btn" onClick={onExcel}>
          Excel
        </button>
        <button type="button" className="prodotti-actionbar__btn" onClick={onAggiornaListini}>
          Aggiorna listini
        </button>
        <button type="button" className="prodotti-actionbar__btn" onClick={onModificaSelez}>
          Modifica selez.
        </button>
        <FixedDropdownMenu
          {...DROPDOWN_PROPS}
          label="Utilità"
          items={UTILITA_ITEMS}
          onPick={onUtilita}
          direction="up"
          align="right"
        />
      </div>
    </div>
  )
}
