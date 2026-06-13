import type { Repair } from '../../types'

type Props = {
  repairs: Repair[]
  onImport: (repairId: string) => void
}

export default function CassaReadyRepairsPanel({ repairs, onImport }: Props) {
  if (repairs.length === 0) return null

  return (
    <div className="gestionale-cassa-ready">
      <div className="gestionale-cassa-ready__title">Da laboratorio — Pronte</div>
      {repairs.map(r => (
        <button key={r.id} type="button" className="gestionale-cassa-ready__item" onClick={() => onImport(r.id)}>
          <div className="gestionale-cassa-ready__client">{r.clientName}</div>
          <div className="gestionale-cassa-ready__device">
            {r.deviceBrand} {r.deviceModel}
          </div>
          <div className="gestionale-cassa-ready__total">
            € {(r.totalCost || 0).toFixed(2)} · Invia in cassa →
          </div>
        </button>
      ))}
    </div>
  )
}
