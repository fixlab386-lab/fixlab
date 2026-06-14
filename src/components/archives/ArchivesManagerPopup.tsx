import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { useOnboardingContext } from '../../contexts/OnboardingContext'
import {
  createStudioArchive,
  duplicateStudioArchive,
  removeStudioFromUser,
  renameStudioArchive,
} from '../../lib/studioMemberships'
import { syncStudioClaimsAndRefreshToken } from '../../lib/syncStudioClaims'
import { FormField, ToolButton } from '../ui'
import '../../theme/gestionale-dialog.css'
import '../../theme/gestionale-settings.css'
import '../../theme/gestionale-archives.css'

type Props = {
  onClose: () => void
}

type FormMode = 'idle' | 'new' | 'rename'

export default function ArchivesManagerPopup({ onClose }: Props) {
  const { userProfile } = useAuth()
  const {
    archives,
    activeStudioId,
    setActiveStudioId,
    memberships,
    setMemberships,
    refreshArchives,
    legacyStudioId,
  } = useActiveStudio()
  const { reopenOnboarding } = useOnboardingContext()

  const [formMode, setFormMode] = useState<FormMode>('idle')
  const [targetStudioId, setTargetStudioId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const userId = userProfile?.id ?? ''
  const userEmail = userProfile?.email ?? ''

  const resetForm = () => {
    setFormMode('idle')
    setTargetStudioId(null)
    setNameInput('')
    setError('')
  }

  const handleCreate = async () => {
    if (!userId || !nameInput.trim()) return
    setBusy(true)
    setError('')
    try {
      const { studioId, memberships: next } = await createStudioArchive({
        userId,
        userEmail,
        name: nameInput.trim(),
        memberships,
      })
      setMemberships(next)
      await syncStudioClaimsAndRefreshToken()
      await refreshArchives()
      setActiveStudioId(studioId)
      resetForm()
      reopenOnboarding()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Creazione non riuscita'
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        setError(
          'Permesso negato durante la creazione dell\'archivio. Verifica le regole Firestore e riprova.',
        )
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleRename = async () => {
    if (!targetStudioId || !nameInput.trim()) return
    setBusy(true)
    setError('')
    try {
      await renameStudioArchive(targetStudioId, nameInput.trim())
      await refreshArchives()
      resetForm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Rinomina non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async (studioId: string) => {
    setBusy(true)
    setError('')
    try {
      await duplicateStudioArchive({
        sourceStudioId: studioId,
        userId,
        userEmail,
        newName: `${archives.find(a => a.studioId === studioId)?.name ?? 'Archivio'} (copia)`,
        memberships,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Duplicazione non disponibile')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (studioId: string) => {
    if (!userId) return
    setBusy(true)
    setError('')
    try {
      const next = await removeStudioFromUser({
        userId,
        studioId,
        memberships,
        legacyStudioId,
      })
      setMemberships(next)
      await syncStudioClaimsAndRefreshToken()
      await refreshArchives()
      if (activeStudioId === studioId) {
        setActiveStudioId(legacyStudioId)
      }
      setConfirmDeleteId(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eliminazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gestionale-dialog-overlay gestionale-theme" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gestionale-dialog-card gestionale-dialog-card--wide" role="dialog" aria-labelledby="archives-title">
        <header className="gestionale-dialog-card__header">
          <h2 id="archives-title" className="gestionale-dialog-card__title">
            Archivi officina
          </h2>
        </header>
        <div className="gestionale-dialog-card__body">
          <p className="gestionale-dialog-hint" style={{ marginTop: 0 }}>
            Ogni archivio è un&apos;officina separata (modello commercialista). I dati operativi sono isolati per{' '}
            <code>studioId</code>.
          </p>

          {error ? (
            <div className="gestionale-settings-info-box gestionale-settings-info-box--danger" style={{ marginBottom: 10 }}>
              {error}
            </div>
          ) : null}

          <div className="gestionale-archives-toolbar">
            <ToolButton
              label="Nuovo archivio"
              onClick={() => {
                setFormMode('new')
                setTargetStudioId(null)
                setNameInput('')
                setError('')
              }}
            />
          </div>

          <div className="gestionale-archives-list">
            {archives.map(a => (
              <div
                key={a.studioId}
                className={`gestionale-archives-list__row${a.studioId === activeStudioId ? ' gestionale-archives-list__row--active' : ''}`}
              >
                <div>
                  <div className="gestionale-archives-list__name">{a.name}</div>
                  <div className="gestionale-archives-list__meta">
                    {a.isPrimary ? 'Archivio principale' : 'Aggiuntivo'} · {a.role}
                    {a.studioId === activeStudioId ? ' · Attivo' : ''}
                  </div>
                </div>
                <div className="gestionale-archives-list__actions">
                  {a.studioId !== activeStudioId ? (
                    <ToolButton label="Attiva" onClick={() => setActiveStudioId(a.studioId)} />
                  ) : null}
                  <ToolButton
                    label="Rinomina"
                    onClick={() => {
                      setFormMode('rename')
                      setTargetStudioId(a.studioId)
                      setNameInput(a.name)
                      setError('')
                    }}
                  />
                  <ToolButton label="Duplica" onClick={() => void handleDuplicate(a.studioId)} disabled={busy} />
                  {!a.isPrimary ? (
                    confirmDeleteId === a.studioId ? (
                      <>
                        <ToolButton
                          label="Conferma"
                          variant="danger"
                          onClick={() => void handleDelete(a.studioId)}
                          disabled={busy}
                        />
                        <ToolButton label="Annulla" onClick={() => setConfirmDeleteId(null)} />
                      </>
                    ) : (
                      <ToolButton
                        label="Elimina"
                        variant="danger"
                        onClick={() => setConfirmDeleteId(a.studioId)}
                        disabled={busy}
                      />
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {formMode !== 'idle' ? (
            <div className="gestionale-archives-form">
              <FormField
                label={formMode === 'new' ? 'Nome nuovo archivio' : 'Nuovo nome'}
                htmlFor="archive-name"
                required
              >
                <input
                  id="archive-name"
                  className="gestionale-form-field__input"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Es. Officina centro"
                  autoFocus
                />
              </FormField>
              <div className="gestionale-archives-form__actions">
                <ToolButton label="Annulla" onClick={resetForm} disabled={busy} />
                <ToolButton
                  label={formMode === 'new' ? 'Crea e configura' : 'Salva nome'}
                  onClick={() => void (formMode === 'new' ? handleCreate() : handleRename())}
                  disabled={busy || !nameInput.trim()}
                />
              </div>
            </div>
          ) : null}
        </div>
        <footer className="gestionale-dialog-card__footer">
          <button type="button" className="gestionale-dialog-btn" onClick={onClose}>
            Chiudi
          </button>
        </footer>
      </div>
    </div>
  )
}
