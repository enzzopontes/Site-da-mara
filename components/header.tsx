"use client"

import Link from "next/link"
import {
  ShoppingCart,
  ShieldAlert,
  Search,
  User,
  ChevronDown,
  MapPin,
  Home,
  UtensilsCrossed,
  Package,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Image from "next/image"
import { AddressModal } from "@/components/address-modal"
import { addressesManager } from "@/lib/addresses-manager"
import { storeStatusManager } from "@/lib/store-status-manager"
import { isAdminUser, isAdmin as checkIsAdmin } from "@/lib/supabase/admin"

interface HeaderProps {
  variant?: "default" | "simple"
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return "Bom dia"
  if (h >= 12 && h < 18) return "Boa tarde"
  return "Boa noite"
}

function getFirstName(fullName?: string | null, email?: string | null): string | null {
  const raw = fullName?.trim() || email?.split("@")[0]?.replace(/[._-]+/g, " ")?.trim()
  if (!raw) return null
  const first = raw.split(/\s+/)[0]
  if (!first) return null
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export function Header({ variant = "default" }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { items } = useCart()
  const { user, loading: authLoading } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [timeGreeting, setTimeGreeting] = useState("Olá")
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [defaultAddress, setDefaultAddress] = useState<string>("Iacanga - SP")
  const [addressLoading, setAddressLoading] = useState(true)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isHeaderHidden, setIsHeaderHidden] = useState(false)

  const hiddenRef = useRef(false)


  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const firstName = user ? getFirstName(user.user_metadata?.full_name, user.email) : null
  const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting

  useEffect(() => {
    setTimeGreeting(getTimeGreeting())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    if (isAdminUser(user)) {
      setIsAdmin(true)
      return
    }
    checkIsAdmin(user.id).then((res) => {
      if (res) setIsAdmin(true)
    })
  }, [user])

  const loadDefaultAddress = async () => {
    if (authLoading) return
    setAddressLoading(true)
    try {
      if (user) {
        const addresses = await addressesManager.getUserAddresses(user.id)
        const def = addresses.find((a) => a.is_default) || addresses[0]
        if (def) {
          setDefaultAddress(`${def.street}, ${def.number}`)
        } else {
          setDefaultAddress("Iacanga - SP")
        }
      } else {
        const guestAddr = typeof window !== "undefined" ? localStorage.getItem("batata_top_guest_address") : null
        if (guestAddr) {
          try {
            const parsed = JSON.parse(guestAddr)
            if (parsed?.street && parsed?.number) {
              setDefaultAddress(`${parsed.street}, ${parsed.number}`)
            } else {
              setDefaultAddress("Iacanga - SP")
            }
          } catch {
            setDefaultAddress("Iacanga - SP")
          }
        } else {
          setDefaultAddress("Iacanga - SP")
        }
      }
    } finally {
      setAddressLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    loadDefaultAddress()
    const handleAddressChange = () => loadDefaultAddress()
    window.addEventListener("address-changed", handleAddressChange)
    return () => window.removeEventListener("address-changed", handleAddressChange)
  }, [user, authLoading])

  useEffect(() => {
    const updateStoreStatus = async () => {
      try {
        const status = await storeStatusManager.getStatus()
        setIsOpen(status.isOpen)
      } catch (err) {
        console.error("Erro ao carregar status da loja:", err)
      } finally {
        setStatusLoading(false)
      }
    }
    updateStoreStatus()
    window.addEventListener("store-status-changed", updateStoreStatus)
    const interval = setInterval(updateStoreStatus, 10000)
    return () => {
      window.removeEventListener("store-status-changed", updateStoreStatus)
      clearInterval(interval)
    }
  }, [])

  // Sincronização de scroll suave entre Header e CategoryBar
  useEffect(() => {
    if (pathname !== "/" && pathname !== "/cardapio") {
      hiddenRef.current = false
      setIsHeaderHidden(false)
      return
    }

    const onHeaderScrollSwap = (event: Event) => {
      const customEvent = event as CustomEvent<{ headerHidden?: boolean }>
      if (typeof customEvent.detail?.headerHidden === "boolean") {
        hiddenRef.current = customEvent.detail.headerHidden
        setIsHeaderHidden(customEvent.detail.headerHidden)
      }
    }

    const handleScroll = () => {
      if (window.scrollY <= 40 && hiddenRef.current) {
        hiddenRef.current = false
        setIsHeaderHidden(false)
      }
    }

    window.addEventListener("header-scroll-swap", onHeaderScrollSwap)
    window.addEventListener("scroll", handleScroll, { passive: true })
    if (window.scrollY <= 40) {
      hiddenRef.current = false
      setIsHeaderHidden(false)
    }

    return () => {
      window.removeEventListener("header-scroll-swap", onHeaderScrollSwap)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [pathname])

  useEffect(() => {
    if (pathname !== "/cardapio") return
    const onCatalogSearch = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string }>
      if (typeof customEvent.detail?.query === "string") {
        setSearchTerm(customEvent.detail.query)
      }
    }
    window.addEventListener("catalog-search", onCatalogSearch)
    return () => window.removeEventListener("catalog-search", onCatalogSearch)
  }, [pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/cardapio?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const isActive = (path: string) => {
    if (!pathname) return false
    if (path === "/" && pathname === "/") return true
    if (path === "/perfil") return pathname === "/perfil" || pathname.startsWith("/perfil/")
    if (path !== "/" && path !== "#" && pathname.startsWith(path)) return true
    return false
  }

  if (pathname === "/checkout" || pathname?.startsWith("/checkout")) return null

  if (variant === "simple") {
    return (
      <header className="w-full bg-white border-b border-[#ECE7E0] h-16 sticky top-0 z-40 flex items-center">
        <div className="container mx-auto px-4 flex justify-center">
          <Link href="/" className="relative w-11 h-11 transition-transform hover:scale-105">
            <Image
              src="/logo.png"
              alt="batata top Delivery"
              fill
              className="rounded-full object-contain pointer-events-none"
              priority
            />
          </Link>
        </div>
      </header>
    )
  }

  const hideHeader = isHeaderHidden && (pathname === "/" || pathname === "/cardapio")
  const isInitialLoading = !mounted || authLoading || addressLoading

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full h-16 bg-[#FFFFFF] border-b border-[#ECE7E0] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hideHeader
            ? "-translate-y-full pointer-events-none"
            : "translate-y-0 opacity-100 pointer-events-auto"
        }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-8 flex items-center justify-between gap-3">
          {/* Left: Dynamic Greeting + Address Selector */}
          <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-initial">
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              className="flex flex-col items-start min-w-0 text-left active:scale-[0.98] transition-transform cursor-pointer group"
              title="Alterar endereço de entrega"
            >
              {isInitialLoading ? (
                <div className="flex flex-col gap-1.5 py-0.5">
                  <div className="h-3 w-24 bg-[#F3F0EB] rounded animate-pulse" />
                  <div className="h-4 w-36 sm:w-44 bg-[#F3F0EB] rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <span className="text-xs font-medium text-[#717171] leading-tight truncate max-w-[200px] sm:max-w-[260px]">
                    {greeting}
                  </span>
                  <div className="flex items-center gap-1 min-w-0 max-w-[210px] xs:max-w-[240px] sm:max-w-[300px]">
                    <MapPin className="h-3.5 w-3.5 text-[#E3A008] flex-shrink-0" />
                    <span className="text-sm sm:text-base font-bold text-[#1A1A1A] truncate leading-snug group-hover:text-[#E3A008] transition-colors">
                      {defaultAddress}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#1A1A1A] flex-shrink-0 transition-transform group-hover:translate-y-0.5" />
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Center: Compact Store Status Badge (+ subtle integrated search on Desktop) */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {statusLoading ? (
              <div className="h-5 w-16 bg-[#F3F0EB] rounded-full animate-pulse" />
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full select-none"
                aria-label={isOpen ? "Loja aberta" : "Loja fechada"}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isOpen ? "bg-[#22C55E] animate-pulse" : "bg-[#E63535]"
                  }`}
                />
                <span className="text-xs sm:text-sm font-medium text-[#717171]">
                  {isOpen ? "Aberto" : "Fechado"}
                </span>
              </div>
            )}

            <form onSubmit={handleSearch} className="hidden lg:block w-44 xl:w-72">
              <div className="relative flex items-center w-full">
                <Search className="absolute left-3 h-4 w-4 text-[#717171] pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (pathname === "/cardapio") {
                      window.dispatchEvent(new CustomEvent("catalog-search", { detail: { query: e.target.value } }))
                    }
                  }}
                  placeholder="Buscar no cardápio..."
                  aria-label="Buscar produtos"
                  className="w-full bg-[#F7F5F0] border border-[#ECE7E0] focus:border-[#E3A008] focus:bg-white rounded-full h-10 pl-9 pr-4 text-sm text-[#1A1A1A] placeholder:text-[#717171] outline-none transition-colors"
                />
              </div>
            </form>
          </div>

          {/* Right: Desktop Quick Links + Minimalist Circular Cart Button */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <nav
              aria-label="Navegação principal"
              className="hidden lg:flex items-center gap-3 xl:gap-5 text-sm font-semibold"
            >
              <Link
                href="/"
                aria-current={isActive("/") ? "page" : undefined}
                className={`flex items-center gap-1.5 transition-colors hover:text-[#E3A008] ${
                  isActive("/") ? "text-[#E3A008]" : "text-[#1A1A1A]"
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Início</span>
              </Link>
              <Link
                href="/cardapio"
                aria-current={isActive("/cardapio") ? "page" : undefined}
                className={`flex items-center gap-1.5 transition-colors hover:text-[#E3A008] ${
                  isActive("/cardapio") ? "text-[#E3A008]" : "text-[#1A1A1A]"
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                <span>Cardápio</span>
              </Link>
              <Link
                href="/pedidos"
                aria-current={isActive("/pedidos") ? "page" : undefined}
                className={`flex items-center gap-1.5 transition-colors hover:text-[#E3A008] ${
                  isActive("/pedidos") ? "text-[#E3A008]" : "text-[#1A1A1A]"
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Pedidos</span>
              </Link>
              {user ? (
                <Link
                  href="/perfil"
                  aria-current={isActive("/perfil") ? "page" : undefined}
                  className={`flex items-center gap-1.5 transition-colors hover:text-[#E3A008] ${
                    isActive("/perfil") ? "text-[#E3A008]" : "text-[#1A1A1A]"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  aria-current={isActive("/login") ? "page" : undefined}
                  className={`flex items-center gap-1.5 transition-colors hover:text-[#E3A008] ${
                    isActive("/login") ? "text-[#E3A008]" : "text-[#1A1A1A]"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Entrar</span>
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="p-1.5 hover:bg-[#F3F0EB] rounded-full text-[#C1440E] transition-colors"
                  title="Painel Administrativo"
                >
                  <ShieldAlert className="h-4 w-4" />
                </Link>
              )}
            </nav>

            <Link
              href="/checkout"
              className="w-10 h-10 rounded-full bg-[#F3F0EB] hover:bg-[#ECE7E0] flex items-center justify-center relative active:scale-[0.98] transition-transform flex-shrink-0"
              aria-label="Ver sacola"
            >
              <ShoppingCart className="text-[#1A1A1A] h-5 w-5" />
              {totalItems > 0 && (
                <span className="bg-[#E63535] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full border-2 border-white absolute -top-1 -right-1 flex items-center justify-center leading-none">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </>
  )
}
