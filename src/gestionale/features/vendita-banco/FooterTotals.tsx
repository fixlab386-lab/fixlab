import { formatEuro } from './utils'
import type { DocumentoVenditaBanco } from './types'

type Props = {
  doc: DocumentoVenditaBanco
  vociCount: number
  onRefresh?: () => void
}

export default function FooterTotals({ doc, vociCount, onRefresh }: Props) {
  return (
    <div className="vb-footer-totals">
      <div className="vb-footer-totals__voci">{vociCount} voci</div>
      <div className="vb-footer-totals__panel">
        <div className="vb-footer-totals__row">
          <span>Tot. netto</span>
          <strong>{formatEuro(doc.totNetto)}</strong>
        </div>
        <div className="vb-footer-totals__row">
          <span>Iva</span>
          <strong>{formatEuro(doc.totIva)}</strong>
        </div>
        <div className="vb-footer-totals__row vb-footer-totals__row--total">
          <span>
            Totale documento
            {onRefresh ? (
              <button type="button" className="vb-footer-totals__refresh" title="Ricalcola totali" onClick={onRefresh}>
                ↻
              </button>
            ) : null}
          </span>
          <strong>{formatEuro(doc.totaleDocumento)}</strong>
        </div>
      </div>
    </div>
  )
}
