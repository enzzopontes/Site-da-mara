"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Tag } from "lucide-react"
import { bannersManager, isSafeImageUrl, type HomeBannerItem } from "@/lib/banners-manager"
import { TopToast } from "@/components/top-toast"

export function CampaignBanner() {
  const [banners, setBanners] = useState<HomeBannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({})
  const [toastState, setToastState] = useState<{ open: boolean; message: string; subMessage?: string }>({
    open: false,
    message: "",
  })

  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // Carrega banners e registra Realtime
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

  // Auto-play suave a cada 7 segundos (pausa durante hover)
  useEffect(() => {
    if (isHovered || banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [isHovered, banners.length])

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

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("batata_applied_coupon", code)
          localStorage.setItem("batata_pending_coupon", code)
        } catch {}
        if ("vibrate" in navigator) {
          navigator.vibrate(20)
        }
      }

      setToastState({
        open: true,
        message: `Cupom "${code}" copiado com sucesso!`,
        subMessage: "Cole o código no carrinho ou checkout para aplicar o desconto.",
      })
    } catch {
      setToastState({
        open: true,
        message: `Código: ${code}`,
        subMessage: "Não foi possível copiar automaticamente. Digite o código no checkout.",
      })
    }
  }, [])

  const handleBannerClick = (banner: HomeBannerItem) => {
    const couponCode = banner.coupon?.code
    if (couponCode) {
      copyToClipboard(couponCode)
    }
  }

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
    if (diff > 45 && banners.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    } else if (diff < -45 && banners.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
    }
    touchStartX.current = 0
    touchEndX.current = 0
  }

  // Skeleton loading (zero CLS)
  if (loading) {
    return (
      <div className="w-full bg-[#F7F5F0] py-3 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="w-full aspect-[21/9] sm:aspect-[24/9] md:aspect-[32/9] bg-stone-200/80 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  // Filtra banners válidos (sem erro de imagem e com URL segura)
  const validBanners = banners.filter(
    (b) => !imgErrorMap[b.id] && isSafeImageUrl(b.image_url)
  )

  if (validBanners.length === 0) return null

  // Índice protegido contra out-of-bounds
  const safeIndex = currentIndex % validBanners.length

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
        className="w-full bg-[#F7F5F0] py-2 sm:py-3 px-3 sm:px-4 select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-5xl mx-auto relative group">
          {/* Trilho de Deslizamento Horizontal com Animação Fluida */}
          <div className="relative w-full rounded-2xl overflow-hidden shadow-xs border border-stone-200/80 bg-stone-100">
            <div
              className="flex w-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform"
              style={{ transform: `translateX(-${safeIndex * 100}%)` }}
            >
              {validBanners.map((banner, idx) => (
                <div
                  key={banner.id}
                  onClick={() => handleBannerClick(banner)}
                  className={`w-full shrink-0 relative aspect-[21/9] sm:aspect-[24/9] md:aspect-[32/9] overflow-hidden ${
                    banner.coupon?.code ? "cursor-pointer" : ""
                  }`}
                >
                  <Image
                    src={banner.image_url}
                    alt={banner.title || "Banner promocional"}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 768px) 100vw, 1024px"
                    className="object-cover transition-transform duration-500 hover:scale-[1.01]"
                    onError={() => {
                      setImgErrorMap((prev) => ({ ...prev, [banner.id]: true }))
                    }}
                  />

                  {/* Chip Flutuante informando cupom vinculado */}
                  {banner.coupon?.code && (
                    <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-black/75 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-white/10 hover:bg-black/90 transition-colors">
                      <Tag className="w-3 h-3 text-[#E3A008]" />
                      <span>Clique para copiar: <strong>{banner.coupon.code}</strong></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navegação Manual (Desktop) */}
          {validBanners.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex((prev) => (prev - 1 + validBanners.length) % validBanners.length)
                }}
                className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-stone-200 text-stone-800 items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white active:scale-95 cursor-pointer z-10"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex((prev) => (prev + 1) % validBanners.length)
                }}
                className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-stone-200 text-stone-800 items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white active:scale-95 cursor-pointer z-10"
                aria-label="Próximo banner"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Paginação de Pontos */}
              <div className="flex justify-center items-center gap-1.5 mt-2">
                {validBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === safeIndex ? "w-6 bg-[#E3A008]" : "w-1.5 bg-stone-300"
                    }`}
                    aria-label={`Ir para banner ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
