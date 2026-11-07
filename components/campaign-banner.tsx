"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight, Tag } from "lucide-react"
import { bannersManager, isSafeImageUrl, type HomeBannerItem } from "@/lib/banners-manager"
import { useCart } from "@/lib/cart-context"
import { TopToast } from "@/components/top-toast"

export function CampaignBanner() {
  const { setCoupon } = useCart()
  const [banners, setBanners] = useState<HomeBannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({})
  const [toastState, setToastState] = useState<{ open: boolean; message: string; subMessage?: string }>({
    open: false,
    message: "",
  })

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

  // Filtra banners válidos com URLs seguras e sem falhas de imagem
  const validBanners = useMemo(() => {
    return banners.filter((b) => !imgErrorMap[b.id] && isSafeImageUrl(b.image_url))
  }, [banners, imgErrorMap])

  const total = validBanners.length

  // Embla Carousel com loop infinito e alinhamento centralizado
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: total > 1,
    align: "center",
    skipSnaps: false,
    duration: 25,
  })

  // Sincroniza índice ativo com Embla
  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  // Pausa autoplay quando o usuário está arrastando (touch / pointer)
  useEffect(() => {
    if (!emblaApi) return
    const onPointerDown = () => setIsPaused(true)
    const onPointerUp = () => setIsPaused(false)

    emblaApi.on("pointerDown", onPointerDown)
    emblaApi.on("pointerUp", onPointerUp)

    return () => {
      emblaApi.off("pointerDown", onPointerDown)
      emblaApi.off("pointerUp", onPointerUp)
    }
  }, [emblaApi])

  // Pausa quando a aba do navegador fica oculta
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden)
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  // Autoplay suave com intervalo de 6 segundos
  useEffect(() => {
    if (!emblaApi || isPaused || total <= 1) return

    const interval = setInterval(() => {
      emblaApi.scrollNext()
    }, 6000)

    return () => clearInterval(interval)
  }, [emblaApi, isPaused, total])

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

  const handlePrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const handleNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi]
  )

  // Skeleton loading responsivo sem layout shift
  if (loading) {
    return (
      <div className="w-full bg-[#F7F5F0] py-2 sm:py-3 select-none">
        <div className="w-[88%] sm:w-[82%] md:w-[76%] lg:w-[70%] max-w-[760px] mx-auto h-36 min-[400px]:h-44 sm:h-52 md:h-64 lg:h-72 bg-stone-200/80 rounded-2xl sm:rounded-3xl animate-pulse" />
      </div>
    )
  }

  if (total === 0) return null

  // Quando só tem 1 banner, renderiza estático centralizado
  if (total === 1) {
    const single = validBanners[0]
    const couponCode = single.coupon?.code
    const badgeText = single.coupon?.badge_label

    return (
      <>
        <TopToast
          isOpen={toastState.open}
          message={toastState.message}
          subMessage={toastState.subMessage}
          onClose={() => setToastState((prev) => ({ ...prev, open: false }))}
        />
        <section aria-label="Banner Promocional" className="w-full bg-[#F7F5F0] py-2 sm:py-3 select-none">
          <div className="w-[88%] sm:w-[82%] md:w-[76%] lg:w-[70%] max-w-[760px] mx-auto">
            <div
              onClick={() => handleBannerClick(single)}
              className={`relative w-full h-36 min-[400px]:h-44 sm:h-52 md:h-64 lg:h-72 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm bg-stone-200/50 ${
                couponCode ? "cursor-pointer active:scale-[0.99] transition-transform" : ""
              }`}
            >
              <img
                src={single.image_url}
                alt={single.title || "Banner promocional"}
                className="w-full h-full object-cover object-center select-none pointer-events-none"
                loading="eager"
                onError={() => setImgErrorMap((prev) => ({ ...prev, [single.id]: true }))}
              />
              {badgeText && (
                <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 bg-[#C1440E] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md">
                  {badgeText}
                </div>
              )}
              {couponCode && (
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 bg-black/80 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/15">
                  <Tag className="w-3.5 h-3.5 text-[#E3A008]" />
                  <span>
                    Cupom: <strong className="text-[#E3A008] font-black">{couponCode}</strong> (Toque para aplicar)
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
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <div className="relative w-full max-w-5xl mx-auto group">
          {/* Viewport do Embla Carousel com Espiada Lateral Bilateral */}
          <div className="w-full overflow-hidden" ref={emblaRef}>
            <div className="flex -ml-3 sm:-ml-4">
              {validBanners.map((banner, idx) => {
                const isActive = idx === selectedIndex
                const couponCode = banner.coupon?.code
                const badgeText = banner.coupon?.badge_label

                return (
                  <div
                    key={banner.id}
                    className="min-w-0 shrink-0 grow-0 pl-3 sm:pl-4 basis-[88%] sm:basis-[82%] md:basis-[76%] lg:basis-[70%] max-w-[760px]"
                  >
                    <div
                      onClick={() => handleBannerClick(banner)}
                      className={`relative w-full h-36 min-[400px]:h-44 sm:h-52 md:h-64 lg:h-72 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm bg-stone-200/50 transition-all duration-300 ${
                        isActive ? "opacity-100 scale-100" : "opacity-80 scale-[0.98]"
                      } ${couponCode ? "cursor-pointer active:scale-[0.97]" : ""}`}
                    >
                      <img
                        src={banner.image_url}
                        alt={banner.title || "Banner promocional"}
                        className="w-full h-full object-cover object-center select-none pointer-events-none"
                        loading={idx === 0 ? "eager" : "lazy"}
                        onError={() => setImgErrorMap((prev) => ({ ...prev, [banner.id]: true }))}
                      />

                      {/* Badge / Selo Promocional */}
                      {badgeText && (
                        <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 bg-[#C1440E] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-md">
                          {badgeText}
                        </div>
                      )}

                      {/* Chip de Cupom Vinculado */}
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

          {/* Paginação por Pontos Sincronizada */}
          <div className="flex justify-center items-center gap-1.5 mt-2.5">
            {validBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollTo(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === selectedIndex ? "w-5 bg-[#E3A008]" : "w-1.5 bg-stone-300 hover:bg-stone-400"
                }`}
                aria-label={`Ir para banner ${idx + 1}`}
                aria-current={idx === selectedIndex ? "true" : undefined}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
