"use client"

import { useState } from "react"
import { Ticket, Copy, Check, Sparkles, Percent } from "lucide-react"

interface HomeCouponBannerProps {
  couponCode?: string
  discountText?: string
}

export function HomeCouponBanner({
  couponCode = "PRIMEIRACOMPRA",
  discountText = "Ganhe desconto especial no seu primeiro pedido!",
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
      setTimeout(() => setCopied(false), 3000)
    } catch {}
  }

  return (
    <section id="cupons" className="py-6 bg-amber-500/5">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 sm:p-6 shadow-xl shadow-amber-500/15 border border-amber-400/40">
          {/* Círculos decorativos de ticket */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F9FAFB]" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F9FAFB]" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pl-3 pr-3">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                <Ticket className="w-6 h-6 text-white stroke-[2.5]" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-black/20 text-amber-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Cupom Especial de Boas-Vindas</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  {discountText}
                </h3>
                <p className="text-xs text-amber-100/90 font-medium">
                  Copie o código e cole na finalização do pedido no site
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <div className="flex-1 sm:flex-initial bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-2 text-center font-mono font-black text-sm text-white tracking-widest select-all">
                {couponCode}
              </div>

              <button
                onClick={handleCopy}
                className={`h-11 px-5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md ${
                  copied
                    ? "bg-emerald-500 text-white shadow-emerald-900/30"
                    : "bg-white text-gray-900 hover:bg-amber-50 shadow-black/10"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
