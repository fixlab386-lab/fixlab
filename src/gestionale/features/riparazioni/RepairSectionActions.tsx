type Props = {
  showFilterMenu: boolean
  hasActiveFilters: boolean
  onToggleFilterMenu: () => void
  activeCount: number
  onCassa?: () => void
}

export default function RepairSectionActions({
  showFilterMenu,
  hasActiveFilters,
  onToggleFilterMenu,
  activeCount,
  onCassa,
}: Props) {
  return (
    <>
      <span style={{ fontSize: 12, color: 'var(--gestionale-text-muted, #666)', marginRight: 8 }}>{activeCount} attive</span>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${showFilterMenu || hasActiveFilters ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleFilterMenu}
      >
        Filtra{hasActiveFilters ? ' (attivo)' : ''}
      </button>
      {onCassa ? (
        <button type="button" className="gestionale-section-header__action-btn" onClick={onCassa}>
          Cassa
        </button>
      ) : null}
    </>
  )
}
