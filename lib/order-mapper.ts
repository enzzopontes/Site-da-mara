import type { Order } from "./orders-manager"

function safeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null
  const d = new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeAdicionais(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a: unknown) => {
      if (typeof a === "string") {
        const trimmed = a.trim()
        if (!trimmed) return null
        return { id: undefined, name: trimmed, price: 0, quantity: 1 }
      }
      if (a && typeof a === "object") {
        const rawName = (a as any).name ?? (a as any).nome
        const name = typeof rawName === "string" ? rawName.trim() : ""
        if (!name) return null
        const price = Number((a as any).price ?? (a as any).preco ?? 0)
        const quantity = Number((a as any).quantity ?? (a as any).quantidade ?? 1)
        return {
          id: (a as any).id,
          name,
          price: Number.isFinite(price) ? price : 0,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        }
      }
      return null
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)
}

function normalizeItems(rawItems: unknown) {
  if (!Array.isArray(rawItems)) return []
  return rawItems
    .filter((item: any) => item && typeof item === "object")
    .map((item: any) => {
      const rawName = item.product_name ?? item.name
      const rawNotes = item.notes ?? item.observacoes
      const rawPasta = item.pasta_type ?? item.pastaType
      return {
        id: item.product_id ?? item.id,
        name: typeof rawName === "string" ? rawName : "",
        quantity: Number(item.quantity) || 1,
        price: Number(item.product_price ?? item.price) || 0,
        adicionais: normalizeAdicionais(item.adicionais),
        pastaType: typeof rawPasta === "string" && rawPasta.trim() ? rawPasta : null,
        notes: typeof rawNotes === "string" && rawNotes.trim() ? rawNotes : null,
      }
    })
}

export function mapOrderData(rawOrder: any, rawItems: any[] = []): Order {
  const o: any = rawOrder && typeof rawOrder === "object" ? rawOrder : {}
  let finalItems: any[] = normalizeItems(rawItems)
  if (finalItems.length === 0) {
    if (Array.isArray(o.order_items) && o.order_items.length > 0) {
      finalItems = normalizeItems(o.order_items)
    } else if (Array.isArray(o.metadata?.items) && o.metadata.items.length > 0) {
      finalItems = normalizeItems(o.metadata.items)
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
    discountAmount: Number(o.discount_amount) || 0,
    couponCode: o.coupon_code,
    user_id: o.user_id,
    metadata: o.metadata
  }
}
