import type { PaymentSummary } from '../../lib/paymentResources'

type Props = {
  summary: PaymentSummary
}

export default function PaymentSummaryBar({ summary }: Props) {
  return (
    <div className="gestionale-payment-summary">
      <div className="gestionale-payment-summary__totals">
        <div className="gestionale-payment-summary__item">
          <span className="gestionale-payment-summary__label">Entrate</span>
          <span className="gestionale-payment-summary__value gestionale-payment-summary__value--in">
            € {summary.totalIn.toFixed(2)}
          </span>
        </div>
        <div className="gestionale-payment-summary__item">
          <span className="gestionale-payment-summary__label">Uscite</span>
          <span className="gestionale-payment-summary__value gestionale-payment-summary__value--out">
            € {summary.totalOut.toFixed(2)}
          </span>
        </div>
        <div className="gestionale-payment-summary__item gestionale-payment-summary__item--balance">
          <span className="gestionale-payment-summary__label">Saldo periodo</span>
          <span
            className={`gestionale-payment-summary__value${summary.balance >= 0 ? ' gestionale-payment-summary__value--in' : ' gestionale-payment-summary__value--out'}`}
          >
            € {summary.balance.toFixed(2)}
          </span>
        </div>
      </div>
      {summary.byResource.length > 0 ? (
        <div className="gestionale-payment-summary__resources">
          {summary.byResource.map(r => (
            <span key={r.resourceId} className="gestionale-payment-summary__resource-chip">
              <strong>{r.name}:</strong> € {r.balance.toFixed(2)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
