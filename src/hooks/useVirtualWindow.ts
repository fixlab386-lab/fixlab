import { useEffect, useRef, useState } from 'react'

/** Virtualizza righe in liste scrollabili (griglie clienti/prodotti/fornitori). */
export function useVirtualWindow(itemCount: number, rowHeight: number, threshold = 80, overscan = 10) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState({ start: 0, end: Math.min(itemCount, threshold + overscan) })

  const enabled = itemCount >= threshold

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) {
      setRange({ start: 0, end: itemCount })
      return
    }

    const update = () => {
      const viewH = el.clientHeight || 400
      const scrollTop = el.scrollTop
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
      const end = Math.min(itemCount, Math.ceil((scrollTop + viewH) / rowHeight) + overscan)
      setRange(prev => (prev.start === start && prev.end === end ? prev : { start, end }))
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [itemCount, rowHeight, enabled, overscan])

  const start = enabled ? range.start : 0
  const end = enabled ? range.end : itemCount

  return {
    scrollRef,
    start,
    end,
    enabled,
    topPad: enabled ? start * rowHeight : 0,
    bottomPad: enabled ? Math.max(0, (itemCount - end) * rowHeight) : 0,
  }
}
