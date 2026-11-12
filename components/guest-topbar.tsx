"use client"

import React, { useState, useEffect, useRef } from "react"
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
  const [isExiting, setIsExiting] = useState(false)
  const prevUserRef = useRef(user)

  // Monitora alterações do estado do mapa e modal de endereço
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

  // Gerencia a animação elástica de saída ao autenticar (spring exit com antecipação)
  useEffect(() => {
    if (!prevUserRef.current && user) {
      setIsExiting(true)
      const timer = setTimeout(() => {
        setIsExiting(false)
      }, 450)
      prevUserRef.current = user
      return () => clearTimeout(timer)
    }
    prevUserRef.current = user
  }, [user])

  // Se carregando inicial ou se já logado (e não estiver no meio da saída elástica)
  if (loading || (user && !isExiting)) {
    return null
  }

  const handleAction = () => {
    if (onOpenAuth) {
      onOpenAuth()
    } else {
      openAuthModal()
    }
  }

  // 1. MODO DESKTOP TOPBAR (Renderizado no topo do Header caso desktopOnly=true)
  if (desktopOnly) {
    if (user) return null

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

  // 2. MODO BANNER FLUTUANTE INFERIOR (Idêntico ao App Móvel com Física Elástica)
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

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const hasCartItems = totalCartItems > 0

  // Posicionamento dinâmico:
  // - Sem sacola: bottom-20 no mobile (respiro de ~24px acima da navbar) e bottom-6 no desktop
  // - Com sacola: bottom-36 no mobile (~144px, flutuando acima da CartBar) e md:bottom-28 no desktop
  const bottomOffsetClass = hasCartItems
    ? "bottom-36 md:bottom-28"
    : "bottom-20 md:bottom-6"

  const animationClass = isExiting ? "banner-elastic-exit" : "banner-elastic-enter"

  return (
    <aside
      aria-label="Aviso para clientes convidados"
      className={`fixed ${bottomOffsetClass} left-0 right-0 z-40 px-3 transition-[bottom,transform] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto select-none`}
    >
      <div className={`max-w-md sm:max-w-lg mx-auto ${animationClass}`}>
        <button
          type="button"
          onClick={handleAction}
          className="w-full bg-white text-[#554D44] border border-[#ECE7E0] shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-[22px] py-2.5 px-4 flex flex-col items-center justify-center text-center active:scale-[0.99] hover:border-[#E3A008]/50 transition-all cursor-pointer"
        >
          <span className="text-[11px] sm:text-xs text-[#6B6157] font-medium leading-none mb-1">
            Explore mais com sua conta Batata Top
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-[#E3A008] hover:text-[#C1440E] leading-tight transition-colors">
            Entrar ou cadastrar-se
          </span>
        </button>
      </div>
    </aside>
  )
}
