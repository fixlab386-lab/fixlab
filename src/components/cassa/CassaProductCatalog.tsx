import { useEffect, useState } from 'react'
import type { Product } from '../../types'
import type { CartItem } from '../../contexts/CartContext'
import { findProductByBarcode, searchProducts } from '../../lib/firestorePagination'
import { loadRecentProducts } from '../../lib/loadStudioCatalog'
import BarcodeScanner from '../BarcodeScanner'
import { productToCartItem } from './productToCart'

type Props = {
  studioId: string
  products: Product[]
  onAdd: (item: Omit<CartItem, 'qty'>) => void
}

export default function CassaProductCatalog({ studioId, products, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!studioId) return
    const term = search.trim()
    if (!term) {
      void loadRecentProducts(studioId, 24).then(items => {
        setResults(items.filter(p => p.stock > 0))
      })
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchProducts(studioId, term)
        .then(items => {
          if (!cancelled) setResults(items.filter(p => p.stock > 0))
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [studioId, search])

  const handleBarcode = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed || !studioId) return
    setShowScanner(false)
    void findProductByBarcode(studioId, trimmed).then(p => {
      if (p && p.stock > 0) {
        onAdd(productToCartItem(p))
        setSearch('')
        return
      }
      const local = products.find(x => (x.barcode || '').trim() === trimmed)
      if (local && local.stock > 0) {
        onAdd(productToCartItem(local))
        setSearch('')
      }
    })
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
        {searching ? <p className="gestionale-cassa-catalog__empty">Ricerca…</p> : null}
        {!searching && results.length === 0 ? (
          <p className="gestionale-cassa-catalog__empty">Nessun prodotto disponibile</p>
        ) : null}
        {!searching
          ? results.map(p => (
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
          : null}
      </div>
      {showScanner ? <BarcodeScanner onScan={handleBarcode} onClose={() => setShowScanner(false)} /> : null}
    </div>
  )
}
