"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Ticket, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react"
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
  badgeLabel = "CUPOM",
  discountValue = 15,
  discountType = "percentage",
  minOrderValue = null,
}: HomeCouponBannerProps) {
  // Constrói lista de cupons com fallback seguro
  const displayCoupons: Array<{
    id: string
    code: string
    discount: number
    type: "percentage" | "fixed"
    minOrderValue?: number | null
    description?: string
    badge?: string
  }> =
    coupons && coupons.length > 0
      ? coupons.map((c) => ({
          id: c.id,
          code: c.code,
          discount: c.discount,
          type: c.type,
          minOrderValue: c.minOrderValue,
          description: c.description || (c.minOrderValue ? `Em pedidos acima de R$ ${Number(c.minOrderValue).toFixed(2).replace(".", ",")}` : "Válido para todo o cardápio"),
          badge: c.showOnHome ? "Destaque" : "Cupom",
        }))
      : [
          {
            id: "1",
            code: couponCode,
            discount: discountValue,
            type: discountType,
            minOrderValue: minOrderValue,
            description: discountText,
            badge: badgeLabel,
          },
          {
            id: "2",
            code: "BATATATOP10",
            discount: 10,
            type: "fixed",
            minOrderValue: 40,
            description: "R$ 10 OFF em pedidos acima de R$ 40,00",
            badge: "Imperdível",
          },
        ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // O carrossel avança de 1 em 1 para permitir visualização rotativa de 2 simultâneos
  const totalSlides = displayCoupons.length

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides)
  }, [totalSlides])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
  }, [totalSlides])

  // Rotação suave automática a cada 4.5s
  useEffect(() => {
    if (isHovered || totalSlides <= 2) return
    const timer = setInterval(() => {
      handleNext()
    }, 4500)
    return () => clearInterval(timer)
  }, [isHovered, totalSlides, handleNext])

  // Gestos Touch (Mobile First)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    if (distance > 45) {
      handleNext()
    } else if (distance < -45) {
      handlePrev()
    }
    touchStartX.current = 0
    touchEndX.current = 0
  }

  const handleCopy = async (code: string) => {
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

  // Janela visível de 2 cupons
  const visibleCoupons = [
    displayCoupons[currentIndex],
    displayCoupons[(currentIndex + 1) % totalSlides],
  ]

  return (
    <section
      id="cupons"
      className="py-5 bg-[#F7F4EF]/70 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Cabeçalho da Seção de Cupons */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1F1B16] uppercase tracking-wider">
              Cupons de Desconto
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/20">
              Economize hoje
            </span>
          </div>

          {/* Controles de Navegação */}
          {totalSlides > 2 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="h-7 w-7 rounded-full bg-white border border-[#ECE7E0] hover:border-[#E3A008] text-[#1F1B16] flex items-center justify-center transition-colors shadow-2xs"
                aria-label="Cupom anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNext}
                className="h-7 w-7 rounded-full bg-white border border-[#ECE7E0] hover:border-[#E3A008] text-[#1F1B16] flex items-center justify-center transition-colors shadow-2xs"
                aria-label="Próximo cupom"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Grade do Carrossel: Mostra exatamente 2 por vez na tela */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 transition-all duration-500 ease-in-out">
          {visibleCoupons.map((c, idx) => {
            if (!c) return null
            const discountLabel =
              c.type === "percentage"
                ? `${c.discount}% OFF`
                : `R$ ${Number(c.discount).toFixed(2).replace(".", ",")} OFF`
            const isCopied = copiedCode === c.code

            return (
              <div
                key={`${c.id}-${idx}`}
                className="relative overflow-hidden rounded-2xl bg-[#FEF8EC] border border-[#FCE8C3] p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow"
              >
                {/* Recortes de Bilhete Laterais */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-r border-[#FCE8C3]" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-l border-[#FCE8C3]" />

                <div className="flex items-start justify-between gap-3 px-1.5 mb-3">
                  <div className="flex items-center gap-3">
                    {/* Ícone Verde de Cupom (Paridade Mobile cuponverde.png) */}
                    <div className="h-10 w-10 rounded-xl bg-[#27AE60]/10 border border-[#27AE60]/20 flex items-center justify-center text-[#27AE60] shrink-0">
                      <Ticket className="h-5 w-5 stroke-[2.2]" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#C1440E]">
                          {discountLabel}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-[#FCE8C3] text-[#8A6100]">
                          {c.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6157] font-medium line-clamp-1 mt-0.5">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Ticket com Código e Botão de Cópia */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#FCE8C3]/70 px-1.5">
                  <span className="font-mono font-bold text-xs text-[#1F1B16] bg-white px-2.5 py-1 rounded-lg border border-[#FCE8C3]">
                    {c.code}
                  </span>

                  <button
                    onClick={() => handleCopy(c.code)}
                    className="h-8 px-3 rounded-lg bg-white border border-[#E3A008] text-[#A16207] hover:bg-[#E3A008] hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#27AE60]" />
                        <span className="text-[#27AE60]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Indicadores de Ponto (Dots) */}
        {totalSlides > 2 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {displayCoupons.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-5 bg-[#E3A008]" : "w-1.5 bg-[#ECE7E0]"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
