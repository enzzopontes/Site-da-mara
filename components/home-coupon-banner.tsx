"use client"

import { useState } from "react"
import { Ticket, Copy, Check, ChevronRight } from "lucide-react"
import Link from "next/link"

interface HomeCouponBannerProps {
  couponCode?: string
  discountText?: string
  badgeLabel?: string
  bannerImageUrl?: string | null
  discountValue?: number
  discountType?: "percentage" | "fixed"
  minOrderValue?: number | null
}

export function HomeCouponBanner({
  couponCode = "PRIMEIRACOMPRA",
  discountText = "Desconto especial no seu pedido",
  badgeLabel = "CUPOM DISPONÍVEL",
  bannerImageUrl = null,
  discountValue = 15,
  discountType = "percentage",
  minOrderValue = null,
}: HomeCouponBannerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(couponCode)
      } else {
        const ta = document.createElement("textarea")
        ta.value = couponCode
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  const formattedDiscount =
    discountType === "percentage"
      ? `${discountValue}% OFF`
      : `R$ ${discountValue?.toFixed(2).replace(".", ",")} OFF`

  return (
    <section id="cupons" className="py-5 bg-[#F7F4EF]/50">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Ticket iFood */}
        <div className="relative overflow-hidden rounded-2xl bg-[#FEF8EC] border border-[#FCE8C3] p-4 sm:p-5 shadow-xs">
          {/* Recortes de Ticket nas Laterais */}
          <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-r border-[#FCE8C3]" />
          <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-l border-[#FCE8C3]" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            {/* Informações do Cupom */}
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-[#E3A008]/15 border border-[#E3A008]/30 flex items-center justify-center shrink-0 text-[#C1440E]">
                <Ticket className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#A16207] bg-white px-2 py-0.5 rounded border border-[#FCE8C3]">
                    {badgeLabel}
                  </span>
                  <span className="text-sm font-black text-[#C1440E]">
                    {formattedDiscount}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#1F1B16] leading-tight">
                  {discountText}
                </h3>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  {minOrderValue ? `Válido em pedidos a partir de R$ ${Number(minOrderValue).toFixed(2).replace(".", ",")}` : "Sem valor mínimo de compra"} • Válido para entrega e retirada
                </p>
              </div>
            </div>

            {/* Código e Ação de Cópia */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="h-10 px-4 rounded-xl bg-white border border-[#E3A008] text-[#1F1B16] hover:bg-[#FEF8EC] font-mono font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-2xs"
                title="Clique para copiar o código"
              >
                <span>{couponCode}</span>
                {copied ? (
                  <span className="inline-flex items-center gap-1 text-[#27AE60] font-sans font-bold">
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[#A16207] font-sans font-bold">
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </span>
                )}
              </button>

              <Link href="/cardapio">
                <button className="h-10 px-4 rounded-xl bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs">
                  <span>Aproveitar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
