import { getSupabaseBrowserClient } from "./supabase/client"

export interface Order {
  id: string
  orderNumber?: number
  customerName: string
  customerPhone: string
  items: any[]
  total: number
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled" | "awaiting_payment"
  paymentMethod: string
  deliveryType: "delivery" | "pickup"
  address: string
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
    const p_items = (order.items || []).map((item: any) => ({
      product_id: String(item.product_id || item.id || '').slice(0, 36),
      quantity: item.quantity || 1,
      notes: item.notes || null,
      pasta_type: item.pastaType || item.pasta_type || null,
      adicionais: (item.adicionais || []).map((a: any) => ({
        id: a.id || undefined,
        name: a.name || a.nome || undefined,
        quantity: a.quantity || 1,
      })),
    }))

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
      p_metadata: order.metadata || {},
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
          adicionais: item.adicionais || [],
          pastaType: item.pasta_type || null // Mapeando o tipo de macarrão
        }))
      } else if (o.metadata?.items && o.metadata.items.length > 0) {
        finalItems = o.metadata.items.map((item: any) => ({
          id: item.product_id || item.id,
          name: item.product_name || item.name,
          quantity: item.quantity,
          price: Number(item.product_price || item.price),
          adicionais: item.adicionais || [],
          pastaType: item.pastaType || null // Mapeando do metadata
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
      .in("status", ["pending", "preparing", "ready"])
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
      const date = new Date(o.created_at).toISOString().split('T')[0]
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
    const { data: existingOrder } = await sb.from("orders").select("metadata").eq("id", orderId).maybeSingle()
    const existingMetadata = existingOrder?.metadata || {}
    await sb.from("orders").update({ 
      status,
      metadata: { ...existingMetadata, statusUpdatedAt: new Date().toISOString() }
    }).eq("id", orderId)
  }

  async deleteOrder(orderId: string): Promise<void> {
    const sb = this.supabase
    await sb.from("order_items").delete().eq("order_id", orderId)
    await sb.from("orders").delete().eq("id", orderId)
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
