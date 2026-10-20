"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Clock, Copy, Check, Lock, ChevronLeft, ChevronRight } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import type { Coupon } from "@/lib/cupons-manager"

interface HomeCouponBannerProps {
  coupons?: Coupon[]
  couponCode?: string
  discountText?: string
  badgeLabel?: string
  discountValue?: number
  discountType?: "percentage" | "fixed"
  minOrderValue?: number | null
}

export function HomeCouponBanner({
  coupons = [],
  couponCode = "PRIMEIRACOMPRA",
  discountText = "Desconto especial no seu pedido",
  discountValue = 15,
  discountType = "percentage",
  minOrderValue = null,
}: HomeCouponBannerProps) {
  const { getTotalPrice } = useCart()

  // Constrói lista de cupons com dados normalizados
  const rawCoupons =
    coupons && coupons.length > 0
      ? coupons
      : [
          {
            id: "1",
            code: couponCode,
            discount: discountValue,
            type: discountType,
            minOrderValue: minOrderValue,
            description: discountText,
            showOnHome: true,
            isActive: true,
            expiresAt: null,
          },
          {
            id: "2",
            code: "BATATATOP10",
            discount: 10,
            type: "fixed" as const,
            minOrderValue: 40,
            description: "R$ 10 de desconto no pedido",
            showOnHome: false,
            isActive: true,
            expiresAt: null,
          },
        ]

  const displayCoupons = rawCoupons.map((c) => {
    const isPercent = c.type === "percentage"
    const discountLabel = isPercent
      ? `${c.discount}% OFF`
      : `R$ ${Number(c.discount).toFixed(2).replace(".", ",")} OFF`

    let desc = c.description || ""
    if (!desc || desc.toLowerCase().includes("qualquer")) {
      desc = isPercent
        ? `${c.discount}% de desconto em qualquer batata`
        : `R$ ${Number(c.discount).toFixed(2).replace(".", ",")} de desconto no pedido`
    }

    let expiryLabel: string | null = null
    if (c.expiresAt) {
      const d = new Date(c.expiresAt)
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, "0")
        const mes = String(d.getMonth() + 1).padStart(2, "0")
        expiryLabel = `Até ${dia}/${mes}`
      }
    }

    return {
      id: c.id,
      code: c.code,
      discountLabel,
      description: desc,
      minOrderVal: Number(c.minOrderValue || 0),
      expiryLabel,
    }
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [animPhase, setAnimPhase] = useState<"idle" | "exit" | "enter">("idle")
  const [animDirection, setAnimDirection] = useState<"next" | "prev">("next")
  const [isHovered, setIsHovered] = useState(false)

  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const totalItems = displayCoupons.length

  const triggerChange = useCallback((newDir: "next" | "prev", nextIdx: number) => {
    setAnimDirection(newDir)
    setAnimPhase("exit")
    setTimeout(() => {
      setCurrentIndex(nextIdx)
      setAnimPhase("enter")
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimPhase("idle")
        })
      })
    }, 220)
  }, [])

  const handleNext = useCallback(() => {
    if (animPhase !== "idle" || totalItems <= 1) return
    const nextIdx = (currentIndex + 1) % totalItems
    triggerChange("next", nextIdx)
  }, [animPhase, totalItems, currentIndex, triggerChange])

  const handlePrev = useCallback(() => {
    if (animPhase !== "idle" || totalItems <= 1) return
    const prevIdx = (currentIndex - 1 + totalItems) % totalItems
    triggerChange("prev", prevIdx)
  }, [animPhase, totalItems, currentIndex, triggerChange])

  // Rotação automática suave a cada 5 segundos
  useEffect(() => {
    if (isHovered || totalItems <= 2 || animPhase !== "idle") return
    const timer = setInterval(() => {
      handleNext()
    }, 5000)
    return () => clearInterval(timer)
  }, [isHovered, totalItems, animPhase, handleNext])

  // Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (diff > 40) handleNext()
    else if (diff < -40) handlePrev()
    touchStartX.current = 0
    touchEndX.current = 0
  }

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        const ta = document.createElement("textarea")
        ta.value = code
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2500)
    } catch {}
  }

  // Dois cupons por vez na tela
  const visible = [
    displayCoupons[currentIndex],
    displayCoupons[(currentIndex + 1) % totalItems],
  ]

  const currentTotal = typeof getTotalPrice === "function" ? getTotalPrice() : 0

  return (
    <section
      id="cupons"
      className="py-5 bg-[#F7F4EF] select-none overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header da Seção com Controles */}
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#1F1B16] tracking-tight">
              Cupons de Desconto
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20">
              Disponíveis
            </span>
          </div>

          {totalItems > 2 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="h-7 w-7 rounded-full bg-white border border-[#E5E7EB] hover:border-[#FFB800] text-[#1F1B16] flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
                aria-label="Cupom anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="h-7 w-7 rounded-full bg-white border border-[#E5E7EB] hover:border-[#FFB800] text-[#1F1B16] flex items-center justify-center transition-all active:scale-95 shadow-2xs cursor-pointer"
                aria-label="Próximo cupom"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Trilha do Carrossel com Animação Direcional (Sai para esquerda, entra pela direita) */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 transform ${
            animPhase === "exit"
              ? animDirection === "next"
                ? "-translate-x-12 opacity-0 scale-[0.98] transition-all duration-200 ease-in"
                : "translate-x-12 opacity-0 scale-[0.98] transition-all duration-200 ease-in"
              : animPhase === "enter"
              ? animDirection === "next"
                ? "translate-x-12 opacity-0 scale-[0.98] transition-none"
                : "-translate-x-12 opacity-0 scale-[0.98] transition-none"
              : "translate-x-0 opacity-100 scale-100 transition-all duration-300 ease-out"
          }`}
        >
          {visible.map((c, i) => {
            if (!c) return null
            const isCopied = copiedCode === c.code
            const missingAmount = c.minOrderVal > 0 ? c.minOrderVal - currentTotal : 0
            const unavailable = c.minOrderVal > 0 && missingAmount > 0
            const progress = c.minOrderVal > 0 ? Math.min(currentTotal / c.minOrderVal, 1) : 1

            return (
              <div
                key={`${c.id}-${i}`}
                className="w-full flex flex-col justify-between h-full shadow-xs transition-transform hover:-translate-y-0.5"
              >
                {/* Parte Superior do Ticket (Idêntico ao HomeCouponCard.jsx do App) */}
                <div className="bg-white rounded-t-2xl border-x-[1.5px] border-t-[1.5px] border-[#E5E7EB] px-3.5 pt-3 pb-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    {/* Ícone Oficial do Cupom Verde do App */}
                    <div className="w-11 h-11 flex items-center justify-center shrink-0">
                      <img
                        src="/assets/cuponverde.png"
                        alt="Cupom"
                        className="w-11 h-11 object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-[19px] font-black text-[#1F1B16] tracking-tight leading-tight truncate">
                        {c.discountLabel}
                      </h3>
                      <p className="text-[11px] text-[#6B7280] font-medium truncate mt-0.5">
                        {c.minOrderVal > 0
                          ? `Pedido mínimo de R$ ${c.minOrderVal.toFixed(2).replace(".", ",")}`
                          : "Válido para todo o cardápio"}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#374151] font-medium mt-2 leading-snug line-clamp-2">
                    {c.description}
                  </p>

                  {c.expiryLabel && (
                    <div className="flex items-center gap-1 mt-1.5 text-[#9CA3AF] text-[11px] font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{c.expiryLabel}</span>
                    </div>
                  )}
                </div>

                {/* Divisória do Ticket com mordidas laterais perfeitamente redondas (TicketDivider do App) */}
                <div className="relative h-3.5 bg-white flex items-center justify-between">
                  {/* Mordida Esquerda recortada sem quinas visíveis */}
                  <div className="w-2 h-3.5 overflow-hidden relative shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EF] border-[1.5px] border-[#E5E7EB] absolute -left-[7px] top-0" />
                  </div>

                  {/* Linha Tracejada Central */}
                  <div className="flex-1 border-t border-dashed border-[#D1D5DB] mx-2" />

                  {/* Mordida Direita recortada sem quinas visíveis */}
                  <div className="w-2 h-3.5 overflow-hidden relative shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EF] border-[1.5px] border-[#E5E7EB] absolute -right-[7px] top-0" />
                  </div>
                </div>

                {/* Parte Inferior do Ticket com Caixa Tracejada de Cópia */}
                <div
                  className={`bg-white border-x-[1.5px] border-[#E5E7EB] px-3 pt-1.5 pb-2.5 ${
                    unavailable ? "border-b-0 rounded-b-none" : "border-b-[1.5px] rounded-b-2xl"
                  }`}
                >
                  <button
                    onClick={() => handleCopyCode(c.code)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border-[1.2px] transition-all cursor-pointer ${
                      isCopied
                        ? "bg-[#F0FDF4] border-solid border-[#86EFAC]"
                        : "bg-[#F9FAFB] border-dashed border-[#D1D5DB] hover:border-[#FFB800]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#FFB800] shrink-0" />
                      )}
                      <span
                        className={`text-xs font-black tracking-wide truncate ${
                          isCopied ? "text-[#16A34A]" : "text-[#1F1B16]"
                        }`}
                      >
                        {isCopied ? "CUPOM COPIADO!" : c.code}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold shrink-0 ml-1.5 ${
                        isCopied ? "text-[#16A34A]" : "text-[#FFB800]"
                      }`}
                    >
                      {isCopied ? "Pronto" : "Copiar"}
                    </span>
                  </button>
                </div>

                {/* Seção de Pedido Mínimo com Cadeado e Barra de Progresso (Idêntico ao App) */}
                {unavailable && (
                  <div className="bg-[#F3F4F6] border-x-[1.5px] border-b-[1.5px] border-t border-[#E5E7EB] rounded-b-2xl px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lock className="w-3 h-3 text-[#71717A] shrink-0" />
                      <span className="text-[11px] text-[#6B7280] font-medium truncate">
                        Faltam R$ {missingAmount.toFixed(2).replace(".", ",")} para usar
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className="h-full bg-[#27AE60] rounded-full transition-all duration-300"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Indicadores de Ponto (Dots) */}
        {totalItems > 2 && (
          <div className="flex items-center justify-center gap-1.5 mt-3.5">
            {displayCoupons.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i !== currentIndex) {
                    triggerChange(i > currentIndex ? "next" : "prev", i)
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-5 bg-[#FFB800]" : "w-1.5 bg-[#D1D5DB]"
                }`}
                aria-label={`Ir para o cupom ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
