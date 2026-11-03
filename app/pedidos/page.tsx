"use client"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Clock, MapPin, Phone, ChevronRight, Package, ShoppingBag, XCircle, Loader2, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ordersManager, type Order } from "@/lib/orders-manager"
import { FeedbackModal } from "@/components/feedback-modal"

export default function PedidosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<Order | null>(null)
  const [evaluatedOrders, setEvaluatedOrders] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      loadOrders()
      loadEvaluatedOrders()
    } else if (!loading) {
      setIsLoadingOrders(false)
    }
  }, [user, loading])

  const loadEvaluatedOrders = () => {
    const evaluated = JSON.parse(localStorage.getItem("evaluated-orders") || "[]")
    setEvaluatedOrders(evaluated)
  }

  const loadOrders = async () => {
    if (!user) return
    setIsLoadingOrders(true)
    try {
      const userOrders = await ordersManager.getUserOrders(user.id)
      setOrders(userOrders)
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleCancelOrder = async (order: Order) => {
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return

    setCancellingOrderId(order.id)
    try {
      await ordersManager.cancelOrder(order.id)
      const message = `Olá, gostaria de cancelar meu pedido #${order.orderNumber || order.id.slice(-4).toUpperCase()}.\n\n*Detalhes do Pedido:*\nCliente: ${order.customerName}\nTotal: R$ ${order.total.toFixed(2).replace('.', ',')}`
      const whatsappUrl = `https://wa.me/5514997361015?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, "_blank")
      await loadOrders()
    } catch (error) {
      console.error("Erro ao cancelar pedido:", error)
      alert("Erro ao cancelar pedido. Por favor, entre em contato via WhatsApp.")
    } finally {
      setCancellingOrderId(null)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Aguardando confirmação",
      preparing: "Preparando",
      ready: "Pronto para entrega",
      delivered: "Entregue",
      cancelled: "Cancelado",
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-yellow-600 bg-yellow-50",
      preparing: "text-orange-600 bg-orange-50",
      ready: "text-blue-600 bg-blue-50",
      delivered: "text-green-600 bg-green-50",
      cancelled: "text-red-600 bg-red-50",
    }
    return colors[status] || "text-gray-600 bg-gray-50"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderWrapper />
      <main className="flex-1 pb-24 lg:pb-8">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b">
          <div className="flex items-center gap-4 px-4 py-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-800" />
            </button>
            <h1 className="text-lg font-black text-gray-800">MEUS PEDIDOS</h1>
          </div>
        </div>

        <div className="hidden lg:block container mx-auto px-4 py-8">
          <h1 className="text-3xl font-black text-gray-800 mb-2">Meus Pedidos</h1>
          <p className="text-gray-500">Acompanhe o histórico de suas compras</p>
        </div>

        <div className="container mx-auto px-4 max-w-2xl">
          {isLoadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : !user || orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 lg:py-20 text-center">
              <img
                src="/assets/batatadormindo.png"
                alt="Poxa, você não tem nenhum pedido"
                className="w-48 h-48 object-contain mx-auto mb-4"
              />
              <h2 className="text-xl font-bold text-[#1F1B16] text-center mb-2">
                Poxa, você não tem nenhum pedido
              </h2>
              <p className="text-sm text-[#6B6157] text-center max-w-sm mb-6">
                Seus pedidos vão aparecer aqui quando você fizer. Que tal aproveitar as ofertas pra pedir agora?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => router.push("/cardapio")}
                  className="bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold px-8 py-3 rounded-xl transition-colors h-auto"
                >
                  Fazer pedido
                </Button>
                {!user && (
                  <Button
                    variant="outline"
                    onClick={() => router.push("/login")}
                    className="border-[#E3A008] text-[#E3A008] hover:bg-[#E3A008]/10 font-bold px-6 py-3 rounded-xl h-auto"
                  >
                    Entrar na conta
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido #{order.orderNumber || order.id.slice(-4).toUpperCase()}</p>
                          <p className="text-sm font-black text-gray-800">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.quantity}x {item.name}</span>
                              <span className="font-bold text-gray-800">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                            </div>
                            {item.adicionais && item.adicionais.length > 0 && (
                              <p className="text-[10px] text-gray-400 ml-4">
                                + {item.adicionais.map((a: any) => `${a.quantity || 1}x ${a.name}`).join(', ')}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">Itens não disponíveis</p>
                      )}
                    </div>

                    {order.couponCode && (
                      <div className="mb-4 p-2 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Ticket className="h-3 w-3 text-green-600" />
                          <span className="text-[10px] font-black text-green-700 uppercase">Cupom: {order.couponCode}</span>
                        </div>
                        {(order.discountAmount ?? 0) > 0 && (
                          <span className="text-[10px] font-bold text-green-600">- R$ {(order.discountAmount ?? 0).toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                        <p className="text-lg font-black text-gray-800">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex gap-2">
                        {["pending", "preparing"].includes(order.status) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 font-bold hover:bg-red-50 hover:text-red-600" 
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancellingOrderId === order.id}
                          >
                            {cancellingOrderId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" /> Cancelar
                              </>
                            )}
                          </Button>
                        )}
                        {!evaluatedOrders.includes(order.id) && order.status !== "cancelled" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-yellow-600 font-bold hover:bg-yellow-50" 
                            onClick={() => setFeedbackModalOrder(order)}
                          >
                            ⭐ Avaliar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-yellow-600 font-bold hover:bg-yellow-50" onClick={() => router.push(`/pedidos/${order.id}`)}>
                          Detalhes <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <OrderSummary />
      {/* Feedback Modal */}
      {feedbackModalOrder && (
        <FeedbackModal
          orderId={feedbackModalOrder.id}
          orderNumber={String(feedbackModalOrder.orderNumber || feedbackModalOrder.id.slice(-4).toUpperCase())}
          onClose={() => setFeedbackModalOrder(null)}
          onSuccess={() => {
            loadEvaluatedOrders()
          }}
        />
      )}
    </div>
  )
}
