import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppWindows } from '../../contexts/AppWindowsContext'
import { PAGAMENTI_MENU_ITEMS, type PagamentiMenuActionId } from './pagamentiMenuConfig'
import ToolbarIcon from './ToolbarIcons'
import '../../theme/gestionale-new-menu.css'

const MENU_MIN_WIDTH = 280

type Props = {
  active?: boolean
}

export default function ToolbarPagamentiMenu({ active = false }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { openPagamentiRisorse } = useAppWindows()
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  const isPagamentiRoute = location.pathname === '/pagamenti' || location.pathname.startsWith('/pagamenti/')

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

  const goPagamenti = (search: string) => {
    close()
    const path = search ? `/pagamenti?${search}` : '/pagamenti'
    if (location.pathname !== '/pagamenti' || location.search !== (search ? `?${search}` : '')) {
      navigate(path)
    }
  }

  const handlePick = (id: PagamentiMenuActionId) => {
    switch (id) {
      case 'tutti':
        goPagamenti('')
        break
      case 'entrate':
        goPagamenti('flow=in')
        break
      case 'uscite':
        goPagamenti('flow=out')
        break
      case 'da_saldare_al': {
        const raw = window.prompt('Mostra pagamenti da saldare entro il (gg/mm/aaaa):', '')
        if (!raw?.trim()) return
        const parts = raw.trim().split(/[/.-]/)
        if (parts.length !== 3) {
          window.alert('Data non valida.')
          return
        }
        const [d, m, y] = parts
        const iso = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        goPagamenti(`status=to_settle&settleBy=${iso}`)
        break
      }
      case 'invio_solleciti':
        goPagamenti('status=to_settle')
        window.setTimeout(() => {
          window.alert('Elenco pagamenti da saldare: usa Stampa o export Excel per inviare i solleciti.')
        }, 300)
        break
      case 'riba':
        goPagamenti('status=to_settle&method=riba')
        break
      case 'bonifici':
        goPagamenti('status=to_settle&method=bonifico')
        break
      case 'impostazioni_risorse':
        close()
        if (!isPagamentiRoute) navigate('/pagamenti')
        openPagamentiRisorse()
        break
      default:
        break
    }
  }

  const menu =
    open ?
      createPortal(
        <div
          ref={menuRef}
          className="gestionale-toolbar-new__menu gestionale-toolbar-pag__menu gestionale-toolbar-pag__menu--fixed"
          style={menuStyle}
          role="menu"
        >
          {PAGAMENTI_MENU_ITEMS.map(item => (
            <div key={item.id} role="presentation">
              {item.dividerBefore ? <div className="gestionale-toolbar-new__section--divider" role="separator" /> : null}
              <button
                type="button"
                role="menuitem"
                className="gestionale-toolbar-new__item"
                onClick={() => handlePick(item.id)}
              >
                {item.icon ? (
                  <span className="gestionale-toolbar-new__item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div className="gestionale-toolbar-pag" ref={rootRef}>
      <button
        type="button"
        className={`gestionale-toolbar__item gestionale-toolbar-pag__trigger${open || active ? ' gestionale-toolbar__item--active' : ''}`}
        onClick={() => {
          if (!isPagamentiRoute) navigate('/pagamenti')
          setOpen(prev => !prev)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Pagamenti"
      >
        <span className="gestionale-toolbar__icon gestionale-toolbar-pag__icon" aria-hidden="true">
          <ToolbarIcon id="pagamenti" />
        </span>
        <span className="gestionale-toolbar__label">Pagamenti</span>
      </button>
      {menu}
    </div>
  )
}
