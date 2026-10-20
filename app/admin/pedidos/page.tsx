"use client"

import { useEffect, useState, useRef } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  Clock,
  ChefHat,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  Trash2,
  User,
  Ticket,
  CreditCard,
  FileText,
  Volume2,
  VolumeX,
  BellRing,
  Bike,
  Store,
  Utensils,
  Printer,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import { ordersManager, type Order } from "@/lib/orders-manager"
import { storeStatusManager } from "@/lib/store-status-manager"
import Link from "next/link"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

type ExtendedStatus = Order["status"] | "out_for_delivery"

const statusConfig: Record<
  string,
  {
    label: string
    color: string
    bgColor: string
    badgeBg: string
    borderColor: string
    icon: any
  }
> = {
  awaiting_payment: {
    label: "Aguardando Pix",
    color: "text-amber-800",
    bgColor: "bg-amber-50/70",
    badgeBg: "bg-amber-500 text-white",
    borderColor: "border-l-amber-500",
    icon: Clock,
  },
  pending: {
    label: "Pendente",
    color: "text-[#C1440E]",
    bgColor: "bg-amber-50/50",
    badgeBg: "bg-[#C1440E] text-white",
    borderColor: "border-l-[#C1440E]",
    icon: Clock,
  },
  preparing: {
    label: "Em Preparo",
    color: "text-amber-700",
    bgColor: "bg-yellow-50/50",
    badgeBg: "bg-[#E3A008] text-white",
    borderColor: "border-l-[#E3A008]",
    icon: ChefHat,
  },
  ready: {
    label: "Pronto",
    color: "text-purple-700",
    bgColor: "bg-purple-50/40",
    badgeBg: "bg-purple-600 text-white",
    borderColor: "border-l-purple-600",
    icon: CheckCircle2,
  },
  out_for_delivery: {
    label: "Em Rota",
    color: "text-blue-700",
    bgColor: "bg-blue-50/50",
    badgeBg: "bg-blue-600 text-white",
    borderColor: "border-l-blue-600",
    icon: Bike,
  },
  delivered: {
    label: "Entregue",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50/40",
    badgeBg: "bg-emerald-600 text-white",
    borderColor: "border-l-emerald-600",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelado",
    color: "text-rose-700",
    bgColor: "bg-rose-50/40",
    badgeBg: "bg-rose-600 text-white",
    borderColor: "border-l-rose-500",
    icon: XCircle,
  },
}

export default function AdminPedidosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<"all" | ExtendedStatus>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>("default")
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const lastOrdersCount = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const savedAudioPref = localStorage.getItem("admin-audio-enabled")
    if (savedAudioPref === "true") {
      setAudioEnabled(true)
    }

    if ("Notification" in window) {
      setPermissionStatus(Notification.permission)
    }

    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadOrders(true)
        const interval = setInterval(() => {
          loadOrders()
        }, 10000)
        return () => clearInterval(interval)
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    }
  }, [user, loading, router])

  const playNotificationSound = () => {
    if (audioEnabled && audioRef.current) {
      audioRef.current.volume = 1.0
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("Erro ao tocar som (bloqueio do navegador):", err)
        })
      }

      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500])
      }

      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("🚨 NOVO PEDIDO - Batata Top!", {
          body: "Um novo pedido acaba de chegar! Abra o Gestor de Pedidos para conferir.",
          icon: "/favicon.ico",
          tag: "novo-pedido",
          requireInteraction: true,
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      }
    }
  }

  const loadOrders = async (isInitial = false) => {
    try {
      const todayOrders = await ordersManager.getTodayOrders()
      const activeOrders = await ordersManager.getActiveOrders()
      const allOrders = [...activeOrders, ...todayOrders]
      const uniqueOrders = allOrders.filter(
        (order, index, self) => index === self.findIndex((t) => t.id === order.id)
      )

      if (!isInitial && uniqueOrders.length > lastOrdersCount.current) {
        playNotificationSound()
      }

      lastOrdersCount.current = uniqueOrders.length
      setOrders(uniqueOrders)
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadOrders()
    setIsRefreshing(false)
  }

  const handleStatusChange = async (orderId: string, status: ExtendedStatus) => {
    try {
      setUpdatingId(orderId)
      await ordersManager.updateOrderStatus(orderId, status as any)
      await loadOrders()
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error)
      alert("Não foi possível atualizar o status do pedido.")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja DELETAR este pedido permanentemente?")) return
    try {
      await ordersManager.deleteOrder(orderId)
      await loadOrders()
    } catch (error) {
      alert("Erro ao deletar pedido")
    }
  }

  const toggleAudio = () => {
    const newState = !audioEnabled
    setAudioEnabled(newState)
    localStorage.setItem("admin-audio-enabled", String(newState))

    if (newState) {
      if ("Notification" in window) {
        Notification.requestPermission().then((permission) => {
          setPermissionStatus(permission)
        })
      }

      if (audioRef.current) {
        audioRef.current.volume = 1.0
        audioRef.current.play().catch(() => {
          alert("Clique em qualquer lugar da página para ativar o som de notificações.")
        })
      }
    }
  }

  const handlePrintReceipt = (order: Order) => {
    setReceiptOrder(order)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const getWhatsAppUrl = (phone: string, customerName: string, orderNumber?: number) => {
    const cleanPhone = (phone || "").replace(/\D/g, "")
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
    const message = encodeURIComponent(
      `Olá ${customerName}! Tudo bem? Falamos da Batata Top Gourmet sobre o seu Pedido #${orderNumber || ""}.`
    )
    return `https://wa.me/${fullPhone}?text=${message}`
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF9E6] to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-200 border-t-[#E3A008] mx-auto mb-6"></div>
          <p className="text-gray-600 font-semibold">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => (o.status as any) === filter)

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    out_for_delivery: orders.filter((o) => (o.status as any) === "out_for_delivery").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9]">
      <HeaderWrapper />

      {/* Áudio de Notificação de Alto Impacto */}
      <audio
        ref={audioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />

      {/* Comanda Térmica invisível na tela, visível apenas na impressão */}
      {receiptOrder && (
        <div id="thermal-receipt" className="hidden print:block print:w-[80mm] print:p-2 text-black font-mono text-xs leading-tight bg-white">
          <div className="text-center pb-2 border-b border-dashed border-black">
            <p className="font-bold text-sm">BATATA TOP GOURMET</p>
            <p className="text-[10px] text-gray-700">GESTOR DE PEDIDOS</p>
            <p className="font-bold text-base mt-1">PEDIDO #{receiptOrder.orderNumber || receiptOrder.id.slice(0, 5)}</p>
            <p className="text-[10px]">
              {new Date(receiptOrder.createdAt).toLocaleDateString("pt-BR")} - {new Date(receiptOrder.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <div className="mt-1 font-bold text-xs uppercase px-2 py-0.5 border border-black inline-block">
              {receiptOrder.deliveryType === "pickup" ? ">>> RETIRADA NO BALCÃO <<<" : ">>> ENTREGA EM DOMICÍLIO <<<"}
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-black space-y-1">
            <p><span className="font-bold">CLIENTE:</span> {receiptOrder.customerName}</p>
            <p><span className="font-bold">TELEFONE:</span> {receiptOrder.customerPhone}</p>
            {receiptOrder.deliveryType !== "pickup" && (
              <p><span className="font-bold">ENDEREÇO:</span> {receiptOrder.address}</p>
            )}
          </div>

          <div className="py-2 border-b border-dashed border-black">
            <p className="font-bold mb-1">ITENS DO PEDIDO:</p>
            {receiptOrder.items.map((item, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex justify-between font-bold">
                  <span>{item.quantity}x {item.name}</span>
                  <span>R$ {(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                </div>
                {item.pastaType && (
                  <p className="text-[10px] pl-3 italic">Massa: {item.pastaType}</p>
                )}
                {item.adicionais && item.adicionais.length > 0 && (
                  <div className="pl-3 text-[10px]">
                    {item.adicionais.map((ad: any, aIdx: number) => (
                      <p key={aIdx}>+ {ad.quantity}x {ad.name || ad.nome}</p>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <p className="text-[10px] pl-3 font-semibold">Obs: {item.notes}</p>
                )}
              </div>
            ))}
          </div>

          {receiptOrder.notes && (
            <div className="py-2 border-b border-dashed border-black">
              <p className="font-bold text-[10px]">OBSERVAÇÕES GERAIS:</p>
              <p className="text-[10px] italic">{receiptOrder.notes}</p>
            </div>
          )}

          <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
            <p>
              <span className="font-bold">TALHERES DESCARTÁVEIS:</span>{" "}
              {(receiptOrder.metadata?.wantsCutlery ?? (receiptOrder as any).wantsCutlery ?? (receiptOrder as any).wants_cutlery)
                ? "SIM (ENVIAR)"
                : "NÃO"}
            </p>
            <p><span className="font-bold">FORMA DE PAGAMENTO:</span> {(receiptOrder.paymentMethod || "").toUpperCase()}</p>
          </div>

          <div className="pt-2 text-right space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span>Subtotal:</span>
              <span>R$ {((receiptOrder.total || 0) + (receiptOrder.discountAmount || 0)).toFixed(2)}</span>
            </div>
            {(receiptOrder.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-[11px]">
                <span>Desconto ({receiptOrder.couponCode || "Cupom"}):</span>
                <span>- R$ {(receiptOrder.discountAmount ?? 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-black">
              <span>TOTAL:</span>
              <span>R$ {Number(receiptOrder.total || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 pt-2 text-center text-[9px] border-t border-dashed border-black">
            <p>Batata Top Gourmet • Gestor de Pedidos</p>
          </div>
        </div>
      )}

      <main className="flex-1 py-8 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* AVISO DE CONFIGURAÇÃO DE SOM */}
          {!audioEnabled && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 text-red-700">
                <VolumeX className="h-6 w-6 shrink-0" />
                <p className="font-black text-sm">O SOM ESTÁ DESATIVADO! Você não ouvirá quando chegar um novo pedido.</p>
              </div>
              <Button onClick={toggleAudio} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md">
                ATIVAR AGORA
              </Button>
            </div>
          )}

          {permissionStatus === "denied" && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 shadow-sm">
              <BellRing className="h-6 w-6 shrink-0 text-amber-600" />
              <p className="font-bold text-sm">
                As notificações estão bloqueadas no navegador. Permita o envio de notificações nas configurações para receber alertas de pedidos em segundo plano.
              </p>
            </div>
          )}

          {/* CABEÇALHO DO PAINEL GESTOR */}
          <div className="mb-8">
            <Link href="/admin">
              <Button variant="ghost" className="mb-4 text-gray-600 hover:text-[#C1440E] hover:bg-amber-50 font-semibold gap-2 -ml-2">
                <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-gradient-to-br from-[#E3A008] to-[#C1440E] rounded-2xl flex items-center justify-center shadow-md">
                  <ShoppingBag className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Gestor de Pedidos</h1>
                    <span className="bg-amber-100 text-[#C1440E] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      iFood Standard
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">Operação em tempo real com controle de rota, comanda e WhatsApp</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={toggleAudio}
                  variant={audioEnabled ? "default" : "outline"}
                  className={`font-black rounded-2xl gap-2 shadow-sm transition-all h-11 px-5 ${
                    audioEnabled
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {audioEnabled ? <Volume2 className="h-5 w-5 animate-pulse" /> : <VolumeX className="h-5 w-5" />}
                  {audioEnabled ? "SOM ATIVO" : "SOM MUDO"}
                </Button>

                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-[#E3A008] hover:bg-[#B87F00] text-white font-bold rounded-2xl gap-2 shadow-sm h-11 px-5"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /> Atualizar
                </Button>
              </div>
            </div>
          </div>

          {/* FILTROS / ABAS DE STATUS ESTILO IFOOD GESTOR */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
            <button
              onClick={() => setFilter("all")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "all"
                  ? "bg-[#E3A008] text-white shadow-md shadow-amber-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-amber-300"
              }`}
            >
              <span className="text-xl font-black">{stats.total}</span>
              <span className="text-[11px] font-bold">Todos</span>
            </button>

            <button
              onClick={() => setFilter("pending")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "pending"
                  ? "bg-[#C1440E] text-white shadow-md shadow-orange-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-[#C1440E]"
              }`}
            >
              <span className="text-xl font-black">{stats.pending}</span>
              <span className="text-[11px] font-bold">Pendentes</span>
            </button>

            <button
              onClick={() => setFilter("preparing")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "preparing"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-amber-400"
              }`}
            >
              <span className="text-xl font-black">{stats.preparing}</span>
              <span className="text-[11px] font-bold">Em Preparo</span>
            </button>

            <button
              onClick={() => setFilter("ready")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "ready"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-purple-300"
              }`}
            >
              <span className="text-xl font-black">{stats.ready}</span>
              <span className="text-[11px] font-bold">Prontos</span>
            </button>

            <button
              onClick={() => setFilter("out_for_delivery")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "out_for_delivery"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="text-xl font-black">{stats.out_for_delivery}</span>
              <span className="text-[11px] font-bold">Em Rota</span>
            </button>

            <button
              onClick={() => setFilter("delivered")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "delivered"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300"
              }`}
            >
              <span className="text-xl font-black">{stats.delivered}</span>
              <span className="text-[11px] font-bold">Entregues</span>
            </button>

            <button
              onClick={() => setFilter("cancelled")}
              className={`p-3 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center text-center ${
                filter === "cancelled"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-200/50 scale-[1.02]"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-rose-300"
              }`}
            >
              <span className="text-xl font-black">{stats.cancelled}</span>
              <span className="text-[11px] font-bold">Cancelados</span>
            </button>
          </div>

          {/* LISTA DE PEDIDOS */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-500">Nenhum pedido encontrado nesta seção</h3>
              <p className="text-sm text-gray-400 mt-1">Quando novos pedidos chegarem, eles aparecerão aqui instantaneamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredOrders.map((order) => {
                const currentStatus = (order.status as any) || "pending"
                const cfg = statusConfig[currentStatus] || statusConfig.pending
                const StatusIcon = cfg.icon
                const isDelivery = order.deliveryType !== "pickup"
                const wantsCutlery = Boolean(
                  order.metadata?.wantsCutlery ?? (order as any).wantsCutlery ?? (order as any).wants_cutlery
                )

                return (
                  <Card
                    key={order.id}
                    className={`border border-gray-200/80 shadow-sm overflow-hidden rounded-3xl transition-all hover:shadow-md ${cfg.borderColor} border-l-[10px] bg-white`}
                  >
                    {/* Header do Pedido */}
                    <div className={`p-4 md:p-6 ${cfg.bgColor} border-b border-gray-100`}>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${cfg.badgeBg} shadow-sm shrink-0 mt-0.5`}>
                            <StatusIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-black text-gray-900">
                                Pedido #{order.orderNumber || order.id.slice(0, 5)}
                              </h3>
                              <Badge className={`${cfg.badgeBg} border-none font-bold text-xs uppercase px-2.5 py-0.5`}>
                                {cfg.label}
                              </Badge>

                              {/* Badge de Modalidade (Entrega vs Retirada) */}
                              {isDelivery ? (
                                <Badge className="bg-blue-100 text-blue-800 border border-blue-200 font-bold gap-1 text-xs">
                                  <Bike className="h-3.5 w-3.5" /> Entrega
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-100 text-purple-800 border border-purple-200 font-bold gap-1 text-xs">
                                  <Store className="h-3.5 w-3.5" /> Balcão / Retirada
                                </Badge>
                              )}

                              {/* Badge de Talheres Descartáveis */}
                              {wantsCutlery ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold gap-1 text-xs">
                                  <Utensils className="h-3.5 w-3.5" /> Com Talheres
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-400 border-gray-300 font-medium gap-1 text-xs">
                                  <Utensils className="h-3.5 w-3.5 opacity-40" /> Sem Talheres
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-gray-600 font-medium mt-1">
                              Horário: <span className="font-bold text-gray-900">{new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              {" • "}
                              Cliente: <span className="font-bold text-gray-900">{order.customerName}</span>
                            </p>
                          </div>
                        </div>

                        {/* Ações de Status e Utilitários */}
                        <div className="flex flex-wrap items-center gap-2">
                          {order.status !== "delivered" && (order.status as any) !== "cancelled" && (
                            <>
                              {order.status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(order.id, "preparing")}
                                  disabled={updatingId === order.id}
                                  className="bg-[#E3A008] hover:bg-[#B87F00] text-white font-bold rounded-xl gap-1.5 shadow-sm h-9"
                                >
                                  <ChefHat className="h-4 w-4" /> Iniciar Preparo
                                </Button>
                              )}

                              {order.status === "preparing" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(order.id, "ready")}
                                  disabled={updatingId === order.id}
                                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl gap-1.5 shadow-sm h-9"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Marcar Pronto
                                </Button>
                              )}

                              {order.status === "ready" && (
                                <>
                                  {isDelivery ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusChange(order.id, "out_for_delivery")}
                                      disabled={updatingId === order.id}
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-1.5 shadow-sm h-9"
                                    >
                                      <Bike className="h-4 w-4" /> Despachar (Em Rota)
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleStatusChange(order.id, "delivered")}
                                      disabled={updatingId === order.id}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-sm h-9"
                                    >
                                      <CheckCircle className="h-4 w-4" /> Cliente Retirou
                                    </Button>
                                  )}
                                </>
                              )}

                              {(order.status as any) === "out_for_delivery" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusChange(order.id, "delivered")}
                                  disabled={updatingId === order.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-sm h-9"
                                >
                                  <CheckCircle className="h-4 w-4" /> Confirmar Entrega
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm(`Deseja realmente cancelar o pedido #${order.orderNumber}?`)) {
                                    handleStatusChange(order.id, "cancelled")
                                  }
                                }}
                                disabled={updatingId === order.id}
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-xl gap-1 h-9"
                              >
                                <XCircle className="h-4 w-4" /> Cancelar
                              </Button>
                            </>
                          )}

                          {/* Botão Imprimir Comanda Térmica */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintReceipt(order)}
                            className="border-gray-200 hover:border-[#E3A008] hover:bg-amber-50 text-gray-700 font-bold rounded-xl gap-1.5 h-9"
                            title="Imprimir comanda térmica do pedido"
                          >
                            <Printer className="h-4 w-4 text-[#C1440E]" />
                            <span className="hidden sm:inline">Comanda</span>
                          </Button>

                          {/* Excluir Registro */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-9 w-9 p-0"
                            title="Excluir Registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo do Pedido */}
                    <CardContent className="p-6 bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Coluna de Itens */}
                        <div className="lg:col-span-2 space-y-6">
                          <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <ShoppingBag className="h-3.5 w-3.5 text-[#E3A008]" /> Itens do Pedido ({order.items.length})
                            </h4>
                            <div className="space-y-3">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100"
                                >
                                  <div className="flex gap-3">
                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-[#C1440E] border border-amber-200 text-sm shrink-0">
                                      {item.quantity}x
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 text-base">{item.name}</p>
                                      {item.pastaType && (
                                        <span className="inline-block bg-amber-100 text-[#C1440E] text-[10px] font-bold px-2 py-0.5 rounded-md uppercase mt-1">
                                          Massa: {item.pastaType}
                                        </span>
                                      )}
                                      {item.adicionais && item.adicionais.length > 0 && (
                                        <p className="text-xs text-gray-600 mt-1">
                                          <span className="font-semibold text-gray-500">Adicionais: </span>
                                          {item.adicionais
                                            .map((a: any) => `${a.quantity || 1}x ${a.name || a.nome}`)
                                            .join(", ")}
                                        </p>
                                      )}
                                      {item.notes && (
                                        <p className="text-xs text-amber-700 italic mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block">
                                          Obs item: {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <p className="font-black text-gray-900 text-base">
                                    R$ {(Number(item.price || 0) * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Observações Gerais do Pedido */}
                          {order.notes && (
                            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                              <h4 className="text-xs font-black text-[#C1440E] uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Observações do Cliente
                              </h4>
                              <p className="text-sm text-gray-800 font-medium whitespace-pre-wrap">{order.notes}</p>
                            </div>
                          )}
                        </div>

                        {/* Coluna do Cliente e Entrega */}
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-[#E3A008]" /> Cliente e Destino
                            </h4>
                            <div className="space-y-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                              {/* Telefone e WhatsApp Direto */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                    <Phone className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Telefone</p>
                                    <p className="font-bold text-gray-900 text-sm">{order.customerPhone}</p>
                                  </div>
                                </div>

                                {order.customerPhone && (
                                  <a
                                    href={getWhatsAppUrl(order.customerPhone, order.customerName, order.orderNumber)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                                    title="Conversar direto no WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                              </div>

                              {/* Endereço de Entrega */}
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                                  <MapPin className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    {isDelivery ? "Endereço de Entrega" : "Local de Retirada"}
                                  </p>
                                  <p className="font-bold text-gray-900 text-sm leading-snug">
                                    {isDelivery ? order.address || "Endereço não informado" : "Retirada no Balcão da Loja"}
                                  </p>
                                </div>
                              </div>

                              {/* Forma de Pagamento */}
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                  <CreditCard className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">Forma de Pagamento</p>
                                  <p className="font-bold text-gray-900 uppercase text-sm">{order.paymentMethod || "Não informado"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Totais Financeiros */}
                          <div className="pt-4 border-t border-gray-200 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 font-semibold">Subtotal</span>
                              <span className="font-bold text-gray-900">
                                R$ {(order.total + (order.discountAmount || 0)).toFixed(2)}
                              </span>
                            </div>

                            {(order.discountAmount ?? 0) > 0 && (
                              <div className="flex items-center justify-between text-sm text-emerald-600">
                                <span className="font-bold flex items-center gap-1">
                                  <Ticket className="h-3.5 w-3.5" /> Desconto ({order.couponCode || "Cupom"})
                                </span>
                                <span className="font-bold">- R$ {(order.discountAmount ?? 0).toFixed(2)}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-base font-black text-gray-900">Total do Pedido</span>
                              <span className="text-2xl font-black text-[#C1440E]">
                                R$ {Number(order.total).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Regras CSS Globais para Impressão de Comanda Térmica 80mm */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            display: block !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
