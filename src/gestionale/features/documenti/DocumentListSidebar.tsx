import type { DocRecord } from '../../../types'
import { subjectLabelForType } from './constants'
import type { DocumentPeriodPreset } from './utils'

type Props = {
  documentType: string
  periodPreset: DocumentPeriodPreset
  onPeriodChange: (preset: DocumentPeriodPreset) => void
  subjectFilter: string
  onSubjectFilterChange: (subjectId: string) => void
  documents: DocRecord[]
}

const PERIOD_OPTIONS: { id: DocumentPeriodPreset; label: string }[] = [
  { id: 'all', label: 'Tutti' },
  { id: 'current_month', label: 'Mese corrente' },
  { id: 'last_month', label: 'Mese scorso' },
  { id: 'current_year', label: 'Anno corrente' },
  { id: 'last_year', label: 'Anno scorso' },
]

export default function DocumentListSidebar({
  documentType,
  periodPreset,
  onPeriodChange,
  subjectFilter,
  onSubjectFilterChange,
  documents,
}: Props) {
  const subjects = Array.from(
    new Map(
      documents
        .filter(d => d.subjectId && d.subjectName)
        .map(d => [d.subjectId!, d.subjectName]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], 'it'))

  return (
    <aside className="documenti-list-sidebar">
      <div className="documenti-list-sidebar__section">
        <h3 className="documenti-list-sidebar__title">Periodo</h3>
        {PERIOD_OPTIONS.map(opt => (
          <label key={opt.id} className="documenti-list-sidebar__option">
            <input
              type="radio"
              name="doc-period"
              checked={periodPreset === opt.id}
              onChange={() => onPeriodChange(opt.id)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="documenti-list-sidebar__section">
        <h3 className="documenti-list-sidebar__title">{subjectLabelForType(documentType)}</h3>
        <select
          className="documenti-list-sidebar__select"
          value={subjectFilter}
          onChange={e => onSubjectFilterChange(e.target.value)}
        >
          <option value="all">— Tutti —</option>
          {subjects.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="documenti-list-sidebar__hint">
        Seleziona una riga nell&apos;elenco per vedere il riepilogo, oppure doppio clic per aprire il documento.
      </p>
    </aside>
  )
}
