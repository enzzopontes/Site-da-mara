import { getSupabaseBrowserClient } from "./supabase/client"
import { getSupabase } from "./supabase-fix"
import { storeStatusManager } from "./store-status-manager"

export interface Coupon {
  id: string
  code: string
  title?: string
  description?: string
  discount: number
  type: "percentage" | "fixed"
  minOrderValue?: number | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  usageCount: number
  maxUsage?: number
  maxUsagePerUser?: number
  showOnHome?: boolean
  homePriority?: number
  bannerImageUrl?: string | null
  badgeLabel?: string | null
  isBannerHighlight?: boolean
  templateOrigin?: string
  rulesText?: string | null
  showCodeInTitle?: boolean
  restrictedCategories?: string[] | null
}

function mapRowToCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    discount: Number(c.discount_value),
    type: c.discount_type as "percentage" | "fixed",
    minOrderValue: c.min_order_value != null ? Number(c.min_order_value) : null,
    expiresAt: c.expires_at ? new Date(c.expires_at) : null,
    isActive: c.active,
    createdAt: new Date(c.created_at),
    usageCount: c.current_uses || 0,
    maxUsage: c.max_uses,
    maxUsagePerUser: c.max_uses_per_user,
    showOnHome: !!c.show_on_home,
    homePriority: Number(c.home_priority || 0),
    bannerImageUrl: c.banner_image_url || null,
    badgeLabel: c.badge_label || null,
    isBannerHighlight: !!c.is_banner_highlight,
    templateOrigin: c.template_origin || "custom",
    rulesText: c.rules_text || null,
    showCodeInTitle: !!c.show_code_in_title,
    restrictedCategories: Array.isArray(c.restricted_categories) ? c.restricted_categories : [],
  }
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

    return data?.map(mapRowToCoupon) || []
  }

  async getActiveHomeCoupon(): Promise<Coupon | null> {
    try {
      const client = getSupabase()
      const now = new Date().toISOString()

      // Prioridade 1: Cupom marcado explicitamente com show_on_home = true
      const { data, error } = await client
        .from("coupons")
        .select("*")
        .eq("active", true)
        .eq("show_on_home", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("home_priority", { ascending: false })
        .order("discount_value", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        return mapRowToCoupon(data)
      }

      // Fallback: Cupom ativo de maior desconto
      const { data: fallbackData } = await client
        .from("coupons")
        .select("*")
        .eq("active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("discount_value", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fallbackData) {
        return mapRowToCoupon(fallbackData)
      }

      return null
    } catch (err) {
      console.warn("Erro ao buscar cupom ativo da Home:", err)
      return null
    }
  }

  private async syncCouponBannerWithHomeBanners(coupon: Coupon): Promise<void> {
    try {
      const { data: existing } = await this.supabase
        .from("home_banners")
        .select("id")
        .eq("coupon_id", coupon.id)
        .maybeSingle()

      if (coupon.isBannerHighlight && coupon.bannerImageUrl) {
        if (existing?.id) {
          await this.supabase
            .from("home_banners")
            .update({
              image_url: coupon.bannerImageUrl,
              title: coupon.title || coupon.code,
              display_order: coupon.homePriority || 0,
              is_active: coupon.isActive,
            })
            .eq("id", existing.id)
        } else {
          await this.supabase.from("home_banners").insert({
            image_url: coupon.bannerImageUrl,
            title: coupon.title || coupon.code,
            coupon_id: coupon.id,
            display_order: coupon.homePriority || 0,
            is_active: coupon.isActive,
          })
        }
      } else if (existing?.id) {
        await this.supabase
          .from("home_banners")
          .update({ is_active: false })
          .eq("id", existing.id)
      }
    } catch {
      // Silencioso caso home_banners ainda não exista
    }
  }

  async addCoupon(coupon: Omit<Coupon, "id" | "createdAt" | "usageCount">): Promise<Coupon | null> {
    const { data, error } = await this.supabase
      .from("coupons")
      .insert({
        code: coupon.code.toUpperCase(),
        title: coupon.title || null,
        description: coupon.description || null,
        rules_text: coupon.rulesText || null,
        discount_type: coupon.type,
        discount_value: coupon.discount,
        min_order_value: coupon.minOrderValue != null ? coupon.minOrderValue : null,
        restricted_categories:
          coupon.restrictedCategories && coupon.restrictedCategories.length > 0
            ? coupon.restrictedCategories
            : null,
        max_uses: coupon.maxUsage || null,
        max_uses_per_user: coupon.maxUsagePerUser || null,
        active: coupon.isActive ?? true,
        expires_at: coupon.expiresAt?.toISOString() || null,
        show_code_in_title: !!coupon.showCodeInTitle,
        show_on_home: !!coupon.showOnHome,
        home_priority: coupon.homePriority || 0,
        banner_image_url: coupon.bannerImageUrl || null,
        badge_label: coupon.badgeLabel || null,
        is_banner_highlight: !!coupon.isBannerHighlight,
        template_origin: coupon.templateOrigin || "custom",
        current_uses: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding coupon:", error.message)
      return null
    }

    if (!data) return null

    const mapped = mapRowToCoupon(data)
    await this.syncCouponBannerWithHomeBanners(mapped)
    return mapped
  }

  async updateCoupon(id: string, updates: Partial<Omit<Coupon, "id" | "createdAt">>): Promise<boolean> {
    const updateData: any = {}
    if (updates.code) updateData.code = updates.code.toUpperCase()
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.rulesText !== undefined) updateData.rules_text = updates.rulesText
    if (updates.discount !== undefined) updateData.discount_value = updates.discount
    if (updates.type) updateData.discount_type = updates.type
    if (updates.minOrderValue !== undefined) updateData.min_order_value = updates.minOrderValue
    if (updates.restrictedCategories !== undefined) {
      updateData.restricted_categories =
        updates.restrictedCategories && updates.restrictedCategories.length > 0
          ? updates.restrictedCategories
          : null
    }
    if (updates.isActive !== undefined) updateData.active = updates.isActive
    if (updates.maxUsage !== undefined) updateData.max_uses = updates.maxUsage
    if (updates.maxUsagePerUser !== undefined) updateData.max_uses_per_user = updates.maxUsagePerUser
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt?.toISOString() || null
    if (updates.showCodeInTitle !== undefined) updateData.show_code_in_title = updates.showCodeInTitle
    if (updates.showOnHome !== undefined) updateData.show_on_home = updates.showOnHome
    if (updates.homePriority !== undefined) updateData.home_priority = updates.homePriority
    if (updates.bannerImageUrl !== undefined) updateData.banner_image_url = updates.bannerImageUrl
    if (updates.badgeLabel !== undefined) updateData.badge_label = updates.badgeLabel
    if (updates.isBannerHighlight !== undefined) updateData.is_banner_highlight = updates.isBannerHighlight
    if (updates.templateOrigin !== undefined) updateData.template_origin = updates.templateOrigin

    const { data, error } = await this.supabase
      .from("coupons")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle()

    if (error) {
      console.error("Error updating coupon:", error.message)
      return false
    }

    if (data) {
      await this.syncCouponBannerWithHomeBanners(mapRowToCoupon(data))
    }

    return true
  }

  async setSingleHomeCoupon(targetId: string): Promise<boolean> {
    try {
      // Remove destaque de todos os outros e marca o selecionado
      await this.supabase.from("coupons").update({ show_on_home: false }).neq("id", targetId)
      const { error } = await this.supabase.from("coupons").update({ show_on_home: true, home_priority: 10 }).eq("id", targetId)
      return !error
    } catch {
      return false
    }
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("coupons").delete().eq("id", id)
    return !error
  }

  async validateCoupon(code: string, userId?: string): Promise<{ valid: boolean; coupon?: Coupon; message?: string }> {
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

    const coupon = mapRowToCoupon(data)

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return { valid: false, message: "Cupom expirado" }
    }

    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return { valid: false, message: "Cupom atingiu o limite global de uso" }
    }

    if (coupon.maxUsagePerUser && userId) {
      const { count, error: countError } = await this.supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
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
