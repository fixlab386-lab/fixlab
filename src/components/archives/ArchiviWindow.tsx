import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { useOnboardingContext } from '../../contexts/OnboardingContext'
import {
  createStudioArchive,
  duplicateStudioArchive,
  removeStudioFromUser,
  renameStudioArchive,
} from '../../lib/studioMemberships'
import {
  exportArchiveBackupJson,
} from '../../lib/archiveBackup'
import {
  fetchArchiveStats,
  formatArchiveAccess,
  formatSizeKb,
  repairArchiveAccess,
  setArchivePassword,
  touchArchiveLastAccess,
  type ArchiveGridItem,
} from '../../lib/archiveOperations'
import {
  isArchiveUnlocked,
  unlockArchiveSession,
  verifyArchivePassword,
} from '../../lib/archivePassword'
import { syncStudioClaimsAndRefreshToken } from '../../lib/syncStudioClaims'
import { getClients } from '../../lib/firestore'
import MoveClientToArchiveDialog from '../clients/MoveClientToArchiveDialog'
import ClientSearchDialog from '../clients/ClientSearchDialog'
import type { Client } from '../../types'
import '../../theme/archivi-window.css'

const NETWORK_BANNER_KEY = 'fixlab-archivi-hide-network-banner'

type DialogMode =
  | null
  | 'new'
  | 'rename'
  | 'delete'
  | 'password-set'
  | 'password-enter'
  | 'share-info'
  | 'move-client'

function SmallDialog({
  title,
  children,
  onClose,
  onOk,
  okLabel = 'OK',
  okDisabled,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onOk?: () => void
  okLabel?: string
  okDisabled?: boolean
}) {
  return (
    <div className="archivi-dialog-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="archivi-dialog" role="dialog">
        <div className="archivi-dialog__header">{title}</div>
        <div className="archivi-dialog__body">{children}</div>
        <div className="archivi-dialog__footer">
          <button type="button" className="archivi-dialog__btn" onClick={onClose}>
            Annulla
          </button>
          {onOk ? (
            <button
              type="button"
              className="archivi-dialog__btn archivi-dialog__btn--primary"
              onClick={onOk}
              disabled={okDisabled}
            >
              {okLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function ArchiviWindow() {
  const { archiviOpen, closeArchivi, openOpzioni } = useAppWindows()
  const { userProfile } = useAuth()
  const { reopenOnboarding } = useOnboardingContext()
  const {
    archives,
    activeStudioId,
    setActiveStudioId,
    memberships,
    setMemberships,
    refreshArchives,
    legacyStudioId,
  } = useActiveStudio()

  const userId = userProfile?.id ?? ''
  const userEmail = userProfile?.email ?? ''

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statsMap, setStatsMap] = useState<Record<string, ArchiveGridItem>>({})
  const [busy, setBusy] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [nameInput, setNameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showNetworkBanner, setShowNetworkBanner] = useState(
    () => localStorage.getItem(NETWORK_BANNER_KEY) !== '1',
  )
  const [altreOpen, setAltreOpen] = useState(false)
  const [moveClient, setMoveClient] = useState<Client | null>(null)
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [clientsForMove, setClientsForMove] = useState<Client[]>([])
  const altreRef = useRef<HTMLDivElement>(null)

  const selectedArchive = useMemo(
    () => archives.find(a => a.studioId === selectedId) ?? null,
    [archives, selectedId],
  )

  const selectedStats = selectedId ? statsMap[selectedId] : null

  const loadAllStats = useCallback(async () => {
    const next: Record<string, ArchiveGridItem> = {}
    for (const a of archives) {
      const stats = await fetchArchiveStats(a.studioId)
      next[a.studioId] = { ...a, ...stats }
    }
    setStatsMap(next)
  }, [archives])

  useEffect(() => {
    if (!archiviOpen || !archives.length) return
    if (!selectedId || !archives.some(a => a.studioId === selectedId)) {
      setSelectedId(activeStudioId ?? archives[0]?.studioId ?? null)
    }
    void loadAllStats()
  }, [archiviOpen, archives, activeStudioId, selectedId, loadAllStats])

  useEffect(() => {
    if (!altreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (altreRef.current && !altreRef.current.contains(e.target as Node)) setAltreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [altreOpen])

  const resetDialog = () => {
    setDialog(null)
    setNameInput('')
    setPasswordInput('')
    setPasswordConfirm('')
    setDeleteConfirm('')
    setError('')
  }

  const openArchive = async (studioId: string, closeAfter = true) => {
    const archive = archives.find(a => a.studioId === studioId)
    if (!archive) return

    if (archive.hasPassword && !isArchiveUnlocked(studioId)) {
      setSelectedId(studioId)
      setDialog('password-enter')
      setPasswordInput('')
      setError('')
      return
    }

    setBusy(true)
    setBusyMsg('Apertura archivio…')
    try {
      await touchArchiveLastAccess(studioId)
      setActiveStudioId(studioId)
      await syncStudioClaimsAndRefreshToken()
      await refreshArchives()
      await loadAllStats()
      if (closeAfter) closeArchivi()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Apertura non riuscita')
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  const handleCreate = async () => {
    if (!userId || !nameInput.trim()) return
    setBusy(true)
    setBusyMsg('Creazione archivio…')
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
      setSelectedId(studioId)
      resetDialog()
      reopenOnboarding()
      await openArchive(studioId, false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Creazione non riuscita')
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  const handleRename = async () => {
    if (!selectedId || !nameInput.trim()) return
    setBusy(true)
    setError('')
    try {
      await renameStudioArchive(selectedId, nameInput.trim())
      await refreshArchives()
      await loadAllStats()
      resetDialog()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Rinomina non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async () => {
    if (!selectedId || !userId) return
    const src = archives.find(a => a.studioId === selectedId)
    if (!src) return
    setBusy(true)
    setBusyMsg('Duplicazione in corso… può richiedere qualche minuto.')
    setError('')
    try {
      const { studioId, memberships: next } = await duplicateStudioArchive({
        sourceStudioId: selectedId,
        userId,
        userEmail,
        newName: `${src.name} (copia)`,
        memberships,
      })
      setMemberships(next)
      await syncStudioClaimsAndRefreshToken()
      await refreshArchives()
      setSelectedId(studioId)
      await loadAllStats()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Duplicazione non riuscita')
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  const handleDelete = async () => {
    if (!selectedId || !userId) return
    setBusy(true)
    setError('')
    try {
      const next = await removeStudioFromUser({
        userId,
        studioId: selectedId,
        memberships,
        legacyStudioId,
      })
      setMemberships(next)
      await syncStudioClaimsAndRefreshToken()
      await refreshArchives()
      setSelectedId(activeStudioId === selectedId ? legacyStudioId : activeStudioId)
      resetDialog()
      await loadAllStats()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eliminazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const handlePasswordSave = async () => {
    if (!selectedId) return
    if (passwordInput && passwordInput !== passwordConfirm) {
      setError('Le password non coincidono.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await setArchivePassword(selectedId, passwordInput || null)
      await refreshArchives()
      resetDialog()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Salvataggio password non riuscito')
    } finally {
      setBusy(false)
    }
  }

  const handlePasswordEnter = async () => {
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      const snap = await getDoc(doc(db, 'studios', selectedId))
      const hash = String(snap.data()?.archivePasswordHash ?? '')
      const ok = await verifyArchivePassword(passwordInput, hash)
      if (!ok) {
        setError('Password non corretta.')
        return
      }
      unlockArchiveSession(selectedId)
      resetDialog()
      await openArchive(selectedId, true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verifica password non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const handleBackup = async () => {
    if (!selectedId || !userId) return
    setBusy(true)
    setBusyMsg('Esportazione backup…')
    setError('')
    try {
      await exportArchiveBackupJson(selectedId, userId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Backup non riuscito')
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  const handleRepair = async () => {
    if (!userId) return
    setBusy(true)
    setBusyMsg('Riparazione accessi archivi…')
    setError('')
    try {
      await repairArchiveAccess(userId, memberships)
      await refreshArchives()
      await loadAllStats()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Riparazione non riuscita')
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  if (!archiviOpen) return null

  const pathLabel = `Cloud FIXLab \\ ${userEmail || 'Account'}`

  const content = (
    <div className="archivi-backdrop gestionale-theme" onClick={e => e.target === e.currentTarget && closeArchivi()}>
      <div className="archivi-window" role="dialog" aria-labelledby="archivi-title">
        <header className="archivi-window__header">
          <div>
            <h1 id="archivi-title" className="archivi-window__title">
              Archivi
            </h1>
            <p className="archivi-window__subtitle">Gestisci ed accedi ai tuoi archivi di lavoro</p>
          </div>
          <span className="archivi-window__header-icon" aria-hidden="true">
            📂
          </span>
        </header>

        <div className="archivi-window__pathbar">
          <span className="archivi-window__pathbar-label">Percorso archivi:</span>
          <span className="archivi-window__pathbar-value">{pathLabel}</span>
        </div>

        <div className="archivi-window__body">
          <aside className="archivi-sidebar">
            <div className="archivi-sidebar__section">
              <div className="archivi-sidebar__section-title">Gestione</div>
              <button type="button" className="archivi-sidebar__btn" onClick={() => { setDialog('new'); setNameInput(''); setError('') }}>
                <span className="archivi-sidebar__icon">📁➕</span>
                Nuovo
              </button>
              <button type="button" className="archivi-sidebar__btn" disabled={!selectedId || busy} onClick={() => void handleDuplicate()}>
                <span className="archivi-sidebar__icon">📁📁</span>
                Duplica
              </button>
              <button
                type="button"
                className="archivi-sidebar__btn"
                disabled={!selectedId || busy}
                onClick={() => {
                  if (!selectedArchive) return
                  setDialog('rename')
                  setNameInput(selectedArchive.name)
                  setError('')
                }}
              >
                <span className="archivi-sidebar__icon">✏️</span>
                Rinomina
              </button>
              <button
                type="button"
                className="archivi-sidebar__btn"
                disabled={!selectedId || busy || selectedArchive?.isPrimary}
                onClick={() => { setDialog('delete'); setDeleteConfirm(''); setError('') }}
              >
                <span className="archivi-sidebar__icon">❌</span>
                Elimina
              </button>
              <div className="archivi-dropdown" ref={altreRef}>
                <button
                  type="button"
                  className="archivi-sidebar__btn"
                  disabled={busy}
                  onClick={() => setAltreOpen(v => !v)}
                >
                  <span className="archivi-sidebar__icon">▾</span>
                  Altre operazioni…
                </button>
                {altreOpen ? (
                  <div className="archivi-dropdown__menu">
                    <button
                      type="button"
                      className="archivi-dropdown__item"
                      disabled={!selectedId}
                      onClick={() => {
                        setAltreOpen(false)
                        void handleBackup()
                      }}
                    >
                      Esporta backup JSON…
                    </button>
                    <button
                      type="button"
                      className="archivi-dropdown__item"
                      disabled={!activeStudioId}
                      onClick={() => {
                        setAltreOpen(false)
                        if (!activeStudioId) return
                        void getClients(activeStudioId).then(setClientsForMove).finally(() => setClientSearchOpen(true))
                      }}
                    >
                      Sposta cliente in altro archivio…
                    </button>
                    <button
                      type="button"
                      className="archivi-dropdown__item"
                      disabled={!selectedId}
                      onClick={() => {
                        setAltreOpen(false)
                        closeArchivi()
                        openOpzioni()
                      }}
                    >
                      Impostazioni archivio…
                    </button>
                    <button
                      type="button"
                      className="archivi-dropdown__item"
                      onClick={() => {
                        setAltreOpen(false)
                        void loadAllStats()
                      }}
                    >
                      Aggiorna dimensioni
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="archivi-sidebar__section">
              <div className="archivi-sidebar__section-title">Sicurezza</div>
              <button
                type="button"
                className="archivi-sidebar__btn"
                disabled={!selectedId || busy}
                onClick={() => { setDialog('password-set'); setPasswordInput(''); setPasswordConfirm(''); setError('') }}
              >
                <span className="archivi-sidebar__icon">🔒</span>
                Password archivio
              </button>
              <button type="button" className="archivi-sidebar__btn" disabled={!selectedId || busy} onClick={() => void handleBackup()}>
                <span className="archivi-sidebar__icon">💾</span>
                Copie di sicurezza…
              </button>
              <button type="button" className="archivi-sidebar__btn" disabled={busy} onClick={() => void handleRepair()}>
                <span className="archivi-sidebar__icon">🔧</span>
                Ripara
              </button>
            </div>
          </aside>

          <div className="archivi-main">
            {busy && busyMsg ? <div className="archivi-busy">{busyMsg}</div> : null}

            {error && !dialog ? (
              <div className="archivi-banner" style={{ background: '#fde8e8', borderColor: '#e8a0a0', color: '#800' }}>
                {error}
              </div>
            ) : null}

            {showNetworkBanner ? (
              <div className="archivi-banner">
                <span aria-hidden="true">💡</span>
                <span>
                  FIXLab sincronizza gli archivi nel cloud: puoi accedere da web e desktop con lo stesso account.{' '}
                  <button type="button" className="archivi-banner__link" onClick={() => setDialog('share-info')}>
                    Utilizzare FIXLab su più dispositivi
                  </button>{' '}
                  <button
                    type="button"
                    className="archivi-banner__link"
                    onClick={() => {
                      localStorage.setItem(NETWORK_BANNER_KEY, '1')
                      setShowNetworkBanner(false)
                    }}
                  >
                    Non mostrare più
                  </button>
                </span>
              </div>
            ) : null}

            <p className="archivi-main__hint">Apri l&apos;archivio di lavoro con doppio-clic:</p>

            <div className="archivi-grid-wrap">
              <div className="archivi-grid">
                {archives.map(a => {
                  const isActive = a.studioId === activeStudioId
                  return (
                    <button
                      key={a.studioId}
                      type="button"
                      className={`archivi-grid__item${selectedId === a.studioId ? ' archivi-grid__item--selected' : ''}`}
                      onClick={() => setSelectedId(a.studioId)}
                      onDoubleClick={() => void openArchive(a.studioId)}
                      title={isActive ? `${a.name} (attivo)` : a.name}
                    >
                      <span className="archivi-grid__folder">{isActive ? '📂' : '📁'}</span>
                      <span className="archivi-grid__label">{a.name}</span>
                      {a.hasPassword ? <span className="archivi-grid__lock">🔒</span> : null}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="archivi-grid__item archivi-grid__item--new"
                  onClick={() => { setDialog('new'); setNameInput(''); setError('') }}
                >
                  <span className="archivi-grid__folder">📁➕</span>
                  <span className="archivi-grid__label">Crea nuovo archivio</span>
                </button>
              </div>
            </div>

            <div className="archivi-main__footer-link">
              <button type="button" onClick={() => setDialog('share-info')}>
                Condividi archivi con gli altri PC della rete locale…
              </button>
            </div>
          </div>
        </div>

        <footer className="archivi-statusbar">
          <span className="archivi-statusbar__item">
            <strong>Archivio:</strong>
            {selectedArchive?.name ?? '—'}
          </span>
          <span className="archivi-statusbar__item">
            <strong>Dimensione:</strong>
            {selectedStats ? formatSizeKb(selectedStats.sizeKb) : '—'}
          </span>
          <span className="archivi-statusbar__item">
            <strong>Ultimo accesso:</strong>
            {formatArchiveAccess(selectedStats?.lastAccessAt ?? selectedArchive?.lastAccessAt)}
          </span>
          <span className="archivi-statusbar__count">{archives.length} archivi</span>
        </footer>
      </div>

      {dialog === 'new' ? (
        <SmallDialog
          title="FIXLab"
          onClose={resetDialog}
          onOk={() => void handleCreate()}
          okDisabled={busy || !nameInput.trim()}
        >
          <label className="archivi-dialog__label" htmlFor="archivi-new-name">
            Nome nuovo archivio:
          </label>
          <input
            id="archivi-new-name"
            className="archivi-dialog__input"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            autoFocus
          />
          {error ? <div className="archivi-dialog__error">{error}</div> : null}
        </SmallDialog>
      ) : null}

      {dialog === 'rename' ? (
        <SmallDialog
          title="FIXLab"
          onClose={resetDialog}
          onOk={() => void handleRename()}
          okDisabled={busy || !nameInput.trim()}
        >
          <label className="archivi-dialog__label" htmlFor="archivi-rename">
            Nuovo nome archivio:
          </label>
          <input
            id="archivi-rename"
            className="archivi-dialog__input"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            autoFocus
          />
          {error ? <div className="archivi-dialog__error">{error}</div> : null}
        </SmallDialog>
      ) : null}

      {dialog === 'delete' ? (
        <SmallDialog
          title="FIXLab — Elimina archivio"
          onClose={resetDialog}
          onOk={() => void handleDelete()}
          okLabel="Elimina"
          okDisabled={busy || deleteConfirm !== 'ELIMINA'}
        >
          <p className="archivi-dialog__label">
            Rimuoverai l&apos;accesso a &quot;{selectedArchive?.name}&quot;. I dati restano nel cloud finché non
            eliminati manualmente.
          </p>
          <label className="archivi-dialog__label" htmlFor="archivi-delete-confirm">
            Digita ELIMINA per confermare:
          </label>
          <input
            id="archivi-delete-confirm"
            className="archivi-dialog__input"
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            autoFocus
          />
          {error ? <div className="archivi-dialog__error">{error}</div> : null}
        </SmallDialog>
      ) : null}

      {dialog === 'password-set' ? (
        <SmallDialog
          title="Password archivio"
          onClose={resetDialog}
          onOk={() => void handlePasswordSave()}
          okDisabled={busy}
        >
          <p className="archivi-dialog__label">
            Imposta una password per proteggere l&apos;apertura di &quot;{selectedArchive?.name}&quot;. Lascia vuoto
            per rimuoverla.
          </p>
          <label className="archivi-dialog__label" htmlFor="archivi-pwd">
            Password:
          </label>
          <input
            id="archivi-pwd"
            type="password"
            className="archivi-dialog__input"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            autoFocus
          />
          <label className="archivi-dialog__label" htmlFor="archivi-pwd2" style={{ marginTop: 8 }}>
            Conferma:
          </label>
          <input
            id="archivi-pwd2"
            type="password"
            className="archivi-dialog__input"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
          />
          {error ? <div className="archivi-dialog__error">{error}</div> : null}
        </SmallDialog>
      ) : null}

      {dialog === 'password-enter' ? (
        <SmallDialog
          title="Password archivio"
          onClose={resetDialog}
          onOk={() => void handlePasswordEnter()}
          okDisabled={busy || !passwordInput}
        >
          <p className="archivi-dialog__label">
            L&apos;archivio &quot;{selectedArchive?.name}&quot; è protetto da password.
          </p>
          <label className="archivi-dialog__label" htmlFor="archivi-pwd-enter">
            Password:
          </label>
          <input
            id="archivi-pwd-enter"
            type="password"
            className="archivi-dialog__input"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && void handlePasswordEnter()}
          />
          {error ? <div className="archivi-dialog__error">{error}</div> : null}
        </SmallDialog>
      ) : null}

      {dialog === 'share-info' ? (
        <SmallDialog title="Archivi condivisi" onClose={resetDialog} onOk={resetDialog} okLabel="Chiudi">
          <p className="archivi-dialog__label">
            FIXLab usa il cloud Firebase: ogni archivio è legato al tuo account. Accedi con le stesse credenziali da
            browser o app desktop per vedere gli stessi archivi. Per collaborare con altri utenti, condividi l&apos;accesso
            allo studio tramite Impostazioni → Utenti (in arrivo).
          </p>
        </SmallDialog>
      ) : null}

      {clientSearchOpen ? (
        <ClientSearchDialog
          clients={clientsForMove}
          onClose={() => setClientSearchOpen(false)}
          onSelect={client => {
            setClientSearchOpen(false)
            setMoveClient(client)
            setDialog('move-client')
          }}
          onNoClient={() => setClientSearchOpen(false)}
          onNewClient={() => setClientSearchOpen(false)}
        />
      ) : null}

      {dialog === 'move-client' && moveClient && activeStudioId ? (
        <MoveClientToArchiveDialog
          client={moveClient}
          sourceStudioId={activeStudioId}
          archives={archives}
          onClose={() => {
            setMoveClient(null)
            resetDialog()
          }}
          onMoved={() => {
            setMoveClient(null)
            resetDialog()
            void loadAllStats()
          }}
        />
      ) : null}
    </div>
  )

  return createPortal(content, document.body)
}
