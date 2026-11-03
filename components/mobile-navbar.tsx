"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Search,
  Package,
  User,
  ChevronDown,
  LogOut,
  HelpCircle,
  Lock,
  Settings,
  ShieldAlert,
  Clock,
  ShoppingCart,
  LogIn,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useState, useEffect, useRef } from "react"
import { storeStatusManager } from "@/lib/store-status-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

export function MobileNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  const { items, getTotalPrice } = useCart()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartPrice = getTotalPrice()

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      setIsAdmin(true)
      return
    }
    const supabase = getSupabaseBrowserClient()
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data?.role === "admin") {
          setIsAdmin(true)
        }
      })
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Não exibir no checkout para garantir fluxo focado e rodapé desobstruído
  if (pathname === "/checkout" || pathname?.startsWith("/checkout")) return null

  const showFloatingCart = items.length > 0 && pathname !== "/carrinho"

  const isActive = (path: string) => {
    if (!pathname) return false
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && path !== "#" && pathname.startsWith(path)) return true
    return false
  }

  const handleSearchClick = () => {
    if (pathname === "/cardapio") {
      window.dispatchEvent(new CustomEvent("focus-search"))
      router.replace(`/cardapio?focus=search&t=${Date.now()}`)
    } else {
      router.push("/cardapio?focus=search")
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsProfileOpen(false)
    router.push("/")
  }

  const navItems = [
    { href: "/", icon: Home, label: "Início", action: null },
    { href: "#", icon: Search, label: "Buscar", action: handleSearchClick },
    user
      ? { href: "/pedidos", icon: Package, label: "Pedidos", action: null }
      : { href: "/cardapio", icon: UtensilsCrossed, label: "Cardápio", action: null },
  ]

  const isProfileActive = user ? isActive("/perfil") : isActive("/login")

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none">
      {/* Floating Cart Bar */}
      {showFloatingCart && (
        <div className="pointer-events-auto px-3 pb-2 max-w-lg mx-auto animate-in slide-in-from-bottom-2 duration-200">
          <Link
            href="/carrinho"
            className="flex items-center justify-between bg-[#E3A008] hover:bg-[#c88d07] active:scale-[0.98] transition-all text-white px-4 py-3 rounded-2xl shadow-xl"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center bg-black/20 text-white text-xs font-black px-2 py-0.5 rounded-full min-w-[22px]">
                {totalCartItems}
              </span>
              <div className="flex flex-col text-left truncate">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">Ver sacola</span>
                <span className="text-sm font-extrabold text-white">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCartPrice)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-xl text-white transition-colors flex-shrink-0">
              <span>Finalizar</span>
              <ShoppingCart className="h-4 w-4 ml-0.5" />
            </div>
          </Link>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="pointer-events-auto bg-white border-t border-gray-100 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 relative max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center flex-1 h-full group transition-all active:scale-90"
                >
                  <div className="relative flex items-center justify-center mb-0.5">
                    <Icon className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${active ? "text-yellow-500 fill-current" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-black transition-colors text-center w-full truncate px-1 ${
                    active ? "text-yellow-500" : "text-gray-400"
                  }`}>
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full group transition-all active:scale-90"
              >
                <div className="relative flex items-center justify-center mb-0.5">
                  <Icon className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${active ? "text-yellow-500 fill-current" : "text-gray-400"}`} />
                </div>
                <span className={`text-[10px] sm:text-[11px] font-black transition-colors text-center w-full truncate px-1 ${
                  active ? "text-yellow-500" : "text-gray-400"
                }`}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Perfil / Entrar com Dropdown */}
          <div ref={profileRef} className="relative flex-1 h-full">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex flex-col items-center justify-center w-full h-full group transition-all active:scale-90"
            >
              <div className="relative flex items-center justify-center mb-0.5">
                <User className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${isProfileActive || isProfileOpen ? "text-yellow-500 fill-current" : "text-gray-400"}`} />
              </div>
              <span className={`text-[10px] sm:text-[11px] font-black transition-colors text-center w-full truncate px-1 ${
                isProfileActive || isProfileOpen ? "text-yellow-500" : "text-gray-400"
              }`}>
                {user ? "Perfil" : "Entrar"}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Header com Status da Loja */}
                <div className="px-4 py-4 bg-gradient-to-b from-yellow-50 to-white border-b border-gray-100 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {user ? "Minha Conta" : "Conta"}
                      </p>
                      <p className="text-sm xs:text-base font-black text-gray-800 truncate">
                        {user ? (user.user_metadata?.full_name || user.email || "Usuário") : "Olá, Visitante"}
                      </p>
                    </div>
                    {/* Status da Loja */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1 xs:ml-2">
                      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                        <div className={`h-1.5 w-1.5 rounded-full ${storeStatusManager.isStoreOpenSync() ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                        <span className={`text-[9px] font-black ${storeStatusManager.isStoreOpenSync() ? "text-green-600" : "text-red-600"}`}>
                          {storeStatusManager.isStoreOpenSync() ? "ABERTO" : "FECHADO"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">
                        <Clock className="h-2.5 w-2.5 text-yellow-500" />
                        <span className="text-[9px] font-black text-gray-600">
                          {storeStatusManager.getWaitTimeSync().min}-{storeStatusManager.getWaitTimeSync().max} min
                        </span>
                      </div>
                    </div>
                  </div>
                  {user ? (
                    <p className="text-xs text-gray-500 mt-1 truncate">{user.email}</p>
                  ) : (
                    <div className="mt-3">
                      <Link
                        href="/login"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#E3A008] hover:bg-[#c88d07] text-white text-xs font-black rounded-xl shadow transition-colors"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        <span>Entrar ou Cadastrar</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link href="/" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                    <Home className="h-4 w-4" /> Início
                  </Link>
                  <Link href="/cardapio" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                    <UtensilsCrossed className="h-4 w-4" /> Cardápio
                  </Link>
                  <Link href="/sobre" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                    <User className="h-4 w-4" /> Sobre
                  </Link>
                  {user && (
                    <>
                      <div className="border-t border-gray-50 my-1"></div>
                      <Link href="/perfil" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                        <User className="h-4 w-4" /> Ver Perfil
                      </Link>
                      <Link href="/pedidos" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                        <Package className="h-4 w-4" /> Meus Pedidos
                      </Link>
                    </>
                  )}
                  <div className="border-t border-gray-50 my-1"></div>
                  <Link href="/ajuda" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                    <HelpCircle className="h-4 w-4" /> Ajuda
                  </Link>
                  {user ? (
                    <>
                      <Link href="/meus-dados" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                        <Settings className="h-4 w-4" /> Meus Dados
                      </Link>
                      <Link href="/seguranca" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                        <Lock className="h-4 w-4" /> Segurança
                      </Link>
                      {isAdmin && (
                        <>
                          <div className="border-t border-gray-50 my-1"></div>
                          <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors">
                            <ShieldAlert className="h-4 w-4" /> Painel Admin
                          </Link>
                        </>
                      )}
                      <div className="border-t border-gray-50 my-1"></div>
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left">
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="border-t border-gray-50 my-1"></div>
                      <Link href="/login" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors">
                        <LogIn className="h-4 w-4" /> Fazer Login
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
