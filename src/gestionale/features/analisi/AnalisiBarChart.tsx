import { useMemo, useState } from 'react'
import type { AnalisiBucket } from './analisiAggregation'
import { formatValue } from './analisiAggregation'
import type { AnalisiCalc } from './analisiTypes'

type Props = {
  buckets: AnalisiBucket[]
  calc: AnalisiCalc
  axisLabel?: string
}

const POS_TOP = '#7cc04a'
const POS_BOTTOM = '#a9d97a'
const NEG_TOP = '#e0746a'
const NEG_BOTTOM = '#f0a59d'

/** Calcola una scala di tacche "rotonda" per l'asse Y. */
function niceTicks(max: number, target = 10): number[] {
  if (max <= 0) return [0]
  const rawStep = max / target
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  let step: number
  if (norm <= 1) step = mag
  else if (norm <= 2) step = 2 * mag
  else if (norm <= 2.5) step = 2.5 * mag
  else if (norm <= 5) step = 5 * mag
  else step = 10 * mag
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

export default function AnalisiBarChart({ buckets, calc, axisLabel }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; b: AnalisiBucket } | null>(null)

  const maxAbs = useMemo(() => buckets.reduce((m, b) => Math.max(m, Math.abs(b.value)), 0), [buckets])
  const ticks = useMemo(() => niceTicks(maxAbs), [maxAbs])
  const scaleMax = ticks[ticks.length - 1] || 1

  if (buckets.length === 0) {
    return <div className="analisi-chart__empty">Nessun dato da rappresentare per il periodo selezionato.</div>
  }

  const PLOT_H = 100
  const barAreaW = 100
  const n = buckets.length
  const slot = barAreaW / n
  const barW = Math.min(slot * 0.62, 8)

  return (
    <div className="analisi-chart">
      <div className="analisi-chart__plot">
        {/* Asse Y con tacche */}
        <div className="analisi-chart__yaxis">
          {[...ticks].reverse().map(t => (
            <div key={t} className="analisi-chart__ytick">
              <span className="analisi-chart__ytick-label">
                {t.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>

        <div className="analisi-chart__canvas">
          {/* Griglia orizzontale */}
          <div className="analisi-chart__grid">
            {[...ticks].reverse().map(t => (
              <div key={t} className="analisi-chart__gridline" />
            ))}
          </div>

          <svg
            className="analisi-chart__svg"
            viewBox={`0 0 ${barAreaW} ${PLOT_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Grafico a barre analisi"
          >
            <defs>
              <linearGradient id="analisi-bar-pos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={POS_TOP} />
                <stop offset="100%" stopColor={POS_BOTTOM} />
              </linearGradient>
              <linearGradient id="analisi-bar-neg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NEG_TOP} />
                <stop offset="100%" stopColor={NEG_BOTTOM} />
              </linearGradient>
            </defs>
            {buckets.map((b, i) => {
              const h = (Math.abs(b.value) / scaleMax) * PLOT_H
              const x = i * slot + (slot - barW) / 2
              const y = PLOT_H - h
              return (
                <rect
                  key={b.key}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, b.value !== 0 ? 0.4 : 0)}
                  fill={b.negative ? 'url(#analisi-bar-neg)' : 'url(#analisi-bar-pos)'}
                  stroke={b.negative ? '#c85a50' : '#5fa336'}
                  strokeWidth={0.15}
                  onMouseEnter={e => setHover({ x: e.clientX, y: e.clientY, b })}
                  onMouseMove={e => setHover({ x: e.clientX, y: e.clientY, b })}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </svg>

          {/* Etichette asse X */}
          <div className="analisi-chart__xaxis">
            {buckets.map(b => (
              <div key={b.key} className="analisi-chart__xtick" title={b.label}>
                <span className="analisi-chart__xtick-label">{b.label}</span>
              </div>
            ))}
          </div>
          {axisLabel ? <div className="analisi-chart__xaxis-title">{axisLabel}</div> : null}
        </div>
      </div>

      {hover ? (
        <div
          className="analisi-chart__tooltip"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
          role="tooltip"
        >
          <strong>{hover.b.label}</strong>
          <span>{formatValue(hover.b.value, calc)}</span>
        </div>
      ) : null}
    </div>
  )
}
