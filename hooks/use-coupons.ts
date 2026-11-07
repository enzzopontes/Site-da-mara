"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

export function useCoupons(currentOrderTotal = 0) {
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

      // Mapeamento de contagem de usos do usuário atual por cupom
      const userUsageMap: Record<string, number> = {}
      if (user?.id) {
        try {
          const { data: userOrders } = await supabase
            .from("orders")
            .select("coupon_code")
            .eq("user_id", user.id)
            .neq("status", "cancelled")
            .not("coupon_code", "is", null)

          if (userOrders) {
            for (const o of userOrders) {
              if (o.coupon_code) {
                const cCode = String(o.coupon_code).toUpperCase().trim()
                userUsageMap[cCode] = (userUsageMap[cCode] || 0) + 1
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

      // Validação antecipada de limite de usos (global e por cliente)
      const mappedCoupons = (activeCoupons ?? []).map((c: any) => {
        const code = String(c.code || "").toUpperCase().trim()
        const userUses = userUsageMap[code] || 0
        const isGlobalExhausted = c.max_uses != null && (c.current_uses ?? 0) >= c.max_uses
        const isUserExhausted = c.max_uses_per_user != null && userUses >= c.max_uses_per_user
        const isExhausted = isGlobalExhausted || isUserExhausted
        const exhaustedReason = isGlobalExhausted
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
      const min = Number(coupon?.min_order_value ?? 0)
      const missing = min - currentOrderTotal
      return missing > 0 ? missing : 0
    },
    [currentOrderTotal]
  )

  const validateCoupon = useCallback(
    async (code: string) => {
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

      const userId = user?.id ?? null
      if (userId && coupon.max_uses_per_user != null) {
        try {
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("coupon_code", coupon.code)
            .neq("status", "cancelled")

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

      if (coupon.min_order_value && currentOrderTotal > 0 && currentOrderTotal < coupon.min_order_value) {
        const falta = (coupon.min_order_value - currentOrderTotal).toFixed(2).replace(".", ",")
        return { valid: false, reason: `Faltam R$ ${falta} pra usar este cupom` }
      }

      return { valid: true, coupon: { ...coupon, isExhausted: false } }
    },
    [currentOrderTotal, user?.id, supabase]
  )

  return {
    coupons,
    freeCoupons,
    loading,
    error,
    reload: load,
    validateCoupon,
    getCouponMissingAmount,
  }
}
