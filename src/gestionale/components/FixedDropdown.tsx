import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'

const DEFAULT_MIN_WIDTH = 280

export type FixedDropdownDirection = 'up' | 'down'
export type FixedDropdownAlign = 'left' | 'right'

type PositionOptions = {
  direction: FixedDropdownDirection
  align: FixedDropdownAlign
  minWidth?: number
}

export function useFixedDropdownPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  { direction, align, minWidth = DEFAULT_MIN_WIDTH }: PositionOptions,
): CSSProperties {
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const width = minWidth
      const left =
        align === 'right'
          ? Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
          : Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))

      if (direction === 'up') {
        const maxHeight = Math.max(120, rect.top - 12)
        setMenuStyle({
          position: 'fixed',
          left,
          bottom: window.innerHeight - rect.top + 4,
          top: 'auto',
          minWidth: width,
          maxHeight,
        })
      } else {
        const maxHeight = Math.max(120, window.innerHeight - rect.bottom - 12)
        setMenuStyle({
          position: 'fixed',
          left,
          top: rect.bottom + 4,
          bottom: 'auto',
          minWidth: width,
          maxHeight,
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, anchorRef, direction, align, minWidth])

  return menuStyle
}

export function useDropdownDismiss(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, ref, onClose])
}

type PanelProps = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  direction?: FixedDropdownDirection
  align?: FixedDropdownAlign
  minWidth?: number
  menuClassName: string
  children: ReactNode
}

export function FixedDropdownPanel({
  open,
  anchorRef,
  direction = 'up',
  align = 'right',
  minWidth,
  menuClassName,
  children,
}: Omit<PanelProps, 'onClose'>) {
  const menuStyle = useFixedDropdownPosition(open, anchorRef, { direction, align, minWidth })

  if (!open) return null

  return (
    <div className={menuClassName} style={menuStyle}>
      {children}
    </div>
  )
}

type MenuProps = {
  label: ReactNode
  items: readonly string[]
  onPick: (item: string) => void
  disabled?: boolean
  direction?: FixedDropdownDirection
  align?: FixedDropdownAlign
  minWidth?: number
  wrapperClass: string
  btnClass: string
  menuClass: string
  itemClass: string
  showCaret?: boolean
}

export function FixedDropdownMenu({
  label,
  items,
  onPick,
  disabled,
  direction = 'up',
  align = 'right',
  minWidth,
  wrapperClass,
  btnClass,
  menuClass,
  itemClass,
  showCaret = true,
}: MenuProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  useDropdownDismiss(open, anchorRef, () => setOpen(false))

  return (
    <div className={wrapperClass} ref={anchorRef}>
      <button type="button" className={btnClass} disabled={disabled} onClick={() => setOpen(v => !v)}>
        {label}
        {showCaret ? <span className="caret">▼</span> : null}
      </button>
      <FixedDropdownPanel
        open={open}
        anchorRef={anchorRef}
        direction={direction}
        align={align}
        minWidth={minWidth}
        menuClassName={menuClass}
      >
        {items.map(item => (
          <button
            key={item}
            type="button"
            className={itemClass}
            onClick={() => {
              onPick(item)
              setOpen(false)
            }}
          >
            {item}
          </button>
        ))}
      </FixedDropdownPanel>
    </div>
  )
}
