"use client"

import { appToast } from "@/lib/app-toast"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { ordersManager, type Order } from "@/lib/orders-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { PixPaymentBox } from "@/components/pix-payment-box"
import { SlideDownPaymentBanner } from "@/components/slide-down-payment-banner"
import { triggerPixConfettiCannons } from "@/lib/pix-confetti"
import { FeedbackModal } from "@/components/feedback-modal"
import { PedidoDetalheSkeleton } from "@/components/skeletons/pedido-detalhe-skeleton"
import {
  ChevronLeft,
  Clock,
  ShieldCheck,
  Flame,
  ShoppingBag,
  Bike,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  CreditCard,
  Ticket,
  MessageSquare,
  RotateCcw,
  Star,
  Loader2,
  Check,
} from "lucide-react"

// ─── Header Minimalista Padrão (Estilo iFood) ─────────────────────────────────
function MinimalHeader({
  orderNumber,
  onBack,
}: {
  orderNumber?: string
  onBack: () => void
}) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[#ECE7E0]">
      <div className="container mx-auto px-4 max-w-2xl h-14 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-[#1F1B16]"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-extrabold text-[#1F1B16] leading-tight">
            Acompanhar pedido
          </h1>
          {orderNumber && (
            <p className="text-[11px] font-bold text-[#6B6157]">#{orderNumber}</p>
          )}
        </div>
        <div className="w-8" />
      </div>
    </div>
  )
}

// ─── Bolinha Pulsante de Radar ───────────────────────────────────────────────
function PulsingRadarDot({ color = "#E3A008" }: { color?: string }) {
  return (
    <div className="relative flex items-center justify-center w-5 h-5">
      <span
        className="absolute w-5 h-5 rounded-full radar-wave opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative w-2.5 h-2.5 rounded-full shadow-xs"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

// ─── Linha do Tempo de 5 Etapas (Estilo iFood) ────────────────────────────────
function ProgressBar({
  status,
  isPixAwaiting = false,
}: {
  status: string
  isPixAwaiting?: boolean
}) {
  if (status === "cancelled") return null

  // 0: Realizado | 1: Confirmado | 2: Em preparo | 3: A caminho | 4: Entregue
  let currentStep = 1
  if (isPixAwaiting || status === "awaiting_payment") {
    currentStep = 0
  } else if (status === "pending" || status === "confirmed") {
    currentStep = 1
  } else if (status === "preparing" || status === "preparo") {
    currentStep = 2
  } else if (status === "ready") {
    currentStep = 2.5
  } else if (status === "out_for_delivery") {
    currentStep = 3
  } else if (status === "delivered") {
    currentStep = 4
  }

  const steps = ["Realizado", "Confirmado", "Em preparo", "A caminho", "Entregue"]
  const progressPercent = Math.min(100, Math.max(0, (currentStep / 4) * 100))

  return (
    <div className="mt-6 mb-2 px-1">
      <div className="relative">
        {/* Trilho cinza de fundo */}
        <div className="absolute top-2.5 left-4 right-4 h-1 bg-[#E8E8E8] rounded-full z-0" />
        {/* Trilho preenchido em amarelo */}
        <div
          className="absolute top-2.5 left-4 h-1 bg-[#E3A008] rounded-full z-0 transition-all duration-700 ease-out"
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        {/* Pontos da timeline */}
        <div className="relative z-10 flex justify-between items-start">
          {steps.map((label, i) => {
            const isPassed = i < Math.floor(currentStep)
            const isActive = i === Math.floor(currentStep) && status !== "delivered"
            const isDelivered = status === "delivered" && i === 4

            return (
              <div key={label} className="flex flex-col items-center w-14">
                <div className="h-5 flex items-center justify-center">
                  {isActive ? (
                    <PulsingRadarDot color="#E3A008" />
                  ) : isPassed || isDelivered ? (
                    <div className="w-5 h-5 rounded-full bg-[#E3A008] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-2 text-center leading-tight truncate w-full ${
                    isActive
                      ? "font-extrabold text-[#E3A008]"
                      : isPassed || isDelivered
                      ? "font-bold text-[#1F1B16]"
                      : "font-semibold text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal de Detalhes ─────────────────────────────────────────
export default function DetalhesPedidoPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const { user, loading: authLoading } = useAuth()
  const { addItem, clearCart } = useCart()

  const [order, setOrder] = useState<Order | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showPaymentSuccessBanner, setShowPaymentSuccessBanner] = useState(false)
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false)
  const [isEvaluated, setIsEvaluated] = useState(false)

  const hasCelebratedRef = useRef(false)
  const orderRef = useRef<Order | null>(null)
  orderRef.current = order

  // Carrega status de avaliação do pedido
  const checkIsEvaluated = useCallback(async (oid: string) => {
    try {
      const local = JSON.parse(localStorage.getItem("evaluated-orders") || "[]")
      if (local.includes(oid)) {
        setIsEvaluated(true)
        return
      }
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("feedbacks")
        .select("id")
        .eq("order_id", oid)
        .maybeSingle()

      if (data) setIsEvaluated(true)
    } catch {}
  }, [])

  // Carrega os dados do pedido
  const loadOrder = useCallback(
    async (isSilent = false) => {
      if (!orderId) return
      if (!isSilent && !order) {
        setInitialLoading(true)
      }
      try {
        const found = await ordersManager.getOrderById(orderId)
        if (found) {
          setOrder(found)
          checkIsEvaluated(found.id)
        } else {
          const todays = await ordersManager.getTodayOrders()
          const fb = todays.find((o) => o.id === orderId)
          if (fb) {
            setOrder(fb)
            checkIsEvaluated(fb.id)
          }
        }
      } catch (err) {
        console.error("Erro ao carregar pedido:", err)
      } finally {
        if (!isSilent) setInitialLoading(false)
      }
    },
    [orderId, order, checkIsEvaluated]
  )

  const loadOrderRef = useRef(loadOrder)
  useEffect(() => {
    loadOrderRef.current = loadOrder
  }, [loadOrder])

  // Disparo da celebração quando Pix for aprovado
  const handlePaymentApproved = useCallback(() => {
    if (!hasCelebratedRef.current) {
      hasCelebratedRef.current = true
      setShowPaymentSuccessBanner(true)
      triggerPixConfettiCannons()
    }
    loadOrderRef.current(true)
  }, [])

  // Proteção de autenticação
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/pedidos/${orderId}`)
    }
  }, [user, authLoading, router, orderId])

  // Inscrição Realtime no Supabase + Polling contingencial
  useEffect(() => {
    if (!orderId || !user) return

    loadOrderRef.current()

    const supabase = getSupabaseBrowserClient()
    const channelName = `order-detail-${orderId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status
          const mpStatus = payload.new?.metadata?.mp_payment_status

          if (
            (newStatus && newStatus !== "awaiting_payment" && newStatus !== "cancelled") ||
            mpStatus === "approved"
          ) {
            if (
              orderRef.current?.status === "awaiting_payment" ||
              orderRef.current?.paymentMethod === "pix"
            ) {
              handlePaymentApproved()
            }
          }
          loadOrderRef.current(true)
        }
      )
      .subscribe()

    const pollInterval = setInterval(() => {
      loadOrderRef.current(true)
    }, 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [orderId, user, handlePaymentApproved])

  // Ações
  const handleCancelOrder = async () => {
    if (!order) return
    if (!confirm("Tem certeza que deseja cancelar seu pedido?")) return

    setCancelling(true)
    try {
      await ordersManager.cancelOrder(order.id)
      await loadOrder(true)
      appToast.success("Pedido cancelado", "Seu pedido foi cancelado com sucesso.")
    } catch (err: any) {
      appToast.error("Falha ao cancelar", err.message || "Não foi possível cancelar o pedido. Contate o suporte.")
    } finally {
      setCancelling(false)
    }
  }

  const handleReorder = () => {
    if (!order?.items || order.items.length === 0) {
      router.push("/cardapio")
      return
    }

    clearCart()
    order.items.forEach((item: any) => {
      addItem({
        id: String(item.product_id || item.id || `reorder-${Date.now()}`),
        name: item.name || item.product_name,
        price: Number(item.price || item.product_price || 0),
        image: item.image || item.image_url || "/logo.png",
        quantity: Number(item.quantity) || 1,
        category: item.category || "batata",
        pastaType: item.pastaType || undefined,
        adicionais: (item.adicionais || []).map((a: any) => ({
          id: a.id || String(a.name || a),
          name: a.name || String(a),
          price: Number(a.price) || 0,
          quantity: Number(a.quantity) || 1,
        })),
      })
    })

    router.push("/checkout")
  }

  const handleHelp = () => {
    if (!order) return
    const num = order.orderNumber || order.id.slice(-4).toUpperCase()
    const msg = `Olá! Gostaria de informações sobre meu pedido #${num}.`
    window.open(`https://wa.me/5514997361015?text=${encodeURIComponent(msg)}`, "_blank")
  }

  if (authLoading || initialLoading) {
    return <PedidoDetalheSkeleton />
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F4EF]">
        <MinimalHeader onBack={() => router.push("/pedidos")} />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-[#1F1B16] mb-2">Pedido não encontrado</h2>
          <p className="text-sm text-[#6B6157] font-medium mb-6">
            Não foi possível carregar os detalhes deste pedido.
          </p>
          <button
            onClick={() => router.push("/pedidos")}
            className="px-6 py-3 bg-[#E3A008] text-white font-extrabold text-sm rounded-xl shadow-md"
          >
            Voltar para Pedidos
          </button>
        </main>
        <Footer />
      </div>
    )
  }

  // Cálculos visuais
  const num = String(order.orderNumber || order.id.slice(-4).toUpperCase())
  const isPaid =
    order.metadata?.mp_payment_status === "approved" ||
    order.metadata?.pix?.status === "approved" ||
    Boolean(order.metadata?.paid_at) ||
    ["preparing", "preparo", "ready", "out_for_delivery", "delivered"].includes(order.status)

  const isPixMethod =
    order.paymentMethod === "pix" ||
    order.paymentMethod?.toLowerCase?.() === "pix" ||
    Boolean(order.metadata?.pix)

  const isPixAwaiting = !isPaid && (order.status === "awaiting_payment" || (order.status === "pending" && isPixMethod))

  const etaMinutes = order.metadata?.eta_minutes
  const formattedTimeOrEta = (() => {
    if (etaMinutes) {
      const base = order.createdAt ? new Date(order.createdAt).getTime() : Date.now()
      const etaDate = new Date(base + etaMinutes * 60 * 1000)
      return `Previsão de entrega às ${etaDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    }
    if (order.createdAt) {
      return `Realizado às ${new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    }
    return ""
  })()

  // Status Badge & Texts
  const statusConfig = (() => {
    switch (order.status) {
      case "awaiting_payment":
        return {
          title: "Aguardando pagamento",
          badgeBg: "bg-[#FEF3C7]",
          badgeColor: "text-[#D97706]",
          icon: <Clock className="w-6 h-6" />,
        }
      case "pending":
      case "confirmed":
        return {
          title: "Pedido confirmado",
          badgeBg: "bg-[#FEF3C7]",
          badgeColor: "text-[#D97706]",
          icon: <ShieldCheck className="w-6 h-6" />,
        }
      case "preparing":
      case "preparo":
        return {
          title: "Seu pedido está sendo preparado",
          badgeBg: "bg-[#FFF7ED]",
          badgeColor: "text-[#EA580C]",
          icon: <Flame className="w-6 h-6 flame-breathing" />,
        }
      case "ready":
        return {
          title: "Pronto para entrega",
          badgeBg: "bg-[#EFF6FF]",
          badgeColor: "text-[#2563EB]",
          icon: <ShoppingBag className="w-6 h-6" />,
        }
      case "out_for_delivery":
        return {
          title: "A Batata Top saiu para entrega!",
          badgeBg: "bg-[#DBEAFE]",
          badgeColor: "text-[#1E40AF]",
          icon: <Bike className="w-6 h-6" />,
        }
      case "delivered":
        return {
          title: "Pedido entregue",
          badgeBg: "bg-[#F0FDF4]",
          badgeColor: "text-[#16A34A]",
          icon: <CheckCircle2 className="w-6 h-6" />,
        }
      case "cancelled":
        return {
          title: "Pedido cancelado",
          badgeBg: "bg-[#FEF2F2]",
          badgeColor: "text-[#DC2626]",
          icon: <XCircle className="w-6 h-6" />,
        }
      default:
        return {
          title: "Pedido confirmado",
          badgeBg: "bg-[#FEF3C7]",
          badgeColor: "text-[#D97706]",
          icon: <ShieldCheck className="w-6 h-6" />,
        }
    }
  })()

  const deliveryTypeLabel = order.deliveryType === "pickup" ? "Retirada na Loja" : "Entrega Delivery"
  const paymentLabel =
    order.paymentMethod === "pix"
      ? "Pix"
      : order.paymentMethod?.toLowerCase?.().includes("cart")
      ? "Cartão"
      : "Dinheiro"

  const freteValue = order.metadata?.deliveryFee != null ? Number(order.metadata.deliveryFee) : 0
  const freteText = order.deliveryType === "pickup" ? "Grátis" : freteValue === 0 ? "Grátis" : `R$ ${freteValue.toFixed(2).replace(".", ",")}`

  const isCancellable = ["awaiting_payment", "pending"].includes(order.status)

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EF]">
      {/* Banner Verde Deslizante Superior de Sucesso no Pagamento */}
      <SlideDownPaymentBanner
        visible={showPaymentSuccessBanner}
        onDismiss={() => setShowPaymentSuccessBanner(false)}
      />

      <MinimalHeader
        orderNumber={num}
        onBack={() => router.push("/pedidos")}
      />

      <main className="flex-1 pb-28 lg:pb-12">
        <div className="container mx-auto px-4 max-w-2xl py-5 space-y-4">
          {/* 1. Bloco Pix Embutido caso aguarde pagamento */}
          {isPixAwaiting && (
            <PixPaymentBox
              orderId={order.id}
              total={order.total}
              pixData={order.metadata?.pix}
              onPaymentApproved={handlePaymentApproved}
            />
          )}

          {/* 2. Card de Status Visual Estilo App Mobile */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-[#ECE7E0]">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${statusConfig.badgeBg} ${statusConfig.badgeColor}`}
              >
                {statusConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-[#1F1B16] leading-tight">
                  {statusConfig.title}
                </h2>
                {formattedTimeOrEta && (
                  <p className="text-xs font-semibold text-[#6B6157] mt-0.5">
                    {formattedTimeOrEta}
                  </p>
                )}
              </div>
            </div>

            {/* Linha do Tempo 5 Etapas com Radar Pulsante */}
            <ProgressBar status={order.status} isPixAwaiting={isPixAwaiting} />
          </div>

          {/* 3. Card Saiu Para Entrega (Sem mapa, informativo do app) */}
          {order.status === "out_for_delivery" && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
                  <Bike className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-blue-950">
                    A Batata Top saiu para entrega!
                  </h3>
                  <p className="text-xs font-medium text-blue-800 mt-0.5 leading-relaxed">
                    O entregador está a caminho do seu endereço com o pedido quentinho. Fique atento ao interfone ou portão.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Card: Itens do Pedido */}
          <div className="bg-white rounded-3xl shadow-xs border border-[#ECE7E0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F5F2ED] flex items-center justify-between">
              <h3 className="text-xs font-black text-[#1F1B16] uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#E3A008]" />
                Itens do Pedido ({order.items?.length || 0})
              </h3>
            </div>

            <div className="p-5 space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, idx: number) => {
                  const adicText = (item.adicionais || [])
                    .map((a: any) => (typeof a === "string" ? a : a?.name || a?.nome))
                    .filter(Boolean)
                    .join(", ")

                  return (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 text-xs pb-3 border-b border-[#F5F2ED] last:border-0 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-[#FEF8EC] text-[#A16207] text-[11px] font-black flex items-center justify-center shrink-0">
                            {item.quantity}
                          </span>
                          <span className="font-extrabold text-[#1F1B16] truncate">
                            {item.name}
                          </span>
                        </div>

                        {item.pastaType && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1 ml-7">
                            Massa: {item.pastaType.toUpperCase()}
                          </span>
                        )}

                        {adicText && (
                          <p className="text-[11px] text-[#6B6157] font-medium pl-7 mt-0.5">
                            + {adicText}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-[11px] text-[#9C9188] italic pl-7 mt-0.5">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>

                      <span className="font-extrabold text-[#1F1B16] shrink-0 text-right">
                        R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-[#9C9188] italic">Itens indisponíveis</p>
              )}

              {/* Cupom de desconto aplicado */}
              {order.couponCode && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold uppercase">
                      Cupom: {order.couponCode}
                    </span>
                  </div>
                  {(order.discountAmount ?? 0) > 0 && (
                    <span className="font-extrabold text-emerald-700">
                      - R$ {(order.discountAmount ?? 0).toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
              )}

              {/* Resumo financeiro */}
              <div className="pt-3 border-t border-[#F5F2ED] space-y-2 text-xs">
                <div className="flex justify-between text-[#6B6157] font-medium">
                  <span>Entrega ({order.deliveryType === "pickup" ? "Retirada" : "Delivery"})</span>
                  <span>{freteText}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-[#1F1B16] pt-1 border-t border-[#F5F2ED]">
                  <span>Total</span>
                  <span className="text-lg font-black text-[#E3A008]">
                    R$ {order.total.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Cards de Entrega e Pagamento */}
          <div className="grid sm:grid-cols-2 gap-3.5">
            {/* Endereço */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#ECE7E0] space-y-1.5">
              <h3 className="text-xs font-black text-[#1F1B16] uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E3A008]" />
                {order.deliveryType === "pickup" ? "Retirada na Loja" : "Endereço de Entrega"}
              </h3>
              <p className="text-xs font-medium text-[#6B6157] leading-relaxed">
                {order.deliveryType === "pickup"
                  ? "Rua Pedro de Toledo, 540 - Centro, Iacanga-SP"
                  : order.address || "Endereço informado na compra"}
              </p>
            </div>

            {/* Pagamento */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#ECE7E0] space-y-1.5">
              <h3 className="text-xs font-black text-[#1F1B16] uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#E3A008]" />
                Forma de Pagamento
              </h3>
              <p className="text-xs font-medium text-[#6B6157]">
                {paymentLabel}
                {order.metadata?.troco ? ` • Troco para R$ ${order.metadata.troco}` : ""}
              </p>
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                {isPaid ? "Pagamento Aprovado" : "Aguardando Pagamento"}
              </span>
            </div>
          </div>

          {/* 6. Botões de Ação no Rodapé */}
          <div className="space-y-2.5 pt-2">
            {/* Avaliação se Entregue */}
            {order.status === "delivered" && !isEvaluated && (
              <button
                type="button"
                onClick={() => setFeedbackModalVisible(true)}
                className="w-full h-12 rounded-2xl bg-[#FEF8EC] border border-[#E3A008]/40 hover:bg-[#E3A008] hover:text-white active:scale-98 text-xs font-extrabold text-[#A16207] transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Star className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
                <span>Avaliar este pedido</span>
              </button>
            )}

            {/* Pedir Novamente */}
            <button
              type="button"
              onClick={handleReorder}
              className="w-full h-12 rounded-2xl bg-[#E3A008] hover:bg-[#B5860A] text-white active:scale-98 text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Pedir novamente</span>
            </button>

            {/* Preciso de Ajuda (WhatsApp) */}
            <button
              type="button"
              onClick={handleHelp}
              className="w-full h-12 rounded-2xl bg-white border border-[#ECE7E0] hover:bg-gray-50 active:scale-98 text-xs font-extrabold text-[#1F1B16] transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Preciso de ajuda com este pedido</span>
            </button>

            {/* Cancelar Pedido (se ainda pendente) */}
            {isCancellable && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="w-full h-11 rounded-2xl bg-white border border-red-200 hover:bg-red-50 text-red-600 active:scale-98 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Cancelar pedido</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <OrderSummary />

      {/* Modal de Avaliação */}
      {feedbackModalVisible && (
        <FeedbackModal
          orderId={order.id}
          orderNumber={num}
          initialRating={5}
          onClose={() => setFeedbackModalVisible(false)}
          onSuccess={() => {
            setIsEvaluated(true)
            checkIsEvaluated(order.id)
          }}
        />
      )}
    </div>
  )
}
