import { useMemo, useState } from 'react'
import type { Product } from '../../types'
import type { CartItem } from '../../contexts/CartContext'
import BarcodeScanner from '../BarcodeScanner'
import { filterCatalogProducts, productToCartItem } from './productToCart'

type Props = {
  products: Product[]
  onAdd: (item: Omit<CartItem, 'qty'>) => void
}

export default function CassaProductCatalog({ products, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const searchLower = search.trim().toLowerCase()
  const filtered = useMemo(
    () => filterCatalogProducts(products, searchLower),
    [products, searchLower],
  )

  const handleBarcode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    setShowScanner(false)
    const p = products.find(x => (x.barcode || '').trim() === trimmed)
    if (p && p.stock > 0) {
      onAdd(productToCartItem(p))
      setSearch('')
    }
  }

  return (
    <div className="gestionale-cassa-catalog">
      <div className="gestionale-cassa-catalog__header">
        <span className="gestionale-cassa-catalog__title">Catalogo</span>
        <button type="button" className="gestionale-cassa-btn gestionale-cassa-btn--sm" onClick={() => setShowScanner(true)}>
          📷 Barcode
        </button>
      </div>
      <input
        className="gestionale-cassa-search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Codice, nome, barcode…"
        autoFocus
      />
      <div className="gestionale-cassa-catalog__list">
        {filtered.length === 0 ? (
          <p className="gestionale-cassa-catalog__empty">Nessun prodotto disponibile</p>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="gestionale-cassa-catalog__item"
              onClick={() => onAdd(productToCartItem(p))}
            >
              <span className="gestionale-cassa-catalog__code">{p.code}</span>
              <span className="gestionale-cassa-catalog__name">{p.name}</span>
              <span className="gestionale-cassa-catalog__meta">
                Giac. {p.stock} · € {(p.price ?? 0).toFixed(2)}
              </span>
            </button>
          ))
        )}
      </div>
      {showScanner ? <BarcodeScanner onScan={handleBarcode} onClose={() => setShowScanner(false)} /> : null}
    </div>
  )
}
