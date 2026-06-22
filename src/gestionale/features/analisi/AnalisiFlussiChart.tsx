import { useMemo, useState } from 'react'
import type { FlussiBucket } from './analisiAggregation'
import { formatCurrency } from './analisiAggregation'

type Props = {
  buckets: FlussiBucket[]
  showEntrate: boolean
  showSaldo: boolean
  showUscite: boolean
}

const COLOR_ENTRATE = '#7cc04a'
const COLOR_SALDO = '#4a90d9'
const COLOR_USCITE = '#e8943a'

function niceTicks(max: number, target = 8): number[] {
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

export default function AnalisiFlussiChart({ buckets, showEntrate, showSaldo, showUscite }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; b: FlussiBucket } | null>(null)

  const { ticks, scaleMax, zeroY } = useMemo(() => {
    let maxPos = 0
    let maxNeg = 0
    for (const b of buckets) {
      if (showEntrate) maxPos = Math.max(maxPos, b.entrate)
      if (showSaldo) {
        maxPos = Math.max(maxPos, Math.max(0, b.saldo))
        maxNeg = Math.max(maxNeg, Math.max(0, -b.saldo))
      }
      if (showUscite) maxNeg = Math.max(maxNeg, b.uscite)
    }
    const posTicks = niceTicks(maxPos)
    const negTicks = niceTicks(maxNeg)
    const posMax = posTicks[posTicks.length - 1] || 1
    const negMax = negTicks[negTicks.length - 1] || 1
    const scale = Math.max(posMax, negMax, 1)
    const allTicks: number[] = []
    for (let i = negTicks.length - 1; i >= 1; i--) allTicks.push(-negTicks[i])
    allTicks.push(0)
    for (let i = 1; i < posTicks.length; i++) allTicks.push(posTicks[i])
    const plotH = 100
    const zeroY = (scale / (scale * 2)) * plotH
    return { ticks: allTicks, scaleMax: scale, zeroY: plotH / 2 }
  }, [buckets, showEntrate, showSaldo, showUscite])

  if (buckets.length === 0) {
    return <div className="analisi-chart__empty">Nessun dato da rappresentare per il periodo selezionato.</div>
  }

  const PLOT_H = 100
  const barAreaW = 100
  const n = buckets.length
  const slot = barAreaW / n
  const groupW = slot * 0.72
  const barW = groupW / 3.2

  const barHeight = (value: number) => (Math.abs(value) / scaleMax) * (PLOT_H / 2)

  return (
    <div className="analisi-chart analisi-flussi-chart">
      <div className="analisi-flussi-chart__title">Analisi flussi</div>
      <div className="analisi-chart__plot">
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
          <div className="analisi-chart__grid">
            {[...ticks].reverse().map(t => (
              <div
                key={t}
                className={`analisi-chart__gridline${t === 0 ? ' analisi-chart__gridline--zero' : ''}`}
              />
            ))}
          </div>

          <svg
            className="analisi-chart__svg"
            viewBox={`0 0 ${barAreaW} ${PLOT_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Grafico analisi flussi"
          >
            {buckets.map((b, i) => {
              const gx = i * slot + (slot - groupW) / 2
              const series: { key: string; value: number; color: string; show: boolean; offset: number }[] = [
                { key: 'entrate', value: b.entrate, color: COLOR_ENTRATE, show: showEntrate, offset: 0 },
                { key: 'saldo', value: b.saldo, color: COLOR_SALDO, show: showSaldo, offset: 1 },
                { key: 'uscite', value: -b.uscite, color: COLOR_USCITE, show: showUscite, offset: 2 },
              ]
              return series
                .filter(s => s.show)
                .map(s => {
                  const h = barHeight(s.value)
                  const x = gx + s.offset * (barW + 0.8)
                  const y = s.value >= 0 ? zeroY - h : zeroY
                  return (
                    <rect
                      key={`${b.key}-${s.key}`}
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(h, s.value !== 0 ? 0.35 : 0)}
                      fill={s.color}
                      stroke="rgba(0,0,0,0.12)"
                      strokeWidth={0.12}
                      onMouseEnter={e => setHover({ x: e.clientX, y: e.clientY, b })}
                      onMouseMove={e => setHover({ x: e.clientX, y: e.clientY, b })}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })
            })}
          </svg>

          <div className="analisi-chart__xaxis">
            {buckets.map(b => (
              <div key={b.key} className="analisi-chart__xtick" title={b.label}>
                <span className="analisi-chart__xtick-label">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="analisi-chart__xaxis-title">Mese</div>
        </div>
      </div>

      <div className="analisi-flussi-chart__legend">
        {showEntrate ? (
          <span className="analisi-flussi-chart__legend-item">
            <span className="analisi-flussi-chart__swatch" style={{ background: COLOR_ENTRATE }} aria-hidden="true" />
            Entrate
          </span>
        ) : null}
        {showSaldo ? (
          <span className="analisi-flussi-chart__legend-item">
            <span className="analisi-flussi-chart__swatch" style={{ background: COLOR_SALDO }} aria-hidden="true" />
            Saldo
          </span>
        ) : null}
        {showUscite ? (
          <span className="analisi-flussi-chart__legend-item">
            <span className="analisi-flussi-chart__swatch" style={{ background: COLOR_USCITE }} aria-hidden="true" />
            Uscite
          </span>
        ) : null}
      </div>

      {hover ? (
        <div
          className="analisi-chart__tooltip"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
          role="tooltip"
        >
          <strong>{hover.b.label}</strong>
          {showEntrate ? <span>Entrate: {formatCurrency(hover.b.entrate)}</span> : null}
          {showUscite ? <span>Uscite: {formatCurrency(hover.b.uscite)}</span> : null}
          {showSaldo ? <span>Saldo: {formatCurrency(hover.b.saldo)}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
