import { useActiveStudio } from '../../hooks/useActiveStudio'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { isArchiveUnlocked } from '../../lib/archivePassword'
import '../../theme/gestionale-archives.css'

export default function ArchiveSelector() {
  const {
    archives,
    activeStudioId,
    setActiveStudioId,
    hasMultipleArchives,
    loading,
  } = useActiveStudio()
  const { openArchivi } = useAppWindows()

  if (loading) return null

  // Come in Danea: nessuna barra archivio per chi ha un solo archivio.
  // La gestione archivi resta disponibile dal pulsante «Archivi» della toolbar.
  if (!hasMultipleArchives) return null

  return (
    <div className="gestionale-archive-bar">
      <span className="gestionale-archive-bar__label">Archivio</span>
      <div className="gestionale-archive-select-wrap">
        <select
          className="gestionale-archive-select"
          value={activeStudioId ?? ''}
          onChange={e => {
            const nextId = e.target.value
            const archive = archives.find(a => a.studioId === nextId)
            if (archive?.hasPassword && !isArchiveUnlocked(nextId)) {
              openArchivi()
              return
            }
            setActiveStudioId(nextId)
          }}
          aria-label="Seleziona archivio attivo"
        >
          {archives.map(a => (
            <option key={a.studioId} value={a.studioId}>
              {a.name}
              {a.hasPassword ? ' 🔒' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
