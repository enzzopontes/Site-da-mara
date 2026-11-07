"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Trash2, X, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import * as SheetPrimitive from "@radix-ui/react-dialog"

import { useCart, type CartItem } from "@/lib/cart-context"
import { ClearCartDialog } from "@/components/checkout/clear-cart-dialog"

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const router = useRouter()
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // 1. Esvaziamento total com limpeza de sessão, fechamento do drawer e redirecionamento
  const handleEmptyCart = useCallback(() => {
    // Limpa carrinho e storage de cupons
    clearCart()
    try {
      localStorage.removeItem("batata top-cart")
      localStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata_applied_coupon")
      localStorage.removeItem("batata_pending_coupon")
      sessionStorage.removeItem("batata top-coupon")
      sessionStorage.removeItem("batata_applied_coupon")
      sessionStorage.removeItem("batata_pending_coupon")
    } catch {}

    // Fecha o modal de confirmação e a gaveta imediatamente
    setShowClearConfirm(false)
    onOpenChange(false)

    // Redireciona para a home
    router.push("/")

    // Toast flutuante no topo (auto-dismiss 3.5s)
    toast("Sua sacola foi esvaziada. Escolha novos produtos!", {
      duration: 3500,
      position: "top-center",
    })
  }, [clearCart, onOpenChange, router])

  // 2. Remoção unitária do item
  const handleRemoveItem = useCallback(
    (id: string) => {
      if (items.length <= 1) {
        handleEmptyCart()
        return
      }
      removeItem(id)
    },
    [items.length, handleEmptyCart, removeItem]
  )

  // 3. Atualização de quantidade inline
  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        if (items.length <= 1) {
          handleEmptyCart()
          return
        }
        removeItem(id)
        return
      }
      updateQuantity(id, quantity)
    },
    [items.length, handleEmptyCart, removeItem, updateQuantity]
  )

  const totalPrice = getTotalPrice()
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <SheetPrimitive.Portal>
          <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <SheetPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-400 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
            {/* Header da Gaveta */}
            <div className="flex items-center justify-between border-b border-[#ECE7E0] p-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#C1440E]" />
                <SheetPrimitive.Title className="text-base font-black text-[#1F1B16]">
                  Sua Sacola ({totalCount})
                </SheetPrimitive.Title>
              </div>

              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs font-bold text-[#C1440E] hover:text-[#9c3609] px-2.5 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Limpar
                  </button>
                )}
                <SheetPrimitive.Close className="w-8 h-8 rounded-full bg-[#F7F5F0] hover:bg-[#ECE7E0] text-[#1F1B16] flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </SheetPrimitive.Close>
              </div>
            </div>

            {/* Lista de Itens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-3xl bg-[#F7F5F0] border border-[#ECE7E0] flex items-center justify-center text-stone-400 mb-3">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-[#1F1B16]">Sua sacola está vazia</h3>
                  <p className="text-xs text-[#6B6157] mt-1 max-w-xs">
                    Adicione itens deliciosos para iniciar seu pedido.
                  </p>
                </div>
              ) : (
                items.map((item: CartItem) => {
                  const adicionaisTotal = (item.adicionais || []).reduce(
                    (acc, a) => acc + a.price * a.quantity,
                    0
                  )
                  const itemTotal = (item.price + adicionaisTotal) * item.quantity

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-[#ECE7E0] bg-[#FCFBF9] flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-[#1F1B16] truncate">{item.name}</h4>
                        {item.pastaType && (
                          <span className="text-[10px] font-bold text-[#C1440E] uppercase">
                            Massa: {item.pastaType}
                          </span>
                        )}
                        <p className="text-xs font-black text-[#1F1B16] mt-1">
                          R$ {itemTotal.toFixed(2).replace(".", ",")}
                        </p>
                      </div>

                      {/* Controle de Quantidade */}
                      <div className="flex items-center gap-1.5 bg-white border border-[#ECE7E0] rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 text-[#1F1B16] hover:text-red-600 flex items-center justify-center transition-colors"
                          aria-label="Diminuir"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="w-5 text-center text-xs font-black text-[#1F1B16]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg hover:bg-amber-50 text-[#1F1B16] hover:text-[#C1440E] flex items-center justify-center transition-colors"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Rodapé da Gaveta */}
            {items.length > 0 && (
              <div className="border-t border-[#ECE7E0] p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B6157]">Subtotal</span>
                  <span className="text-base font-black text-[#1F1B16]">
                    R$ {totalPrice.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    router.push("/checkout")
                  }}
                  className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Continuar para checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
      </SheetPrimitive.Root>

      {/* Modal de confirmação estilo iFood */}
      <ClearCartDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleEmptyCart}
      />
    </>
  )
}

// Alias exportável para suporte a CartDrawer
export const CartDrawer = CartSheet
