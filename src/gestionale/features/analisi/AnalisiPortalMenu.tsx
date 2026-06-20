import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  className?: string
  width?: number
  /** Apre a sinistra del pulsante (stile Danea sidebar). */
  openLeft?: boolean
  role?: string
}

export default function AnalisiPortalMenu({
  open,
  anchorRef,
  onClose,
  children,
  className,
  width = 200,
  openLeft = true,
  role = 'menu',
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const positionMenu = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? 420
    const left = openLeft
      ? Math.max(8, rect.left - width + 2)
      : Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const maxTop = Math.max(8, window.innerHeight - menuHeight - 8)
    const top = Math.min(rect.top, maxTop)
    setPos(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }, [anchorRef, openLeft, width])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    positionMenu()
  }, [open, positionMenu])

  useLayoutEffect(() => {
    if (open && menuRef.current) positionMenu()
  })

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onReposition = () => positionMenu()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, onClose, anchorRef, positionMenu])

  if (!open || !pos) return null

  return createPortal(
    <div
      ref={menuRef}
      className={className}
      role={role}
      style={{ top: pos.top, left: pos.left, width }}
    >
      {children}
    </div>,
    document.body,
  )
}
