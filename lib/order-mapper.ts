import type { Order } from "./orders-manager"

function safeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

export function mapOrderData(rawOrder: any, rawItems: any[] = []): Order {
  const o: any = rawOrder && typeof rawOrder === "object" ? rawOrder : {}
  const items = Array.isArray(rawItems) ? rawItems : []
  let finalItems: any[] = items;
  if (finalItems.length === 0) {
    if (Array.isArray(o.order_items) && o.order_items.length > 0) {
      finalItems = o.order_items.map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        quantity: Number(item.quantity) || 1,
        price: Number(item.product_price) || 0,
        adicionais: (Array.isArray(item.adicionais) ? item.adicionais : []).map((a: any) => ({
          id: a.id,
          name: a.name || a.nome,
          price: Number(a.price ?? a.preco ?? 0),
          quantity: Number(a.quantity || 1),
        })),
        pastaType: item.pasta_type || null,
        notes: item.notes || null,
      }))
    } else if (Array.isArray(o.metadata?.items) && o.metadata.items.length > 0) {
      finalItems = o.metadata.items.map((item: any) => ({
        id: item.product_id || item.id,
        name: item.product_name || item.name,
        quantity: Number(item.quantity) || 1,
        price: Number(item.product_price || item.price) || 0,
        adicionais: (Array.isArray(item.adicionais) ? item.adicionais : []).map((a: any) => ({
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
    id: String(o.id ?? ""),
    orderNumber: o.order_number || 0,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    items: finalItems,
    total: Number(o.total_amount) || 0,
    status: o.status as any,
    paymentMethod: o.payment_method,
    deliveryType: o.delivery_type || "delivery",
    address: o.customer_address,
    neighborhood: o.customer_neighborhood || "",
    complement: o.customer_complement || "",
    deliveryLat: o.delivery_lat ?? o.metadata?.delivery_lat ?? null,
    deliveryLng: o.delivery_lng ?? o.metadata?.delivery_lng ?? null,
    createdAt: safeDate(o.created_at) ?? new Date(0),
    completedAt: safeDate(o.updated_at) ?? undefined,
    statusUpdatedAt: safeDate(o.metadata?.statusUpdatedAt) ?? safeDate(o.updated_at) ?? undefined,
    notes: o.notes,
    discountAmount: Number(o.discount_amount),
    couponCode: o.coupon_code,
    user_id: o.user_id,
    metadata: o.metadata
  }
}
