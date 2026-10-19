"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Search, Package, User, ChevronDown, LogOut, HelpCircle, Lock, Settings, ShieldAlert, Clock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect, useRef } from "react"
import { storeStatusManager } from "@/lib/store-status-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

export function MobileNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, loading } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

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

  // Só aparece se estiver logado
  if (loading || !user) return null

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  const handleSearchClick = () => {
    // Se já estiver no cardápio, apenas força o foco
    if (pathname === "/cardapio") {
      window.dispatchEvent(new CustomEvent("focus-search"))
      // Adicionamos um timestamp para garantir que a URL mude e o useEffect no cardapio dispare
      router.replace(`/cardapio?focus=search&t=${Date.now()}`)
    } else {
      // Forçamos a navegação com o parâmetro de foco
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
    { href: "/pedidos", icon: Package, label: "Pedidos", action: null },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 lg:hidden z-50 pb-safe">
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

        {/* Perfil com Dropdown */}
        <div ref={profileRef} className="relative flex-1 h-full">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex flex-col items-center justify-center w-full h-full group transition-all active:scale-90"
          >
            <div className="relative flex items-center justify-center mb-0.5">
              <User className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${isActive("/perfil") || isProfileOpen ? "text-yellow-500 fill-current" : "text-gray-400"}`} />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-black transition-colors text-center w-full truncate px-1 ${
              isActive("/perfil") || isProfileOpen ? "text-yellow-500" : "text-gray-400"
            }`}>
              Perfil
            </span>
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Header com Nome da Conta e Status da Loja */}
              <div className="px-4 py-4 bg-gradient-to-b from-yellow-50 to-white border-b border-gray-100 relative">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minha Conta</p>
                    <p className="text-sm xs:text-base font-black text-gray-800 truncate">{user?.user_metadata?.full_name || user?.email || "Usuário"}</p>
                  </div>
                  {/* Status da Loja no Canto Superior Direito (Mobile) */}
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
                <p className="text-xs text-gray-500 mt-1 truncate">{user?.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link href="/" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <Home className="h-4 w-4" /> Início
                </Link>
                <Link href="/cardapio" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <Search className="h-4 w-4" /> Cardápio
                </Link>
                <Link href="/sobre" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <User className="h-4 w-4" /> Sobre
                </Link>
                <div className="border-t border-gray-50 my-1"></div>
                <Link href="/perfil" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <User className="h-4 w-4" /> Ver Perfil
                </Link>
                <Link href="/pedidos" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <Package className="h-4 w-4" /> Meus Pedidos
                </Link>
                <div className="border-t border-gray-50 my-1"></div>
                <Link href="/ajuda" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <HelpCircle className="h-4 w-4" /> Ajuda
                </Link>
                <Link href="/meus-dados" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <Settings className="h-4 w-4" /> Meus Dados
                </Link>
                <Link href="/seguranca" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <Lock className="h-4 w-4" /> Segurança
                </Link>
                <div className="border-t border-gray-50 my-1"></div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-amber-600 hover:bg-amber-50 transition-colors">
                    <ShieldAlert className="h-4 w-4" /> Painel Admin
                  </Link>
                )}
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors text-left">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
