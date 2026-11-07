"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Lock } from "lucide-react"
import { appToast } from "@/lib/app-toast"
import { SelectorCircle } from "./selector-circle"
import { TicketDivider } from "./ticket-divider"

interface CouponCardProps {
  coupon: any
  currentTotal?: number
  missingAmount: number
  isSelected?: boolean
  onSelect?: (coupon: any) => void
  pageBackgroundColor?: string
}

function formatMoney(v: number | string) {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`
}

function getTimeLeft(expiresAt?: string | Date | null) {
  if (!expiresAt) return null
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return "Expirado"
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  return `Acaba em ${h}h ${m}min`
}

export function CouponCard({
  coupon,
  currentTotal = 0,
  missingAmount,
  isSelected = false,
  onSelect,
  pageBackgroundColor = "#FFFFFF",
}: CouponCardProps) {
  const [rulesOpen, setRulesOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(coupon?.expires_at))

  useEffect(() => {
    if (!coupon?.expires_at) return
    const id = setInterval(() => setTimeLeft(getTimeLeft(coupon.expires_at)), 60_000)
    return () => clearInterval(id)
  }, [coupon?.expires_at])

  const isExhausted =
    Boolean(coupon?.isExhausted) ||
    (coupon?.max_uses != null && (coupon.current_uses ?? 0) >= coupon.max_uses) ||
    (coupon?.max_uses_per_user != null && (coupon.user_uses ?? 0) >= coupon.max_uses_per_user)

  const available =
    coupon?.max_uses != null
      ? Math.max(0, coupon.max_uses - (coupon.current_uses ?? 0))
      : 1

  const unavailable = missingAmount > 0 || isExhausted

  const isPercentage =
    coupon?.discount_type === "percentage" || coupon?.discount_type === "percent"

  const discountLabel =
    coupon?.title ||
    (isPercentage
      ? `${Number(coupon.discount_value)}%`
      : formatMoney(coupon?.discount_value ?? 0))

  const minOrder = Number(coupon?.min_order_value ?? 0)
  const progress = minOrder > 0 ? Math.min(currentTotal / minOrder, 1) : 1

  const handleSelect = () => {
    if (isExhausted) {
      appToast.error("Cupom indisponível", coupon?.exhaustedReason || "Limite de usos atingido")
      return
    }
    if (missingAmount > 0) {
      appToast.warning("Valor mínimo não atingido", `Faltam ${formatMoney(missingAmount)} para usar este cupom.`)
      return
    }
    onSelect?.(coupon)
  }

  const borderColor = !isExhausted && isSelected ? "#1F1B16" : "#ECE7E0"

  return (
    <div className="mb-3 w-full select-none">
      <div
        onClick={handleSelect}
        className={`relative z-10 transition-all ${
          isExhausted
            ? "cursor-not-allowed opacity-60"
            : missingAmount > 0
            ? "cursor-not-allowed opacity-90"
            : "cursor-pointer active:scale-[0.99]"
        }`}
      >
        {/* Parte Superior do Ticket */}
        <div
          className="bg-white rounded-t-2xl px-4 pt-3.5 pb-1 relative"
          style={{
            borderLeft: `1.5px solid ${borderColor}`,
            borderRight: `1.5px solid ${borderColor}`,
            borderTop: `1.5px solid ${borderColor}`,
            borderBottom: "0",
          }}
        >
          {/* Seletor Circle na direita superior */}
          <div className="absolute top-3.5 right-4 z-20">
            <SelectorCircle selected={!isExhausted && isSelected} disabled={unavailable} size={28} />
          </div>

          {/* Cabeçalho do Ticket */}
          <div className="flex items-center gap-2.5 pr-10">
            <div className={`relative w-11 h-11 flex-shrink-0 ${isExhausted ? "grayscale opacity-70" : ""}`}>
              <Image
                src="/assets/cuponverde.png"
                alt="Cupom"
                fill
                sizes="44px"
                className="object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-xl font-bold leading-none ${isExhausted ? "text-[#9C9188]" : "text-[#1F1B16]"}`}>
                  {discountLabel}
                </h3>
                {coupon?.code && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      isExhausted
                        ? "bg-[#F3F4F6] text-[#9C9188] border border-[#E5E7EB]"
                        : "bg-[#FEF8EC] text-[#A16207] border border-[#E3A008]/40"
                    }`}
                  >
                    {coupon.code}
                  </span>
                )}
                {isExhausted && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]">
                    Limite de usos atingido
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-[13px] text-[#3E3E3E] mt-1.5 leading-snug">
            {coupon?.description || (coupon?.code ? `Cupom ${coupon.code} para seus pedidos.` : `${discountLabel} para pedidos selecionados.`)}
          </p>

          {/* Meta Info */}
          <div className="flex items-center justify-between mt-1 text-[11px] text-[#717171]">
            {minOrder > 0 ? (
              <span className="truncate pr-2">
                Válido para pedidos acima de {formatMoney(minOrder)}.
              </span>
            ) : (
              <span className="truncate pr-2 text-emerald-600 font-medium">Sem valor mínimo</span>
            )}
            {timeLeft && <span className="flex-shrink-0 font-medium">{timeLeft}</span>}
          </div>
        </div>

        {/* Divisória com as Mordidas */}
        <TicketDivider pageBackgroundColor={pageBackgroundColor} borderColor={borderColor} />

        {/* Parte Inferior do Ticket */}
        <div
          className="bg-white rounded-b-2xl px-4 pt-1 pb-3.5"
          style={{
            borderLeft: `1.5px solid ${borderColor}`,
            borderRight: `1.5px solid ${borderColor}`,
            borderBottom: `1.5px solid ${borderColor}`,
            borderTop: "0",
          }}
        >
          <div className="flex items-center justify-between text-xs text-[#717171]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setRulesOpen((v) => !v)
              }}
              className="underline text-xs text-[#717171] hover:text-[#1F1B16] flex items-center gap-0.5 cursor-pointer"
            >
              Regras {rulesOpen ? "˄" : "˅"}
            </button>
            <span className="flex-shrink-0 font-medium">
              {isExhausted ? "Esgotado" : `${available} disponível${available === 1 ? "" : "is"}`}
            </span>
          </div>

          {rulesOpen && (
            <div
              className="mt-2.5 pt-2 border-t border-[#F5F2ED] space-y-1 text-[11px] text-[#555555] leading-normal"
              onClick={(e) => e.stopPropagation()}
            >
              {coupon?.rules_text && <p>• {coupon.rules_text}</p>}
              {minOrder > 0 && (
                <p>
                  • Válido para pedidos acima de {formatMoney(minOrder)} (sem considerar taxa de entrega).
                </p>
              )}
              {coupon?.expires_at && (
                <p>
                  • Data de validade: até {new Date(coupon.expires_at).toLocaleString("pt-BR")}.
                </p>
              )}
              <p>
                • Limite de uso: {coupon?.max_uses_per_user ? `${coupon.max_uses_per_user}x por usuário.` : "ilimitado por usuário."}
              </p>
              {Array.isArray(coupon?.restricted_categories) && coupon.restricted_categories.length > 0 && (
                <p>• Válido para: {coupon.restricted_categories.join(", ")}.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Seção Trancada colada abaixo (apenas se não estiver esgotado) */}
      {!isExhausted && missingAmount > 0 && (
        <div
          className="bg-[#F3F3F4] rounded-b-2xl px-4 pb-2.5 pt-6 -mt-4 relative z-0"
          style={{
            borderLeft: "1.5px solid #ECE7E0",
            borderRight: "1.5px solid #ECE7E0",
            borderBottom: "1.5px solid #ECE7E0",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[#717171] font-medium">
            <Lock className="w-3.5 h-3.5 text-[#9C9188]" />
            <span>Faltam {formatMoney(missingAmount)} para usar o cupom</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#E0E0E0] overflow-hidden">
            <div
              className="h-full bg-[#27AE60] rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
