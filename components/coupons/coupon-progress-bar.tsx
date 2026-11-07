"use client"

import React from "react"
import { Tag, CheckCircle2, Sparkles } from "lucide-react"

export interface CouponProgressBarProps {
  subtotal: number
  targetCoupon: {
    code: string
    minOrderValue?: number | null
    min_order_value?: number | null
    minOrderVal?: number | null
    discount?: number
    discount_value?: number
    type?: string
    discount_type?: string
    title?: string
  }
  className?: string
}

export function CouponProgressBar({ subtotal, targetCoupon, className = "" }: CouponProgressBarProps) {
  const minOrderValue = Number(
    targetCoupon.minOrderValue ?? targetCoupon.min_order_value ?? targetCoupon.minOrderVal ?? 0
  )
  const discountVal = Number(targetCoupon.discount ?? targetCoupon.discount_value ?? 0)
  const discountType = targetCoupon.type ?? targetCoupon.discount_type ?? "fixed"

  const discountFormatted =
    targetCoupon.title ||
    (discountType === "percentage" || discountType === "percent"
      ? `${discountVal}%`
      : `R$ ${discountVal.toFixed(2).replace(".", ",")}`)

  const percentage = minOrderValue > 0 ? Math.min(100, Math.max(0, (subtotal / minOrderValue) * 100)) : 100
  const remaining = Math.max(0, minOrderValue - subtotal)
  const isUnlocked = percentage >= 100

  return (
    <div
      role="region"
      aria-label="Progresso do cupom"
      className={`w-full rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all ${
        isUnlocked
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
          : "border-amber-200 bg-amber-50/70 text-amber-950"
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold gap-2">
        <span className="flex items-center gap-1.5 truncate">
          <Tag className={`h-3.5 w-3.5 shrink-0 ${isUnlocked ? "text-emerald-600" : "text-[#E3A008]"}`} />
          <span className="text-[#1F1B16] font-medium">Cupom</span>
          <span className="font-black text-[#1F1B16] tracking-wide">{targetCoupon.code}</span>
        </span>

        {isUnlocked ? (
          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Liberado
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full shrink-0">
            <Sparkles className="h-3 w-3 text-[#E3A008]" /> Mínimo R$ {minOrderValue.toFixed(2).replace(".", ",")}
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      <div
        className="relative mt-2.5 h-2 w-full overflow-hidden rounded-full bg-stone-200/60"
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso para ativar cupom: ${Math.round(percentage)}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isUnlocked ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-[#E3A008]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Copy persuasivo e dinâmico */}
      <p className="mt-2 text-xs font-medium leading-relaxed">
        {isUnlocked ? (
          <span className="font-semibold text-emerald-800">
            Desconto de <strong>{discountFormatted}</strong> pronto para ser usado no seu pedido!
          </span>
        ) : (
          <span className="text-stone-700">
            Faltam apenas <strong className="text-stone-900 font-black">R$ {remaining.toFixed(2).replace(".", ",")}</strong> para você ganhar <strong className="text-amber-800 font-black">{discountFormatted}</strong> de desconto!
          </span>
        )}
      </p>
    </div>
  )
}
