import { getSupabaseBrowserClient } from "./supabase/client"
import { storeStatusManager } from "./store-status-manager"

export interface Coupon {
  id: string
  code: string
  discount: number
  type: "percentage" | "fixed"
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  usageCount: number
  maxUsage?: number
  maxUsagePerUser?: number // Novo campo
}

class CouponsManager {
  private supabase = getSupabaseBrowserClient()

  async getCoupons(): Promise<Coupon[]> {
    const { data, error } = await this.supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching coupons:", error.message)
      return []
    }

    return (
      data?.map((c: any) => ({
        id: c.id,
        code: c.code,
        discount: Number(c.discount_value),
        type: c.discount_type as "percentage" | "fixed",
        expiresAt: c.expires_at ? new Date(c.expires_at) : null,
        isActive: c.active,
        createdAt: new Date(c.created_at),
        usageCount: c.current_uses || 0,
        maxUsage: c.max_uses,
        maxUsagePerUser: c.max_uses_per_user,
      })) || []
    )
  }

  async addCoupon(coupon: Omit<Coupon, "id" | "createdAt" | "usageCount">): Promise<Coupon | null> {
    const { data, error } = await this.supabase
      .from("coupons")
      .insert({
        code: coupon.code.toUpperCase(),
        discount_type: coupon.type,
        discount_value: coupon.discount,
        max_uses: coupon.maxUsage || null,
        max_uses_per_user: coupon.maxUsagePerUser || null,
        active: coupon.isActive ?? true,
        expires_at: coupon.expiresAt?.toISOString() || null,
        current_uses: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding coupon:", error.message)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      code: data.code,
      discount: Number(data.discount_value),
      type: data.discount_type as "percentage" | "fixed",
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      isActive: data.active,
      createdAt: new Date(data.created_at),
      usageCount: data.current_uses || 0,
      maxUsage: data.max_uses,
      maxUsagePerUser: data.max_uses_per_user,
    }
  }

  async updateCoupon(id: string, updates: Partial<Omit<Coupon, "id" | "createdAt">>): Promise<boolean> {
    const updateData: any = {}
    if (updates.code) updateData.code = updates.code.toUpperCase()
    if (updates.discount !== undefined) updateData.discount_value = updates.discount
    if (updates.type) updateData.discount_type = updates.type
    if (updates.isActive !== undefined) updateData.active = updates.isActive
    if (updates.maxUsage !== undefined) updateData.max_uses = updates.maxUsage
    if (updates.maxUsagePerUser !== undefined) updateData.max_uses_per_user = updates.maxUsagePerUser
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt?.toISOString() || null

    const { error } = await this.supabase.from("coupons").update(updateData).eq("id", id)

    if (error) {
      console.error("Error updating coupon:", error.message)
      return false
    }

    return true
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("coupons").delete().eq("id", id)
    return !error
  }

  async validateCoupon(code: string, userId?: string): Promise<{ valid: boolean; coupon?: Coupon; message?: string }> {
    // Verifica se há promoção ativa
    const storeStatus = await storeStatusManager.getStatus()
    const hasActivePromo = storeStatus.superPromo?.isActive || storeStatus.itemPromo?.isActive
    
    if (hasActivePromo) {
      return { valid: false, message: "Cupons não podem ser usados durante promoções ativas" }
    }

    const normalizedCode = (code || "").trim().toUpperCase()
    if (!normalizedCode) {
      return { valid: false, message: "Código de cupom inválido" }
    }

    const { data, error } = await this.supabase
      .from("coupons")
      .select("*")
      .eq("code", normalizedCode)
      .eq("active", true)
      .single()

    if (error || !data) {
      return { valid: false, message: "Cupom não encontrado" }
    }

    const coupon: Coupon = {
      id: data.id,
      code: data.code,
      discount: Number(data.discount_value),
      type: data.discount_type as "percentage" | "fixed",
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
      isActive: data.active,
      createdAt: new Date(data.created_at),
      usageCount: data.current_uses || 0,
      maxUsage: data.max_uses,
      maxUsagePerUser: data.max_uses_per_user,
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return { valid: false, message: "Cupom expirado" }
    }

    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return { valid: false, message: "Cupom atingiu o limite global de uso" }
    }

    // Verificar limite por usuário
    if (coupon.maxUsagePerUser && userId) {
      const { count, error: countError } = await this.supabase
        .from("orders")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("coupon_code", coupon.code)
        .neq("status", "cancelled")

      if (!countError && count !== null && count >= coupon.maxUsagePerUser) {
        return { valid: false, message: `Você já usou este cupom o limite de ${coupon.maxUsagePerUser} vez(es)` }
      }
    }

    return { valid: true, coupon }
  }

  async useCoupon(_id: string): Promise<boolean> {
    // No-op: o uso do cupom é contabilizado atomicamente pelo banco via create_order
    return true
  }

  calculateDiscount(total: number, coupon: Coupon): number {
    if (coupon.type === "percentage") {
      return (total * coupon.discount) / 100
    }
    return Math.min(coupon.discount, total)
  }
}

export const couponsManager = new CouponsManager()
