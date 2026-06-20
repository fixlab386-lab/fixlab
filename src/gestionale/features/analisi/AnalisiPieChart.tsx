import { useMemo, useState } from 'react'
import type { AnalisiBucket } from './analisiAggregation'
import { formatValue } from './analisiAggregation'
import type { AnalisiCalc } from './analisiTypes'

type Props = {
  buckets: AnalisiBucket[]
  calc: AnalisiCalc
}

const PALETTE = [
  '#7cc04a', '#4a90d9', '#e0a93b', '#d9684a', '#8e6cc0',
  '#3bb6a6', '#d35b8e', '#9bbf3a', '#5a7fd9', '#c0782f',
  '#6ab04c', '#e15b64', '#5b8def', '#b06ab3', '#3aa0a0',
]

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

export default function AnalisiPieChart({ buckets, calc }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; b: AnalisiBucket; pct: number } | null>(null)

  const slices = useMemo(() => {
    const positive = buckets.filter(b => b.value > 0)
    const total = positive.reduce((a, b) => a + b.value, 0)
    if (total <= 0) return { items: [], total: 0 }
    let acc = -Math.PI / 2
    const items = positive
      .slice()
      .sort((a, b) => b.value - a.value)
      .map((b, i) => {
        const frac = b.value / total
        const start = acc
        const end = acc + frac * Math.PI * 2
        acc = end
        const [x1, y1] = polar(50, 50, 46, start)
        const [x2, y2] = polar(50, 50, 46, end)
        const large = end - start > Math.PI ? 1 : 0
        const d = `M50,50 L${x1.toFixed(2)},${y1.toFixed(2)} A46,46 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
        return { b, d, color: PALETTE[i % PALETTE.length], pct: frac * 100 }
      })
    return { items, total }
  }, [buckets])

  if (slices.items.length === 0) {
    return <div className="analisi-chart__empty">Nessun valore positivo da rappresentare nella torta.</div>
  }

  return (
    <div className="analisi-pie">
      <svg className="analisi-pie__svg" viewBox="0 0 100 100" role="img" aria-label="Grafico a torta analisi">
        {slices.items.map(s => (
          <path
            key={s.b.key}
            d={s.d}
            fill={s.color}
            stroke="#fff"
            strokeWidth={0.5}
            onMouseEnter={e => setHover({ x: e.clientX, y: e.clientY, b: s.b, pct: s.pct })}
            onMouseMove={e => setHover({ x: e.clientX, y: e.clientY, b: s.b, pct: s.pct })}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <ul className="analisi-pie__legend">
        {slices.items.slice(0, 16).map(s => (
          <li key={s.b.key} className="analisi-pie__legend-item">
            <span className="analisi-pie__legend-swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="analisi-pie__legend-label" title={s.b.label}>{s.b.label}</span>
            <span className="analisi-pie__legend-value">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      {hover ? (
        <div className="analisi-chart__tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }} role="tooltip">
          <strong>{hover.b.label}</strong>
          <span>
            {formatValue(hover.b.value, calc)} • {hover.pct.toFixed(1)}%
          </span>
        </div>
      ) : null}
    </div>
  )
}
