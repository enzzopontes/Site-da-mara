"use client"

import { useEffect, useState, useRef } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Clock, ChefHat, CheckCircle, XCircle, Phone, MapPin, ArrowLeft, RefreshCw, Filter, ShoppingBag, Trash2, User, Ticket, Megaphone, Zap, Tag, Image, CreditCard, FileText, Volume2, VolumeX, BellRing } from "lucide-react"
import { ordersManager, type Order } from "@/lib/orders-manager"
import { storeStatusManager } from "@/lib/store-status-manager"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Link from "next/link"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

const statusConfig = {
  pending: { label: "Pendente", color: "bg-orange-100 text-orange-700", bgColor: "bg-orange-50", icon: Clock, borderColor: "border-orange-200" },
  preparing: { label: "Preparando", color: "bg-blue-100 text-blue-700", bgColor: "bg-blue-50", icon: ChefHat, borderColor: "border-blue-200" },
  ready: { label: "Pronto", color: "bg-purple-100 text-purple-700", bgColor: "bg-purple-50", icon: CheckCircle, borderColor: "border-purple-200" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-700", bgColor: "bg-green-50", icon: CheckCircle, borderColor: "border-green-200" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", bgColor: "bg-red-50", icon: XCircle, borderColor: "border-red-200" },
}

export default function AdminPedidosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<"all" | Order["status"]>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>("default")
  const lastOrdersCount = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Carregar preferência de som do localStorage
    const savedAudioPref = localStorage.getItem("admin-audio-enabled")
    if (savedAudioPref === "true") {
      setAudioEnabled(true)
    }

    // Verificar permissão de notificação
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
      // Tenta tocar o som com volume máximo
      audioRef.current.volume = 1.0
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error("Erro ao tocar som (bloqueio do navegador):", err)
          // Se falhar, avisa o usuário que ele precisa interagir com a página
        })
      }
      
      // Vibração para celulares (se suportado)
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500])
      }
      
      // Notificação do navegador
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("🚨 NOVO PEDIDO - batata top!", {
          body: "Um novo pedido acaba de chegar! Abra o painel para conferir.",
          icon: "/favicon.ico",
          tag: "novo-pedido", // Evita múltiplas notificações iguais
          requireInteraction: true // Mantém a notificação visível até o usuário clicar
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
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex((t) => t.id === order.id)
      )
      
      // Se o número de pedidos aumentou, toca o som
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

  const handleStatusChange = async (orderId: string, status: Order["status"]) => {
    await ordersManager.updateOrderStatus(orderId, status)
    loadOrders()
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
      // Solicitar permissão de notificação
      if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
          setPermissionStatus(permission)
        })
      }
      
      // Tocar som de teste para "desbloquear" o áudio no navegador
      if (audioRef.current) {
        audioRef.current.volume = 1.0
        audioRef.current.play().catch(() => {
          alert("Clique em qualquer lugar da página para ativar o som de notificações.")
        })
      }
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-200 border-t-yellow-500 mx-auto mb-6"></div>
          <p className="text-gray-600 font-semibold">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter)

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
      <HeaderWrapper />
      
      {/* SOM DE ALTO IMPACTO (Campainha de Loja Forte) */}
      <audio 
        ref={audioRef} 
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto" 
      />

      <main className="flex-1 py-8 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          
          {/* AVISO DE CONFIGURAÇÃO DE SOM */}
          {!audioEnabled && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center justify-between animate-bounce">
              <div className="flex items-center gap-3 text-red-700">
                <VolumeX className="h-6 w-6" />
                <p className="font-black text-sm">O SOM ESTÁ DESATIVADO! Você não ouvirá quando chegar pedido.</p>
              </div>
              <Button onClick={toggleAudio} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl">
                ATIVAR AGORA
              </Button>
            </div>
          )}

          {permissionStatus === "denied" && (
            <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center gap-3 text-orange-700">
              <BellRing className="h-6 w-6" />
              <p className="font-bold text-sm">As notificações estão bloqueadas no seu navegador. Para receber avisos no celular, você precisa permitir as notificações nas configurações do site.</p>
            </div>
          )}

          <div className="mb-8">
            <Link href="/admin">
              <Button variant="ghost" className="mb-6 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 font-semibold gap-2">
                <ArrowLeft className="h-5 w-5" /> Voltar ao Painel
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <ShoppingBag className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900">Gerenciar Pedidos</h1>
                  <p className="text-gray-500 text-sm md:text-base">Acompanhe e gerencie todos os pedidos ativos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  onClick={toggleAudio} 
                  variant={audioEnabled ? "default" : "outline"}
                  className={`font-black rounded-xl gap-2 shadow-lg transition-all h-12 px-6 ${audioEnabled ? "bg-green-500 hover:bg-green-600 text-white scale-105" : "border-gray-200 text-gray-500"}`}
                >
                  {audioEnabled ? <Volume2 className="h-6 w-6 animate-pulse" /> : <VolumeX className="h-6 w-6" />}
                  {audioEnabled ? "SOM LIGADO" : "SOM DESLIGADO"}
                </Button>
                
                <Button onClick={handleRefresh} disabled={isRefreshing} className="bg-yellow-400 hover:bg-yellow-500 text-white font-bold rounded-xl gap-2 shadow-lg h-12">
                  <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} /> Atualizar
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <button onClick={() => setFilter("all")} className={`p-4 rounded-2xl font-bold text-sm transition-all ${filter === "all" ? "bg-yellow-400 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-100 hover:border-yellow-200"}`}>
              <div className="text-2xl font-black mb-1">{stats.total}</div><div>Todos</div>
            </button>
            <button onClick={() => setFilter("pending")} className={`p-4 rounded-2xl font-bold text-sm transition-all ${filter === "pending" ? "bg-orange-400 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-100 hover:border-orange-200"}`}>
              <div className="text-2xl font-black mb-1">{stats.pending}</div><div>Pendentes</div>
            </button>
            <button onClick={() => setFilter("preparing")} className={`p-4 rounded-2xl font-bold text-sm transition-all ${filter === "preparing" ? "bg-blue-400 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-100 hover:border-blue-200"}`}>
              <div className="text-2xl font-black mb-1">{stats.preparing}</div><div>Preparando</div>
            </button>
            <button onClick={() => setFilter("ready")} className={`p-4 rounded-2xl font-bold text-sm transition-all ${filter === "ready" ? "bg-purple-400 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-100 hover:border-purple-200"}`}>
              <div className="text-2xl font-black mb-1">{stats.ready}</div><div>Pronto</div>
            </button>
            <button onClick={() => setFilter("delivered")} className={`p-4 rounded-2xl font-bold text-sm transition-all ${filter === "delivered" ? "bg-green-400 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-100 hover:border-green-200"}`}>
              <div className="text-2xl font-black mb-1">{stats.delivered}</div><div>Entregues</div>
            </button>
            <button onClick={() => setFilter("cancelled")} className={`p-4 rounded-2xl font-bold text-sm transition-all ${filter === "cancelled" ? "bg-red-400 text-white shadow-lg" : "bg-white text-gray-700 border-2 border-gray-100 hover:border-red-200"}`}>
              <div className="text-2xl font-black mb-1">{orders.filter((o) => o.status === "cancelled").length}</div><div>Cancelados</div>
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400">Nenhum pedido encontrado</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon
                return (
                  <Card key={order.id} className={`border-none shadow-md overflow-hidden rounded-3xl transition-all hover:shadow-xl ${statusConfig[order.status].borderColor} border-l-8`}>
                    <div className={`p-4 md:p-6 ${statusConfig[order.status].bgColor}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${statusConfig[order.status].color}`}>
                            <StatusIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-black text-gray-900">Pedido #{order.orderNumber}</h3>
                              <Badge className={`${statusConfig[order.status].color} border-none font-bold`}>
                                {statusConfig[order.status].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">
                              {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {order.customerName}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.status !== "delivered" && order.status !== "cancelled" && (
                            <>
                              {order.status === "pending" && (
                                <Button onClick={() => handleStatusChange(order.id, "preparing")} className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl gap-2">
                                  <ChefHat className="h-4 w-4" /> Preparar
                                </Button>
                              )}
                              {order.status === "preparing" && (
                                <Button onClick={() => handleStatusChange(order.id, "ready")} className="bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl gap-2">
                                  <CheckCircle className="h-4 w-4" /> Pronto
                                </Button>
                              )}
                              {order.status === "ready" && (
                                <Button onClick={() => handleStatusChange(order.id, "delivered")} className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl gap-2">
                                  <CheckCircle className="h-4 w-4" /> Entregue
                                </Button>
                              )}
                              <Button onClick={() => handleStatusChange(order.id, "cancelled")} variant="outline" className="text-red-500 border-red-100 hover:bg-red-50 font-bold rounded-xl gap-2">
                                <XCircle className="h-4 w-4" /> Cancelar
                              </Button>
                            </>
                          )}
                          <Button onClick={() => handleDeleteOrder(order.id)} variant="ghost" className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl p-2">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6 bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                          <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <ShoppingBag className="h-3 w-3" /> Itens do Pedido
                            </h4>
                            <div className="space-y-3">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                                  <div className="flex gap-3">
                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-yellow-600 border border-yellow-100">
                                      {item.quantity}x
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900">{item.name}</p>
                                      {item.pastaType && (
                                        <p className="text-[10px] font-bold text-yellow-600 uppercase">Tipo: {item.pastaType}</p>
                                      )}
                                      {item.adicionais && item.adicionais.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          + {item.adicionais.map((a: any) => `${a.quantity}x ${a.name}`).join(", ")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <p className="font-black text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          {order.notes && (
                            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                              <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Observações
                              </h4>
                              <p className="text-sm text-orange-800 font-medium whitespace-pre-wrap">{order.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <User className="h-3 w-3" /> Cliente e Entrega
                            </h4>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                                  <Phone className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase">Telefone</p>
                                  <p className="font-bold text-gray-900">{order.customerPhone}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                  <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase">Endereço</p>
                                  <p className="font-bold text-gray-900 text-sm leading-tight">{order.address}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                                  <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase">Pagamento</p>
                                  <p className="font-bold text-gray-900 uppercase text-sm">{order.paymentMethod}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-500 font-bold">Subtotal</span>
                              <span className="font-bold text-gray-900">R$ {(order.total + (order.discountAmount || 0)).toFixed(2)}</span>
                            </div>
                            {(order.discountAmount ?? 0) > 0 && (
                              <div className="flex items-center justify-between mb-2 text-green-600">
                                <span className="font-bold flex items-center gap-1"><Ticket className="h-4 w-4" /> Desconto</span>
                                <span className="font-bold">- R$ {(order.discountAmount ?? 0).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-lg font-black text-gray-900">Total</span>
                              <span className="text-2xl font-black text-yellow-600">R$ {order.total.toFixed(2)}</span>
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
    </div>
  )
}
