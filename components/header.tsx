"use client"

import Link from "next/link"
import { ShoppingCart, Menu, X, ShieldAlert, Search, User, ChevronDown, MapPin, LogOut, Clock, UserPlus, LogIn, Utensils, ArrowLeft } from "lucide-react"
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

export function Header({ variant = "default" }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { items, getTotalPrice } = useCart()
  const { user, signOut } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "")
  const [defaultAddress, setDefaultAddress] = useState<string>("Selecione o endereço")
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [waitTime, setWaitTime] = useState({ min: 15, max: 22 })

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = getTotalPrice()
  const [isAdmin, setIsAdmin] = useState(false)

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
        setDefaultAddress("Cadastrar endereço")
      }
    } else {
      setDefaultAddress("Entre para ver endereços")
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

  const handleMobileSearchClick = () => {
    if (pathname === "/cardapio") {
      window.dispatchEvent(new CustomEvent("focus-search"))
      router.replace(`/cardapio?focus=search&t=${Date.now()}`)
    } else {
      router.push("/cardapio?focus=search")
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const isActive = (path: string) => pathname === path

  if (variant === "simple") {
    return (
      <header className="w-full bg-white border-b py-6 sticky top-0 z-40">
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

  if (!user) {
    return (
      <header className={`sticky top-0 z-40 w-full transition-all duration-200 bg-white ${
        isScrolled ? "py-2" : "py-4 sm:py-6"
      }`}>
        <div className="container mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center lg:hidden gap-1">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors"
              >
                <Menu className="h-7 w-7 text-gray-900" />
              </button>
              <Link href="/" className="relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="batata top Delivery"
                  fill
                  className="rounded-full object-contain pointer-events-none"
                  priority
                />
              </Link>
            </div>

            <div className="hidden lg:flex items-center lg:mr-4">
              <Link href="/" className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="batata top Delivery"
                  fill
                  className="rounded-full object-contain pointer-events-none"
                  priority
                />
              </Link>
            </div>

            <nav className="hidden lg:flex items-center gap-8 text-[15px] font-bold text-gray-600 lg:ml-4">
              <Link href="/" className="hover:text-yellow-500 transition-colors">Início</Link>
              <Link href="/cardapio" className="hover:text-yellow-500 transition-colors">Cardápio</Link>
              <Link href="/sobre" className="hover:text-yellow-500 transition-colors">Nossa História</Link>
              <Link href="/contato" className="hover:text-yellow-500 transition-colors">Fale Conosco</Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 lg:gap-6">
              {/* Ícone de pesquisa removido do mobile conforme solicitado */}
              <div className="hidden lg:block">
                <button onClick={handleMobileSearchClick} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                  <Search className="h-6 w-6 text-gray-900" />
                </button>
              </div>

              <Link href="/carrinho" className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-yellow-200 transition-all active:scale-95">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[10px] font-black h-4.5 w-4.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {totalItems}
                    </span>
                  )}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[11px] sm:text-[14px] font-black text-gray-900">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </Link>

              <Link href="/cadastro" className="hidden sm:block text-[15px] font-bold text-yellow-600 hover:text-yellow-700 transition-colors">
                criar conta
              </Link>
              <Link href="/login">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-white font-black text-xs sm:text-sm px-3 sm:px-6 h-9 sm:h-11 rounded-xl shadow-lg shadow-yellow-100 transition-all active:scale-95">
                  Entrar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[85%] bg-white shadow-2xl animate-in slide-in-from-left duration-500 flex flex-col overflow-hidden rounded-r-[40px]">
              <div className="bg-gradient-to-b from-yellow-50 to-white p-8 pt-12 flex flex-col items-center relative">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute top-6 right-6 p-2.5 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-sm transition-all active:scale-90"
                >
                  <X className="h-6 w-6 text-gray-400" />
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
                <h2 className="text-2xl font-black text-gray-800 mt-4">Bem-vindo!</h2>

                <div className="flex items-center gap-3 mt-4">
                  <StoreStatusBadge />
                  <div className="flex items-center gap-1.5 text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs font-black">{waitTime.min}-{waitTime.max} min</span>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-4">Faça login para continuar</p>
              </div>

              <div className="p-6 space-y-3 border-b border-gray-100">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-black h-12 rounded-xl shadow-lg shadow-yellow-100 transition-all active:scale-95">
                    <LogIn className="h-5 w-5 mr-2" /> Entrar
                  </Button>
                </Link>
                <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-2 border-yellow-500 text-yellow-600 font-black h-12 rounded-xl hover:bg-yellow-50 transition-all active:scale-95">
                    <UserPlus className="h-5 w-5 mr-2" /> Criar Conta
                  </Button>
                </Link>
              </div>

              <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-yellow-50 rounded-2xl transition-all group">
                  <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Utensils className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-800">Início</p>
                    <p className="text-xs text-gray-400">Página principal</p>
                  </div>
                </Link>
                <Link href="/cardapio" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-yellow-50 rounded-2xl transition-all group">
                  <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Search className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-800">Cardápio</p>
                    <p className="text-xs text-gray-400">Veja nossas batatas</p>
                  </div>
                </Link>
                <Link href="/sobre" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-yellow-50 rounded-2xl transition-all group">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-800">Nossa História</p>
                    <p className="text-xs text-gray-400">Conheça o batata top</p>
                  </div>
                </Link>
              </nav>

              <div className="p-8 bg-gray-50 text-center">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">batata top © 2026</p>
              </div>
            </div>
          </div>
        )}
      </header>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white border-b lg:hidden">
        <div className="px-4 py-4 sm:py-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="block flex-shrink-0 relative w-10 h-10 sm:w-12 sm:h-12">
              <Image
                src="/logo.png"
                alt="batata top Delivery"
                fill
                className="rounded-full object-contain pointer-events-none"
                priority
              />
            </Link>

            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsAddressModalOpen(true);
              }}
              className="flex-1 min-w-0 cursor-pointer group px-1"
            >
              <p className="text-[10px] sm:text-[12px] font-bold text-gray-400 uppercase tracking-tighter truncate">Entrega em</p>
              <div className="flex items-center text-[13px] sm:text-[16px] font-black text-yellow-500 group-active:text-yellow-600 transition-colors">
                <span className="truncate max-w-[250px] xs:max-w-fit">{defaultAddress}</span>
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0 ml-0.5" />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Ícone de pesquisa removido do mobile conforme solicitado */}

              <Link href="/carrinho" className="flex items-center gap-2 sm:gap-3 bg-yellow-50 hover:bg-yellow-100 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-yellow-200 transition-all active:scale-95 flex-shrink-0">
                <div className="relative">
                  <ShoppingCart className="h-5.5 w-5.5 sm:h-7 sm:w-7 text-yellow-500" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-[10px] sm:text-[12px] font-black h-4.5 w-4.5 sm:h-5.5 sm:w-5.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                      {totalItems}
                    </span>
                  )}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[12px] sm:text-[15px] font-black text-gray-900">
                    R$ {totalPrice.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <header className={`sticky top-0 z-40 w-full transition-all duration-200 bg-white hidden lg:block ${
        isScrolled ? "py-2" : "border-b py-4"
      }`}>
        <div className="w-full px-4 sm:px-8">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-6 flex-shrink-0">
              <Link href="/" className="block flex-shrink-0 relative w-12 h-12 sm:w-14 sm:h-14">
                <Image
                  src="/logo.png"
                  alt="batata top Delivery"
                  fill
                  className="rounded-full object-contain pointer-events-none"
                  priority
                />
              </Link>

              <nav className="hidden xl:flex items-center gap-5 text-[14px] font-bold">
                <Link href="/" className={`transition-colors hover:text-yellow-500 ${isActive("/") ? "text-yellow-500" : "text-gray-500"}`}>Início</Link>
                <Link href="/cardapio" className={`transition-colors hover:text-yellow-500 ${isActive("/cardapio") ? "text-yellow-500" : "text-gray-500"}`}>Cardápio</Link>
                <Link href="/sobre" className={`transition-colors hover:text-yellow-500 ${isActive("/sobre") ? "text-yellow-500" : "text-gray-500"}`}>Sobre</Link>
                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                <StoreStatusBadge />
                <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-[13px] font-bold">{waitTime.min}-{waitTime.max} min</span>
                </div>
              </nav>
            </div>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
              <div className="relative w-full group">
                <div className="absolute inset-y-0 left-4 flex items-center justify-center pointer-events-none">
                  <Search className="h-5 w-5 text-yellow-500" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Busque por batatas ou bebidas"
                  className="w-full h-11 pl-12 pr-4 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-yellow-200 focus:ring-0 rounded-xl text-sm transition-all outline-none"
                />
              </div>
            </form>

            <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
              <div onClick={() => setIsAddressModalOpen(true)} className="hidden lg:flex flex-col items-end cursor-pointer group px-2 py-1 rounded-lg hover:bg-yellow-50 transition-colors">
                <span className="text-[9px] uppercase font-black text-black-600 tracking-tighter">Entrega em</span>
                <div className="flex items-center gap-1 text-sm font-black text-yellow-500 transition-colors">
                  <span className="max-w-[140px] truncate">{defaultAddress}</span>
                  <ChevronDown className="h-4 w-4 text-yellow-500" />
                </div>
              </div>

              <div className="h-8 w-[1px] bg-gray-200 hidden lg:block mx-1" />

              <Link
                href="/perfil"
                className="flex items-center gap-2 p-2 hover:bg-yellow-50 rounded-full transition-all"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || "Perfil"}
                    className="h-8 w-8 rounded-full object-cover border-2 border-yellow-200"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center border-2 border-yellow-200">
                    <User className="h-4 w-4 text-yellow-600" />
                  </div>
                )}
              </Link>

              <Link href="/carrinho">
                <div className="flex items-center gap-2 p-2 hover:bg-yellow-50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-yellow-100">
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6 text-yellow-500" />
                    {totalItems > 0 && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] font-black rounded-full h-4 w-4 flex items-center justify-center border-2 border-white shadow-sm">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  <div className="hidden lg:flex flex-col leading-tight">
                    <span className="text-sm font-black text-gray-800">R$ {totalPrice.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-500 font-bold">{totalItems} itens</span>
                  </div>
                </div>
              </Link>
            </div>
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
