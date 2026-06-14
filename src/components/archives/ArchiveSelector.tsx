import { useActiveStudio } from '../../hooks/useActiveStudio'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { isArchiveUnlocked } from '../../lib/archivePassword'
import { ToolButton } from '../ui'
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

  const activeName = archives.find(a => a.studioId === activeStudioId)?.name ?? 'Archivio'

  return (
    <div className="gestionale-archive-bar">
      <span className="gestionale-archive-bar__label">Archivio</span>
      {hasMultipleArchives ? (
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
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600 }}>{activeName}</span>
      )}
      <div className="gestionale-archive-bar__manage">
        <ToolButton label="Gestisci archivi" onClick={openArchivi} />
      </div>
    </div>
  )
}
