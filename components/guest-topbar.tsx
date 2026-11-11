"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, ArrowRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { usePathname } from "next/navigation"

interface GuestTopbarProps {
  onOpenAuth?: () => void
  desktopOnly?: boolean
}

export function GuestTopbar({ onOpenAuth, desktopOnly = false }: GuestTopbarProps) {
  const { user, loading, openAuthModal } = useAuth()
  const { items } = useCart()
  const pathname = usePathname()
  const [isMapActive, setIsMapActive] = useState(false)

  useEffect(() => {
    const handleMapState = (e: any) => {
      setIsMapActive(Boolean(e.detail?.active))
    }

    const checkDataset = () => {
      const active =
        document.body.dataset.mapActive === "true" ||
        document.documentElement.dataset.mapActive === "true" ||
        document.body.dataset.addressModalOpen === "true"
      setIsMapActive(active)
    }

    window.addEventListener("map-view-active", handleMapState)
    window.addEventListener("address-modal-state", handleMapState)

    const observer = new MutationObserver(checkDataset)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-map-active", "data-address-modal-open"],
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-map-active", "data-address-modal-open"],
    })

    checkDataset()

    return () => {
      window.removeEventListener("map-view-active", handleMapState)
      window.removeEventListener("address-modal-state", handleMapState)
      observer.disconnect()
    }
  }, [])

  // Se já estiver logado ou carregando o estado inicial, não renderiza
  if (loading || user) {
    return null
  }

  const handleAction = () => {
    if (onOpenAuth) {
      onOpenAuth()
    } else {
      openAuthModal()
    }
  }

  // 1. MODO DESKTOP (Renderizado pelo Header apenas em telas md/lg para cima)
  if (desktopOnly) {
    return (
      <aside
        aria-label="Aviso para clientes convidados"
        className="hidden md:block w-full bg-[#1F1B16] text-[#F7F5F0] border-b border-[#2E2820] py-2 px-4 text-xs font-semibold relative z-30 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E3A008]/20 text-[#E3A008] flex items-center justify-center">
              <Sparkles className="h-3 w-3 animate-pulse" />
            </span>
            <p className="truncate text-xs text-[#E8E2D9]">
              <strong className="text-white font-bold">Entre ou cadastre-se</strong> para ver seus cupons e acompanhar seu pedido em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleAction}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E3A008] hover:bg-[#C1440E] active:scale-95 text-white text-xs font-black rounded-full shadow-sm transition-all duration-150 cursor-pointer"
            >
              <span>Entrar / Cadastrar</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>
    )
  }

  // 2. MODO MOBILE BOTTOM BANNER (Ancorado acima da Bottom Navigation)
  // Ocultar se o mapa/endereço estiver ativo
  if (isMapActive) return null

  // Rotas restritas onde não deve aparecer no mobile
  const isHiddenRoute =
    !pathname ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout") ||
    pathname === "/carrinho" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/enderecos") ||
    pathname.startsWith("/cupons") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/reset-password")

  if (isHiddenRoute) return null

  // A sacola (CartBar) tem totalItems > 0
  const hasCartItems = items.reduce((sum, item) => sum + item.quantity, 0) > 0

  // Se tiver sacola, a sacola já ocupa bottom-16. Para não colidir, o banner fica acima da sacola (bottom-36)
  // Se não houver sacola, o banner fica exatamente ancorado na bottom-16 (acima da Bottom Navigation)
  const mobileBottomOffset = hasCartItems
    ? "bottom-34 sm:bottom-36"
    : "bottom-16"

  return (
    <aside
      aria-label="Aviso promocional para visitante"
      className={`fixed ${mobileBottomOffset} left-0 right-0 z-40 md:hidden px-3 transition-all duration-300 ease-out animate-in slide-in-from-bottom-2 pointer-events-auto`}
    >
      <div className="max-w-md mx-auto">
        <div className="bg-[#1F1B16] text-[#F7F5F0] border border-[#2E2820] shadow-[0_8px_24px_rgba(0,0,0,0.25)] rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5">
          {/* Lado Esquerdo: Mensagem e Ícone */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#E3A008]/20 text-[#E3A008] flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-[#E3A008]" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] leading-tight text-[#E8E2D9] font-medium line-clamp-2">
                <strong className="text-white font-bold">Entre ou cadastre-se</strong> para ver seus cupons.
              </p>
            </div>
          </div>

          {/* Lado Direito: Botão Pill Amarelo */}
          <button
            type="button"
            onClick={handleAction}
            className="flex-shrink-0 h-8 px-3.5 bg-[#E3A008] hover:bg-[#C1440E] active:scale-95 text-white text-[11px] font-black rounded-full shadow-sm flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>Entrar</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  )
}
