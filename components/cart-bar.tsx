"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"

const hasLocalAuthToken = (): boolean => {
  if (typeof window === "undefined") return false
  try {
    const hasCookie = Boolean(
      document.cookie &&
        (document.cookie.includes("sb-") ||
          document.cookie.includes("supabase.auth.token"))
    )
    const hasStorage = Object.keys(localStorage).some(
      (k) => k.startsWith("sb-") || k.includes("supabase.auth.token")
    )
    return hasCookie || hasStorage
  } catch {
    return false
  }
}

export function CartBar() {
  const pathname = usePathname()
  const { items, getTotalPrice } = useCart()
  const { user, loading: authLoading, openAuthModal } = useAuth()
  const [isMapActive, setIsMapActive] = useState(false)
  const [isDeliveryFeeEnabled, setIsDeliveryFeeEnabled] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [statusLoaded, setStatusLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const applyStatus = (status?: StoreStatus | null) => {
      if (!active || !status) return
      setIsDeliveryFeeEnabled(Boolean(status.isDeliveryFeeEnabled))
      setDeliveryFee(typeof status.deliveryFee === "number" ? status.deliveryFee : 0)
      setStatusLoaded(true)
    }

    storeStatusManager.getStatus().then(applyStatus).catch(() => {})

    const handleStatusChange = (e: Event) => {
      const detail = (e as CustomEvent<StoreStatus>).detail
      if (detail) {
        applyStatus(detail)
      } else {
        storeStatusManager.getStatus().then(applyStatus).catch(() => {})
      }
    }

    window.addEventListener("store-status-changed", handleStatusChange)
    return () => {
      active = false
      window.removeEventListener("store-status-changed", handleStatusChange)
    }
  }, [])

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
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-map-active", "data-address-modal-open"] })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-map-active", "data-address-modal-open"] })

    checkDataset()

    return () => {
      window.removeEventListener("map-view-active", handleMapState)
      window.removeEventListener("address-modal-state", handleMapState)
      observer.disconnect()
    }
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = getTotalPrice()

  // Regras estritas de ocultação da Barra Flutuante da Sacola
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
    pathname.startsWith("/perfil/pagamentos") ||
    pathname.startsWith("/excluir-conta") ||
    pathname.startsWith("/selecionar-endereco") ||
    pathname.startsWith("/reset-password")

  // Exibir somente quando totalItems > 0 e não estiver em rota restrita nem com mapa ativo
  if (totalItems <= 0 || isHiddenRoute || isMapActive) {
    return null
  }

  // Verifica se a TabBar móvel está visível para calcular o offset inferior
  const isMainTab =
    pathname === "/" ||
    pathname === "/cardapio" ||
    pathname === "/pedidos" ||
    pathname === "/perfil" ||
    pathname === "/profile"

  // Se a TabBar estiver ativa no mobile, fica acima dela (bottom-16 = 64px)
  const bottomPositionClass = isMainTab
    ? "bottom-16 lg:bottom-0"
    : "bottom-0"

  const handleCheckoutClick = (e: React.MouseEvent) => {
    // 1. Se autenticado ou com token presente nos cookies/localStorage, permite navegação direta
    if (user || hasLocalAuthToken()) {
      return
    }

    // 2. Se a autenticação ainda está carregando, bloqueia sem abrir modal indevidamente
    if (authLoading) {
      e.preventDefault()
      return
    }

    // 3. Usuário comprovadamente não autenticado: abre modal de auth
    e.preventDefault()
    openAuthModal()
  }

  const isCheckingAuth = authLoading && !user && !hasLocalAuthToken()

  return (
    <aside
      aria-label="Resumo da sacola flutuante"
      className={`fixed ${bottomPositionClass} left-0 right-0 z-50 bg-white border-t border-[#ECE7E0] shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.06)] rounded-none transition-all duration-300 ease-out animate-in slide-in-from-bottom-4`}
    >
      <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo + Preço */}
        <Link
          href="/checkout"
          onClick={handleCheckoutClick}
          className="flex-1 flex items-center gap-2 pr-2 min-w-0 group cursor-pointer"
        >
          <Image
            src="/brand/logo.png"
            alt="Batata Top Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain flex-shrink-0"
          />
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs text-[#6B6157] font-normal truncate">
              {!statusLoaded ? (
                "Total sem entrega"
              ) : isDeliveryFeeEnabled && deliveryFee > 0 ? (
                <>
                  Total + entrega{" "}
                  <strong className="font-bold text-[#1F1B16]">
                    R$ {deliveryFee.toFixed(2).replace(".", ",")}
                  </strong>
                </>
              ) : (
                <>
                  Total com <strong className="font-bold text-[#1F1B16]">entrega grátis</strong>
                </>
              )}
            </span>
            <div className="mt-0.5 flex items-baseline">
              <span className="text-base font-bold text-[#1F1B16] tracking-tight group-hover:text-[#E3A008] transition-colors whitespace-nowrap">
                R$ {totalPrice.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-xs text-[#9C9188] font-normal ml-1.5 truncate">
                / {totalItems} {totalItems === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>
        </Link>

        {/* Botão "Ver sacola" idêntico ao app (w-1/2, radius 4px, sem sombra extra) */}
        <Link
          href="/checkout"
          onClick={handleCheckoutClick}
          aria-busy={isCheckingAuth}
          className="w-1/2 py-3 px-4 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] text-white font-bold text-base rounded-[4px] flex items-center justify-center transition-all duration-200 cursor-pointer"
        >
          {isCheckingAuth ? (
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Verificando...</span>
            </span>
          ) : (
            "Ver sacola"
          )}
        </Link>
      </div>
    </aside>
  )
}
