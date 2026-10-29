"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
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
  const processedOrdersRef = useRef<Set<string>>(new Set())
  const isPlayingAudioRef = useRef(false)
  const audioQueueRef = useRef(0)

  // Destravamento automático do áudio na primeira interação do usuário (sem botão visível)
  useEffect(() => {
    localStorage.removeItem("admin-audio-enabled")

    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          if (ctx.state === "suspended") {
            ctx.resume()
          }
        }
        // Áudio curto mudo para liberar política de autoplay no navegador
        const dummy = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA")
        dummy.volume = 0.01
        dummy.play().catch(() => {})
      } catch (err) {
        // Silencioso
      }
      window.removeEventListener("pointerdown", unlockAudio)
      window.removeEventListener("keydown", unlockAudio)
      window.removeEventListener("touchstart", unlockAudio)
      window.removeEventListener("click", unlockAudio)
    }

    window.addEventListener("pointerdown", unlockAudio, { passive: true })
    window.addEventListener("keydown", unlockAudio, { passive: true })
    window.addEventListener("touchstart", unlockAudio, { passive: true })
    window.addEventListener("click", unlockAudio, { passive: true })

    return () => {
      window.removeEventListener("pointerdown", unlockAudio)
      window.removeEventListener("keydown", unlockAudio)
      window.removeEventListener("touchstart", unlockAudio)
      window.removeEventListener("click", unlockAudio)
    }
  }, [])

  // Tocar som 3 vezes em sequência (tanan, tanan, tanan) com ~300ms de pausa
  const playThreeTimesSequence = async () => {
    const playOnce = () =>
      new Promise<void>((resolve) => {
        try {
          const audio = new Audio("/sounds/new_order.mp3")
          audio.volume = 1.0
          audio.onended = () => resolve()
          audio.onerror = () => {
            // Fallback para URL remota caso arquivo local falhe
            try {
              const fallback = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3")
              fallback.volume = 1.0
              fallback.onended = () => resolve()
              fallback.onerror = () => resolve()
              fallback.play().catch(() => resolve())
            } catch {
              resolve()
            }
          }
          const p = audio.play()
          if (p !== undefined) {
            p.catch(() => resolve())
          }
        } catch {
          resolve()
        }
      })

    try {
      if ("vibrate" in navigator) {
        navigator.vibrate([400, 200, 400, 200, 400])
      }
      for (let i = 0; i < 3; i++) {
        await playOnce()
        if (i < 2) {
          await new Promise((r) => setTimeout(r, 300))
        }
      }
    } catch {
      // Silencioso
    }
  }

  // Fila de áudio concorrente segura (evita sobreposição se 2 pedidos chegarem juntos)
  const triggerOrderAlert = async () => {
    audioQueueRef.current += 1
    if (isPlayingAudioRef.current) return
    isPlayingAudioRef.current = true
    while (audioQueueRef.current > 0) {
      audioQueueRef.current -= 1
      await playThreeTimesSequence()
    }
    isPlayingAudioRef.current = false
  }

  // Listener global do Supabase Realtime para novos pedidos (ativo em qualquer tela do admin)
  useEffect(() => {
    if (!isAdmin) return

    let supabase: any
    try {
      supabase = getSupabaseBrowserClient()
    } catch {
      return
    }

    // Pré-carrega IDs de pedidos confirmados existentes para não disparar som em pedidos antigos
    // (pedidos em 'awaiting_payment' NÃO são pré-carregados, para tocar quando o PIX for pago)
    const preloadExistingOrders = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("id")
          .in("status", ["pending", "preparing", "ready"])
          .limit(100)
        if (data) {
          data.forEach((o: any) => processedOrdersRef.current.add(o.id))
        }
      } catch {
        // Silencioso
      }
    }
    preloadExistingOrders()

    const channel = supabase
      .channel("admin-global-new-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload: any) => {
          const newOrder = payload.new
          if (!newOrder?.id) return

          const orderId = newOrder.id
          const status = newOrder.status

          // Já tocou som para este pedido -> deduplicar
          if (processedOrdersRef.current.has(orderId)) return

          // Pedido cancelado ou ainda aguardando pagamento do PIX -> NÃO toca
          if (status === "awaiting_payment" || status === "cancelled") return

          // Toca apenas quando o pedido é confirmado:
          // 1. Dinheiro / Cartão na entrega (INSERT com status 'pending')
          // 2. PIX aceito e pago (UPDATE com status passando para 'preparing' ou 'pending')
          if (status === "pending" || status === "preparing") {
            processedOrdersRef.current.add(orderId)
            triggerOrderAlert()
          }
        }
      )
      .subscribe()

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [isAdmin])

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
        <div className="h-20 px-5 flex items-center justify-between border-b border-[#2D2721] bg-[#14100C]">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-black/40 border border-amber-400/40 shrink-0">
              <img
                src="/logo.png"
                alt="Batata Top Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-black tracking-wider text-white flex items-center gap-1.5 uppercase">
                BATATA TOP
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#E3A008] text-[#1F1B16]">
                  PARCEIRO
                </span>
              </div>
              <p className="text-[11px] text-amber-200/60 font-medium">Gestor Operacional</p>
            </div>
          </Link>
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
            {/* Botão de Retorno à Loja / Home (Destacado e Claro) */}
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 h-9 px-3.5 rounded-xl border-[#E3A008]/40 bg-[#FEF8EC] text-[#8A6100] hover:bg-[#E3A008] hover:text-white font-bold text-xs shadow-2xs transition-all"
                title="Voltar para a página inicial da loja"
              >
                <Store className="h-4 w-4" />
                <span className="hidden xs:inline">Ir para a Loja</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Button>
            </Link>

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
