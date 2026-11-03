"use client"

import Link from "next/link"
import {
  ShoppingCart,
  Menu,
  X,
  ShieldAlert,
  Search,
  User,
  ChevronDown,
  MapPin,
  LogOut,
  Clock,
  UserPlus,
  LogIn,
  Utensils,
  ShoppingBag
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Image from "next/image"
import { StoreStatusBadge } from "@/components/store-status-badge"
import { AddressModal } from "@/components/address-modal"
import { addressesManager } from "@/lib/addresses-manager"
import { storeStatusManager } from "@/lib/store-status-manager"
import { isAdminUser, isAdmin as checkIsAdmin } from "@/lib/supabase/admin"

interface HeaderProps {
  variant?: "default" | "simple"
}

const SEARCH_PLACEHOLDERS = [
  "Buscar batata recheada...",
  "Buscar macarrão cremoso...",
  "Buscar bebidas e refrigerantes...",
  "Buscar adicionais de bacon...",
  "Buscar sobremesas doces...",
]

export function Header({ variant = "default" }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { items, getTotalPrice } = useCart()
  const { user, signOut } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [defaultAddress, setDefaultAddress] = useState<string>("Iacanga - SP")
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [waitTime, setWaitTime] = useState({ min: 15, max: 22 })
  const [isAdmin, setIsAdmin] = useState(false)

  // Animated rotating placeholder state
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderFade, setPlaceholderFade] = useState<"visible" | "fading">("visible")

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = getTotalPrice()

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderFade("fading")
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length)
        setPlaceholderFade("visible")
      }, 200)
    }, 2500)
    return () => clearInterval(timer)
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
    if (user) {
      const addresses = await addressesManager.getUserAddresses(user.id)
      const def = addresses.find(a => a.is_default) || addresses[0]
      if (def) {
        setDefaultAddress(`${def.street}, ${def.number}`)
      } else {
        setDefaultAddress("Iacanga - SP")
      }
    } else {
      setDefaultAddress("Iacanga - SP")
    }
  }

  useEffect(() => {
    loadDefaultAddress()
    const handleAddressChange = () => loadDefaultAddress()
    window.addEventListener("address-changed", handleAddressChange)
    return () => window.removeEventListener("address-changed", handleAddressChange)
  }, [user])

  useEffect(() => {
    const updateWaitTime = async () => {
      const status = await storeStatusManager.getStatus()
      setWaitTime({ min: status.waitTimeMin, max: status.waitTimeMax })
    }
    updateWaitTime()
    const interval = setInterval(updateWaitTime, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/cardapio?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
    router.push("/")
  }

  const isActive = (path: string) => pathname === path

  if (variant === "simple") {
    return (
      <header className="w-full bg-white border-b border-[#ECE7E0] py-4 sticky top-0 z-40">
        <div className="container mx-auto px-4 flex justify-center">
          <Link href="/" className="relative w-12 h-12 sm:w-14 sm:h-14 transition-transform hover:scale-105">
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

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b border-[#ECE7E0] transition-shadow">
        {/* Mobile View */}
        <div className="lg:hidden px-3 sm:px-4 pt-2 pb-2.5 space-y-2">
          {/* Top Bar: Menu + Logo + Location Pill + Cart + Auth */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 -ml-1 hover:bg-[#FEF8EC] rounded-lg transition-colors text-[#1F1B16]"
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Link href="/" className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="batata top Delivery"
                  fill
                  className="rounded-full object-contain pointer-events-none"
                  priority
                />
              </Link>
            </div>

            {/* Location Pill */}
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEF8EC] border border-[#ECE7E0] hover:bg-amber-100/40 transition-colors min-w-0 max-w-[190px] xs:max-w-[230px] text-left"
              title="Alterar endereço de entrega"
            >
              <MapPin className="h-3.5 w-3.5 text-[#E3A008] flex-shrink-0" />
              <div className="flex flex-col min-w-0 leading-none">
                <span className="text-[9px] uppercase font-bold text-[#6B6157] tracking-tight truncate">
                  Entregar em
                </span>
                <span className="text-xs font-black text-[#1F1B16] truncate flex items-center gap-0.5">
                  {defaultAddress}
                  <ChevronDown className="h-3 w-3 text-[#E3A008] flex-shrink-0" />
                </span>
              </div>
            </button>

            {/* Right: Cart + Auth Avatar / Login */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Link
                href="/carrinho"
                className="flex items-center gap-1.5 bg-[#FEF8EC] hover:bg-amber-100/60 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-[#ECE7E0] transition-all active:scale-95"
                aria-label="Ver carrinho"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 text-[#E3A008]" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#C1440E] text-white text-[10px] font-black h-4 w-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="text-xs font-black text-[#1F1B16] hidden xs:inline">
                  R$ {totalPrice.toFixed(2).replace('.', ',')}
                </span>
              </Link>

              {user ? (
                <Link
                  href="/perfil"
                  className="p-1 hover:bg-[#FEF8EC] rounded-full transition-colors"
                  aria-label="Perfil do usuário"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Perfil"
                      className="h-7 w-7 rounded-full object-cover border border-[#ECE7E0]"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-[#FEF8EC] border border-[#ECE7E0] flex items-center justify-center">
                      <User className="h-3.5 w-3.5 text-[#E3A008]" />
                    </div>
                  )}
                </Link>
              ) : (
                <Link href="/login" aria-label="Entrar na conta">
                  <Button className="bg-[#E3A008] hover:bg-[#B5860A] text-white font-black text-xs px-2.5 h-8 rounded-xl shadow-sm transition-all active:scale-95">
                    Entrar
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Row 2: Mobile Search Bar with Animated Placeholder */}
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 h-4 w-4 text-[#E3A008] pointer-events-none z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar produtos no cardápio"
                className="w-full h-10 pl-10 pr-4 bg-[#F7F4EF] hover:bg-[#F7F4EF]/80 focus:bg-white border border-[#ECE7E0] focus:border-[#E3A008] focus:ring-1 focus:ring-[#E3A008] rounded-xl text-xs text-[#1F1B16] outline-none transition-all placeholder-transparent"
              />
              {!searchTerm && (
                <span
                  className={`pointer-events-none absolute left-10 text-xs text-[#6B6157] select-none truncate transition-all duration-300 ease-out ${
                    placeholderFade === "visible"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-1.5"
                  }`}
                >
                  {SEARCH_PLACEHOLDERS[placeholderIndex]}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:flex items-center justify-between w-full h-16 px-4 sm:px-8 max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-6 flex-shrink-0">
            <Link href="/" className="block relative w-12 h-12 flex-shrink-0 transition-transform hover:scale-105">
              <Image
                src="/logo.png"
                alt="batata top Delivery"
                fill
                className="rounded-full object-contain pointer-events-none"
                priority
              />
            </Link>

            <nav className="flex items-center gap-5 text-sm font-bold">
              <Link
                href="/"
                className={`transition-colors hover:text-[#E3A008] ${isActive("/") ? "text-[#E3A008]" : "text-[#6B6157]"}`}
              >
                Início
              </Link>
              <Link
                href="/cardapio"
                className={`transition-colors hover:text-[#E3A008] ${isActive("/cardapio") ? "text-[#E3A008]" : "text-[#6B6157]"}`}
              >
                Cardápio
              </Link>
              <Link
                href="/sobre"
                className={`transition-colors hover:text-[#E3A008] ${isActive("/sobre") ? "text-[#E3A008]" : "text-[#6B6157]"}`}
              >
                Sobre
              </Link>
              <Link
                href="/contato"
                className={`transition-colors hover:text-[#E3A008] ${isActive("/contato") ? "text-[#E3A008]" : "text-[#6B6157]"}`}
              >
                Contato
              </Link>

              <div className="h-4 w-[1px] bg-[#ECE7E0] mx-1" />
              <StoreStatusBadge />
              <div className="h-4 w-[1px] bg-[#ECE7E0] mx-1" />
              <div className="flex items-center gap-1.5 text-[#6B6157] bg-[#F7F4EF] px-2.5 py-1 rounded-md border border-[#ECE7E0]">
                <Clock className="h-3.5 w-3.5 text-[#E3A008]" />
                <span className="text-xs font-bold">{waitTime.min}-{waitTime.max} min</span>
              </div>
            </nav>
          </div>

          {/* Desktop Search Bar with Animated Placeholder */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3.5 h-4 w-4 text-[#E3A008] pointer-events-none z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar produtos"
                className="w-full h-11 pl-10 pr-4 bg-[#F7F4EF] hover:bg-[#F7F4EF]/80 focus:bg-white border border-[#ECE7E0] focus:border-[#E3A008] focus:ring-1 focus:ring-[#E3A008] rounded-xl text-sm text-[#1F1B16] outline-none transition-all placeholder-transparent"
              />
              {!searchTerm && (
                <span
                  className={`pointer-events-none absolute left-10 text-sm text-[#6B6157] select-none truncate transition-all duration-300 ease-out ${
                    placeholderFade === "visible"
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 -translate-y-1.5"
                  }`}
                >
                  {SEARCH_PLACEHOLDERS[placeholderIndex]}
                </span>
              )}
            </div>
          </form>

          {/* Desktop Right Controls: Location + Auth/Profile + Cart */}
          <div className="flex items-center gap-3 xl:gap-4 flex-shrink-0">
            {/* Location Pill */}
            <div
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#FEF8EC] hover:bg-amber-100/50 border border-[#ECE7E0] rounded-full cursor-pointer transition-colors max-w-[210px]"
              title="Alterar endereço de entrega"
            >
              <MapPin className="h-4 w-4 text-[#E3A008] flex-shrink-0" />
              <div className="flex flex-col min-w-0 leading-none">
                <span className="text-[9px] uppercase font-bold text-[#6B6157] tracking-tight">
                  Entregar em
                </span>
                <div className="flex items-center gap-1 text-xs font-black text-[#1F1B16]">
                  <span className="truncate">{defaultAddress}</span>
                  <ChevronDown className="h-3 w-3 text-[#E3A008] flex-shrink-0" />
                </div>
              </div>
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                className="p-2 hover:bg-amber-50 rounded-full text-[#C1440E] transition-colors"
                title="Painel Administrativo"
              >
                <ShieldAlert className="h-5 w-5" />
              </Link>
            )}

            {/* Cart Link */}
            <Link href="/carrinho">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FEF8EC] hover:bg-amber-100/60 rounded-xl border border-[#ECE7E0] transition-all cursor-pointer group active:scale-95">
                <div className="relative">
                  <ShoppingCart className="h-5.5 w-5.5 text-[#E3A008]" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#C1440E] text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center border border-white shadow-sm">
                      {totalItems}
                    </span>
                  )}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-black text-[#1F1B16]">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
                  <span className="text-[10px] text-[#6B6157] font-bold">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
                </div>
              </div>
            </Link>

            {user ? (
              <Link
                href="/perfil"
                className="flex items-center gap-2 p-1.5 hover:bg-[#FEF8EC] rounded-full transition-all"
                title="Meu Perfil"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || "Perfil"}
                    className="h-8 w-8 rounded-full object-cover border border-[#ECE7E0]"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[#FEF8EC] flex items-center justify-center border border-[#ECE7E0]">
                    <User className="h-4 w-4 text-[#E3A008]" />
                  </div>
                )}
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/cadastro"
                  className="text-sm font-bold text-[#E3A008] hover:text-[#B5860A] transition-colors"
                >
                  Criar conta
                </Link>
                <Link href="/login">
                  <Button className="bg-[#E3A008] hover:bg-[#B5860A] text-white font-black text-sm px-4 h-9 rounded-xl shadow-md transition-all active:scale-95">
                    Entrar
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 animate-in fade-in duration-300"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col overflow-hidden rounded-r-[32px]">
              <div className="bg-gradient-to-b from-[#FEF8EC] to-white p-6 pt-10 flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute top-5 right-5 p-2 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-sm transition-all active:scale-90"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5 text-[#6B6157]" />
                </button>

                <div className="w-14 h-14 relative">
                  <Image
                    src="/logo.png"
                    alt="batata top Delivery"
                    fill
                    className="rounded-full object-contain pointer-events-none"
                    priority
                  />
                </div>
                <h2 className="text-xl font-black text-[#1F1B16] mt-3">
                  {user ? (user.user_metadata?.full_name || "Olá, Cliente!") : "Bem-vindo!"}
                </h2>

                <div className="flex items-center gap-2.5 mt-3">
                  <StoreStatusBadge />
                  <div className="flex items-center gap-1.5 text-[#6B6157] bg-white px-2.5 py-1 rounded-xl border border-[#ECE7E0] shadow-sm">
                    <Clock className="h-3.5 w-3.5 text-[#E3A008]" />
                    <span className="text-xs font-black">{waitTime.min}-{waitTime.max} min</span>
                  </div>
                </div>

                {!user && (
                  <p className="text-xs text-[#6B6157] mt-3">Faça login para continuar</p>
                )}
              </div>

              {!user ? (
                <div className="p-5 space-y-2.5 border-b border-[#ECE7E0]">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-[#E3A008] hover:bg-[#B5860A] text-white font-black h-11 rounded-xl shadow-md transition-all active:scale-95">
                      <LogIn className="h-4 w-4 mr-2" /> Entrar
                    </Button>
                  </Link>
                  <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-2 border-[#E3A008] text-[#A16207] font-black h-11 rounded-xl hover:bg-[#FEF8EC] transition-all active:scale-95">
                      <UserPlus className="h-4 w-4 mr-2" /> Criar Conta
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 border-b border-[#ECE7E0] space-y-1">
                  <Link
                    href="/perfil"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FEF8EC] transition-colors"
                  >
                    <User className="h-5 w-5 text-[#E3A008]" />
                    <span className="font-bold text-sm text-[#1F1B16]">Meu Perfil</span>
                  </Link>
                  <Link
                    href="/pedidos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FEF8EC] transition-colors"
                  >
                    <ShoppingBag className="h-5 w-5 text-[#E3A008]" />
                    <span className="font-bold text-sm text-[#1F1B16]">Meus Pedidos</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-[#C1440E] transition-colors"
                    >
                      <ShieldAlert className="h-5 w-5" />
                      <span className="font-bold text-sm">Painel Administrativo</span>
                    </Link>
                  )}
                </div>
              )}

              <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 p-3 hover:bg-[#FEF8EC] rounded-2xl transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Utensils className="h-5 w-5 text-[#E3A008]" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-[#1F1B16]">Início</p>
                    <p className="text-xs text-[#6B6157]">Página principal</p>
                  </div>
                </Link>
                <Link
                  href="/cardapio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 p-3 hover:bg-[#FEF8EC] rounded-2xl transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Search className="h-5 w-5 text-[#C1440E]" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-[#1F1B16]">Cardápio</p>
                    <p className="text-xs text-[#6B6157]">Veja nossas opções</p>
                  </div>
                </Link>
                <Link
                  href="/sobre"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 p-3 hover:bg-[#FEF8EC] rounded-2xl transition-all group"
                >
                  <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="h-5 w-5 text-[#A16207]" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-[#1F1B16]">Nossa História</p>
                    <p className="text-xs text-[#6B6157]">Conheça o batata top</p>
                  </div>
                </Link>
              </nav>

              {user && (
                <div className="p-4 border-t border-[#ECE7E0]">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full p-2.5 rounded-xl hover:bg-red-50 text-red-600 font-bold text-sm transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}

              <div className="p-4 bg-[#F7F4EF] text-center border-t border-[#ECE7E0]">
                <p className="text-[10px] font-bold text-[#6B6157] uppercase tracking-[0.2em]">
                  batata top © 2026
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </>
  )
}
