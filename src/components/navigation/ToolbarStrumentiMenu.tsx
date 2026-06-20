import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import ToolbarIcon from './ToolbarIcons'
import '../../theme/gestionale-new-menu.css'
import { useAppWindows, type StrumentiTabellaKind } from '../../contexts/AppWindowsContext'
import { useActiveStudio } from '../../hooks/useActiveStudio'
import { runStudioBackup } from '../../lib/studioBackup'

const MENU_MIN_WIDTH = 240

const TABELLE_ITEMS: { id: StrumentiTabellaKind; label: string; icon: string }[] = [
  { id: 'aliquote', label: 'Aliquote IVA', icon: '％' },
  { id: 'pagamenti', label: 'Tipi pagamento', icon: '💳' },
  { id: 'conti', label: "Conti d'acquisto", icon: '🧾' },
]

export default function ToolbarStrumentiMenu() {
  const { openStrumentiTabella, strumentiTabella } = useAppWindows()
  const { studioId, activeArchive } = useActiveStudio()
  const [open, setOpen] = useState(false)
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const [backupRunning, setBackupRunning] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
      setSubmenuOpen(false)
    }, 250)
  }, [cancelClose])

  const openMenu = useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose])

  const close = useCallback(() => {
    setOpen(false)
    setSubmenuOpen(false)
  }, [])

  useEffect(() => () => cancelClose(), [cancelClose])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    const updatePosition = () => {
      const anchor = rootRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - MENU_MIN_WIDTH - 8))
      setMenuStyle({ position: 'fixed', top: rect.bottom + 1, left, minWidth: MENU_MIN_WIDTH, zIndex: 14000 })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const handleTabella = (kind: StrumentiTabellaKind) => {
    close()
    openStrumentiTabella(kind)
  }

  const handleBackup = async () => {
    close()
    if (!studioId) {
      alert('Nessun archivio attivo: impossibile eseguire la copia di sicurezza.')
      return
    }
    setBackupRunning(true)
    try {
      const summary = await runStudioBackup(studioId, activeArchive?.name)
      alert(
        `Copia di sicurezza completata.\n\n` +
          `File: ${summary.fileName}\n` +
          `Documenti salvati: ${summary.totalDocs}`,
      )
    } catch (err) {
      alert(`Copia di sicurezza non riuscita.\n${err instanceof Error ? err.message : ''}`)
    } finally {
      setBackupRunning(false)
    }
  }

  const submenuStyle: CSSProperties = {
    position: 'absolute',
    top: -6,
    left: '100%',
    minWidth: 200,
    padding: '6px 0',
    background: '#fff',
    border: '1px solid #a8c4dc',
    borderRadius: 4,
    boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
    zIndex: 14001,
  }

  const menu =
    open ?
      createPortal(
        <div
          ref={menuRef}
          className="gestionale-toolbar-new__menu gestionale-toolbar-doc__menu gestionale-toolbar-doc__menu--fixed"
          style={menuStyle}
          role="menu"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="gestionale-toolbar-new__group">
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setSubmenuOpen(true)}
              onMouseLeave={() => setSubmenuOpen(false)}
            >
              <button
                type="button"
                role="menuitem"
                className="gestionale-toolbar-new__item"
                aria-haspopup="menu"
                aria-expanded={submenuOpen}
                onClick={() => setSubmenuOpen(v => !v)}
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="gestionale-toolbar-new__item-icon" aria-hidden>📑</span>
                  <span>Tabelle</span>
                </span>
                <span aria-hidden style={{ color: '#6b7c8f' }}>▸</span>
              </button>
              {submenuOpen ? (
                <div role="menu" style={submenuStyle}>
                  {TABELLE_ITEMS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className="gestionale-toolbar-new__item"
                      onClick={() => handleTabella(item.id)}
                    >
                      <span className="gestionale-toolbar-new__item-icon" aria-hidden>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="gestionale-toolbar-new__group">
            <button
              type="button"
              role="menuitem"
              className="gestionale-toolbar-new__item"
              disabled={backupRunning}
              onClick={() => void handleBackup()}
            >
              <span className="gestionale-toolbar-new__item-icon" aria-hidden>💾</span>
              <span>{backupRunning ? 'Copia in corso…' : 'Esegui copia di sicurezza archivio'}</span>
            </button>
          </div>
        </div>,
        document.body,
      )
    : null

  const active = strumentiTabella !== null

  return (
    <div
      className="gestionale-toolbar-doc"
      ref={rootRef}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`gestionale-toolbar__item gestionale-toolbar-doc__trigger${open || active ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Strumenti"
      >
        <span className="gestionale-toolbar__icon" aria-hidden>
          <ToolbarIcon id="strumenti" />
        </span>
        <span className="gestionale-toolbar__label">Strumenti</span>
      </button>
      {menu}
    </div>
  )
}
