"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import {
  evaluateCoupon,
  getCouponMinOrder,
  getRestrictedCategories,
  toCents,
} from "@/lib/coupon-rules"

export function useCoupons(
  currentOrderTotal = 0,
  selectedCouponId?: string | null,
  cartItems?: any[]
) {
  const [coupons, setCoupons] = useState<any[]>([])
  const [freeCoupons, setFreeCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: activeCoupons, error: couponsErr } = await supabase
        .from("coupons")
        .select("*")
        .eq("active", true)
        .order("discount_value", { ascending: false })

      if (couponsErr) {
        setError(couponsErr.message)
        setLoading(false)
        return
      }

      // Mapeamento de contagem de usos do usuário atual por cupom (via user_coupon_uses)
      const userUsageMap: Record<string, number> = {}
      if (user?.id) {
        try {
          const { data: userUses } = await supabase
            .from("user_coupon_uses")
            .select("coupon_id")
            .eq("user_id", user.id)

          if (userUses) {
            for (const u of userUses) {
              if (u.coupon_id) {
                const cId = String(u.coupon_id)
                userUsageMap[cId] = (userUsageMap[cId] || 0) + 1
              }
            }
          }
        } catch {
          // Silencioso em caso de erro na contagem
        }
      }

      let free: any[] = []
      if (user?.id) {
        try {
          const { data: freeData, error: freeErr } = await supabase
            .from("free_coupons")
            .select("*, coupons(*)")
            .eq("user_id", user.id)
            .eq("is_used", false)

          if (!freeErr && freeData) {
            free = freeData
          }
        } catch {
          // Tabela free_coupons opcional
        }
      }

      // Validação antecipada de limite de usos (global e por cliente) e expiração
      const nowMs = Date.now()
      const mappedCoupons = (activeCoupons ?? []).map((c: any) => {
        const couponId = String(c.id || "")
        const userUses = userUsageMap[couponId] || 0
        const isGlobalExhausted = c.max_uses != null && (c.current_uses ?? 0) >= c.max_uses
        const isUserExhausted = c.max_uses_per_user != null && userUses >= c.max_uses_per_user
        const isExpired = c.expires_at ? new Date(c.expires_at).getTime() < nowMs : false
        const isExhausted = isGlobalExhausted || isUserExhausted || isExpired
        const exhaustedReason = isExpired
          ? "Cupom expirado"
          : isGlobalExhausted
          ? "Limite de usos atingido"
          : isUserExhausted
          ? `Você já atingiu o limite de ${c.max_uses_per_user} uso(s) deste cupom`
          : undefined

        return {
          ...c,
          user_uses: userUses,
          isExhausted,
          exhaustedReason,
        }
      })

      setCoupons(mappedCoupons)
      setFreeCoupons(free)
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar cupons")
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    load()
  }, [load])

  const getCouponMissingAmount = useCallback(
    (coupon: any) => {
      const minCents = toCents(getCouponMinOrder(coupon))
      const totalCents = Math.max(0, toCents(currentOrderTotal))
      const missingCents = minCents - totalCents
      return missingCents > 0 ? missingCents / 100 : 0
    },
    [currentOrderTotal]
  )

  // Ordenação inteligente:
  // 1. Cupom atualmente selecionado no topo
  // 2. Cupons LIBERADOS (valor mínimo atingido e não esgotados)
  // 3. Cupons NÃO LIBERADOS que apenas faltam valor (ordenados pelo que falta menos para liberar)
  // 4. Cupons ESGOTADOS / EXPIRADOS no final
  // 5. Desempate sempre pelo maior desconto
  const sortedCoupons = useMemo(() => {
    const totalCents = Math.max(0, toCents(currentOrderTotal))
    return [...coupons].sort((a, b) => {
      const isSelectedA = selectedCouponId && a.id === selectedCouponId
      const isSelectedB = selectedCouponId && b.id === selectedCouponId
      if (isSelectedA && !isSelectedB) return -1
      if (!isSelectedA && isSelectedB) return 1

      const missingA = Math.max(0, toCents(getCouponMinOrder(a)) - totalCents)
      const missingB = Math.max(0, toCents(getCouponMinOrder(b)) - totalCents)

      const isExpiredA = a.expires_at ? new Date(a.expires_at).getTime() < Date.now() : false
      const isExpiredB = b.expires_at ? new Date(b.expires_at).getTime() < Date.now() : false

      const isExhaustedA = Boolean(a.isExhausted) || isExpiredA
      const isExhaustedB = Boolean(b.isExhausted) || isExpiredB

      const isLiberadoA = !isExhaustedA && missingA === 0
      const isLiberadoB = !isExhaustedB && missingB === 0

      // 1. Liberados sempre primeiro
      if (isLiberadoA && !isLiberadoB) return -1
      if (!isLiberadoA && isLiberadoB) return 1

      // 2. Entre não-liberados: cupons que só faltam valor vêm antes de esgotados/expirados
      if (!isLiberadoA && !isLiberadoB) {
        if (!isExhaustedA && isExhaustedB) return -1
        if (isExhaustedA && !isExhaustedB) return 1

        // Se ambos apenas faltam valor, ordenar pelo que está mais perto de liberar (menor valor restante)
        if (!isExhaustedA && !isExhaustedB && missingA !== missingB) {
          return missingA - missingB
        }
      }

      // 3. Desempate por maior desconto
      const valA = Number(a.discount_value ?? 0)
      const valB = Number(b.discount_value ?? 0)
      return valB - valA
    })
  }, [coupons, currentOrderTotal, selectedCouponId])

  const validateCoupon = useCallback(
    async (code: string, cartItemsOverride?: any[]) => {
      const trimmed = code?.trim().toUpperCase()
      if (!trimmed) return { valid: false, reason: "Digite um código de cupom" }

      const { data: coupon, error: fetchErr } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", trimmed)
        .maybeSingle()

      if (fetchErr || !coupon) {
        return { valid: false, reason: "Cupom não encontrado" }
      }
      if (!coupon.active) {
        return { valid: false, reason: "Cupom inativo" }
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { valid: false, reason: "Cupom expirado" }
      }
      if (coupon.max_uses != null && (coupon.current_uses ?? 0) >= coupon.max_uses) {
        return { valid: false, reason: "Limite de usos atingido" }
      }

      const evaluation = evaluateCoupon(coupon, currentOrderTotal)
      if (evaluation.minOrder > 0 && evaluation.missing > 0) {
        const falta = evaluation.missing.toFixed(2).replace(".", ",")
        return { valid: false, reason: `Faltam R$ ${falta} pra usar este cupom` }
      }

      const userId = user?.id ?? null

      // 1. Regra de Primeiro Pedido (Boas-vindas para novos clientes cadastrados)
      if (
        coupon.template_origin === "first_order" ||
        String(coupon.code || "").toUpperCase().startsWith("BEMVINDO")
      ) {
        if (!userId) {
          return { valid: false, reason: "Faça login para usar cupom de 1º pedido" }
        }
        try {
          const { count: priorOrders } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .neq("status", "cancelled")

          if ((priorOrders ?? 0) > 0) {
            return { valid: false, reason: "Válido apenas no seu primeiro pedido" }
          }
        } catch {
          // Ignora caso erro
        }
      }

      // 2. Regra Exclusiva para Clientes Cadastrados / Aniversário
      if (
        coupon.template_origin === "registered_only" ||
        coupon.template_origin === "aniversario"
      ) {
        if (!userId) {
          return { valid: false, reason: "Exclusivo para clientes cadastrados. Faça login!" }
        }
      }

      // 3. Limite por usuário (via user_coupon_uses)
      if (userId && coupon.max_uses_per_user != null) {
        try {
          const { count } = await supabase
            .from("user_coupon_uses")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("coupon_id", coupon.id)

          if ((count ?? 0) >= coupon.max_uses_per_user) {
            return {
              valid: false,
              reason: `Você já atingiu o limite de ${coupon.max_uses_per_user} uso(s) deste cupom`,
            }
          }
        } catch {
          // Ignora caso erro
        }
      }

      // 4. Bloqueio durante promoções ativas da loja
      try {
        const { data: statusRow } = await supabase
          .from("store_settings")
          .select("setting_value")
          .eq("setting_key", "store_status")
          .maybeSingle()

        let settingValue: any = statusRow?.setting_value
        if (typeof settingValue === "string") {
          try {
            settingValue = JSON.parse(settingValue)
          } catch {
            settingValue = null
          }
        }

        if (
          settingValue?.itemPromo?.isActive ||
          settingValue?.superPromo?.isActive ||
          settingValue?.isPromoActive
        ) {
          return {
            valid: false,
            reason: "Cupons não podem ser combinados com promoções ativas.",
          }
        }
      } catch {
        // Ignora caso erro
      }

      // 5. Restrição por categorias elegíveis no carrinho
      const effectiveCartItems = cartItemsOverride ?? cartItems ?? []
      const allowedCategories = getRestrictedCategories(coupon)
      if (
        allowedCategories.length > 0 &&
        Array.isArray(effectiveCartItems) &&
        effectiveCartItems.length > 0
      ) {
        const itemsWithCategory = effectiveCartItems.filter((item) =>
          Boolean(item?.category || item?.categoria)
        )

        if (itemsWithCategory.length > 0) {
          const hasEligibleItem = itemsWithCategory.some((item) => {
            const itemCategory = String(item?.category ?? item?.categoria ?? "")
              .toLowerCase()
              .trim()
            return allowedCategories.includes(itemCategory)
          })
          if (!hasEligibleItem) {
            return {
              valid: false,
              reason: "Cupom válido apenas para categorias específicas.",
            }
          }
        }
      }

      return { valid: true, coupon: { ...coupon, isExhausted: false } }
    },
    [currentOrderTotal, user?.id, supabase, cartItems]
  )

  return {
    coupons: sortedCoupons,
    freeCoupons,
    loading,
    error,
    reload: load,
    validateCoupon,
    getCouponMissingAmount,
  }
}
