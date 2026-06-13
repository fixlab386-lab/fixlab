import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { NEW_MENU_SECTIONS } from './newMenuConfig'
import '../../theme/gestionale-new-menu.css'

export default function ToolbarNewMenu() {
  const navigate = useNavigate()
  const { openVenditaBanco } = useAppWindows()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
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

  const handleItem = (item: (typeof NEW_MENU_SECTIONS)[number][number]) => {
    close()
    if (item.kind === 'modal') {
      if (item.modal === 'vendita_banco') openVenditaBanco()
      return
    }
    navigate(item.to)
  }

  return (
    <div className="gestionale-toolbar-new" ref={rootRef}>
      <button
        type="button"
        className={`gestionale-toolbar-new__trigger${open ? ' gestionale-toolbar-new__trigger--open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Nuovo"
      >
        <span className="gestionale-toolbar-new__icon gestionale-toolbar-new__icon--sun" aria-hidden="true">
          ☀
        </span>
        <span className="gestionale-toolbar-new__label">Nuovo</span>
      </button>

      {open ? (
        <div className="gestionale-toolbar-new__menu" role="menu">
          {NEW_MENU_SECTIONS.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className={`gestionale-toolbar-new__section${sectionIndex > 0 ? ' gestionale-toolbar-new__section--divider' : ''}`}
              role="presentation"
            >
              {section.map(item => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className="gestionale-toolbar-new__item"
                  onClick={() => handleItem(item)}
                >
                  <span className="gestionale-toolbar-new__item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
