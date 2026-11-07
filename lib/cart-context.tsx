"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  category: "batata" | "bebida"
  pastaType?: "penne" | "parafuso" | "espaguete" // Tipo de macarrão (apenas para categoria macarrao)
  observacoes?: string
  adicionais: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

interface CartContextType {
  items: CartItem[]
  coupon: any | null
  setCoupon: (coupon: any | null) => void
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  checkoutSuccess: () => void
  getTotalPrice: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [coupon, setCouponState] = useState<any | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar carrinho do localStorage e cupom do sessionStorage (sessão única)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("batata top-cart")
      if (savedCart) {
        setItems(JSON.parse(savedCart))
      }
      
      // Cupom salvo em sessionStorage para validade restrita ao pedido atual
      const savedCoupon = sessionStorage.getItem("batata top-coupon")
      if (savedCoupon) {
        setCouponState(JSON.parse(savedCoupon))
      }

      // Limpeza de cupom permanente legado do localStorage
      localStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata_applied_coupon")
      localStorage.removeItem("batata_pending_coupon")
    } catch {
      // Ignora erro de JSON
    }
    setIsInitialized(true)
  }, [])

  // Salvar carrinho no localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("batata top-cart", JSON.stringify(items))
    }
  }, [items, isInitialized])

  // Salvar cupom estritamente em sessionStorage (sessão única)
  useEffect(() => {
    if (isInitialized) {
      if (coupon) {
        sessionStorage.setItem("batata top-coupon", JSON.stringify(coupon))
      } else {
        sessionStorage.removeItem("batata top-coupon")
      }
    }
  }, [coupon, isInitialized])

  const setCoupon = (newCoupon: any | null) => {
    setCouponState(newCoupon)
  }

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      // Ordenar adicionais para comparação consistente
      const sortAdicionais = (ads: any[]) => 
        [...ads].sort((a, b) => a.id.localeCompare(b.id))
          .map(a => ({ id: a.id, quantity: a.quantity }));

      const existingItemIndex = prev.findIndex(
        (item) =>
          item.id.slice(0, 36) === newItem.id.slice(0, 36) &&
          item.category === newItem.category &&
          item.pastaType === newItem.pastaType && // Comparar também o tipo de macarrão
          JSON.stringify(sortAdicionais(item.adicionais)) === JSON.stringify(sortAdicionais(newItem.adicionais))
      )

      if (existingItemIndex !== -1) {
        const updated = [...prev]
        updated[existingItemIndex] = {
          ...updated[existingItemIndex],
          quantity: updated[existingItemIndex].quantity + newItem.quantity,
        }
        return updated
      }

      // Gerar um ID único para cada combinação de produto + adicionais + tipo de macarrão
      return [...prev, { ...newItem, id: `${newItem.id.slice(0, 36)}-${Date.now()}` }]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const clearCart = () => {
    setItems([])
    setCouponState(null)
    try {
      sessionStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata_applied_coupon")
      localStorage.removeItem("batata_pending_coupon")
    } catch {}
  }

  const checkoutSuccess = () => {
    clearCart()
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const adicionaisTotal = item.adicionais.reduce((sum, add) => sum + (add.price * add.quantity), 0)
      return total + (item.price + adicionaisTotal) * item.quantity
    }, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        coupon,
        setCoupon,
        addItem,
        removeItem,
        removeFromCart: removeItem,
        updateQuantity,
        clearCart,
        checkoutSuccess,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
