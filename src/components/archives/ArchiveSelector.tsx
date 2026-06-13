import { useState } from 'react'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { ToolButton } from '../ui'
import ArchivesManagerPopup from './ArchivesManagerPopup'
import '../../theme/gestionale-archives.css'

export default function ArchiveSelector() {
  const {
    archives,
    activeStudioId,
    setActiveStudioId,
    hasMultipleArchives,
    loading,
  } = useActiveStudio()
  const [showManager, setShowManager] = useState(false)

  if (loading) return null

  const activeName = archives.find(a => a.studioId === activeStudioId)?.name ?? 'Archivio'

  return (
    <>
      <div className="gestionale-archive-bar">
        <span className="gestionale-archive-bar__label">Archivio</span>
        {hasMultipleArchives ? (
          <div className="gestionale-archive-select-wrap">
            <select
              className="gestionale-archive-select"
              value={activeStudioId}
              onChange={e => setActiveStudioId(e.target.value)}
              aria-label="Seleziona archivio attivo"
            >
              {archives.map(a => (
                <option key={a.studioId} value={a.studioId}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 600 }}>{activeName}</span>
        )}
        <div className="gestionale-archive-bar__manage">
          <ToolButton label="Gestisci archivi" onClick={() => setShowManager(true)} />
        </div>
      </div>

      {showManager ? <ArchivesManagerPopup onClose={() => setShowManager(false)} /> : null}
    </>
  )
}
