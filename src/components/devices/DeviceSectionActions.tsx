import type { DeviceGroupByMode } from './utils'

type Props = {
  groupBy: DeviceGroupByMode
  onToggleGroupBy: () => void
  statusFilter: string
  brandFilter: string
  showFilterMenu: boolean
  onToggleFilterMenu: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
  onScan: () => void
}

const GROUP_LABELS: Record<DeviceGroupByMode, string> = {
  none: 'Raggruppa',
  brand: 'Raggruppa (marca)',
  type: 'Raggruppa (tipo)',
}

export default function DeviceSectionActions({
  groupBy,
  onToggleGroupBy,
  statusFilter,
  brandFilter,
  showFilterMenu,
  onToggleFilterMenu,
  selectionMode,
  onToggleSelectionMode,
  onScan,
}: Props) {
  const filterActive = showFilterMenu || statusFilter !== 'all' || brandFilter !== 'all'
  const filterSuffix =
    statusFilter !== 'all' || brandFilter !== 'all' ? ' (attivo)' : ''

  return (
    <>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${groupBy !== 'none' ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleGroupBy}
        title="Raggruppa per marca o tipo"
      >
        {GROUP_LABELS[groupBy]}
      </button>
      <button
        type="button"
        className={`gestionale-section-header__action-btn${filterActive ? ' gestionale-section-header__action-btn--active' : ''}`}
        onClick={onToggleFilterMenu}
        title="Filtra per stato e marca"
      >
        Filtra{filterSuffix}
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
      <button
        type="button"
        className="gestionale-section-header__action-btn"
        onClick={onScan}
        title="Scansiona IMEI o barcode con la fotocamera"
      >
        📷 Scansiona
      </button>
    </>
  )
}
