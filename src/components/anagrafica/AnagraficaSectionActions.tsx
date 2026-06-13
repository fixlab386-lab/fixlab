import type { GroupByMode } from './utils'

type Props = {
  groupBy: GroupByMode
  onToggleGroupBy: () => void
  regionFilter: string
  showFilterMenu: boolean
  onToggleFilterMenu: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
}

export default function AnagraficaSectionActions({
  groupBy,
  onToggleGroupBy,
  regionFilter,
  showFilterMenu,
  onToggleFilterMenu,
  selectionMode,
  onToggleSelectionMode,
}: Props) {
  return (
    <>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${groupBy === 'province' ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleGroupBy}
        title="Raggruppa per provincia"
      >
        Raggruppa
      </button>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${showFilterMenu || regionFilter !== 'all' ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleFilterMenu}
        title="Filtra per provincia"
      >
        Filtra{regionFilter !== 'all' ? ` (${regionFilter})` : ''}
      </button>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${selectionMode ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleSelectionMode}
        title="Abilita selezione multipla"
      >
        Seleziona
      </button>
      <button type="button" className="gestionale-section-header__action-btn" disabled title="Prossimamente">
        Colonne
      </button>
    </>
  )
}
