import type { CartItem } from '../../contexts/CartContext'
import type { Product } from '../../types'

export function productToCartItem(p: Product): Omit<CartItem, 'qty'> {
  return {
    productId: p.id,
    name: p.name,
    model: p.model,
    brand: p.brand || '',
    color: p.color || '',
    price: p.price ?? 0,
    maxStock: p.stock,
  }
}

export function filterCatalogProducts(products: Product[], searchLower: string): Product[] {
  if (!searchLower) return products.filter(p => p.stock > 0).slice(0, 24)
  return products
    .filter(p => {
      const hay = `${p.code} ${p.name} ${p.brand} ${p.model} ${p.barcode || ''}`.toLowerCase()
      return hay.includes(searchLower) && p.stock > 0
    })
    .slice(0, 24)
}
