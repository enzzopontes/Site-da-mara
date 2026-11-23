"use client"

import React from "react"
import { Tag, CheckCircle2, X } from "lucide-react"
import { evaluateCoupon } from "@/lib/coupon-rules"
import { useCart } from "@/lib/cart-context"

export interface CouponStatusCardProps {
  /** Subtotal bruto dos itens (sem frete, sem desconto). */
  subtotal: number
  coupon: any
  onRemove?: () => void
  className?: string
}

function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

function describeDiscount(coupon: any): string {
  const value = Number(coupon?.discount ?? coupon?.discount_value ?? 0)
  const type = coupon?.type ?? coupon?.discount_type
  return type === "percentage" || type === "percent" ? `${value}%` : formatMoney(value)
}

/**
 * Card único e compacto do cupom. Estados:
 * - applied: subtotal_itens >= valor_minimo (verde, sem barra de progresso)
 * - pending: subtotal_itens < valor_minimo (âmbar, barra fina, não trava o pedido)
 */
export function CouponStatusCard({ subtotal, coupon, onRemove, className = "" }: CouponStatusCardProps) {
  const { items } = useCart()
  const evaluation = evaluateCoupon(coupon, subtotal, items)
  if (evaluation.status === "none") return null

  const isApplied = evaluation.status === "applied"
  const isCategoryIneligible = !isApplied && evaluation.missing <= 0
  const percentage = Math.round(evaluation.progress * 100)
  const discountLabel = describeDiscount(coupon)

  return (
    <div
      role="region"
      aria-label={isApplied ? "Cupom liberado" : "Cupom pendente"}
      className={`w-full rounded-xl border px-3 py-2.5 transition-colors ${
        isApplied
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-amber-200 bg-amber-50/70"
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Tag
          className={`h-4 w-4 shrink-0 ${isApplied ? "text-emerald-600" : "text-[#E3A008]"}`}
          aria-hidden="true"
        />
        <span className="font-black text-sm tracking-wide text-[#1F1B16] truncate">
          {evaluation.code}
        </span>

        {isApplied ? (
          <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-100/80 px-2 py-0.5 text-[11px] font-black text-emerald-700">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Liberado
          </span>
        ) : !isCategoryIneligible ? (
          <span className="inline-flex items-center shrink-0 rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            Faltam {formatMoney(evaluation.missing)}
          </span>
        ) : null}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover cupom ${evaluation.code}`}
            className="ml-auto inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-[#DC2626] transition-colors hover:bg-red-50 active:scale-95"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Remover
          </button>
        )}
      </div>

      {isApplied ? (
        <p className="mt-1 pl-6 text-xs font-medium text-emerald-800">
          {evaluation.discount > 0
            ? `${formatMoney(evaluation.discount)} de desconto aplicado`
            : "Desconto aplicado"}
        </p>
      ) : isCategoryIneligible ? (
        <p className="mt-1.5 text-xs font-medium leading-snug text-stone-700">
          Adicione itens de categorias elegíveis para usar este cupom.
        </p>
      ) : (
        <>
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-200/70"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso para liberar o cupom: ${percentage}%`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#E3A008] transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs font-medium leading-snug text-stone-700">
            Adicione mais <strong className="font-black text-stone-900">{formatMoney(evaluation.missing)}</strong> em
            itens para liberar {discountLabel} OFF (não trava seu pedido).
          </p>
        </>
      )}
    </div>
  )
}
