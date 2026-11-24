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

export function getRestrictedCategories(coupon: any): string[] {
  const raw = coupon?.restrictedCategories ?? coupon?.restricted_categories
  if (!Array.isArray(raw)) return []
  return raw.map((c) => String(c || "").toLowerCase().trim()).filter(Boolean)
}

function computeEligibleCents(coupon: any, subtotalCents: number, items?: any[]): number {
  const code = String(coupon?.code || "").trim().toUpperCase()
  if (code.startsWith("FIDELIDADE-")) {
    if (!Array.isArray(items) || items.length === 0) return 0
    const batataUnitCents = items
      .filter((item) => {
        const cat = String(item?.category ?? item?.categoria ?? "").toLowerCase().trim()
        return cat === "batata" || cat === "batatas"
      })
      .map((item) => toCents(Number(item?.price ?? item?.product_price ?? 0)))
      .filter((c) => c > 0)
    if (batataUnitCents.length === 0) return 0
    return Math.max(0, Math.min(subtotalCents, Math.min(...batataUnitCents)))
  }

  const restricted = getRestrictedCategories(coupon)
  if (restricted.length === 0 || !Array.isArray(items) || items.length === 0) {
    return subtotalCents
  }
  let sumCents = 0
  for (const item of items) {
    const cat = String(item?.category ?? item?.categoria ?? "").toLowerCase().trim()
    if (!restricted.includes(cat)) continue
    const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1))
    const basePrice = Number(item?.price ?? item?.product_price ?? 0)
    const addons = Array.isArray(item?.adicionais) ? item.adicionais : []
    const addonsSum = addons.reduce(
      (acc: number, a: any) => acc + Number(a?.price ?? a?.preco ?? 0) * Math.max(1, Math.floor(Number(a?.quantity) || 1)),
      0
    )
    sumCents += toCents((basePrice + addonsSum) * qty)
  }
  return Math.max(0, Math.min(subtotalCents, sumCents))
}

export function evaluateCoupon(coupon: any, itemsSubtotal: number, items?: any[]): CouponEvaluation {
  if (!coupon || !coupon.code) {
    return { status: "none", code: null, minOrder: 0, discount: 0, missing: 0, progress: 0 }
  }

  const subtotalCents = Math.max(0, toCents(itemsSubtotal))
  const minCents = toCents(getCouponMinOrder(coupon))
  const eligibleCents = computeEligibleCents(coupon, subtotalCents, items)
  const unlocked = subtotalCents >= minCents && eligibleCents > 0
  const progress = minCents > 0 ? Math.min(1, subtotalCents / minCents) : 1

  return {
    status: unlocked ? "applied" : "pending",
    code: String(coupon.code),
    minOrder: minCents / 100,
    discount: unlocked ? computeDiscountCents(coupon, eligibleCents) / 100 : 0,
    missing: subtotalCents >= minCents ? 0 : (minCents - subtotalCents) / 100,
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
export function resolveCouponForCheckout(
  coupon: any,
  itemsSubtotal: number,
  items?: any[]
): CheckoutCouponResolution {
  const evaluation = evaluateCoupon(coupon, itemsSubtotal, items)
  if (evaluation.status !== "applied") {
    return { couponCode: null, discount: 0, status: evaluation.status }
  }
  return { couponCode: evaluation.code, discount: evaluation.discount, status: "applied" }
}
