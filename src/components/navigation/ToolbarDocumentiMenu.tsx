import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { DOCUMENT_MENU_SECTIONS } from './documentMenuConfig'
import type { ActiveDocumentType } from '../../gestionale/features/documenti/constants'
import '../../theme/gestionale-new-menu.css'

const MENU_MIN_WIDTH = 260

type Props = {
  active?: boolean
}

export default function ToolbarDocumentiMenu({ active = false }: Props) {
  const { openDocumentiType } = useAppWindows()
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return

    const updatePosition = () => {
      const anchor = rootRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const centeredLeft = rect.left + rect.width / 2 - MENU_MIN_WIDTH / 2
      const left = Math.max(8, Math.min(centeredLeft, window.innerWidth - MENU_MIN_WIDTH - 8))
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 2,
        left,
        minWidth: MENU_MIN_WIDTH,
        zIndex: 14000,
      })
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

  const handlePick = (type: ActiveDocumentType) => {
    close()
    openDocumentiType(type)
  }

  const menu =
    open ?
      createPortal(
        <div
          ref={menuRef}
          className="gestionale-toolbar-new__menu gestionale-toolbar-doc__menu gestionale-toolbar-doc__menu--fixed"
          style={menuStyle}
          role="menu"
        >
          {DOCUMENT_MENU_SECTIONS.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className={sectionIndex > 0 ? 'gestionale-toolbar-new__section--divider' : undefined}
              role="presentation"
            >
              {section.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="gestionale-toolbar-new__item"
                  onClick={() => handlePick(item.id)}
                >
                  <span className="gestionale-toolbar-new__item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div className="gestionale-toolbar-doc" ref={rootRef}>
      <button
        type="button"
        className={`gestionale-toolbar__item gestionale-toolbar-doc__trigger${open || active ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Documenti"
      >
        <span className="gestionale-toolbar__icon" aria-hidden="true">
          📄
        </span>
        <span className="gestionale-toolbar__label">Documenti</span>
      </button>
      {menu}
    </div>
  )
}
