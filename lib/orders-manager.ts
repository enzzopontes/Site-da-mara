import { getSupabaseBrowserClient } from "./supabase/client"
import { validateOrder } from "./validation"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Order {
  id: string
  orderNumber?: number
  customerName: string
  customerPhone: string
  items: any[]
  total: number
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled" | "awaiting_payment" | "confirmed" | "preparo" | "out_for_delivery"
  paymentMethod: string
  deliveryType: "delivery" | "pickup" | "retirada"
  address: string
  neighborhood?: string
  complement?: string
  deliveryLat?: number | null
  deliveryLng?: number | null
  createdAt: Date
  completedAt?: Date
  statusUpdatedAt?: Date
  notes?: string
  discountAmount?: number
  couponCode?: string | null
  user_id?: string | null
  metadata?: any
}

export interface DailySales {
  date: string
  total: number
  count: number
}

class OrdersManager {
  private get supabase() {
    return getSupabaseBrowserClient()
  }

  async createOrder(order: any): Promise<Order> {
    const orderCheck = validateOrder(order)
    if (!orderCheck.isValid) {
      throw new Error(orderCheck.error || "Dados do pedido inválidos")
    }
    const p_items = (order.items || []).map((item: any) => {
      const rawId = String(item.product_id || item.id || "").trim()
      const productId = rawId.length >= 36 ? rawId.slice(0, 36) : rawId
      if (!UUID_REGEX.test(productId)) {
        const label = item.name || item.product_name || rawId || "sem identificação"
        throw new Error(`Produto inválido no carrinho (${label}). Remova o item e adicione novamente.`)
      }

      const rawQty = Number(item.quantity ?? item.quantidade ?? 1)
      const quantity = Math.max(1, Math.min(99, Math.floor(Number.isNaN(rawQty) ? 1 : rawQty)))

      const rawNotes = String(item.notes || item.observacoes || "").trim()
      const notes = rawNotes ? rawNotes.slice(0, 300) : null
      const pastaType = item.pastaType || item.pasta_type || null

      const adicionaisMap = new Map<string, { id?: string; name?: string; quantity: number }>()
      if (Array.isArray(item.adicionais)) {
        for (const adic of item.adicionais) {
          if (!adic || typeof adic !== "object") continue
          const rawAdicQty = Number(adic.quantity ?? adic.quantidade ?? 1)
          const adicQty = Math.max(
            1,
            Math.min(99, Math.floor(Number.isNaN(rawAdicQty) ? 1 : rawAdicQty))
          )
          const rawAdicId = String(adic.id || "").trim()
          const adicId = rawAdicId.length >= 36 ? rawAdicId.slice(0, 36) : rawAdicId
          const isValidId = UUID_REGEX.test(adicId)

          if (isValidId) {
            const key = `id:${adicId.toLowerCase()}`
            const existing = adicionaisMap.get(key)
            if (existing) {
              existing.quantity = Math.max(1, Math.min(99, existing.quantity + adicQty))
            } else {
              adicionaisMap.set(key, { id: adicId, quantity: adicQty })
            }
          } else if (adic.name || adic.nome) {
            const adicName = String(adic.name || adic.nome).trim()
            if (!adicName) continue
            const key = `name:${adicName.toUpperCase()}`
            const existing = adicionaisMap.get(key)
            if (existing) {
              existing.quantity = Math.max(1, Math.min(99, existing.quantity + adicQty))
            } else {
              adicionaisMap.set(key, { name: adicName, quantity: adicQty })
            }
          }
        }
      }

      return {
        product_id: productId,
        quantity,
        notes,
        pasta_type: pastaType,
        adicionais: Array.from(adicionaisMap.values()),
      }
    })

    const { items: _ignoredItems, ...cleanMetadata } = order.metadata || {}

    const sb = this.supabase
    const { data: rpcData, error: rpcError } = await sb.rpc('create_order', {
      p_customer_name: order.customerName || "Cliente",
      p_customer_phone: order.customerPhone || "Não informado",
      p_customer_address: order.customerAddress || "",
      p_customer_neighborhood: order.customerNeighborhood || "",
      p_customer_complement: order.customerComplement || "",
      p_delivery_type: order.deliveryType || "delivery",
      p_payment_method: order.paymentMethod || "dinheiro",
      p_payment_online: Boolean(order.paymentOnline),
      p_coupon_code: order.couponCode || null,
      p_notes: order.notes || null,
      p_wants_cutlery: order.wantsCutlery ?? false,
      p_metadata: cleanMetadata,
      p_items: p_items,
    })

    if (rpcError) throw new Error(rpcError.message)

    return {
      id: rpcData.order_id,
      orderNumber: rpcData.order_number,
      customerName: order.customerName || "Cliente",
      customerPhone: order.customerPhone || "",
      items: order.items || [],
      total: Number(rpcData.total_amount),
      status: rpcData.status as any,
      paymentMethod: order.paymentMethod || "dinheiro",
      deliveryType: order.deliveryType || "delivery",
      address: order.customerAddress || "",
      neighborhood: order.customerNeighborhood || "",
      complement: order.customerComplement || "",
      deliveryLat: cleanMetadata.delivery_lat ?? null,
      deliveryLng: cleanMetadata.delivery_lng ?? null,
      createdAt: new Date(),
      discountAmount: Number(rpcData.discount_amount),
      couponCode: order.couponCode || null,
    }
  }

  private mapOrderData(o: any, items: any[] = []): Order {
    let finalItems = items;
    if (!finalItems || finalItems.length === 0) {
      if (o.order_items && o.order_items.length > 0) {
        finalItems = o.order_items.map((item: any) => ({
          id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: Number(item.product_price),
          adicionais: (item.adicionais || []).map((a: any) => ({
            id: a.id,
            name: a.name || a.nome,
            price: Number(a.price ?? a.preco ?? 0),
            quantity: Number(a.quantity || 1),
          })),
          pastaType: item.pasta_type || null,
          notes: item.notes || null,
        }))
      } else if (o.metadata?.items && o.metadata.items.length > 0) {
        finalItems = o.metadata.items.map((item: any) => ({
          id: item.product_id || item.id,
          name: item.product_name || item.name,
          quantity: item.quantity,
          price: Number(item.product_price || item.price),
          adicionais: (item.adicionais || []).map((a: any) => ({
            id: a.id,
            name: a.name || a.nome,
            price: Number(a.price ?? a.preco ?? 0),
            quantity: Number(a.quantity || 1),
          })),
          pastaType: item.pastaType || null,
          notes: item.notes || item.observacoes || null,
        }))
      }
    }

    return {
      id: o.id,
      orderNumber: o.order_number || 0,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      items: finalItems,
      total: Number(o.total_amount),
      status: o.status as any,
      paymentMethod: o.payment_method,
      deliveryType: o.delivery_type || "delivery",
      address: o.customer_address,
      neighborhood: o.customer_neighborhood || "",
      complement: o.customer_complement || "",
      deliveryLat: o.delivery_lat ?? o.metadata?.delivery_lat ?? null,
      deliveryLng: o.delivery_lng ?? o.metadata?.delivery_lng ?? null,
      createdAt: new Date(o.created_at),
      completedAt: o.updated_at ? new Date(o.updated_at) : undefined,
      statusUpdatedAt: o.metadata?.statusUpdatedAt ? new Date(o.metadata.statusUpdatedAt) : (o.updated_at ? new Date(o.updated_at) : undefined),
      notes: o.notes,
      discountAmount: Number(o.discount_amount),
      couponCode: o.coupon_code,
      user_id: o.user_id,
      metadata: o.metadata
    }
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const sb = this.supabase
      const { data, error } = await sb
        .from("orders")
        .select(`*, order_items (*)`)
        .eq("id", orderId)
        .maybeSingle()
      if (error || !data) return null
      return this.mapOrderData(data)
    } catch (err) {
      console.error("[OrdersManager] getOrderById erro:", err)
      return null
    }
  }

  async getTodayOrders(): Promise<Order[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sb = this.supabase
    const { data } = await sb
      .from("orders")
      .select(`*, order_items (*)`)
      .gte("created_at", today.toISOString())
      .neq("status", "awaiting_payment")
      .order("created_at", { ascending: false })
    return data?.map((o: any) => this.mapOrderData(o)) || []
  }

  async getActiveOrders(): Promise<Order[]> {
    const sb = this.supabase
    const { data } = await sb
      .from("orders")
      .select(`*, order_items (*)`)
      .in("status", ["pending", "preparing", "ready", "out_for_delivery"])
      .order("created_at", { ascending: false })
    return data?.map((o: any) => this.mapOrderData(o)) || []
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    const sb = this.supabase
    const { data } = await sb
      .from("orders")
      .select(`*, order_items (*)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    return data?.map((o: any) => this.mapOrderData(o)) || []
  }

  async getOrdersByDate(dateStr: string): Promise<Order[]> {
    const start = new Date(dateStr + 'T00:00:00')
    const end = new Date(dateStr + 'T23:59:59')
    const sb = this.supabase
    const { data } = await sb
      .from("orders")
      .select(`*, order_items (*)`)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .neq("status", "awaiting_payment")
      .order("created_at", { ascending: false })
    return data?.map((o: any) => this.mapOrderData(o)) || []
  }

  async getSalesHistory(): Promise<DailySales[]> {
    const sb = this.supabase
    const { data } = await sb
      .from("orders")
      .select("created_at, total_amount, status")
      .eq("status", "delivered")
      .neq("status", "awaiting_payment")
      .order("created_at", { ascending: false })

    const history: Record<string, DailySales> = {}
    data?.forEach((o: any) => {
      const date = new Date(o.created_at).toLocaleDateString("en-CA", {
        timeZone: "America/Sao_Paulo",
      })
      if (!history[date]) history[date] = { date, total: 0, count: 0 }
      history[date].total += Number(o.total_amount)
      history[date].count += 1
    })
    return Object.values(history)
  }

  async getTodayStats() {
    const orders = await this.getTodayOrders()
    const completedOrders = orders.filter((o) => o.status === "delivered")
    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      preparingOrders: orders.filter((o) => o.status === "preparing").length,
      completedOrders: completedOrders.length,
      totalSales: completedOrders.reduce((sum, o) => sum + o.total, 0),
    }
  }

  async updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
    const sb = this.supabase
    const { data: existingOrder, error: readErr } = await sb
      .from("orders")
      .select("metadata, user_id, created_at, coupon_code")
      .eq("id", orderId)
      .maybeSingle()

    if (readErr) {
      throw new Error(readErr.message || "Erro ao consultar pedido antes da atualização.")
    }

    const existingMetadata = existingOrder?.metadata || {}
    const { error: updateErr } = await sb
      .from("orders")
      .update({
        status,
        metadata: { ...existingMetadata, statusUpdatedAt: new Date().toISOString() },
      })
      .eq("id", orderId)

    if (updateErr) {
      throw new Error(updateErr.message || "Não foi possível atualizar o status do pedido.")
    }

    // NEW-13 FIX: Ao cancelar pedido pelo admin, estorna uso de cupom via API server-side
    if (status === "cancelled" && existingOrder?.coupon_code) {
      try {
        await fetch("/api/admin/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "refundOrderCoupon", orderId }),
        })
      } catch (err) {
        console.warn("[OrdersManager] Falha ao estornar cupom no cancelamento:", err)
      }
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    const sb = this.supabase
    const { error: rpcError } = await sb.rpc('delete_order_admin', { p_order_id: orderId })
    if (!rpcError) return

    if (rpcError.message?.includes("Acesso negado")) {
      throw new Error(rpcError.message)
    }

    console.warn("RPC delete_order_admin indisponível, tentando exclusão direta:", rpcError.message)

    // Deleta vínculos de cupons antes de deletar o pedido para evitar violação de chave estrangeira
    try {
      const { error: couponUsesError } = await sb.from("user_coupon_uses").delete().eq("order_id", orderId)
      if (couponUsesError) console.warn("Aviso ao deletar user_coupon_uses:", couponUsesError)
    } catch (e) {
      console.warn("Exceção ao deletar user_coupon_uses:", e)
    }

    const { error: itemsError } = await sb.from("order_items").delete().eq("order_id", orderId)
    if (itemsError) console.warn("Aviso ao deletar order_items:", itemsError)

    const { data: deletedOrders, error: orderError } = await sb
      .from("orders")
      .delete()
      .eq("id", orderId)
      .select("id")

    if (orderError) {
      throw new Error(orderError.message)
    }

    if (!deletedOrders || deletedOrders.length === 0) {
      throw new Error(
        rpcError.message ||
        "Permissão insuficiente ou script 018 não executado no Supabase."
      )
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    const sb = this.supabase
    const { error } = await sb.rpc('cancel_order_user', {
      p_order_id: orderId,
      p_cancel_reason: null,
    })
    if (error) throw new Error(error.message)
  }
}

export const ordersManager = new OrdersManager()
