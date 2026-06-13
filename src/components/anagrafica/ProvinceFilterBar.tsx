import ToolButton from '../ui/ToolButton'

type Props = {
  idPrefix: string
  provinces: string[]
  regionFilter: string
  onRegionFilterChange: (value: string) => void
  onClearFilter: () => void
}

export default function ProvinceFilterBar({
  idPrefix,
  provinces,
  regionFilter,
  onRegionFilterChange,
  onClearFilter,
}: Props) {
  if (provinces.length === 0) return null

  return (
    <div className="gestionale-page__filter-bar">
      <label className="gestionale-page__filter-label" htmlFor={`${idPrefix}-province-filter`}>
        Provincia
      </label>
      <select
        id={`${idPrefix}-province-filter`}
        className="gestionale-page__filter-select"
        value={regionFilter}
        onChange={e => onRegionFilterChange(e.target.value)}
      >
        <option value="all">Tutte le province</option>
        {provinces.map(p => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      {regionFilter !== 'all' ? (
        <ToolButton label="Azzera filtro" onClick={onClearFilter} />
      ) : null}
    </div>
  )
}
