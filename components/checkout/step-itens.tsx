"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Trash2,
  Plus,
  Minus,
  Ticket,
  X,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Loader2,
} from "lucide-react"
import { CartItem } from "@/lib/cart-context"
import { Coupon } from "@/lib/cupons-manager"

interface StepItensProps {
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  discountAmount: number
  finalTotal: number
  appliedCoupon: Coupon | null
  couponCode: string
  couponError: string
  validandoCupom: boolean
  deliveryType: "delivery" | "pickup"
  recommendedProducts: any[]
  onUpdateQuantity: (id: string, qty: number) => void
  onRemoveItem: (id: string) => void
  onSetCouponCode: (code: string) => void
  onApplyCoupon: () => void
  onRemoveCoupon: () => void
  onAddQuickItem: (product: any) => void
}

export function StepItens({
  items,
  subtotal,
  deliveryFee,
  discountAmount,
  finalTotal,
  appliedCoupon,
  couponCode,
  couponError,
  validandoCupom,
  deliveryType,
  recommendedProducts,
  onUpdateQuantity,
  onRemoveItem,
  onSetCouponCode,
  onApplyCoupon,
  onRemoveCoupon,
  onAddQuickItem,
}: StepItensProps) {
  const router = useRouter()

  // Filtra produtos recomendados que já estão na sacola
  const cartProductIds = new Set(items.map((i) => i.id.split("-")[0]))
  const filteredRecommendations = recommendedProducts.filter(
    (p) => !cartProductIds.has(String(p.id)) && p.available !== false
  )

  const resolveImage = (img?: string | null) => {
    if (!img) return "/products/default.jpg"
    if (img.startsWith("http") || img.startsWith("/")) return img
    return `/products/${img}`
  }

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Header do Restaurante / Loja */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#F7F5F0] border border-[#ECE7E0] flex-shrink-0 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Batata Top"
              width={48}
              height={48}
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1F1B16]">Batata Top</h2>
            <p className="text-xs text-[#6B6157]">Delivery & Balcão • Iacanga</p>
          </div>
        </div>

        <Link
          href="/cardapio"
          className="text-xs sm:text-sm font-bold text-[#E3A008] hover:text-[#C1440E] flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Mais itens</span>
        </Link>
      </div>

      {/* 2. Lista de Produtos Adicionados */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#E3A008]" />
          Itens Adicionados ({items.length})
        </h3>

        <div className="divide-y divide-[#F3F0EB]">
          {items.map((item) => {
            const itemAdicionaisTotal = (item.adicionais || []).reduce(
              (sum, a) => sum + a.price * a.quantity,
              0
            )
            const itemUnitTotal = item.price + itemAdicionaisTotal
            const itemTotal = itemUnitTotal * item.quantity

            return (
              <div key={item.id} className="py-4 first:pt-2 last:pb-2 flex gap-3 sm:gap-4">
                {/* Imagem do prato (80x80px arredondada) */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#F7F5F0] border border-[#ECE7E0] flex-shrink-0">
                  <Image
                    src={resolveImage(item.image)}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                {/* Dados do produto e adicionais */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm sm:text-base font-black text-[#1F1B16] leading-snug line-clamp-2">
                        {item.name}
                      </h4>
                      <span className="text-sm font-black text-[#1F1B16] flex-shrink-0">
                        R$ {itemTotal.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    {/* Tag de massa se houver */}
                    {item.pastaType && (
                      <div className="mt-1">
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-[#C1440E] border border-amber-200 rounded-md text-[10px] font-black uppercase">
                          MASSA: {item.pastaType}
                        </span>
                      </div>
                    )}

                    {/* Lista de adicionais com quantidades e valores extras */}
                    {item.adicionais && item.adicionais.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {item.adicionais.map((adicional, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[#6B6157] flex items-center justify-between"
                          >
                            <span>
                              + {adicional.quantity}x {adicional.name}
                            </span>
                            <span className="text-[11px] font-semibold text-[#8C827A]">
                              (+R$ {(adicional.price * adicional.quantity).toFixed(2).replace(".", ",")})
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Controle de Quantidade Inline estilo iFood */}
                  <div className="flex items-center justify-between pt-2 mt-1">
                    <span className="text-xs text-[#8C827A]">
                      Unit: R$ {itemUnitTotal.toFixed(2).replace(".", ",")}
                    </span>

                    <div className="flex items-center gap-2 bg-[#F7F5F0] rounded-xl p-1 border border-[#ECE7E0]">
                      <button
                        onClick={() => {
                          if (item.quantity === 1) {
                            onRemoveItem(item.id)
                          } else {
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors active:scale-90 ${
                          item.quantity === 1
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-white text-[#1F1B16] hover:bg-gray-100 shadow-2xs"
                        }`}
                        aria-label={item.quantity === 1 ? "Remover item" : "Diminuir quantidade"}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="w-6 text-center text-xs font-black text-[#1F1B16]">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white text-[#1F1B16] hover:bg-gray-100 shadow-2xs flex items-center justify-center transition-colors active:scale-90"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Botão + Adicionar mais itens */}
        <div className="pt-2">
          <button
            onClick={() => router.push("/cardapio")}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#E3A008] text-[#E3A008] hover:bg-amber-50/50 font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            Adicionar mais itens ao pedido
          </button>
        </div>
      </div>

      {/* 3. Carrossel "Aproveite e peça também" (Idêntico ao App) */}
      {filteredRecommendations.length > 0 && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#1F1B16] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E3A008]" />
              Aproveite e peça também
            </h3>
            <span className="text-[11px] font-bold text-[#8C827A]">Mais pedidos</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {filteredRecommendations.slice(0, 8).map((product) => (
              <div
                key={product.id}
                className="w-28 sm:w-32 flex-shrink-0 bg-[#F7F5F0] rounded-2xl p-2 border border-[#ECE7E0] flex flex-col justify-between snap-start group"
              >
                <div className="space-y-1.5">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white">
                    <Image
                      src={resolveImage(product.image || product.imagem)}
                      alt={product.name || product.nome}
                      fill
                      sizes="120px"
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <button
                      onClick={() => onAddQuickItem(product)}
                      className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#E3A008] hover:bg-[#C1440E] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
                      aria-label={`Adicionar ${product.name || product.nome}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-xs font-black text-[#1F1B16] block">
                    R$ {Number(product.price || product.preco || 0).toFixed(2).replace(".", ",")}
                  </span>

                  <p className="text-[11px] font-bold text-[#6B6157] line-clamp-2 leading-tight">
                    {product.name || product.nome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Cupom de Desconto */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#1F1B16] flex items-center gap-2">
          <Ticket className="w-4 h-4 text-[#E3A008]" />
          Cupom de desconto
        </h3>

        {appliedCoupon ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-black text-xs">
                %
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-emerald-800 uppercase block truncate">
                  Cupom {appliedCoupon.code} aplicado
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  Economia de R$ {discountAmount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <button
              onClick={onRemoveCoupon}
              className="p-1 rounded-full text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 transition-colors"
              aria-label="Remover cupom"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="DIGITE SEU CUPOM"
                value={couponCode}
                onChange={(e) => onSetCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && onApplyCoupon()}
                className="flex-1 h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-black text-[#1F1B16] placeholder:text-[#9C9188] uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
              />
              <button
                onClick={onApplyCoupon}
                disabled={!couponCode.trim() || validandoCupom}
                className="h-12 px-5 rounded-xl bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm transition-all flex items-center justify-center"
              >
                {validandoCupom ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
              </button>
            </div>

            {couponError && (
              <p className="text-xs font-bold text-red-600 animate-in fade-in">
                {couponError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5. Resumo Financeiro */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider">
          Resumo dos Valores
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-[#6B6157]">
            <span>Subtotal</span>
            <span className="font-bold text-[#1F1B16]">
              R$ {subtotal.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Desconto</span>
              <span className="font-bold">- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
            </div>
          )}

          <div className="flex justify-between text-[#6B6157]">
            <span>Taxa de entrega</span>
            <span className="font-bold text-[#1F1B16]">
              {deliveryType === "pickup"
                ? "Grátis (Retirada)"
                : deliveryFee > 0
                ? `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
                : "A calcular"}
            </span>
          </div>

          <div className="pt-2 border-t border-[#F3F0EB] flex justify-between items-baseline">
            <span className="font-black text-base text-[#1F1B16]">Total</span>
            <span className="font-black text-xl text-[#1F1B16]">
              R$ {finalTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
