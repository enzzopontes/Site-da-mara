"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"

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

export interface CouponItem {
  id?: string
  code: string
  title?: string
  description?: string
  discount?: number
  discount_value?: number
  type?: "percentage" | "fixed" | string
  discount_type?: "percentage" | "fixed" | string
  minOrderValue?: number | null
  min_order_value?: number | null
  minOrderVal?: number | null
  badgeLabel?: string | null
  isExhausted?: boolean
  exhaustedReason?: string
}

interface CartContextType {
  items: CartItem[]
  coupon: any | null // Cupom ativo com valor mínimo atingido (compatibilidade retroativa)
  appliedCoupon: any | null
  pendingCoupon: any | null
  activeTrackCoupon: any | null // appliedCoupon || pendingCoupon
  setCoupon: (coupon: any | null) => void
  setPendingCoupon: (coupon: any | null) => void
  removeCoupon: () => void
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  checkoutSuccess: () => void
  getTotalPrice: () => number
  subtotal: number
  discountAmount: number
  total: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null)
  const [pendingCoupon, setPendingCouponState] = useState<any | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Subtotal dinâmico da sacola
  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const adicionaisTotal = item.adicionais.reduce((sum, add) => sum + (add.price * add.quantity), 0)
      return total + (item.price + adicionaisTotal) * item.quantity
    }, 0)
  }, [items])

  // Desconto dinâmico calculado somente quando appliedCoupon estiver ativo
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0
    const minVal = Number(
      appliedCoupon.minOrderValue ?? appliedCoupon.min_order_value ?? appliedCoupon.minOrderVal ?? 0
    )
    if (subtotal < minVal) return 0

    const discount = Number(appliedCoupon.discount ?? appliedCoupon.discount_value ?? 0)
    const type = appliedCoupon.type ?? appliedCoupon.discount_type
    if (type === "percentage" || type === "percent") {
      return (subtotal * discount) / 100
    }
    return Math.min(discount, subtotal)
  }, [appliedCoupon, subtotal])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount)
  }, [subtotal, discountAmount])

  // Carregar carrinho do localStorage e cupom do sessionStorage (sessão única)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("batata top-cart")
      let initialItems: CartItem[] = []
      if (savedCart) {
        initialItems = JSON.parse(savedCart)
        setItems(initialItems)
      }

      const initialSubtotal = initialItems.reduce((sum, item) => {
        const adicionaisTotal = item.adicionais.reduce((acc, add) => acc + (add.price * add.quantity), 0)
        return sum + (item.price + adicionaisTotal) * item.quantity
      }, 0)

      const savedCoupon = sessionStorage.getItem("batata top-coupon")
      if (savedCoupon) {
        const parsed = JSON.parse(savedCoupon)
        const minVal = Number(
          parsed.minOrderValue ?? parsed.min_order_value ?? parsed.minOrderVal ?? 0
        )
        if (initialSubtotal >= minVal) {
          setAppliedCoupon(parsed)
          setPendingCouponState(null)
        } else {
          setAppliedCoupon(null)
          setPendingCouponState(parsed)
        }
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

  // Auto-reavaliação de elegibilidade do cupom quando subtotal muda (impedir desconto indevido)
  useEffect(() => {
    if (!isInitialized) return

    if (appliedCoupon) {
      const minVal = Number(
        appliedCoupon.minOrderValue ?? appliedCoupon.min_order_value ?? appliedCoupon.minOrderVal ?? 0
      )
      if (subtotal < minVal) {
        // Se o subtotal caiu abaixo do valor mínimo, rebaixa para pendente imediatamente
        setPendingCouponState(appliedCoupon)
        setAppliedCoupon(null)
      }
    } else if (pendingCoupon) {
      const minVal = Number(
        pendingCoupon.minOrderValue ?? pendingCoupon.min_order_value ?? pendingCoupon.minOrderVal ?? 0
      )
      if (subtotal >= minVal) {
        // Se o subtotal atingiu o valor mínimo exigido, promove para cupom ativo
        setAppliedCoupon(pendingCoupon)
        setPendingCouponState(null)
      }
    }
  }, [subtotal, appliedCoupon, pendingCoupon, isInitialized])

  // Sincronizar cupom de sessão única em sessionStorage
  useEffect(() => {
    if (!isInitialized) return
    const active = appliedCoupon || pendingCoupon
    if (active) {
      try {
        sessionStorage.setItem("batata top-coupon", JSON.stringify(active))
      } catch {}
    } else {
      try {
        sessionStorage.removeItem("batata top-coupon")
      } catch {}
    }
  }, [appliedCoupon, pendingCoupon, isInitialized])

  const setCoupon = useCallback((newCoupon: any | null) => {
    if (!newCoupon) {
      setAppliedCoupon(null)
      setPendingCouponState(null)
      try {
        sessionStorage.removeItem("batata top-coupon")
      } catch {}
      return
    }

    const minVal = Number(
      newCoupon.minOrderValue ?? newCoupon.min_order_value ?? newCoupon.minOrderVal ?? 0
    )

    if (subtotal >= minVal) {
      setAppliedCoupon(newCoupon)
      setPendingCouponState(null)
    } else {
      setAppliedCoupon(null)
      setPendingCouponState(newCoupon)
    }
  }, [subtotal])

  const setPendingCoupon = useCallback((newCoupon: any | null) => {
    setPendingCouponState(newCoupon)
    if (newCoupon) {
      const minVal = Number(
        newCoupon.minOrderValue ?? newCoupon.min_order_value ?? newCoupon.minOrderVal ?? 0
      )
      if (subtotal >= minVal) {
        setAppliedCoupon(newCoupon)
        setPendingCouponState(null)
      }
    }
  }, [subtotal])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
    setPendingCouponState(null)
    try {
      sessionStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata_applied_coupon")
      localStorage.removeItem("batata_pending_coupon")
    } catch {}
  }, [])

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const sortAdicionais = (ads: any[]) =>
        [...ads]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((a) => ({ id: a.id, quantity: a.quantity }))

      const existingItemIndex = prev.findIndex(
        (item) =>
          item.id.slice(0, 36) === newItem.id.slice(0, 36) &&
          item.category === newItem.category &&
          item.pastaType === newItem.pastaType &&
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
    setAppliedCoupon(null)
    setPendingCouponState(null)
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
    return subtotal
  }

  return (
    <CartContext.Provider
      value={{
        items,
        coupon: appliedCoupon, // Retrocompatibilidade: apenas retorna o cupom se estiver elegível/aplicado
        appliedCoupon,
        pendingCoupon,
        activeTrackCoupon: appliedCoupon || pendingCoupon,
        setCoupon,
        setPendingCoupon,
        removeCoupon,
        addItem,
        removeItem,
        removeFromCart: removeItem,
        updateQuantity,
        clearCart,
        checkoutSuccess,
        getTotalPrice,
        subtotal,
        discountAmount,
        total,
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
