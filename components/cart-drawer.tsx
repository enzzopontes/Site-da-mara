"use client"

import React, { useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, Tag, X } from "lucide-react"
import { toast } from "sonner"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { useCart } from "@/lib/cart-context"
import { ClearCartDialog } from "@/components/checkout/clear-cart-dialog"
import { CouponProgressBar } from "@/components/coupons/coupon-progress-bar"

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
    appliedCoupon,
    pendingCoupon,
    activeTrackCoupon,
    discountAmount,
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
  const currentDiscount = discountAmount > 0 ? discountAmount : 0
  const finalTotal = Math.max(0, subtotal - currentDiscount)

  const handleCheckout = () => {
    onOpenChange(false)
    router.push("/checkout")
  }

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          {/* Backdrop semi-transparente clicável com desfoque e fade */}
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />

          {/* Gaveta Lateral (Slide-over Drawer) alinhada à direita */}
          <DialogPrimitive.Content
            aria-describedby="cart-drawer-desc"
            className="fixed inset-y-0 right-0 z-50 flex h-full w-full sm:w-[420px] sm:max-w-md flex-col bg-white shadow-2xl transition ease-in-out duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right focus:outline-hidden"
          >
            <DialogPrimitive.Description id="cart-drawer-desc" className="sr-only">
              Gaveta lateral da sua sacola de compras com itens selecionados e resumo do pedido.
            </DialogPrimitive.Description>

            {/* HEADER DO DRAWER */}
            <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FEF8EC] text-[#E3A008] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <DialogPrimitive.Title className="text-lg font-black text-[#1F1B16]">
                    Sua Sacola
                  </DialogPrimitive.Title>
                  <p className="text-xs text-gray-500 font-medium">
                    {totalItems === 0
                      ? "Nenhum item adicionado"
                      : `${totalItems} ${totalItems === 1 ? "item adicionado" : "itens adicionados"}`}
                  </p>
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
                <DialogPrimitive.Close
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Fechar sacola"
                >
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </header>

            {/* BARRA DE PROGRESSO GAMIFICADA DO CUPOM (se houver cupom ativo ou pendente) */}
            {activeTrackCoupon && items.length > 0 && (
              <div className="px-5 pt-3.5 pb-1 shrink-0">
                <CouponProgressBar subtotal={subtotal} targetCoupon={activeTrackCoupon} />
              </div>
            )}

            {/* CORPO: ITENS OU ESTADO VAZIO */}
            {items.length === 0 ? (
              <div className="flex-1 p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#1F1B16]">Sua sacola está vazia</h3>
                <p className="text-xs text-gray-500 max-w-xs">
                  Escolha suas batatas recheadas, massas artesanais e bebidas favoritas para montar seu pedido.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    router.push("/cardapio")
                  }}
                  className="mt-2 px-5 py-2.5 bg-[#E3A008] hover:bg-[#C68A07] active:scale-95 text-white font-bold text-xs rounded-full shadow-sm transition-all cursor-pointer"
                >
                  Explorar Cardápio
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3 space-y-4 divide-y divide-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                          <div className="flex items-center gap-2 bg-[#F4F4F5] rounded-full p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center transition-colors active:scale-95 shadow-xs cursor-pointer"
                              aria-label="Diminuir quantidade"
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
                              className="w-7 h-7 rounded-full bg-[#E3A008] hover:bg-[#C68A07] text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs cursor-pointer"
                              aria-label="Aumentar quantidade"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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

            {/* FOOTER FIXO NA BASE COM RESUMO FINANCEIRO E CTA */}
            {items.length > 0 && (
              <footer className="shrink-0 bg-white border-t border-gray-100 p-4 sm:p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] space-y-3">
                {/* Linha informativa de cupom ativo ou link para cupons */}
                {appliedCoupon ? (
                  <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" /> Cupom {appliedCoupon.code}
                    </span>
                    <span className="font-black text-emerald-700">Ativo no pedido</span>
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

                {/* Discriminação de Subtotal, Entrega e Descontos */}
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">
                      R$ {subtotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Taxa de entrega</span>
                    <span className="font-semibold text-emerald-600">Grátis (Iacanga)</span>
                  </div>

                  {currentDiscount > 0 && appliedCoupon && (
                    <div className="flex items-center justify-between font-bold text-emerald-600">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>- R$ {currentDiscount.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm font-black text-[#1F1B16]">
                    <span>Total</span>
                    <span className="text-base text-[#1F1B16]">
                      R$ {finalTotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      router.push("/cardapio")
                    }}
                    className="px-4 py-3 border border-gray-200 hover:border-gray-300 active:scale-95 text-gray-700 font-bold text-xs sm:text-sm rounded-2xl transition-all cursor-pointer"
                  >
                    + Itens
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="flex-1 bg-[#E3A008] hover:bg-[#C68A07] active:scale-[0.98] text-white font-black text-sm sm:text-base h-12 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Ir para a finalização</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </footer>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <ClearCartDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleEmptyCart}
      />
    </>
  )
}
