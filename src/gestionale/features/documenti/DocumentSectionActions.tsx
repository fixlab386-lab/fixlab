type Props = {
  groupBy: 'none' | 'type'
  onToggleGroupBy: () => void
  showFilterMenu: boolean
  hasActiveFilters: boolean
  onToggleFilterMenu: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
  showColumnsMenu: boolean
  onToggleColumnsMenu: () => void
  hiddenColumnIds: Set<string>
  onToggleColumn: (columnId: string) => void
  optionalColumns: { id: string; label: string }[]
}

export default function DocumentSectionActions({
  groupBy,
  onToggleGroupBy,
  showFilterMenu,
  hasActiveFilters,
  onToggleFilterMenu,
  selectionMode,
  onToggleSelectionMode,
  showColumnsMenu,
  onToggleColumnsMenu,
  hiddenColumnIds,
  onToggleColumn,
  optionalColumns,
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
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          className={`gestionale-section-header__action-btn${showColumnsMenu || hiddenColumnIds.size ? ' gestionale-section-header__action-btn--active' : ''}`}
          onClick={onToggleColumnsMenu}
        >
          Colonne{hiddenColumnIds.size ? ' (nasc.)' : ''}
        </button>
        {showColumnsMenu ? (
          <div
            className="gestionale-dropdown-menu"
            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, minWidth: 160, background: '#fff', border: '1px solid #ccc', padding: 8 }}
          >
            {optionalColumns.map(col => (
              <label key={col.id} style={{ display: 'block', fontSize: 12, marginBottom: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!hiddenColumnIds.has(col.id)}
                  onChange={() => onToggleColumn(col.id)}
                  style={{ marginRight: 6 }}
                />
                {col.label}
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
