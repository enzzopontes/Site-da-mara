/**
 * Fonte única de verdade da regra de valor mínimo de cupom.
 *
 * Base de cálculo: SUBTOTAL BRUTO DOS ITENS (antes de qualquer desconto e
 * sem taxa de entrega). Toda comparação é feita em centavos inteiros para
 * evitar erro de ponto flutuante (ex.: 59.999999 vs 60).
 */

export type CouponEvaluationStatus = "none" | "applied" | "pending"

export interface CouponEvaluation {
  status: CouponEvaluationStatus
  code: string | null
  /** Valor mínimo exigido pelo cupom, em reais (0 = sem mínimo). */
  minOrder: number
  /** Desconto efetivo em reais. Sempre 0 quando pendente. */
  discount: number
  /** Quanto falta em itens para liberar, em reais. 0 quando liberado. */
  missing: number
  /** Progresso 0..1 (subtotal_itens / valor_minimo). */
  progress: number
}

export function toCents(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function getCouponMinOrder(coupon: any): number {
  if (!coupon) return 0
  const raw = coupon.minOrderValue ?? coupon.min_order_value ?? coupon.minOrderVal ?? 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function computeDiscountCents(coupon: any, subtotalCents: number): number {
  const value = Number(coupon?.discount ?? coupon?.discount_value ?? 0)
  if (!Number.isFinite(value) || value <= 0) return 0
  const type = coupon?.type ?? coupon?.discount_type
  if (type === "percentage" || type === "percent") {
    return Math.min(subtotalCents, Math.round((subtotalCents * value) / 100))
  }
  return Math.min(subtotalCents, toCents(value))
}

export function evaluateCoupon(coupon: any, itemsSubtotal: number): CouponEvaluation {
  if (!coupon || !coupon.code) {
    return { status: "none", code: null, minOrder: 0, discount: 0, missing: 0, progress: 0 }
  }

  const subtotalCents = Math.max(0, toCents(itemsSubtotal))
  const minCents = toCents(getCouponMinOrder(coupon))
  const unlocked = subtotalCents >= minCents
  const progress = minCents > 0 ? Math.min(1, subtotalCents / minCents) : 1

  return {
    status: unlocked ? "applied" : "pending",
    code: String(coupon.code),
    minOrder: minCents / 100,
    discount: unlocked ? computeDiscountCents(coupon, subtotalCents) / 100 : 0,
    missing: unlocked ? 0 : (minCents - subtotalCents) / 100,
    progress,
  }
}

export interface CheckoutCouponResolution {
  /** Código a enviar ao backend. null quando não há cupom ou ele está pendente. */
  couponCode: string | null
  discount: number
  status: CouponEvaluationStatus
}

/**
 * Etapa final: cupom pendente é ignorado graciosamente (pedido segue sem
 * desconto e sem enviar o código ao backend), eliminando erro surpresa.
 */
export function resolveCouponForCheckout(coupon: any, itemsSubtotal: number): CheckoutCouponResolution {
  const evaluation = evaluateCoupon(coupon, itemsSubtotal)
  if (evaluation.status !== "applied") {
    return { couponCode: null, discount: 0, status: evaluation.status }
  }
  return { couponCode: evaluation.code, discount: evaluation.discount, status: "applied" }
}
