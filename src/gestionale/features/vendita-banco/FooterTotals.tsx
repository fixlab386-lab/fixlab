import { formatEuro } from './utils'
import type { DocumentoVenditaBanco } from './types'

type Props = {
  doc: DocumentoVenditaBanco
  vociCount: number
}

export default function FooterTotals({ doc, vociCount }: Props) {
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
          <span>Totale documento</span>
          <strong>{formatEuro(doc.totaleDocumento)}</strong>
        </div>
      </div>
    </div>
  )
}
