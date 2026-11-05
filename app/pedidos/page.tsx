"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { ordersManager, type Order } from "@/lib/orders-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { FeedbackModal } from "@/components/feedback-modal"
import { PedidosSkeleton } from "@/components/skeletons/pedidos-skeleton"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Bike,
  CheckCircle2,
  XCircle,
  Star,
  MessageSquare,
  RotateCcw,
} from "lucide-react"

// ─── Header Minimalista Padrão (Estilo iFood) ─────────────────────────────────
function MinimalHeader({ title = "Pedidos" }: { title?: string }) {
  const router = useRouter()
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-[#ECE7E0]">
      <div className="container mx-auto px-4 max-w-2xl h-14 flex items-center justify-between">
        <button
          onClick={() => router.push("/cardapio")}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-[#1F1B16]"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-extrabold text-[#1F1B16] tracking-tight">{title}</h1>
        <div className="w-8" />
      </div>
    </div>
  )
}

// ─── Bolinha Pulsante Amarela ────────────────────────────────────────────────
function PulsingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E3A008] opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E3A008]" />
    </span>
  )
}

// ─── Barra de Progresso Segmentada Estilo iFood ──────────────────────────────
function SegmentedProgressBar({ status }: { status: string }) {
  // 1: Confirmado | 2: Preparo | 3: A caminho | 4: Entregue
  let currentStep = 1
  let statusText = "Pedido confirmado"

  if (status === "awaiting_payment") {
    currentStep = 1
    statusText = "Aguardando pagamento Pix"
  } else if (status === "pending" || status === "confirmed") {
    currentStep = 1
    statusText = "Pedido confirmado"
  } else if (status === "preparing" || status === "preparo") {
    currentStep = 2
    statusText = "Seu pedido está sendo preparado"
  } else if (status === "ready") {
    currentStep = 3
    statusText = "Pronto para sair"
  } else if (status === "out_for_delivery") {
    currentStep = 3
    statusText = "A Batata Top saiu para entrega!"
  } else if (status === "delivered") {
    currentStep = 4
    statusText = "Pedido entregue"
  }

  return (
    <div className="mt-3 mb-2">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((stepIdx) => {
          const isCompleted = stepIdx < currentStep
          const isCurrent = stepIdx === currentStep

          return (
            <div
              key={stepIdx}
              className="flex-1 h-1 rounded-full bg-[#E8E8E8] overflow-hidden relative"
            >
              {isCompleted ? (
                <div className="absolute inset-0 bg-[#E3A008]" />
              ) : isCurrent ? (
                <div className="absolute inset-0 bg-[#E3A008] animate-pulse" />
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="text-xs font-bold text-[#3E3E3E] mt-2">{statusText}</p>
    </div>
  )
}

// ─── Verificador de Pedido Aguardando Pix ──────────────────────────────────
export function isOrderAwaitingPix(order: Order): boolean {
  if (!order) return false
  const isPaid =
    order.metadata?.mp_payment_status === "approved" ||
    order.metadata?.pix?.status === "approved" ||
    Boolean(order.metadata?.paid_at) ||
    ["preparing", "preparo", "ready", "out_for_delivery", "delivered"].includes(order.status)

  if (isPaid) return false

  const isPixMethod =
    order.paymentMethod === "pix" ||
    order.paymentMethod?.toLowerCase?.() === "pix" ||
    Boolean(order.metadata?.pix) ||
    Boolean(order.metadata?.qr_code) ||
    Boolean(order.metadata?.pix_qr_code)

  return order.status === "awaiting_payment" || (order.status === "pending" && isPixMethod)
}

// ─── Card de Pedido em Andamento (Design Rico iFood) ─────────────────────────
function ActiveOrderCard({
  order,
  onDetails,
}: {
  order: Order
  onDetails: (id: string) => void
}) {
  const num = String(order.orderNumber || order.id.slice(-4).toUpperCase())
  const awaitingPix = isOrderAwaitingPix(order)
  const deliveryTypeLabel = order.deliveryType === "pickup" ? "Retirada" : "Delivery"
  const paymentLabel =
    order.paymentMethod === "pix"
      ? "Pix"
      : order.paymentMethod?.toLowerCase?.().includes("cart")
      ? "Cartão"
      : "Dinheiro"

  const freteText =
    order.deliveryType === "pickup"
      ? "Grátis"
      : order.metadata?.deliveryFee != null
      ? Number(order.metadata.deliveryFee) === 0
        ? "Grátis"
        : `R$ ${Number(order.metadata.deliveryFee).toFixed(2).replace(".", ",")}`
      : "Grátis"

  return (
    <div
      onClick={() => onDetails(order.id)}
      className="bg-white rounded-2xl border border-[#ECE7E0] p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F5F2ED]">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Batata Top"
            className="w-10 h-10 rounded-xl object-contain shrink-0"
          />
          <div>
            <h3 className="text-sm font-extrabold text-[#1F1B16] leading-tight">Batata Top</h3>
            <p className="text-xs font-semibold text-[#6B6157]">
              Pedido #{num} • {deliveryTypeLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#1F1B16]">
            R$ {order.total.toFixed(2).replace(".", ",")}
          </span>
          <ChevronRight className="w-4 h-4 text-[#9C9188]" />
        </div>
      </div>

      {/* Faixa de Status Estilo iFood */}
      <div className="mt-3">
        {awaitingPix ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#B45309] text-xs font-bold">
            <Clock className="w-4 h-4 shrink-0 text-[#D97706]" />
            <span className="truncate">Aguardando pagamento Pix • Toque para pagar</span>
          </div>
        ) : order.status === "out_for_delivery" ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#DBEAFE] text-[#1E40AF] text-xs font-bold">
            <Bike className="w-4 h-4 shrink-0 text-[#1E40AF]" />
            <span className="truncate">A Batata Top saiu para entrega!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#B45309] text-xs font-bold">
            <PulsingDot />
            <span className="truncate">Seu pedido está sendo preparado</span>
          </div>
        )}
      </div>

      {/* Barra de Progresso Segmentada iFood */}
      <SegmentedProgressBar status={order.status} />

      {/* Lista de Itens Rica dentro do Card */}
      <div className="py-2.5 space-y-2 border-y border-[#F5F2ED]">
        {order.items && order.items.length > 0 ? (
          order.items.map((item: any, idx: number) => {
            const adicText = (item.adicionais || [])
              .map((a: any) => (typeof a === "string" ? a : a?.name || a?.nome))
              .filter(Boolean)
              .join(", ")

            return (
              <div key={idx} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-[#FEF8EC] text-[#A16207] text-[11px] font-black flex items-center justify-center shrink-0">
                      {item.quantity}
                    </span>
                    <span className="font-bold text-[#1F1B16] truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-[#1F1B16] shrink-0">
                    R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {adicText && (
                  <p className="text-[11px] text-[#6B6157] pl-7 mt-0.5">+ {adicText}</p>
                )}
                {item.notes && (
                  <p className="text-[11px] text-[#9C9188] italic pl-7 mt-0.5">Obs: {item.notes}</p>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-xs text-[#9C9188] italic">Itens indisponíveis</p>
        )}
      </div>

      {/* Linha Sutil de Resumo */}
      <div className="pt-2 text-xs text-[#6B6157] font-medium">
        Pagamento: {paymentLabel} • Entrega: {freteText}
      </div>

      {/* Toque para Acompanhar */}
      <div className="mt-3 pt-2.5 border-t border-[#F5F2ED] flex items-center justify-between text-xs font-bold text-[#B45309]">
        <span>{awaitingPix ? "Ver código e pagar Pix" : "Acompanhar detalhes do pedido"}</span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  )
}

// ─── Card de Histórico Concluído (Design Rico iFood) ──────────────────────────
function CompletedOrderCard({
  order,
  onDetails,
  onOpenFeedback,
  feedbackRating,
  onReorder,
  onHelp,
}: {
  order: Order
  onDetails: (id: string) => void
  onOpenFeedback: (order: Order, star: number) => void
  feedbackRating?: number
  onReorder: (order: Order) => void
  onHelp: (order: Order) => void
}) {
  const isCancelled = order.status === "cancelled"
  const num = String(order.orderNumber || order.id.slice(-4).toUpperCase())
  const deliveryTypeLabel = order.deliveryType === "pickup" ? "Retirada" : "Delivery"
  const paymentLabel =
    order.paymentMethod === "pix"
      ? "Pix"
      : order.paymentMethod?.toLowerCase?.().includes("cart")
      ? "Cartão"
      : "Dinheiro"

  const freteText =
    order.deliveryType === "pickup"
      ? "Grátis"
      : order.metadata?.deliveryFee != null
      ? Number(order.metadata.deliveryFee) === 0
        ? "Grátis"
        : `R$ ${Number(order.metadata.deliveryFee).toFixed(2).replace(".", ",")}`
      : "Grátis"

  const formattedTime = useMemo(() => {
    if (!order.createdAt) return ""
    return new Date(order.createdAt).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [order.createdAt])

  return (
    <div
      onClick={() => onDetails(order.id)}
      className="bg-white rounded-2xl border border-[#ECE7E0] p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer select-none"
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F5F2ED]">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Batata Top"
            className="w-10 h-10 rounded-xl object-contain shrink-0"
          />
          <div>
            <h3 className="text-sm font-extrabold text-[#1F1B16] leading-tight">Batata Top</h3>
            <p className="text-xs font-semibold text-[#6B6157]">
              Pedido #{num} • {deliveryTypeLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#1F1B16]">
            R$ {order.total.toFixed(2).replace(".", ",")}
          </span>
          <ChevronRight className="w-4 h-4 text-[#9C9188]" />
        </div>
      </div>

      {/* Faixa de Status */}
      <div className="mt-3">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
            isCancelled ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#DCFCE7] text-[#16A34A]"
          }`}
        >
          {isCancelled ? (
            <XCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
          )}
          <span className="truncate">
            {isCancelled ? "Pedido cancelado" : `Pedido concluído às ${formattedTime}`}
          </span>
        </div>
      </div>

      {/* Lista de Itens Rica dentro do Card */}
      <div className="mt-3 py-2.5 space-y-2 border-y border-[#F5F2ED]">
        {order.items && order.items.length > 0 ? (
          order.items.map((item: any, idx: number) => {
            const adicText = (item.adicionais || [])
              .map((a: any) => (typeof a === "string" ? a : a?.name || a?.nome))
              .filter(Boolean)
              .join(", ")

            return (
              <div key={idx} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-[#F7F4EF] text-[#6B6157] text-[11px] font-black flex items-center justify-center shrink-0">
                      {item.quantity}
                    </span>
                    <span className="font-bold text-[#1F1B16] truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-[#1F1B16] shrink-0">
                    R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {adicText && (
                  <p className="text-[11px] text-[#6B6157] pl-7 mt-0.5">+ {adicText}</p>
                )}
                {item.notes && (
                  <p className="text-[11px] text-[#9C9188] italic pl-7 mt-0.5">Obs: {item.notes}</p>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-xs text-[#9C9188] italic">Itens indisponíveis</p>
        )}
      </div>

      {/* Linha Sutil de Resumo */}
      <div className="pt-2 text-xs text-[#6B6157] font-medium">
        Pagamento: {paymentLabel} • Entrega: {freteText}
      </div>

      {/* Faixa de Avaliação se Entregue */}
      {!isCancelled && (
        <div className="mt-3 pt-2.5 border-t border-[#F5F2ED]">
          {feedbackRating ? (
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#6B6157]">Avaliação enviada</span>
              <div className="flex items-center gap-1 bg-[#FEF8EC] border border-[#E3A008]/40 px-2 py-0.5 rounded-full text-[#A16207] font-bold">
                <Star className="w-3.5 h-3.5 fill-[#FFB800] text-[#FFB800]" />
                <span>{feedbackRating}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1F1B16]">Avalie seu pedido</span>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => onOpenFeedback(order, star)}
                    className="p-1 hover:scale-125 transition-transform text-[#FFB800]"
                    aria-label={`Avaliar ${star} estrelas`}
                  >
                    <Star className="w-4 h-4 text-[#FFB800]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rodapé Duplo */}
      <div className="mt-3 pt-3 border-t border-[#F5F2ED] flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onHelp(order)
          }}
          className="px-4 py-2 rounded-xl border border-[#ECE7E0] hover:bg-gray-50 active:scale-95 text-xs font-bold text-[#1F1B16] transition-all flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
          <span>Ajuda</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onReorder(order)
          }}
          className="px-4 py-2 rounded-xl bg-[#FEF8EC] border border-[#E3A008]/40 hover:bg-[#E3A008] hover:text-white active:scale-95 text-xs font-extrabold text-[#A16207] transition-all flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Pedir novamente</span>
        </button>
      </div>
    </div>
  )
}

// ─── Tela Principal de Pedidos ────────────────────────────────────────────────
export default function PedidosPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { addItem, clearCart } = useCart()

  const [orders, setOrders] = useState<Order[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, number>>({})

  // Modais de Feedback
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<Order | null>(null)
  const [feedbackInitialRating, setFeedbackInitialRating] = useState(5)

  // Carrega feedbacks do usuário
  const fetchFeedbacks = useCallback(async (uid: string) => {
    if (!uid) return
    try {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from("feedbacks")
        .select("order_id, rating")
        .eq("user_id", uid)

      const map: Record<string, number> = {}
      if (data) {
        data.forEach((fb: any) => {
          if (fb.order_id) map[fb.order_id] = fb.rating
        })
      }
      // Mescla com localStorage para compatibilidade imediata
      try {
        const local = JSON.parse(localStorage.getItem("evaluated-orders") || "[]")
        local.forEach((oid: string) => {
          if (!map[oid]) map[oid] = 5
        })
      } catch {}
      setFeedbackMap(map)
    } catch {}
  }, [])

  // Busca lista de pedidos
  const fetchOrders = useCallback(
    async (uid: string, { silent = false } = {}) => {
      if (!uid) {
        setOrders([])
        setInitialLoading(false)
        return
      }
      if (!silent && orders.length === 0) {
        setInitialLoading(true)
      }
      try {
        const userOrders = await ordersManager.getUserOrders(uid)
        setOrders(userOrders)
        await fetchFeedbacks(uid)
      } catch (err) {
        console.error("Erro ao carregar pedidos:", err)
      } finally {
        setInitialLoading(false)
      }
    },
    [fetchFeedbacks, orders.length]
  )

  const fetchOrdersRef = useRef(fetchOrders)
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders
  }, [fetchOrders])

  // Assinatura Realtime + Polling 30s
  useEffect(() => {
    if (!user?.id) {
      if (!authLoading) setInitialLoading(false)
      return
    }

    const uid = user.id
    fetchOrdersRef.current(uid)

    const supabase = getSupabaseBrowserClient()
    const channelName = `orders-list-${uid}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          fetchOrdersRef.current(uid, { silent: true })
        }
      )
      .subscribe()

    // Polling a cada 30 segundos
    const pollInterval = setInterval(() => {
      fetchOrdersRef.current(uid, { silent: true })
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [user?.id, authLoading])

  // Ações dos cards
  const handleDetails = (id: string) => {
    router.push(`/pedidos/${id}`)
  }

  const handleOpenFeedback = (order: Order, star: number) => {
    setFeedbackInitialRating(star)
    setFeedbackModalOrder(order)
  }

  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      router.push("/cardapio")
      return
    }

    clearCart()
    order.items.forEach((item: any) => {
      addItem({
        id: String(item.product_id || item.id || `reorder-${Date.now()}-${Math.random()}`),
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

  const handleHelp = (order: Order) => {
    const num = order.orderNumber || order.id.slice(-4).toUpperCase()
    const msg = `Olá! Preciso de ajuda com meu pedido #${num}.`
    window.open(`https://wa.me/5514997361015?text=${encodeURIComponent(msg)}`, "_blank")
  }

  // Divisão em pedidos ativos e anteriores
  const activeOrders = useMemo(() => {
    return orders.filter((o) =>
      ["awaiting_payment", "pending", "confirmed", "preparing", "preparo", "ready", "out_for_delivery"].includes(
        o.status
      )
    )
  }, [orders])

  const completedOrders = useMemo(() => {
    return orders.filter((o) => ["delivered", "cancelled"].includes(o.status))
  }, [orders])

  if (authLoading || initialLoading) {
    return <PedidosSkeleton />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EF]">
      <MinimalHeader title="Pedidos" />

      <main className="flex-1 pb-24 lg:pb-12">
        <div className="container mx-auto px-4 max-w-2xl py-5">
          {!user || orders.length === 0 ? (
            /* Estado Vazio Idêntico ao App Mobile */
            <div className="flex flex-col items-center justify-center py-12 lg:py-20 text-center">
              <img
                src="/assets/batatadormindo.png"
                alt="Poxa, você não tem nenhum pedido"
                className="w-48 h-48 object-contain mx-auto mb-4"
              />
              <h2 className="text-xl font-black text-[#1F1B16] text-center mb-2">
                Poxa, você não tem nenhum pedido
              </h2>
              <p className="text-sm text-[#6B6157] text-center max-w-sm mb-6 font-medium">
                Seus pedidos vão aparecer aqui quando você fizer. Que tal aproveitar as ofertas pra pedir agora?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => router.push("/cardapio")}
                  className="w-full sm:w-auto bg-[#E3A008] hover:bg-[#B5860A] text-white font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-md active:scale-95"
                >
                  Fazer pedido
                </button>
                {!user && (
                  <button
                    type="button"
                    onClick={() => router.push("/login?redirect=/pedidos")}
                    className="w-full sm:w-auto border border-[#E3A008] text-[#E3A008] hover:bg-[#E3A008]/10 font-extrabold px-6 py-3.5 rounded-xl transition-all"
                  >
                    Entrar na conta
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seção Em Andamento */}
              {activeOrders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-black text-[#6B6157] uppercase tracking-wider px-1">
                    Em andamento ({activeOrders.length})
                  </h2>
                  <div className="space-y-3.5">
                    {activeOrders.map((order) => (
                      <ActiveOrderCard
                        key={order.id}
                        order={order}
                        onDetails={handleDetails}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Seção Pedidos Anteriores */}
              {completedOrders.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-black text-[#6B6157] uppercase tracking-wider px-1">
                    Anteriores ({completedOrders.length})
                  </h2>
                  <div className="space-y-3.5">
                    {completedOrders.map((order) => (
                      <CompletedOrderCard
                        key={order.id}
                        order={order}
                        onDetails={handleDetails}
                        onOpenFeedback={handleOpenFeedback}
                        feedbackRating={feedbackMap[order.id]}
                        onReorder={handleReorder}
                        onHelp={handleHelp}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <OrderSummary />

      {/* Modal de Avaliação com estrela pré-selecionada */}
      {feedbackModalOrder && (
        <FeedbackModal
          orderId={feedbackModalOrder.id}
          orderNumber={String(
            feedbackModalOrder.orderNumber || feedbackModalOrder.id.slice(-4).toUpperCase()
          )}
          initialRating={feedbackInitialRating}
          onClose={() => setFeedbackModalOrder(null)}
          onSuccess={() => {
            if (user?.id) fetchFeedbacks(user.id)
          }}
        />
      )}
    </div>
  )
}
