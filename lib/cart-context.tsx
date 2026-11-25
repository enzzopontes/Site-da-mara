"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { evaluateCoupon } from "@/lib/coupon-rules"
import { trackAddToCart } from "@/lib/meta-pixel"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  category: string
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
  updateItem: (id: string, updated: Partial<CartItem>) => void
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
    const sum = items.reduce((total, item) => {
      const adicionaisTotal = (item.adicionais || []).reduce(
        (acc, a) => acc + (Number(a.price) || 0) * (Number(a.quantity) || 0),
        0
      )
      const lineTotal = Math.round(((Number(item.price) || 0) + adicionaisTotal) * (Number(item.quantity) || 0) * 100) / 100
      return total + lineTotal
    }, 0)
    return Math.round(sum * 100) / 100
  }, [items])

  // Desconto dinâmico calculado somente quando appliedCoupon estiver ativo
  const discountAmount = useMemo(() => {
    // Base oficial: subtotal bruto dos itens (sem frete). Pendente => desconto 0.
    return Math.round((Number(evaluateCoupon(appliedCoupon, subtotal, items).discount) || 0) * 100) / 100
  }, [appliedCoupon, subtotal, items])

  const total = useMemo(() => {
    return Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100)
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
        if (evaluateCoupon(parsed, initialSubtotal, initialItems).status === "applied") {
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
      if (evaluateCoupon(appliedCoupon, subtotal, items).status === "pending") {
        // Se o subtotal caiu abaixo do valor mínimo, rebaixa para pendente imediatamente
        setPendingCouponState(appliedCoupon)
        setAppliedCoupon(null)
      }
    } else if (pendingCoupon) {
      if (evaluateCoupon(pendingCoupon, subtotal, items).status === "applied") {
        // Se o subtotal atingiu o valor mínimo exigido, promove para cupom ativo
        setAppliedCoupon(pendingCoupon)
        setPendingCouponState(null)
      }
    }
  }, [subtotal, items, appliedCoupon, pendingCoupon, isInitialized])

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

    if (evaluateCoupon(newCoupon, subtotal, items).status === "applied") {
      setAppliedCoupon(newCoupon)
      setPendingCouponState(null)
    } else {
      setAppliedCoupon(null)
      setPendingCouponState(newCoupon)
    }
  }, [subtotal, items])

  const setPendingCoupon = useCallback((newCoupon: any | null) => {
    setPendingCouponState(newCoupon)
    if (newCoupon) {
      if (evaluateCoupon(newCoupon, subtotal, items).status === "applied") {
        setAppliedCoupon(newCoupon)
        setPendingCouponState(null)
      }
    }
  }, [subtotal, items])

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
    const qty = Number(newItem.quantity) || 1
    const adicionaisTotal = (newItem.adicionais || []).reduce(
      (acc, a) => acc + (Number(a.price) || 0) * (Number(a.quantity) || 0),
      0
    )
    const totalValue = Math.round(((Number(newItem.price) || 0) + adicionaisTotal) * qty * 100) / 100

    trackAddToCart({
      id: String(newItem.id),
      name: newItem.name,
      category: newItem.category,
      value: totalValue,
      quantity: qty,
    })

    setItems((prev) => {
      const sortAdicionais = (ads: any[] = []) =>
        [...(ads || [])]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((a) => ({ id: a.id, quantity: a.quantity }))
      const normalizeObs = (obs?: string) => (obs || "").trim()
      const normalizedObs = normalizeObs(newItem.observacoes) || undefined

      const existingItemIndex = prev.findIndex(
        (item) =>
          item.id.slice(0, 36) === newItem.id.slice(0, 36) &&
          item.category === newItem.category &&
          item.pastaType === newItem.pastaType &&
          normalizeObs(item.observacoes) === normalizeObs(newItem.observacoes) &&
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

      return [...prev, { ...newItem, observacoes: normalizedObs, id: `${newItem.id.slice(0, 36)}-${Date.now()}` }]
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

  const updateItem = (id: string, updatedFields: Partial<CartItem>) => {
    setItems((prev) => {
      const targetIndex = prev.findIndex((item) => item.id === id)
      if (targetIndex === -1) return prev

      const normalizeObs = (obs?: string) => (obs || "").trim()
      const sortAdicionais = (ads: CartItem["adicionais"] = []) =>
        [...(ads || [])]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((a) => ({ id: a.id, quantity: a.quantity }))

      const merged: CartItem = {
        ...prev[targetIndex],
        ...updatedFields,
        id: prev[targetIndex].id,
      }
      merged.observacoes = normalizeObs(merged.observacoes) || undefined

      if ((Number(merged.quantity) || 0) <= 0) {
        return prev.filter((item) => item.id !== id)
      }

      const duplicateIndex = prev.findIndex(
        (item, idx) =>
          idx !== targetIndex &&
          item.id.slice(0, 36) === merged.id.slice(0, 36) &&
          item.category === merged.category &&
          item.pastaType === merged.pastaType &&
          normalizeObs(item.observacoes) === normalizeObs(merged.observacoes) &&
          JSON.stringify(sortAdicionais(item.adicionais)) === JSON.stringify(sortAdicionais(merged.adicionais))
      )

      if (duplicateIndex !== -1) {
        return prev
          .map((item, idx) =>
            idx === duplicateIndex
              ? { ...item, quantity: item.quantity + merged.quantity }
              : item
          )
          .filter((_, idx) => idx !== targetIndex)
      }

      return prev.map((item, idx) => (idx === targetIndex ? merged : item))
    })
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
        updateItem,
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
