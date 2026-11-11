"use client"

import React, { useState, useEffect } from "react"
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
          <p className="truncate text-xs text-[#E8E2D9]">
            Explore mais com sua conta Batata Top.{" "}
            <button
              type="button"
              onClick={handleAction}
              className="text-[#E3A008] hover:text-[#C1440E] font-bold underline transition-colors cursor-pointer ml-1"
            >
              Entrar ou cadastrar-se
            </button>
          </p>

          <button
            type="button"
            onClick={handleAction}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E3A008] hover:bg-[#C1440E] active:scale-95 text-white text-xs font-black rounded-full shadow-sm transition-all duration-150 cursor-pointer"
          >
            <span>Entrar ou cadastrar-se</span>
          </button>
        </div>
      </aside>
    )
  }

  // 2. MODO MOBILE BOTTOM BANNER (Idêntico ao app na captura enviada)
  if (isMapActive) return null

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

  const hasCartItems = items.reduce((sum, item) => sum + item.quantity, 0) > 0

  const mobileBottomOffset = hasCartItems
    ? "bottom-34 sm:bottom-36"
    : "bottom-16"

  return (
    <aside
      aria-label="Aviso para clientes convidados"
      className={`fixed ${mobileBottomOffset} left-0 right-0 z-40 md:hidden px-3 transition-all duration-300 ease-out pointer-events-auto`}
    >
      <div className="max-w-md mx-auto">
        <button
          type="button"
          onClick={handleAction}
          className="w-full bg-white text-[#554D44] border border-[#ECE7E0] shadow-[0_4px_20px_rgba(0,0,0,0.06)] rounded-2xl py-2.5 px-4 flex flex-col items-center justify-center text-center active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="text-[11px] sm:text-xs text-[#6B6157] font-medium leading-none mb-1">
            Explore mais com sua conta Batata Top
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-[#E3A008] leading-tight">
            Entrar ou cadastrar-se
          </span>
        </button>
      </div>
    </aside>
  )
}
