type Props = {
  groupBy: 'none' | 'type'
  onToggleGroupBy: () => void
  showFilterMenu: boolean
  hasActiveFilters: boolean
  onToggleFilterMenu: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
}

export default function DocumentSectionActions({
  groupBy,
  onToggleGroupBy,
  showFilterMenu,
  hasActiveFilters,
  onToggleFilterMenu,
  selectionMode,
  onToggleSelectionMode,
}: Props) {
  return (
    <>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${groupBy !== 'none' ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleGroupBy}
      >
        {groupBy === 'type' ? 'Raggruppa (tipo)' : 'Raggruppa'}
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
      <button type="button" className="gestionale-section-header__action-btn" disabled title="Prossimamente">
        Colonne
      </button>
    </>
  )
}
