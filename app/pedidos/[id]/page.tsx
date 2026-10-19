"use client"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Clock, MapPin, Phone, MessageSquare, Package, ShoppingBag, CheckCircle2, Truck, Timer, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ordersManager, type Order } from "@/lib/orders-manager"
import { PixPaymentBox } from "@/components/pix-payment-box"

export default function DetalhesPedidoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && orderId) {
      loadOrder()
    }
  }, [user, orderId])

  const loadOrder = async () => {
    setIsLoading(true)
    try {
      const foundOrder = await ordersManager.getOrderById(orderId)
      if (foundOrder) {
        setOrder(foundOrder)
      } else {
        const allOrders = await ordersManager.getTodayOrders()
        const fallback = allOrders.find(o => o.id === orderId)
        if (fallback) setOrder(fallback)
      }
    } catch (error) {
      console.error("Erro ao carregar pedido:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      awaiting_payment: "Aguardando pagamento Pix",
      pending: "Aguardando confirmação",
      preparing: "Preparando seu pedido",
      ready: "Pronto para entrega",
      delivered: "Pedido entregue",
      cancelled: "Pedido cancelado",
    }
    return labels[status] || status
  }

  const getStatusStep = (status: string) => {
    const steps: Record<string, number> = {
      awaiting_payment: 0,
      pending: 1,
      preparing: 2,
      ready: 3,
      delivered: 4,
      cancelled: 0
    }
    return steps[status] || 1
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderWrapper />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-xl font-black text-gray-800 mb-4">Pedido não encontrado</h2>
          <Button onClick={() => router.push("/pedidos")} className="bg-yellow-500 text-white font-bold rounded-xl">Voltar para Meus Pedidos</Button>
        </main>
        <Footer />
      </div>
    )
  }

  const currentStep = getStatusStep(order.status)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderWrapper />
      <main className="flex-1 pb-24 lg:pb-8">
        <div className="bg-white border-b sticky top-0 z-30 lg:relative lg:top-0">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-800" />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-800 uppercase">Acompanhar Pedido</h1>
              <p className="text-xs text-gray-400 font-bold">#{order.orderNumber || order.id.slice(0, 4)}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-2xl mt-6">
          {/* Seção Pix Embutido caso aguarde pagamento */}
          {order.status === "awaiting_payment" && (
            <PixPaymentBox
              orderId={order.id}
              total={order.total}
              pixData={order.metadata?.pix}
              onPaymentApproved={() => {
                loadOrder()
              }}
            />
          )}

          {/* Status Visual - Estilo iFood */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-yellow-500 flex items-center justify-center text-white shadow-lg shadow-yellow-100">
                {order.status === 'delivered' ? <CheckCircle2 className="h-6 w-6" /> : <Timer className="h-6 w-6 animate-pulse" />}
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-800">{getStatusLabel(order.status)}</h2>
                <p className="text-sm text-gray-500">Realizado às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="relative flex justify-between items-center px-2">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-100 z-0"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-yellow-500 z-0 transition-all duration-1000" style={{ width: `${(currentStep - 1) * 33.33}%` }}></div>
              
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className={`relative z-10 h-4 w-4 rounded-full border-2 transition-colors duration-500 ${step <= currentStep ? 'bg-yellow-500 border-yellow-500' : 'bg-white border-gray-200'}`}></div>
              ))}
            </div>
            <div className="flex justify-between mt-3 px-0">
              <span className={`text-[10px] font-black uppercase ${currentStep >= 1 ? 'text-yellow-600' : 'text-gray-300'}`}>Confirmado</span>
              <span className={`text-[10px] font-black uppercase ${currentStep >= 2 ? 'text-yellow-600' : 'text-gray-300'}`}>Preparo</span>
              <span className={`text-[10px] font-black uppercase ${currentStep >= 3 ? 'text-yellow-600' : 'text-gray-300'}`}>Pronto</span>
              <span className={`text-[10px] font-black uppercase ${currentStep >= 4 ? 'text-yellow-600' : 'text-gray-300'}`}>Entregue</span>
            </div>
          </div>

          {/* Detalhes do Pedido */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-5 border-b border-gray-50">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-500" /> Itens do Pedido
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{item.quantity}x {item.name}</p>
                      {item.adicionais && item.adicionais.length > 0 && (
                        <p className="text-xs text-gray-400">+ {item.adicionais.map((a: any) => `${a.quantity || 1}x ${a.name}`).join(', ')}</p>
                      )}
                    </div>
                    <p className="text-sm font-black text-gray-800">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">Itens não disponíveis</p>
              )}
              {order.couponCode && (
                <div className="flex justify-between items-center py-2 px-3 bg-green-50 border border-green-100 rounded-xl mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-black text-green-700 uppercase">Cupom: {order.couponCode}</span>
                  </div>
                  {(order.discountAmount ?? 0) > 0 && (
                    <span className="text-xs font-bold text-green-600">- R$ {(order.discountAmount ?? 0).toFixed(2).replace('.', ',')}</span>
                  )}
                </div>
              )}
              <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className="font-black text-gray-800">Total</span>
                <span className="text-xl font-black text-yellow-600">R$ {order.total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>

          {/* Entrega e Pagamento */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 text-sm mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-yellow-500" /> Endereço
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">{order.address || 'Retirada na loja'}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 text-sm mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-yellow-500" /> Pagamento
              </h3>
              <p className="text-xs text-gray-500 uppercase font-bold">{order.paymentMethod}</p>
            </div>
          </div>

          <Button 
            onClick={() => window.open(`https://wa.me/5514997361015?text=Olá, gostaria de informações sobre meu pedido #${order.orderNumber || order.id.slice(0,4)}`, '_blank')}
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-5 w-5" /> Preciso de Ajuda
          </Button>
        </div>
      </main>
      <Footer />
      <OrderSummary />
    </div>
  )
}
