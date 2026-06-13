import { createContext, useContext, useState, type ReactNode } from 'react'

export interface CartItem {
  productId: string
  name: string
  model: string
  brand: string
  color: string
  price: number
  qty: number
  maxStock: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'qty'>) => void
  removeFromCart: (productId: string) => void
  changeQty: (productId: string, qty: number) => void
  clearCart: () => void
  cartTotal: number
  cartCount: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])

  const addToCart = (item: Omit<CartItem, 'qty'>) => {
    setCart(prev => {
      const exists = prev.find(x => x.productId === item.productId)
      if (exists) {
        if (exists.qty >= exists.maxStock) return prev
        return prev.map(x => x.productId === item.productId ? { ...x, qty: x.qty + 1 } : x)
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(x => x.productId !== productId))
  }

  const changeQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setCart(prev => prev.map(x =>
      x.productId === productId ? { ...x, qty: Math.min(qty, x.maxStock) } : x
    ))
  }

  const clearCart = () => setCart([])

  const cartTotal = cart.reduce((a, p) => a + p.price * p.qty, 0)
  const cartCount = cart.reduce((a, p) => a + p.qty, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, changeQty, clearCart, cartTotal, cartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve essere usato dentro CartProvider')
  return ctx
}