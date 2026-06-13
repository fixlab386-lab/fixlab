import type { PaymentResource, PaymentResourceType } from '../../types'

type Props = {
  resources: PaymentResource[]
  selectedResourceId: string
  onSelectResource: (id: string) => void
  cashGiven: string
  onCashGivenChange: (v: string) => void
  cardPaid: boolean
  onCardPaidChange: (v: boolean) => void
  discount: number
  discountType: 'percent' | 'fixed'
  onDiscountChange: (v: number) => void
  onDiscountTypeChange: (t: 'percent' | 'fixed') => void
  subtotal: number
  discountAmount: number
  total: number
  cashChange: number
  rtIp?: string
  processing: boolean
  cartEmpty: boolean
  onComplete: () => void
}

const RESOURCE_ICONS: Record<PaymentResourceType, string> = {
  cash: '💵',
  card: '💳',
  bank: '🏦',
}

function completeLabel(type: PaymentResourceType, processing: boolean): string {
  if (processing) return '⏳ Elaborazione…'
  if (type === 'cash') return '🧾 Incassa e stampa scontrino'
  if (type === 'card') return '💳 Conferma vendita'
  return '✅ Registra vendita'
}

export default function CassaPaymentSection({
  resources,
  selectedResourceId,
  onSelectResource,
  cashGiven,
  onCashGivenChange,
  cardPaid,
  onCardPaidChange,
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  subtotal,
  discountAmount,
  total,
  cashChange,
  rtIp,
  processing,
  cartEmpty,
  onComplete,
}: Props) {
  const selected = resources.find(r => r.id === selectedResourceId)
  const resourceType = selected?.type ?? 'cash'

  return (
    <div className="gestionale-cassa-payment">
      <div className="gestionale-cassa-payment__title">Risorsa di incasso</div>
      <div className="gestionale-cassa-payment__resources">
        {resources.map(r => (
          <button
            key={r.id}
            type="button"
            className={`gestionale-cassa-resource-btn${selectedResourceId === r.id ? ' gestionale-cassa-resource-btn--active' : ''}`}
            onClick={() => onSelectResource(r.id)}
          >
            <span className="gestionale-cassa-resource-btn__icon">{RESOURCE_ICONS[r.type] || '💰'}</span>
            <span className="gestionale-cassa-resource-btn__label">{r.name}</span>
          </button>
        ))}
      </div>

      {resourceType === 'cash' ? (
        <div className="gestionale-cassa-payment__extra">
          <label className="gestionale-cassa-payment__label">Importo dato dal cliente</label>
          <input
            type="number"
            step="0.01"
            className="gestionale-cassa-search gestionale-cassa-search--amount"
            value={cashGiven}
            onChange={e => onCashGivenChange(e.target.value)}
            placeholder={`€ ${total.toFixed(2)}`}
          />
          {cashGiven && parseFloat(cashGiven) >= total ? (
            <div className="gestionale-cassa-payment__change">
              <span>Resto</span>
              <strong>€ {cashChange.toFixed(2)}</strong>
            </div>
          ) : null}
          <p className="gestionale-cassa-payment__hint">
            🧾 Scontrino RT{rtIp ? ` (${rtIp})` : ' — IP non configurato'}
          </p>
        </div>
      ) : null}

      {resourceType === 'card' ? (
        <div className="gestionale-cassa-payment__extra">
          <label className="gestionale-cassa-payment__check">
            <input type="checkbox" checked={cardPaid} onChange={e => onCardPaidChange(e.target.checked)} />
            {cardPaid ? '✅ Pagamento avvenuto' : 'Conferma pagamento carta'}
          </label>
        </div>
      ) : null}

      {resourceType === 'bank' ? (
        <p className="gestionale-cassa-payment__hint">Registrato come da saldare in prima nota.</p>
      ) : null}

      <div className="gestionale-cassa-discount">
        <div className="gestionale-cassa-discount__head">
          <span>Sconto totale</span>
          <div className="gestionale-cassa-discount__toggle">
            <button
              type="button"
              className={discountType === 'percent' ? 'gestionale-cassa-discount__toggle--on' : ''}
              onClick={() => onDiscountTypeChange('percent')}
            >
              %
            </button>
            <button
              type="button"
              className={discountType === 'fixed' ? 'gestionale-cassa-discount__toggle--on' : ''}
              onClick={() => onDiscountTypeChange('fixed')}
            >
              €
            </button>
          </div>
        </div>
        <input
          type="number"
          step={discountType === 'percent' ? '1' : '0.01'}
          className="gestionale-cassa-search"
          value={discount || ''}
          onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)}
          placeholder={discountType === 'percent' ? 'Es: 10' : 'Es: 5.00'}
        />
      </div>

      <div className="gestionale-cassa-totals">
        <div className="gestionale-cassa-totals__row">
          <span>Subtotale</span>
          <span>€ {subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 ? (
          <div className="gestionale-cassa-totals__row gestionale-cassa-totals__row--discount">
            <span>Sconto</span>
            <span>−€ {discountAmount.toFixed(2)}</span>
          </div>
        ) : null}
        <div className="gestionale-cassa-totals__row">
          <span>IVA incl. (22%)</span>
          <span>€ {(total - total / 1.22).toFixed(2)}</span>
        </div>
        <div className="gestionale-cassa-totals__grand">
          <span>TOTALE</span>
          <span>€ {total.toFixed(2)}</span>
        </div>
      </div>

      <button
        type="button"
        className="gestionale-cassa-complete-btn"
        disabled={processing || cartEmpty}
        onClick={onComplete}
      >
        {completeLabel(resourceType, processing)}
      </button>
    </div>
  )
}
