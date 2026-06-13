import type { CartItem } from '../../contexts/CartContext'

type Props = {
  cart: CartItem[]
  cartCount: number
  onChangeQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
}

export default function CassaCartSection({ cart, cartCount, onChangeQty, onRemove }: Props) {
  return (
    <div className="gestionale-cassa-cart">
      <div className="gestionale-cassa-cart__header">
        <span>Carrello</span>
        <span className="gestionale-cassa-cart__count">{cartCount} art.</span>
      </div>
      {cart.length === 0 ? (
        <p className="gestionale-cassa-cart__empty">Aggiungi prodotti dal catalogo a sinistra</p>
      ) : (
        <div className="gestionale-cassa-cart__items">
          {cart.map(item => (
            <div key={item.productId} className="gestionale-cassa-cart__row">
              <div className="gestionale-cassa-cart__info">
                <div className="gestionale-cassa-cart__name">{item.name}</div>
                <div className="gestionale-cassa-cart__sub">
                  {item.brand} {item.model} {item.color ? `· ${item.color}` : ''}
                </div>
              </div>
              <div className="gestionale-cassa-cart__price">€ {item.price.toFixed(2)}</div>
              <div className="gestionale-cassa-cart__qty">
                <button type="button" className="gestionale-cassa-qty-btn" onClick={() => onChangeQty(item.productId, item.qty - 1)}>
                  −
                </button>
                <span>{item.qty}</span>
                <button
                  type="button"
                  className="gestionale-cassa-qty-btn"
                  disabled={item.qty >= item.maxStock}
                  onClick={() => onChangeQty(item.productId, item.qty + 1)}
                >
                  +
                </button>
              </div>
              <div className="gestionale-cassa-cart__line-total">€ {(item.price * item.qty).toFixed(2)}</div>
              <button type="button" className="gestionale-cassa-cart__remove" onClick={() => onRemove(item.productId)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
