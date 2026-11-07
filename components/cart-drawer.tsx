"use client"

import React, { useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, Sparkles, Tag, X } from "lucide-react"
import { toast } from "sonner"
import { useCart } from "@/lib/cart-context"
import { ClearCartDialog } from "@/components/checkout/clear-cart-dialog"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function resolveProductImage(img?: string) {
  if (!img) return "/placeholder.jpg"
  if (img.startsWith("/") || img.startsWith("http")) return img
  return `/products/${img}`
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const router = useRouter()
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
    coupon,
  } = useCart()

  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Esvaziamento completo da sacola
  const handleEmptyCart = useCallback(() => {
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

    setShowClearConfirm(false)
    onOpenChange(false)
    router.push("/")
    toast("Sua sacola foi esvaziada. Escolha novos produtos!", {
      duration: 3500,
      position: "top-center",
    })
  }, [clearCart, onOpenChange, router])

  // Remoção unitária com checagem de último item
  const handleRemoveItem = useCallback(
    (id: string) => {
      if (items.length <= 1) {
        handleEmptyCart()
        return
      }
      removeFromCart(id)
    },
    [items.length, handleEmptyCart, removeFromCart]
  )

  // Alteração de quantidade com checagem de último item
  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        if (items.length <= 1) {
          handleEmptyCart()
          return
        }
        removeFromCart(id)
        return
      }
      updateQuantity(id, quantity)
    },
    [items.length, handleEmptyCart, removeFromCart, updateQuantity]
  )

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = getTotalPrice()

  const handleCheckout = () => {
    onOpenChange(false)
    router.push("/checkout")
  }

  return (
    <>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        showCloseButton={false}
        showHandle={true}
        className="p-0 border-none sm:border sm:border-gray-100 bg-white flex flex-col overflow-hidden sm:max-w-lg sm:rounded-3xl rounded-t-[28px] max-h-[90vh]"
      >
        {/* HEADER DO CARRINHO */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF8EC] text-[#E3A008] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <ResponsiveModalTitle className="text-lg font-black text-[#1F1B16]">
                Sua Sacola
              </ResponsiveModalTitle>
              <ResponsiveModalDescription className="text-xs text-gray-500 font-medium">
                {totalItems === 0
                  ? "Nenhum item adicionado"
                  : `${totalItems} ${totalItems === 1 ? "item adicionado" : "itens adicionados"}`}
              </ResponsiveModalDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs font-bold text-[#C1440E] hover:text-[#9c3609] px-2.5 py-1.5 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
              >
                Limpar sacola
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
              aria-label="Fechar sacola"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CORPO: ITENS OU VAZIO */}
        {items.length === 0 ? (
          <div className="flex-1 p-8 text-center flex flex-col items-center justify-center">
            <div className="relative w-[180px] h-[180px] mb-3">
              <Image
                src="/assets/pedidos.png"
                alt="Sua sacola está vazia"
                width={180}
                height={180}
                className="w-full h-full object-contain mx-auto"
              />
            </div>
            <h3 className="text-[18px] font-bold text-[#1F1B16] mb-2">Sua sacola está vazia</h3>
            <p className="text-[14px] text-[#6B6157] text-center leading-5 mb-6 max-w-xs">
              Que tal adicionar algumas deliciosas batatas recheadas para começar?
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                router.push("/cardapio")
              }}
              className="bg-[#E3A008] hover:bg-[#B5860A] active:scale-[0.98] text-white font-bold text-[15px] px-6 py-3 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Ver Cardápio
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4 divide-y divide-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const adicionaisTotal = item.adicionais.reduce(
                (sum, a) => sum + a.price * a.quantity,
                0
              )
              const unitTotal = item.price + adicionaisTotal
              const itemTotal = unitTotal * item.quantity

              return (
                <div key={item.id} className="pt-4 first:pt-0 flex gap-3 sm:gap-4 items-start">
                  {/* Foto do item */}
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                    <Image
                      src={resolveProductImage(item.image)}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>

                  {/* Detalhes e adicionais */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#1F1B16] leading-tight line-clamp-1">
                        {item.name}
                      </h4>
                      <span className="text-sm font-black text-[#1F1B16] shrink-0">
                        R$ {itemTotal.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    {item.pastaType && (
                      <span className="inline-block mt-1 text-[11px] font-bold text-[#8A6100] bg-[#FEF8EC] px-2 py-0.5 rounded-md">
                        Massa: {item.pastaType}
                      </span>
                    )}

                    {item.adicionais.length > 0 && (
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                        {item.adicionais
                          .map((a) => `${a.quantity}x ${a.name}`)
                          .join(", ")}
                      </p>
                    )}

                    {item.observacoes && (
                      <p className="text-[11px] text-gray-400 italic mt-0.5 line-clamp-1">
                        Obs: {item.observacoes}
                      </p>
                    )}

                    {/* Controles de Quantidade */}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-2 bg-[#F4F4F5] rounded-full p-0.5" data-vaul-no-drag>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center transition-colors active:scale-95 shadow-xs"
                          aria-label="Diminuir quantidade"
                          data-vaul-no-drag
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="text-xs font-black text-[#1F1B16] min-w-[20px] text-center">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-[#E3A008] hover:bg-[#C68A07] text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs"
                          aria-label="Aumentar quantidade"
                          data-vaul-no-drag
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                        data-vaul-no-drag
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* FOOTER FIXO COM RESUMO E CTA */}
        {items.length > 0 && (
          <div className="shrink-0 bg-white border-t border-gray-100 p-4 sm:p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] space-y-3">
            {/* Cupom aplicado tag ou link para ver cupons */}
            {coupon ? (
              <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                <span className="flex items-center gap-1.5 font-bold">
                  <Tag className="w-3.5 h-3.5" /> Cupom {coupon.code}
                </span>
                <span className="font-black">Ativo no pedido</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs bg-[#FEF8EC] text-[#A16207] px-3 py-1.5 rounded-xl border border-[#E3A008]/20">
                <span className="flex items-center gap-1.5 font-bold">
                  <Tag className="w-3.5 h-3.5 text-[#E3A008]" /> Tem cupom de desconto?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    router.push("/cupons?from=cart")
                  }}
                  className="font-black text-[#E3A008] hover:underline cursor-pointer"
                >
                  Ver cupons
                </button>
              </div>
            )}

            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-500">Subtotal</span>
              <span className="font-black text-lg text-[#1F1B16]">
                R$ {subtotal.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {/* Botão de Finalização */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  router.push("/cardapio")
                }}
                className="px-4 py-3 border border-gray-200 hover:border-gray-300 active:scale-95 text-gray-700 font-bold text-xs sm:text-sm rounded-2xl transition-all"
              >
                + Itens
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 bg-[#E3A008] hover:bg-[#C68A07] active:scale-[0.98] text-white font-black text-sm sm:text-base h-12 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </ResponsiveModalContent>
    </ResponsiveModal>

      <ClearCartDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleEmptyCart}
      />
    </>
  )
}
