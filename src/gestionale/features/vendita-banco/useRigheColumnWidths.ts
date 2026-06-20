import { useCallback, useEffect, useRef, useState } from 'react'
import type { ColonnaRigheId } from './types'

const STORAGE_KEY = 'fixlab.vb.righeColWidths'
const MIN_WIDTH = 36
const MAX_WIDTH = 520

function loadWidths(defaults: Record<ColonnaRigheId, number>): Record<ColonnaRigheId, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<Record<ColonnaRigheId, number>>
    const merged = { ...defaults }
    for (const key of Object.keys(defaults) as ColonnaRigheId[]) {
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

export function useRigheColumnWidths(defaults: Record<ColonnaRigheId, number>) {
  const [widths, setWidths] = useState<Record<ColonnaRigheId, number>>(() => loadWidths(defaults))
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  const dragRef = useRef<{ id: ColonnaRigheId; startX: number; startW: number } | null>(null)

  const persist = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widthsRef.current))
    } catch {
      /* ignore quota */
    }
  }, [])

  const startResize = useCallback((id: ColonnaRigheId, clientX: number) => {
    dragRef.current = { id, startX: clientX, startW: widthsRef.current[id] }
    document.body.classList.add('vb-col-resize-active')
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
      document.body.classList.remove('vb-col-resize-active')
      persist()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('vb-col-resize-active')
    }
  }, [persist])

  return { widths, startResize }
}
