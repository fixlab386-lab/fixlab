import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_WIDTH = 36
const MAX_WIDTH = 520
const RESIZE_BODY_CLASS = 'gestionale-col-resize-active'

function loadWidths<T extends string>(storageKey: string, defaults: Record<T, number>): Record<T, number> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<T, number>>
    const merged = { ...defaults }
    for (const key of Object.keys(defaults) as T[]) {
      const w = parsed[key]
      if (typeof w === 'number' && Number.isFinite(w)) {
        merged[key] = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))
      }
    }
    return merged
  } catch {
    return defaults
  }
}

export function useTableColumnWidths<T extends string>(storageKey: string, defaults: Record<T, number>) {
  const [widths, setWidths] = useState<Record<T, number>>(() => loadWidths(storageKey, defaults))
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  const dragRef = useRef<{ id: T; startX: number; startW: number } | null>(null)

  const persist = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widthsRef.current))
    } catch {
      /* ignore quota */
    }
  }, [storageKey])

  const startResize = useCallback((id: T, clientX: number) => {
    dragRef.current = { id, startX: clientX, startW: widthsRef.current[id] }
    document.body.classList.add(RESIZE_BODY_CLASS)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, drag.startW + (e.clientX - drag.startX)))
      setWidths(prev => ({ ...prev, [drag.id]: next }))
    }

    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.classList.remove(RESIZE_BODY_CLASS)
      persist()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove(RESIZE_BODY_CLASS)
    }
  }, [persist])

  return { widths, startResize }
}
