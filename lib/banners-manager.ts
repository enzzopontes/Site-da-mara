import { getSupabaseBrowserClient } from "./supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface LinkedCoupon {
  id: string
  code: string
  title?: string | null
  description?: string | null
  badge_label?: string | null
  discount_value: number
  discount_type: "percentage" | "fixed"
  min_order_value?: number | null
  active: boolean
  expires_at?: string | null
}

export interface HomeBannerItem {
  id: string
  image_url: string
  title: string | null
  display_order: number
  is_active: boolean
  coupon_id?: string | null
  coupon?: LinkedCoupon | null
  created_at?: string
}

/**
 * Validação rigorosa de URLs para prevenir vetores XSS (ex: javascript:, data:text/html)
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  const trimmed = url.trim().toLowerCase()
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  )
}

class BannersManager {
  private supabase = getSupabaseBrowserClient()

  async getActiveBanners(): Promise<HomeBannerItem[]> {
    try {
      const now = new Date().toISOString()

      // 1. Tabela home_banners com join no cupom (padrão principal do app)
      const { data: banners, error: bannersErr } = await this.supabase
        .from("home_banners")
        .select(`
          id,
          image_url,
          title,
          display_order,
          is_active,
          coupon_id,
          created_at,
          coupons (
            id,
            code,
            title,
            description,
            badge_label,
            discount_value,
            discount_type,
            min_order_value,
            active,
            expires_at
          )
        `)
        .eq("is_active", true)
        .order("display_order", { ascending: false })
        .order("created_at", { ascending: false })

      if (!bannersErr && Array.isArray(banners) && banners.length > 0) {
        return banners
          .filter((b: any) => isSafeImageUrl(b.image_url))
          .map((b: any) => ({
            id: b.id,
            image_url: b.image_url,
            title: b.title || b.coupons?.title || null,
            display_order: b.display_order ?? 0,
            is_active: b.is_active,
            coupon_id: b.coupon_id,
            coupon: b.coupons?.active ? b.coupons : null,
            created_at: b.created_at,
          }))
      }

      // 2. Fallback de retrocompatibilidade: coupons com is_banner_highlight
      const { data: couponsData, error: couponsErr } = await this.supabase
        .from("coupons")
        .select("id, code, title, description, banner_image_url, badge_label, discount_value, discount_type, min_order_value, active, expires_at")
        .eq("active", true)
        .eq("is_banner_highlight", true)
        .not("banner_image_url", "is", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("home_priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6)

      if (couponsErr || !couponsData) return []

      return couponsData
        .filter((c: any) => isSafeImageUrl(c.banner_image_url))
        .map((c: any) => ({
          id: `coupon-${c.id}`,
          image_url: c.banner_image_url,
          title: c.title || c.code,
          display_order: 0,
          is_active: c.active,
          coupon_id: c.id,
          coupon: {
            id: c.id,
            code: c.code,
            title: c.title,
            description: c.description,
            badge_label: c.badge_label,
            discount_value: Number(c.discount_value),
            discount_type: c.discount_type,
            min_order_value: c.min_order_value,
            active: c.active,
            expires_at: c.expires_at,
          },
        }))
    } catch (err) {
      console.error("[BannersManager] Erro ao buscar banners:", err)
      return []
    }
  }

  subscribeToBanners(onChange: () => void): RealtimeChannel {
    return this.supabase
      .channel("home_banners_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "home_banners" }, () => onChange())
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, () => onChange())
      .subscribe()
  }

  async getAllBanners(): Promise<HomeBannerItem[]> {
    const { data, error } = await this.supabase
      .from("home_banners")
      .select(`id, image_url, title, display_order, is_active, coupon_id, created_at, coupons (id, code, title, discount_value, discount_type, active)`)
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data || []).map((b: any) => ({ ...b, coupon: b.coupons || null }))
  }

  async createBanner(payload: { image_url: string; title?: string | null; coupon_id?: string | null; display_order?: number; is_active?: boolean }): Promise<void> {
    if (!isSafeImageUrl(payload.image_url)) {
      throw new Error("URL de imagem inválida ou insegura.")
    }
    const { error } = await this.supabase.from("home_banners").insert([payload])
    if (error) throw error
  }

  async updateBanner(id: string, payload: Partial<HomeBannerItem>): Promise<void> {
    if (payload.image_url && !isSafeImageUrl(payload.image_url)) {
      throw new Error("URL de imagem inválida ou insegura.")
    }
    const cleanPayload = { ...payload }
    delete (cleanPayload as any).coupon
    const { error } = await this.supabase.from("home_banners").update(cleanPayload).eq("id", id)
    if (error) throw error
  }

  async deleteBanner(id: string): Promise<void> {
    const { error } = await this.supabase.from("home_banners").delete().eq("id", id)
    if (error) throw error
  }
}

export const bannersManager = new BannersManager()
