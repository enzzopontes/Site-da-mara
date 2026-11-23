import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { authenticateRequestUser } from "@/lib/supabase/route-auth"
import { isSecureAdminCheck } from "@/lib/security-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FALLBACK_ADMIN_EMAILS = "enzzobaraldo2008@gmail.com,maraysis9010@gmail.com"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function requireAdminUser(req: NextRequest, service: NonNullable<ReturnType<typeof getServiceClient>>) {
  const user = await authenticateRequestUser(req, service)
  if (!user) return { ok: false as const, status: 401, error: "Sessão inválida. Faça login novamente." }

  const emails =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    FALLBACK_ADMIN_EMAILS
  if (isSecureAdminCheck(user, emails)) return { ok: true as const, user }

  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role === "admin") return { ok: true as const, user }

  return { ok: false as const, status: 403, error: "Acesso negado: apenas administradores." }
}

const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/Products/"
const SAFE_RELATIVE_IMAGE_REGEX = /^\/api\/images\/[a-zA-Z0-9._-]+$/
const FORBIDDEN_RAW_URL_CHARS_REGEX = /[\s\u0000-\u001F\u007F\\]/
const FORBIDDEN_DECODED_PATH_CHARS_REGEX = /[\u0000-\u001F\u007F\\]/

const UrlSchema = z
  .string()
  .min(1, "URL obrigatória.")
  .max(2048, "URL excede o limite de 2048 caracteres.")

const MigrateWebpRefsSchema = z
  .object({
    oldUrl: UrlSchema,
    newUrl: UrlSchema,
  })
  .refine((data) => data.oldUrl !== data.newUrl, {
    message: "oldUrl e newUrl devem ser diferentes.",
    path: ["newUrl"],
  })

function getAllowedSupabaseOrigin(): string | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!rawUrl) return null
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    return parsed.origin
  } catch {
    return null
  }
}

function validateAllowedImageUrl(
  value: string,
  allowedOrigin: string,
  options: { fieldName: "oldUrl" | "newUrl"; requireWebpForStorage: boolean }
): { ok: true } | { ok: false; error: string } {
  const { fieldName, requireWebpForStorage } = options

  if (
    !value ||
    value.includes("..") ||
    FORBIDDEN_RAW_URL_CHARS_REGEX.test(value)
  ) {
    return {
      ok: false,
      error: `${fieldName} inválida: contém caracteres ou sequência de caminho não permitidos.`,
    }
  }

  if (value.startsWith("/")) {
    if (!SAFE_RELATIVE_IMAGE_REGEX.test(value)) {
      return {
        ok: false,
        error: `${fieldName} relativa não permitida. Use apenas /api/images/<id>.`,
      }
    }
    return { ok: true }
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return {
      ok: false,
      error: `${fieldName} não é uma URL válida.`,
    }
  }

  if (parsed.username !== "" || parsed.password !== "") {
    return {
      ok: false,
      error: `${fieldName} não pode conter credenciais na URL.`,
    }
  }

  if (parsed.origin !== allowedOrigin) {
    return {
      ok: false,
      error: `${fieldName} pertence a uma origem não permitida.`,
    }
  }

  let decodedPathname: string
  try {
    decodedPathname = decodeURIComponent(parsed.pathname)
  } catch {
    return {
      ok: false,
      error: `${fieldName} contém codificação de caminho inválida.`,
    }
  }

  if (
    decodedPathname.includes("..") ||
    FORBIDDEN_DECODED_PATH_CHARS_REGEX.test(decodedPathname) ||
    !parsed.pathname.startsWith(STORAGE_PUBLIC_PREFIX) ||
    !decodedPathname.startsWith(STORAGE_PUBLIC_PREFIX) ||
    parsed.pathname.length <= STORAGE_PUBLIC_PREFIX.length
  ) {
    return {
      ok: false,
      error: `${fieldName} deve apontar para um arquivo válido no bucket Products.`,
    }
  }

  if (requireWebpForStorage && !parsed.pathname.toLowerCase().endsWith(".webp")) {
    return {
      ok: false,
      error: `${fieldName} no Storage deve terminar com .webp.`,
    }
  }

  return { ok: true }
}

function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205"
}

function replaceExactUrlInJson(
  value: unknown,
  oldUrl: string,
  newUrl: string
): { value: unknown; changed: boolean } {
  if (typeof value === "string") {
    if (value === oldUrl) {
      return { value: newUrl, changed: true }
    }
    return { value, changed: false }
  }

  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const res = replaceExactUrlInJson(item, oldUrl, newUrl)
      if (res.changed) changed = true
      return res.value
    })
    return { value: changed ? next : value, changed }
  }

  if (value !== null && typeof value === "object") {
    let changed = false
    const next: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const res = replaceExactUrlInJson(entry, oldUrl, newUrl)
      if (res.changed) changed = true
      next[key] = res.value
    }
    return { value: changed ? next : value, changed }
  }

  return { value, changed: false }
}

export async function POST(req: NextRequest) {
  try {
    const service = getServiceClient()
    const allowedOrigin = getAllowedSupabaseOrigin()
    if (!service || !allowedOrigin) {
      console.error("[migrate-webp-refs] Configuração de servidor Supabase ausente ou inválida.")
      return NextResponse.json({ ok: false, error: "Erro de configuração do servidor." }, { status: 500 })
    }

    const auth = await requireAdminUser(req, service)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return NextResponse.json({ ok: false, error: "Corpo da requisição inválido." }, { status: 400 })
    }

    const parsed = MigrateWebpRefsSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Requisição inválida." },
        { status: 400 }
      )
    }

    const { oldUrl, newUrl } = parsed.data
    const oldUrlCheck = validateAllowedImageUrl(oldUrl, allowedOrigin, {
      fieldName: "oldUrl",
      requireWebpForStorage: false,
    })
    if (!oldUrlCheck.ok) {
      return NextResponse.json({ ok: false, error: oldUrlCheck.error }, { status: 400 })
    }

    const newUrlCheck = validateAllowedImageUrl(newUrl, allowedOrigin, {
      fieldName: "newUrl",
      requireWebpForStorage: true,
    })
    if (!newUrlCheck.ok) {
      return NextResponse.json({ ok: false, error: newUrlCheck.error }, { status: 400 })
    }

    const now = new Date().toISOString()

    const updatedProductIds: string[] = []
    const previousStoreSettings: Array<{ id: string; setting_value: unknown }> = []
    const updatedBannerIds: string[] = []
    const updatedCouponIds: string[] = []

    try {
      // 1. products
      const { data: updatedProducts, error: productsErr } = await service
        .from("products")
        .update({ image_url: newUrl, updated_at: now })
        .eq("image_url", oldUrl)
        .select("id")

      if (productsErr) {
        throw new Error(`Erro ao atualizar products: ${productsErr.message}`)
      }
      for (const row of updatedProducts ?? []) {
        if (row?.id != null) updatedProductIds.push(String(row.id))
      }

      // 2. store_settings
      const { data: settingsRows, error: settingsReadErr } = await service
        .from("store_settings")
        .select("id, setting_key, setting_value, updated_at")

      if (settingsReadErr) {
        throw new Error(`Erro ao ler store_settings: ${settingsReadErr.message}`)
      }

      for (const row of settingsRows ?? []) {
        const replaced = replaceExactUrlInJson(row.setting_value, oldUrl, newUrl)
        if (!replaced.changed) continue

        let updateQuery = service
          .from("store_settings")
          .update({ setting_value: replaced.value, updated_at: now })
          .eq("id", row.id)

        if (row.updated_at != null) {
          updateQuery = updateQuery.eq("updated_at", row.updated_at)
        }

        const { data: updatedSettingRows, error: settingsUpdateErr } = await updateQuery.select("id")

        if (settingsUpdateErr) {
          throw new Error(`Erro ao atualizar store_settings (${row.setting_key}): ${settingsUpdateErr.message}`)
        }
        if (!updatedSettingRows || updatedSettingRows.length === 0) {
          throw new Error(`Conflito de concorrência ao atualizar store_settings (${row.setting_key}).`)
        }
        previousStoreSettings.push({ id: String(row.id), setting_value: row.setting_value })
      }

      // 3. home_banners (ignora apenas ausência da tabela)
      const { data: updatedBanners, error: bannersErr } = await service
        .from("home_banners")
        .update({ image_url: newUrl })
        .eq("image_url", oldUrl)
        .select("id")

      if (bannersErr) {
        if (!isMissingTableError(bannersErr)) {
          throw new Error(`Erro ao atualizar home_banners: ${bannersErr.message}`)
        }
      } else {
        for (const row of updatedBanners ?? []) {
          if (row?.id != null) updatedBannerIds.push(String(row.id))
        }
      }

      // 4. coupons (ignora apenas ausência da tabela)
      const { data: updatedCoupons, error: couponsErr } = await service
        .from("coupons")
        .update({ banner_image_url: newUrl })
        .eq("banner_image_url", oldUrl)
        .select("id")

      if (couponsErr) {
        if (!isMissingTableError(couponsErr)) {
          throw new Error(`Erro ao atualizar coupons: ${couponsErr.message}`)
        }
      } else {
        for (const row of updatedCoupons ?? []) {
          if (row?.id != null) updatedCouponIds.push(String(row.id))
        }
      }
    } catch (migrationErr: any) {
      console.error("[migrate-webp-refs] Erro ao migrar referências:", migrationErr)
      const rollbackNow = new Date().toISOString()

      if (updatedCouponIds.length > 0) {
        try {
          const { error: rbCouponsErr } = await service
            .from("coupons")
            .update({ banner_image_url: oldUrl })
            .in("id", updatedCouponIds)
            .eq("banner_image_url", newUrl)
          if (rbCouponsErr) {
            console.error("[migrate-webp-refs] Falha no rollback de coupons:", rbCouponsErr)
          }
        } catch (rbErr) {
          console.error("[migrate-webp-refs] Exceção no rollback de coupons:", rbErr)
        }
      }

      if (updatedBannerIds.length > 0) {
        try {
          const { error: rbBannersErr } = await service
            .from("home_banners")
            .update({ image_url: oldUrl })
            .in("id", updatedBannerIds)
            .eq("image_url", newUrl)
          if (rbBannersErr) {
            console.error("[migrate-webp-refs] Falha no rollback de home_banners:", rbBannersErr)
          }
        } catch (rbErr) {
          console.error("[migrate-webp-refs] Exceção no rollback de home_banners:", rbErr)
        }
      }

      for (const prev of previousStoreSettings) {
        try {
          const { error: rbSettingsErr } = await service
            .from("store_settings")
            .update({ setting_value: prev.setting_value, updated_at: rollbackNow })
            .eq("id", prev.id)
          if (rbSettingsErr) {
            console.error(
              `[migrate-webp-refs] Falha no rollback de store_settings (${prev.id}):`,
              rbSettingsErr
            )
          }
        } catch (rbErr) {
          console.error(
            `[migrate-webp-refs] Exceção no rollback de store_settings (${prev.id}):`,
            rbErr
          )
        }
      }

      if (updatedProductIds.length > 0) {
        try {
          const { error: rbProductsErr } = await service
            .from("products")
            .update({ image_url: oldUrl, updated_at: rollbackNow })
            .in("id", updatedProductIds)
            .eq("image_url", newUrl)
          if (rbProductsErr) {
            console.error("[migrate-webp-refs] Falha no rollback de products:", rbProductsErr)
          }
        } catch (rbErr) {
          console.error("[migrate-webp-refs] Exceção no rollback de products:", rbErr)
        }
      }

      return NextResponse.json(
        { ok: false, error: "Erro ao migrar referências de imagem." },
        { status: 500 }
      )
    }

    const products = updatedProductIds.length
    const storeSettings = previousStoreSettings.length
    const homeBanners = updatedBannerIds.length
    const coupons = updatedCouponIds.length
    const total = products + storeSettings + homeBanners + coupons

    return NextResponse.json({
      ok: true,
      updated: {
        products,
        storeSettings,
        homeBanners,
        coupons,
        total,
      },
    })
  } catch (err: any) {
    console.error("[migrate-webp-refs] Erro interno inesperado:", err)
    return NextResponse.json({ ok: false, error: "Erro interno ao processar a solicitação." }, { status: 500 })
  }
}
