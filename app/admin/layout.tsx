"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { storeStatusManager, StoreStatus } from "@/lib/store-status-manager"
import { BusinessHours } from "@/components/business-hours"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Ticket,
  DollarSign,
  Image as ImageIcon,
  Megaphone,
  Star,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Clock,
  Menu,
  X,
  Store,
  ChevronRight,
  Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const navItems = [
  { name: "Visão Geral", href: "/admin", icon: LayoutDashboard },
  { name: "Gestor de Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
  { name: "Cardápio & Itens", href: "/admin/produtos", icon: Package },
  { name: "Cupons de Desconto", href: "/admin/cupons", icon: Ticket },
  { name: "Gestão Financeira", href: "/admin/caixa", icon: DollarSign },
  { name: "Banco de Imagens", href: "/admin/imagens", icon: ImageIcon },
  { name: "Banner & Promoções", href: "/admin/promocoes", icon: Megaphone },
  { name: "Avaliações", href: "/admin/feedbacks", icon: Star },
  { name: "Administradores", href: "/admin/administradores", icon: ShieldCheck },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false)

  // Auth check centralizado para todo o portal /admin
  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    checkIsAdmin(user.id).then((allowed) => {
      setCheckingAuth(false)
      if (allowed) {
        setIsAdmin(true)
      } else {
        alert("Você não tem permissão para acessar o painel administrativo")
        router.push("/")
      }
    })
  }, [user, loading, router])

  // Store status listener
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const s = await storeStatusManager.getStatus()
        setStoreStatus(s)
      } catch (err) {
        console.error("Erro ao carregar status da loja:", err)
      }
    }

    fetchStatus()

    const onStatusChanged = (e: any) => {
      if (e.detail) {
        setStoreStatus(e.detail)
      } else {
        fetchStatus()
      }
    }

    window.addEventListener("store-status-changed", onStatusChanged)
    return () => {
      window.removeEventListener("store-status-changed", onStatusChanged)
    }
  }, [])

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1F1B16] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E3A008]/20 border-t-[#E3A008] mx-auto mb-4" />
          <p className="text-stone-300 text-sm font-medium tracking-wide">
            Carregando Portal Batata Top...
          </p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const isStoreOpen = storeStatus?.isOpen ?? false
  const userInitial = user?.email ? user.email[0].toUpperCase() : "A"
  const currentRouteName =
    navItems.find((item) =>
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href)
    )?.name || "Portal do Parceiro"

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      {/* Backdrop Mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR FIXA ESTILO IFOOD PARTNER PORTAL */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1F1B16] text-stone-200 border-r border-[#2D2721] flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#2D2721] bg-[#191511]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#E3A008] to-[#C1440E] flex items-center justify-center text-white shadow-md shadow-amber-950/40">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                BATATA TOP
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E3A008]/20 text-[#E3A008] border border-[#E3A008]/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-medium">Portal do Parceiro</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Gerenciamento
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#E3A008] text-[#1F1B16] shadow-sm font-bold"
                    : "text-stone-300 hover:bg-[#2A241E] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#1F1B16]" : "text-[#E3A008]"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-[#1F1B16]/70" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#2D2721] bg-[#191511] space-y-2">
          {/* Link para o Cardápio / Loja */}
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-stone-300 hover:bg-[#2A241E] hover:text-[#E3A008] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-[#E3A008]" />
              <span>Ver Cardápio ao Vivo</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </Link>

          {/* User Profile & Logout */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#231E19] border border-[#2D2721]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-[#E3A008] text-[#1F1B16] font-black text-xs flex items-center justify-center shrink-0">
                {userInitial}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-stone-200 truncate">
                  {user?.email}
                </p>
                <p className="text-[10px] text-stone-400">Administrador</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sair"
              className="p-1.5 text-stone-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL: TOPBAR + CANVAS SCROLLÁVEL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar iFood Partner Style */}
        <header className="h-16 bg-white border-b border-stone-200 px-4 md:px-6 flex items-center justify-between shrink-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-stone-700 hover:text-black rounded-lg hover:bg-stone-100 lg:hidden"
              aria-label="Abrir menu lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                {currentRouteName}
              </h2>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Painel de Operações • Batata Top Gourmet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Store Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                isStoreOpen
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isStoreOpen ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isStoreOpen ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                />
              </span>
              <span>{isStoreOpen ? "Loja Aberta" : "Loja Fechada"}</span>
            </div>

            {/* Quick Action: Horários de Funcionamento Modal */}
            <Dialog open={isHoursModalOpen} onOpenChange={setIsHoursModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-xl border-stone-300 font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                >
                  <Clock className="h-3.5 w-3.5 text-[#E3A008]" />
                  <span>Horários</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-stone-900">
                    Configuração de Horários & Entrega
                  </DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <BusinessHours showToggle={true} />
                </div>
              </DialogContent>
            </Dialog>

            {/* Admin Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="h-8 w-8 rounded-full bg-[#E3A008]/20 text-[#C1440E] border border-[#E3A008]/40 font-black text-xs flex items-center justify-center">
                {userInitial}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <p className="font-bold text-stone-800 truncate max-w-[130px]">
                  {user?.email?.split("@")[0]}
                </p>
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1 font-bold bg-amber-50 text-[#C1440E] border-amber-200"
                >
                  Admin
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Canvas de Conteúdo com Scroll Próprio */}
        <main className="flex-1 overflow-y-auto bg-stone-50/70 [&>div>header]:hidden [&_footer]:hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
