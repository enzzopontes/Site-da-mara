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
  adicionais: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar carrinho do localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("batata top-cart")
    if (savedCart) {
      setItems(JSON.parse(savedCart))
    }
    setIsInitialized(true)
  }, [])

  // Salvar carrinho no localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("batata top-cart", JSON.stringify(items))
    }
  }, [items, isInitialized])

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
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const adicionaisTotal = item.adicionais.reduce((sum, add) => sum + (add.price * add.quantity), 0)
      return total + (item.price + adicionaisTotal) * item.quantity
    }, 0)
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, getTotalPrice }}>
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