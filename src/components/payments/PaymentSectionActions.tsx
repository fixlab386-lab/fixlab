type Props = {
  showFilterMenu: boolean
  hasActiveFilters: boolean
  onToggleFilterMenu: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
  onManageResources: () => void
}

export default function PaymentSectionActions({
  showFilterMenu,
  hasActiveFilters,
  onToggleFilterMenu,
  selectionMode,
  onToggleSelectionMode,
  onManageResources,
}: Props) {
  return (
    <>
      <button type="button" className="gestionale-section-header__action-btn" onClick={onManageResources}>
        Risorse
      </button>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${showFilterMenu || hasActiveFilters ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleFilterMenu}
      >
        Filtra{hasActiveFilters ? ' (attivo)' : ''}
      </button>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${selectionMode ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleSelectionMode}
      >
        Seleziona
      </button>
    </>
  )
}
