"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Trash2,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react"
import { useCart, CartItem } from "@/lib/cart-context"
import { CouponModal } from "@/components/coupons/coupon-modal"
import { CouponProgressBar } from "@/components/coupons/coupon-progress-bar"

interface StepItensProps {
  items: CartItem[]
  subtotal: number
  deliveryFee: number
  discountAmount: number
  finalTotal: number
  appliedCoupon: any | null
  availableCouponsCount?: number
  couponCode?: string
  couponError?: string
  validandoCupom?: boolean
  deliveryType: "delivery" | "pickup"
  recommendedProducts: any[]
  onUpdateQuantity: (id: string, qty: number) => void
  onRemoveItem: (id: string) => void
  onSetCouponCode?: (code: string) => void
  onApplyCoupon?: () => void
  onRemoveCoupon: () => void
  onAddQuickItem: (product: any) => void
}

function resolveProductImage(url?: string | null): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return "/placeholder.jpg"
  }
  const trimmed = url.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  if (trimmed.startsWith("/")) {
    return trimmed
  }
  return `/products/${trimmed}`
}

export function StepItens({
  items,
  subtotal,
  deliveryFee,
  discountAmount,
  finalTotal,
  appliedCoupon,
  availableCouponsCount,
  deliveryType,
  recommendedProducts,
  onUpdateQuantity,
  onRemoveItem,
  onRemoveCoupon,
  onAddQuickItem,
}: StepItensProps) {
  const router = useRouter()
  const { activeTrackCoupon } = useCart()
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)

  // Filtra produtos recomendados que já estão na sacola
  const cartProductIds = new Set(items.map((i) => i.id.split("-")[0]))
  const filteredRecommendations = recommendedProducts.filter(
    (p) => !cartProductIds.has(String(p.id)) && p.available !== false
  )

  const isPercentage =
    appliedCoupon?.discount_type === "percentage" ||
    appliedCoupon?.discount_type === "percent" ||
    appliedCoupon?.type === "percentage"

  const discountVal = Number(
    appliedCoupon?.discount_value ?? appliedCoupon?.discount ?? 0
  )

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Header do Restaurante / Loja */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#F7F5F0] border border-[#ECE7E0] flex-shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Batata Top"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1F1B16] leading-tight">
              Batata Top
            </h2>
            <p className="text-xs text-[#8C827A] flex items-center gap-1.5 mt-0.5">
              <span>Cardápio Digital Oficial</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">Aberto agora</span>
            </p>
          </div>
        </div>

        <Link
          href="/cardapio"
          className="text-xs font-bold text-[#E3A008] hover:underline"
        >
          Ver loja
        </Link>
      </div>

      {/* 2. Lista de Produtos na Sacola */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE7E0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#ECE7E0] pb-3">
          <h3 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider">
            Itens no seu pedido ({items.reduce((acc, i) => acc + i.quantity, 0)})
          </h3>
          <span className="text-xs text-[#8C827A]">
            {items.length} {items.length === 1 ? "prato" : "pratos"}
          </span>
        </div>

        <div className="divide-y divide-[#F5F2ED]">
          {items.map((item) => {
            const adicionaisTotal = item.adicionais.reduce(
              (acc, a) => acc + a.price * a.quantity,
              0
            )
            const itemUnitTotal = item.price + adicionaisTotal
            const itemTotal = itemUnitTotal * item.quantity

            return (
              <div key={item.id} className="py-4 first:pt-2 last:pb-2 flex gap-3 sm:gap-4">
                {/* Imagem do prato (80x80px arredondada) */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#F7F5F0] border border-[#ECE7E0] flex-shrink-0">
                  <Image
                    src={resolveProductImage(item.image)}
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
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#ECE7E0] hover:bg-red-50 hover:border-red-200 text-[#1F1B16] hover:text-red-600 flex items-center justify-center transition-colors active:scale-95"
                        aria-label="Diminuir quantidade"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="w-6 text-center font-black text-xs sm:text-sm text-[#1F1B16]">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-[#ECE7E0] hover:bg-amber-50 hover:border-[#E3A008] text-[#1F1B16] hover:text-[#E3A008] flex items-center justify-center transition-colors active:scale-95"
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
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#E3A008] text-[#E3A008] hover:bg-amber-50/50 font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar mais itens ao pedido
          </button>
        </div>
      </div>

      {/* 3. Carrossel "Aproveite e peça também" */}
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
                      src={resolveProductImage(product.image || product.imagem)}
                      alt={product.name || product.nome}
                      fill
                      sizes="120px"
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <button
                      onClick={() => onAddQuickItem(product)}
                      className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#E3A008] hover:bg-[#C1440E] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
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

      {/* Barra de Progresso Gamificada do Cupom (se houver cupom ativo ou pendente) */}
      {activeTrackCoupon && (
        <CouponProgressBar subtotal={subtotal} targetCoupon={activeTrackCoupon} />
      )}

      {/* 4. Bloco de Cupom (Idêntico ao Aplicativo) */}
      <div
        onClick={() => {
          if (!appliedCoupon) {
            router.push("/cupons?from=cart")
          }
        }}
        className={`flex items-center justify-between bg-white rounded-2xl p-3 border border-[#ECE7E0] shadow-xs ${
          !appliedCoupon ? "cursor-pointer hover:border-[#E3A008]/50 transition-colors" : ""
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src="/assets/cuponpretobranco.png"
              alt="Cupom"
              fill
              sizes="32px"
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            {appliedCoupon ? (
              <>
                <p className="text-sm font-bold text-[#1F1B16] leading-tight truncate">
                  {appliedCoupon.code}
                </p>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  {isPercentage
                    ? `${discountVal}% de desconto`
                    : `R$ ${discountVal.toFixed(2).replace(".", ",")} de desconto`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#1F1B16] leading-tight">
                  Nenhum cupom aplicado
                </p>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  {availableCouponsCount != null
                    ? `${availableCouponsCount} disponível${availableCouponsCount === 1 ? "" : "is"}`
                    : "1 disponível"}
                </p>
              </>
            )}
          </div>
        </div>

        {appliedCoupon ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemoveCoupon()
            }}
            className="text-sm font-bold text-[#DC2626] hover:opacity-80 active:scale-95 transition-all px-2 py-1 cursor-pointer flex-shrink-0"
          >
            Remover
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsCouponModalOpen(true)
            }}
            className="text-sm font-bold text-[#E3A008] hover:opacity-80 active:scale-95 transition-all px-2 py-1 cursor-pointer flex-shrink-0"
          >
            Ver cupons
          </button>
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

                    <div className="flex justify-between items-center text-[#6B6157]">
            <span>Taxa de entrega</span>
            <span className="font-bold text-[#1F1B16]">
              {deliveryType === "pickup" ? (
                <span className="text-emerald-700 font-bold">Grátis (Retirada)</span>
              ) : deliveryFee > 0 ? (
                `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className="line-through text-stone-400 text-xs font-normal">R$ 5,00</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
                    Grátis
                  </span>
                </span>
              )}
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

      <CouponModal
        open={isCouponModalOpen}
        onOpenChange={setIsCouponModalOpen}
      />
    </div>
  )
}
