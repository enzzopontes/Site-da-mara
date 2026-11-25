import type { Order } from "@/lib/orders-manager"

// ─── Verificador de Pedido em Revisão (Pagamento Parcial) ───────────────────
export function isOrderUnderpaidReview(order: Order): boolean {
  if (!order) return false
  return Boolean(
    (order as any).isUnderpaidReview ||
      (order.metadata?.needs_review && order.metadata?.review_reason === "underpaid") ||
      order.metadata?.review_reason === "underpaid"
  )
}

// ─── Verificador de Pedido Aguardando Pix ──────────────────────────────────
export function isOrderAwaitingPix(order: Order): boolean {
  if (!order) return false
  const underpaidReview = isOrderUnderpaidReview(order)
  const isPaid =
    Boolean(order.metadata?.paid_at) ||
    ["preparing", "preparo", "ready", "out_for_delivery", "delivered"].includes(order.status) ||
    (!underpaidReview &&
      (order.metadata?.mp_payment_status === "approved" ||
        order.metadata?.pix?.status === "approved"))

  if (isPaid || underpaidReview) return false

  const isPixMethod =
    order.paymentMethod === "pix" ||
    order.paymentMethod?.toLowerCase?.() === "pix" ||
    Boolean(order.metadata?.pix) ||
    Boolean(order.metadata?.qr_code) ||
    Boolean(order.metadata?.pix_qr_code)

  return order.status === "awaiting_payment" || (order.status === "pending" && isPixMethod)
}
