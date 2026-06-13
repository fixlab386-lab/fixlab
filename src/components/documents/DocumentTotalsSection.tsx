import { documentTotals } from './documentLineUtils'
import type { DocumentRow } from '../../types'

type Props = {
  rows: DocumentRow[]
  shippingCost?: number
  shippingVatRate?: number
  variant?: 'default' | 'vendita_banco'
}

export default function DocumentTotalsSection({
  rows,
  shippingCost = 0,
  shippingVatRate = 22,
  variant = 'default',
}: Props) {
  const { totalNet, totalVat, totalDocument, vatByRate } = documentTotals(rows, shippingCost, shippingVatRate)
  const isVenditaBanco = variant === 'vendita_banco'

  return (
    <div className="gestionale-doc-totals">
      <div className="gestionale-doc-totals__grid">
        <div className="gestionale-doc-totals__row">
          <span>Tot. netto</span>
          <strong>€ {totalNet.toFixed(2)}</strong>
        </div>
        {isVenditaBanco ? (
          <div className="gestionale-doc-totals__row">
            <span>Iva</span>
            <strong>€ {totalVat.toFixed(2)}</strong>
          </div>
        ) : (
          Array.from(vatByRate.entries())
            .sort(([a], [b]) => b - a)
            .map(([rate, amount]) => (
              <div key={rate} className="gestionale-doc-totals__row">
                <span>IVA {rate}%</span>
                <strong>€ {amount.toFixed(2)}</strong>
              </div>
            ))
        )}
        <div className="gestionale-doc-totals__row gestionale-doc-totals__row--total">
          <span>Totale documento</span>
          <strong>€ {totalDocument.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  )
}
