"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, Tag } from "lucide-react"
import { bannersManager, isSafeImageUrl, type HomeBannerItem } from "@/lib/banners-manager"
import { useCart } from "@/lib/cart-context"
import { TopToast } from "@/components/top-toast"

type TrackBanner = HomeBannerItem & { _key?: string }

export function CampaignBanner() {
  const { setCoupon } = useCart()
  const [banners, setBanners] = useState<HomeBannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [realIndex, setRealIndex] = useState(0) // 0 a N-1
  const [displayIndex, setDisplayIndex] = useState(1) // 1 a N no track com clones
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({})
  const [toastState, setToastState] = useState<{ open: boolean; message: string; subMessage?: string }>({
    open: false,
    message: "",
  })
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9)

  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Carrega banners e escuta Realtime
  useEffect(() => {
    let mounted = true
    const load = async () => {
      const data = await bannersManager.getActiveBanners()
      if (mounted) {
        setBanners(data)
        setLoading(false)
      }
    }
    load()

    const channel = bannersManager.subscribeToBanners(() => load())
    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [])

  // Filtra banners válidos
  const validBanners = useMemo(() => {
    return banners.filter((b) => !imgErrorMap[b.id] && isSafeImageUrl(b.image_url))
  }, [banners, imgErrorMap])

  // Auto-adapta a proporção do container ao tamanho real do banner (igual ao app mobile)
  useEffect(() => {
    const firstUrl = validBanners[0]?.image_url
    if (!firstUrl) return
    const img = new Image()
    img.src = firstUrl
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const ratio = img.naturalWidth / img.naturalHeight
        const clamped = Math.max(1.3, Math.min(2.6, ratio))
        setAspectRatio(clamped)
      }
    }
  }, [validBanners])

  const total = validBanners.length

  // Lista com clones nas pontas para looping circular contínuo com espiada bilateral perfeita
  const trackItems = useMemo<TrackBanner[]>(() => {
    if (total <= 1) return validBanners
    const first = validBanners[0]
    const last = validBanners[total - 1]
    return [
      { ...last, _key: `clone-last-${last.id}` },
      ...validBanners.map((b) => ({ ...b, _key: `real-${b.id}` })),
      { ...first, _key: `clone-first-${first.id}` },
    ]
  }, [validBanners, total])

  // Navegação para próximo
  const handleNext = useCallback(() => {
    if (total <= 1) return
    setIsTransitioning(true)
    setDisplayIndex((prev) => prev + 1)
  }, [total])

  // Navegação para anterior
  const handlePrev = useCallback(() => {
    if (total <= 1) return
    setIsTransitioning(true)
    setDisplayIndex((prev) => prev - 1)
  }, [total])

  // Trata salto silencioso ao alcançar clones (loop infinito invisível)
  useEffect(() => {
    if (total <= 1) return

    if (displayIndex === total + 1) {
      setRealIndex(0)
      resetTimerRef.current = setTimeout(() => {
        setIsTransitioning(false)
        setDisplayIndex(1)
      }, 500)
    } else if (displayIndex === 0) {
      setRealIndex(total - 1)
      resetTimerRef.current = setTimeout(() => {
        setIsTransitioning(false)
        setDisplayIndex(total)
      }, 500)
    } else {
      setRealIndex(displayIndex - 1)
    }

    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [displayIndex, total])

  // Auto-play a cada 7 segundos (pausa quando o mouse está em cima)
  useEffect(() => {
    if (isHovered || total <= 1) return
    const timer = setInterval(() => {
      handleNext()
    }, 7000)
    return () => clearInterval(timer)
  }, [isHovered, total, handleNext])

  // Cópia para Clipboard com Fallback multi-plataforma e suporte iOS
  const copyToClipboard = useCallback(async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = code
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        textArea.setAttribute("readonly", "")
        document.body.appendChild(textArea)
        textArea.select()
        textArea.setSelectionRange(0, 99999)
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
    } catch {}
  }, [])

  // Aplicação instantânea do cupom na sacola ao clicar no banner
  const handleBannerClick = useCallback(
    async (banner: HomeBannerItem) => {
      const coupon = banner.coupon
      if (coupon && (coupon.code || coupon.id)) {
        const couponData = {
          id: coupon.id,
          code: coupon.code,
          discount: Number(coupon.discount_value),
          type: coupon.discount_type as "percentage" | "fixed",
          title: coupon.title,
          description: coupon.description,
          badgeLabel: coupon.badge_label,
          minOrderValue: coupon.min_order_value != null ? Number(coupon.min_order_value) : null,
          isActive: coupon.active,
          expiresAt: coupon.expires_at ? new Date(coupon.expires_at) : null,
        }

        // 1. Atualiza estado global do CartContext
        if (setCoupon) {
          setCoupon(couponData)
        }

        // 2. Persiste em todas as chaves do localStorage para a sacola ler instantaneamente
        try {
          localStorage.setItem("batata top-coupon", JSON.stringify(couponData))
          localStorage.setItem("batata_applied_coupon", coupon.code)
          localStorage.setItem("batata_pending_coupon", coupon.code)
        } catch {}

        // 3. Copia o código para a área de transferência
        await copyToClipboard(coupon.code)

        // 4. Vibração tátil sutil em dispositivos móveis
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(20)
          } catch {}
        }

        // 5. Toast superior confirmando a ativação na sacola
        setToastState({
          open: true,
          message: `Cupom "${coupon.code}" aplicado com sucesso!`,
          subMessage: "Desconto ativado na sua sacola. O valor já foi reduzido!",
        })
      }
    },
    [setCoupon, copyToClipboard]
  )

  // Gestos de Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (diff > 45) {
      handleNext()
    } else if (diff < -45) {
      handlePrev()
    }
    touchStartX.current = 0
    touchEndX.current = 0
  }

  // Skeleton loading
  if (loading) {
    return (
      <div className="w-full bg-[#F7F5F0] py-3 select-none">
        <div
          className="w-[84%] sm:w-[80%] md:w-[74%] max-w-[760px] mx-auto bg-stone-200/80 rounded-2xl sm:rounded-3xl animate-pulse"
          style={{ aspectRatio: `${aspectRatio}` }}
        />
      </div>
    )
  }

  if (total === 0) return null

  // Quando só tem 1 banner, renderiza estático centralizado
  if (total === 1) {
    const single = validBanners[0]
    return (
      <>
        <TopToast
          isOpen={toastState.open}
          message={toastState.message}
          subMessage={toastState.subMessage}
          onClose={() => setToastState((prev) => ({ ...prev, open: false }))}
        />
        <section aria-label="Banner Promocional" className="w-full bg-[#F7F5F0] py-2 sm:py-3 select-none">
          <div className="w-[84%] sm:w-[80%] md:w-[74%] max-w-[760px] mx-auto">
            <div
              onClick={() => handleBannerClick(single)}
              className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm ${
                single.coupon?.code ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
              }`}
              style={{ aspectRatio: `${aspectRatio}` }}
            >
              <img
                src={single.image_url}
                alt={single.title || "Banner promocional"}
                className="w-full h-full object-cover select-none pointer-events-none"
                loading="lazy"
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    const ratio = naturalWidth / naturalHeight
                    setAspectRatio(Math.max(1.3, Math.min(2.6, ratio)))
                  }
                }}
                onError={() => setImgErrorMap((prev) => ({ ...prev, [single.id]: true }))}
              />
              {single.coupon?.badge_label && (
                <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 bg-[#C1440E] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md">
                  {single.coupon.badge_label}
                </div>
              )}
              {single.coupon?.code && (
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 bg-black/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/15">
                  <Tag className="w-3.5 h-3.5 text-[#E3A008]" />
                  <span>
                    Cupom: <strong className="text-[#E3A008] font-black">{single.coupon.code}</strong> (Toque para aplicar)
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <TopToast
        isOpen={toastState.open}
        message={toastState.message}
        subMessage={toastState.subMessage}
        onClose={() => setToastState((prev) => ({ ...prev, open: false }))}
      />

      <section
        aria-label="Campanhas e Banners Promocionais"
        className="w-full bg-[#F7F5F0] py-2 sm:py-3 select-none overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full max-w-5xl mx-auto group">
          {/* Trilho Deslizante com Espiada Lateral Idêntica ao App Mobile */}
          <div className="w-full overflow-hidden">
            <div
              className={`flex items-center gap-3 sm:gap-4 will-change-transform ${
                isTransitioning
                  ? "transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                  : ""
              }`}
              style={{
                // Fórmula de centralização: deixa a borda do banner anterior na esquerda e do próximo na direita
                transform: `translateX(calc((100% - var(--banner-w, 84%)) / 2 - ${displayIndex} * (var(--banner-w, 84%) + var(--banner-gap, 12px))))`,
              }}
            >
              {trackItems.map((banner, idx) => {
                const isActive = idx === displayIndex
                const couponCode = banner.coupon?.code
                const badgeText = banner.coupon?.badge_label

                return (
                  <div
                    key={banner._key || `${banner.id}-${idx}`}
                    onClick={() => handleBannerClick(banner)}
                    className={`shrink-0 w-[84%] sm:w-[80%] md:w-[74%] max-w-[760px] transition-opacity duration-300 ${
                      isActive ? "opacity-100" : "opacity-85"
                    } ${couponCode ? "cursor-pointer" : ""}`}
                    style={
                      {
                        "--banner-w": "84%",
                        "--banner-gap": "12px",
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm"
                      style={{ aspectRatio: `${aspectRatio}` }}
                    >
                      <img
                        src={banner.image_url}
                        alt={banner.title || "Banner promocional"}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        loading="lazy"
                        onLoad={(e) => {
                          if (idx === displayIndex) {
                            const { naturalWidth, naturalHeight } = e.currentTarget
                            if (naturalWidth > 0 && naturalHeight > 0) {
                              const ratio = naturalWidth / naturalHeight
                              setAspectRatio(Math.max(1.3, Math.min(2.6, ratio)))
                            }
                          }
                        }}
                        onError={() => setImgErrorMap((prev) => ({ ...prev, [banner.id]: true }))}
                      />

                      {/* Badge / Selo Promocional (se cadastrado) */}
                      {badgeText && (
                        <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 bg-[#C1440E] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md">
                          {badgeText}
                        </div>
                      )}

                      {/* Chip de Cupom Vinculado com Chamada Clara */}
                      {couponCode && (
                        <div className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 bg-black/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/15 hover:bg-black transition-colors">
                          <Tag className="w-3.5 h-3.5 text-[#E3A008]" />
                          <span>
                            Cupom: <strong className="text-[#E3A008] font-black">{couponCode}</strong> (Toque para aplicar)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botões de Navegação Lateral (Desktop) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-stone-200 text-stone-800 items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white active:scale-95 cursor-pointer z-30"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 border border-stone-200 text-stone-800 items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white active:scale-95 cursor-pointer z-30"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Paginação por Pontos (Idêntica ao dotsRow do App) */}
          <div className="flex justify-center items-center gap-1.5 mt-2.5">
            {validBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsTransitioning(true)
                  setDisplayIndex(idx + 1)
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === realIndex ? "w-5 bg-[#E3A008]" : "w-1.5 bg-stone-300 hover:bg-stone-400"
                }`}
                aria-label={`Ir para banner ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
