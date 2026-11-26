"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { isAdminUser } from "@/lib/supabase/admin"
import {
  DEFAULT_CATEGORIES,
  mapCategoryRow,
  type Category,
  type CategoryIconType,
  type CategoryKind,
  type CategoryWithCounts,
  type MenuLayoutZone,
} from "@/lib/categories-db"
import {
  ALLOWED_CATEGORY_ICON_MIME_TYPES,
  MAX_CATEGORY_ICON_BYTES,
  isSafeCategoryHref,
  isSafeIconUrl,
  normalizeLegacyCategorySlug,
  sanitizeCategorySlug,
} from "@/lib/category-icons"
import { CATEGORIES_CACHE_TAG, HOME_GRID_LAYOUT_CACHE_TAG } from "@/lib/categories-server"
import {
  DEFAULT_HOME_GRID_LAYOUT,
  HOME_GRID_LAYOUT_LIMITS,
  HOME_GRID_LAYOUT_SELECT_COLUMNS,
  normalizeHomeGridLayout,
  type HomeGridLayout,
} from "@/lib/home-grid-layout"

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string; productCount?: number }

export interface CategoryFormInput {
  name: string
  slug?: string
  description?: string | null
  kind: CategoryKind
  icon_url?: string | null
  icon_type: CategoryIconType
  fallback_icon: string
  accent_color: string
  badge_text?: string | null
  badge_color?: string | null
  custom_href?: string | null
  is_active: boolean
  show_on_home_bar: boolean
  home_bar_order: number
  show_on_home_featured: boolean
  home_featured_order: number
  home_featured_limit: number
  show_on_menu: boolean
  menu_order: number
  menu_layout_zone: MenuLayoutZone
  allows_addons: boolean
  allows_notes: boolean
  show_ranking: boolean
}

export interface ReorderItemInput {
  id: string
  order: number
  show_on_home_bar?: boolean
  show_on_home_featured?: boolean
  home_featured_limit?: number
  show_on_menu?: boolean
  menu_layout_zone?: MenuLayoutZone
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

const CategoryFormSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(60, "Nome muito longo"),
  slug: z.string().trim().max(48).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  kind: z.enum(["product_category", "home_shortcut"]),
  icon_url: z
    .string()
    .trim()
    .max(1000)
    .refine((val) => !val || isSafeIconUrl(val), "URL do ícone inválida (use caminho relativo / ou https://)")
    .nullable()
    .optional(),
  icon_type: z.enum(["upload", "preset_3d", "lucide"]),
  fallback_icon: z.string().trim().min(1).max(40).default("UtensilsCrossed"),
  accent_color: z.string().regex(HEX_COLOR_REGEX, "Cor de destaque inválida (use HEX #RRGGBB)").default("#E3A008"),
  badge_text: z.string().trim().max(20).nullable().optional(),
  badge_color: z
    .string()
    .regex(HEX_COLOR_REGEX, "Cor do selo inválida")
    .nullable()
    .optional(),
  custom_href: z.string().trim().max(300).nullable().optional(),
  is_active: z.boolean().default(true),
  show_on_home_bar: z.boolean().default(true),
  home_bar_order: z.number().int().min(0).max(999).default(0),
  show_on_home_featured: z.boolean().default(false),
  home_featured_order: z.number().int().min(0).max(999).default(0),
  home_featured_limit: z.number().int().min(1).max(24).default(6),
  show_on_menu: z.boolean().default(true),
  menu_order: z.number().int().min(0).max(999).default(0),
  menu_layout_zone: z.enum(["main", "sidebar_right"]).default("main"),
  allows_addons: z.boolean().default(true),
  allows_notes: z.boolean().default(true),
  show_ranking: z.boolean().default(true),
})

const ReorderPayloadSchema = z.object({
  mode: z.enum(["home_bar", "home_featured", "menu"]),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int().min(0).max(999),
        show_on_home_bar: z.boolean().optional(),
        show_on_home_featured: z.boolean().optional(),
        home_featured_limit: z.number().int().min(1).max(24).optional(),
        show_on_menu: z.boolean().optional(),
        menu_layout_zone: z.enum(["main", "sidebar_right"]).optional(),
      })
    )
    .min(1),
})

const HomeGridLayoutSchema = z.object({
  mobile_columns: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.mobile_columns.min)
    .max(HOME_GRID_LAYOUT_LIMITS.mobile_columns.max),
  mobile_card_padding: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.mobile_card_padding.min)
    .max(HOME_GRID_LAYOUT_LIMITS.mobile_card_padding.max),
  mobile_card_gap: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.mobile_card_gap.min)
    .max(HOME_GRID_LAYOUT_LIMITS.mobile_card_gap.max),
  mobile_icon_size: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.mobile_icon_size.min)
    .max(HOME_GRID_LAYOUT_LIMITS.mobile_icon_size.max),
  mobile_label_size: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.mobile_label_size.min)
    .max(HOME_GRID_LAYOUT_LIMITS.mobile_label_size.max),
  mobile_card_radius: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.mobile_card_radius.min)
    .max(HOME_GRID_LAYOUT_LIMITS.mobile_card_radius.max),
  desktop_columns: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.desktop_columns.min)
    .max(HOME_GRID_LAYOUT_LIMITS.desktop_columns.max),
  desktop_card_padding: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.desktop_card_padding.min)
    .max(HOME_GRID_LAYOUT_LIMITS.desktop_card_padding.max),
  desktop_card_gap: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.desktop_card_gap.min)
    .max(HOME_GRID_LAYOUT_LIMITS.desktop_card_gap.max),
  desktop_icon_size: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.desktop_icon_size.min)
    .max(HOME_GRID_LAYOUT_LIMITS.desktop_icon_size.max),
  desktop_label_size: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.desktop_label_size.min)
    .max(HOME_GRID_LAYOUT_LIMITS.desktop_label_size.max),
  desktop_card_radius: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.desktop_card_radius.min)
    .max(HOME_GRID_LAYOUT_LIMITS.desktop_card_radius.max),
  app_columns: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.app_columns.min)
    .max(HOME_GRID_LAYOUT_LIMITS.app_columns.max),
  app_card_padding: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.app_card_padding.min)
    .max(HOME_GRID_LAYOUT_LIMITS.app_card_padding.max),
  app_card_gap: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.app_card_gap.min)
    .max(HOME_GRID_LAYOUT_LIMITS.app_card_gap.max),
  app_icon_size: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.app_icon_size.min)
    .max(HOME_GRID_LAYOUT_LIMITS.app_icon_size.max),
  app_label_size: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.app_label_size.min)
    .max(HOME_GRID_LAYOUT_LIMITS.app_label_size.max),
  app_card_radius: z
    .number()
    .int()
    .min(HOME_GRID_LAYOUT_LIMITS.app_card_radius.min)
    .max(HOME_GRID_LAYOUT_LIMITS.app_card_radius.max),
})

async function assertAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { authorized: false as const, error: "Sessão expirada. Faça login novamente." }
  }

  if (isAdminUser(user)) {
    return { authorized: true as const, user }
  }

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role === "admin") {
    return { authorized: true as const, user }
  }

  return { authorized: false as const, error: "Acesso restrito a administradores." }
}

function revalidateCatalogPages() {
  try {
    revalidateTag(CATEGORIES_CACHE_TAG, { expire: 0 })
    revalidateTag(HOME_GRID_LAYOUT_CACHE_TAG, { expire: 0 })
    revalidatePath("/")
    revalidatePath("/cardapio")
    revalidatePath("/admin/categorias")
    revalidatePath("/admin/produtos")
  } catch (err) {
    console.warn("[categories] revalidate warning:", err)
  }
}

function extractStoragePathFromPublicUrl(publicUrl?: string | null): string | null {
  if (!publicUrl) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  let url: URL
  let expectedOrigin: string
  try {
    url = new URL(publicUrl)
    expectedOrigin = new URL(supabaseUrl).origin
  } catch {
    return null
  }

  if (url.origin !== expectedOrigin) return null

  const marker = "/storage/v1/object/public/category-icons/"
  if (!url.pathname.startsWith(marker)) return null

  const rawPath = url.pathname.slice(marker.length)
  if (!rawPath) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(rawPath)
  } catch {
    return null
  }

  if (
    !decoded ||
    decoded.startsWith("/") ||
    decoded.includes("..") ||
    decoded.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    return null
  }

  return decoded
}

function isMissingTableError(error: any): boolean {
  const code = String(error?.code || "")
  const msg = String(error?.message || "")
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("Could not find the table") ||
    msg.includes("schema cache")
  )
}

export async function listCategoriesAdminAction(): Promise<
  ActionResult<{ categories: CategoryWithCounts[]; migrationPending?: boolean }>
> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const service = createServiceRoleClient()
    const [{ data: catRows, error: catError }, { data: prodRows, error: prodError }] = await Promise.all([
      service
        .from("categories")
        .select("*")
        .order("home_bar_order", { ascending: true })
        .order("name", { ascending: true }),
      service.from("products").select("id, category, category_id, available"),
    ])

    const totalById = new Map<string, Set<string>>()
    const activeById = new Map<string, Set<string>>()
    const totalBySlug = new Map<string, Set<string>>()
    const activeBySlug = new Map<string, Set<string>>()

    if (!prodError && Array.isArray(prodRows)) {
      for (const p of prodRows) {
        const pid = String(p.id)
        const isAvailable = p.available !== false
        if (p.category_id) {
          let tSet = totalById.get(p.category_id)
          if (!tSet) {
            tSet = new Set<string>()
            totalById.set(p.category_id, tSet)
          }
          tSet.add(pid)
          if (isAvailable) {
            let aSet = activeById.get(p.category_id)
            if (!aSet) {
              aSet = new Set<string>()
              activeById.set(p.category_id, aSet)
            }
            aSet.add(pid)
          }
        }
        const slug = normalizeLegacyCategorySlug(p.category)
        if (slug) {
          let tSet = totalBySlug.get(slug)
          if (!tSet) {
            tSet = new Set<string>()
            totalBySlug.set(slug, tSet)
          }
          tSet.add(pid)
          if (isAvailable) {
            let aSet = activeBySlug.get(slug)
            if (!aSet) {
              aSet = new Set<string>()
              activeBySlug.set(slug, aSet)
            }
            aSet.add(pid)
          }
        }
      }
    }

    if (catError) {
      if (isMissingTableError(catError)) {
        const fallback: CategoryWithCounts[] = DEFAULT_CATEGORIES.map((cat) => {
          const normalizedSlug = normalizeLegacyCategorySlug(cat.slug)
          return {
            ...cat,
            total_products: totalBySlug.get(normalizedSlug)?.size ?? 0,
            active_products: activeBySlug.get(normalizedSlug)?.size ?? 0,
          }
        })
        return { ok: true, data: { categories: fallback, migrationPending: true } }
      }
      return { ok: false, error: `Erro ao carregar categorias: ${catError.message}` }
    }

    const categories: CategoryWithCounts[] = (catRows || []).map((row) => {
      const mapped = mapCategoryRow(row)
      const normalizedSlug = normalizeLegacyCategorySlug(mapped.slug)
      const totalIds = new Set<string>([
        ...(totalById.get(mapped.id) || []),
        ...(totalBySlug.get(normalizedSlug) || []),
      ])
      const activeIds = new Set<string>([
        ...(activeById.get(mapped.id) || []),
        ...(activeBySlug.get(normalizedSlug) || []),
      ])
      return {
        ...mapped,
        total_products: totalIds.size,
        active_products: activeIds.size,
      }
    })

    return { ok: true, data: { categories, migrationPending: false } }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro inesperado ao listar categorias." }
  }
}

export async function createCategoryAction(input: CategoryFormInput): Promise<ActionResult<Category>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const parsed = CategoryFormSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Dados inválidos." }
    }

    const data = parsed.data
    const slug = sanitizeCategorySlug(data.slug || data.name)
    if (!slug) {
      return { ok: false, error: "Informe um nome ou slug válido (letras ou números)." }
    }

    if (data.kind === "home_shortcut" && data.custom_href) {
      const href = data.custom_href.trim()
      if (!isSafeCategoryHref(href)) {
        return { ok: false, error: "Link customizado deve ser um caminho relativo (/) ou URL https:// válida." }
      }
    }

    const service = createServiceRoleClient()
    const { data: existing } = await service
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (existing) {
      return { ok: false, error: `Já existe uma categoria com o slug "${slug}".` }
    }

    const payload = {
      slug,
      name: data.name,
      description: data.description?.trim() || null,
      kind: data.kind,
      icon_url: data.icon_type === "lucide" ? null : data.icon_url?.trim() || null,
      icon_type: data.icon_type,
      fallback_icon: data.fallback_icon,
      accent_color: data.accent_color,
      badge_text: data.badge_text?.trim() || null,
      badge_color: data.badge_color || "#C1440E",
      custom_href: data.kind === "home_shortcut" ? data.custom_href?.trim() || "/cardapio" : null,
      is_active: data.is_active,
      show_on_home_bar: data.show_on_home_bar,
      home_bar_order: data.home_bar_order,
      show_on_home_featured: data.kind === "product_category" ? data.show_on_home_featured : false,
      home_featured_order: data.home_featured_order,
      home_featured_limit: data.home_featured_limit,
      show_on_menu: data.kind === "product_category" ? data.show_on_menu : false,
      menu_order: data.menu_order,
      menu_layout_zone: data.menu_layout_zone,
      allows_addons: data.kind === "product_category" ? data.allows_addons : false,
      allows_notes: data.kind === "product_category" ? data.allows_notes : false,
      show_ranking: data.kind === "product_category" ? data.show_ranking : false,
    }

    const { data: inserted, error } = await service
      .from("categories")
      .insert(payload)
      .select("*")
      .single()

    if (error || !inserted) {
      return { ok: false, error: error?.message || "Não foi possível criar a categoria." }
    }

    revalidateCatalogPages()
    return { ok: true, data: mapCategoryRow(inserted) }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao criar categoria." }
  }
}

export async function updateCategoryAction(
  id: string,
  input: CategoryFormInput
): Promise<ActionResult<Category>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    if (!z.string().uuid().safeParse(id).success) {
      return { ok: false, error: "ID de categoria inválido." }
    }

    const parsed = CategoryFormSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Dados inválidos." }
    }

    const data = parsed.data
    if (data.kind === "home_shortcut" && data.custom_href) {
      const href = data.custom_href.trim()
      if (!isSafeCategoryHref(href)) {
        return { ok: false, error: "Link customizado deve ser um caminho relativo (/) ou URL https:// válida." }
      }
    }

    const service = createServiceRoleClient()

    if (data.kind === "home_shortcut") {
      const { data: existing, error: existingErr } = await service
        .from("categories")
        .select("id, slug")
        .eq("id", id)
        .single()

      if (existingErr || !existing) {
        return { ok: false, error: "Categoria não encontrada." }
      }

      const [{ data: linkedById, error: byIdErr }, { data: linkedBySlug, error: bySlugErr }] =
        await Promise.all([
          service.from("products").select("id").eq("category_id", id).limit(1),
          service.from("products").select("id").eq("category", existing.slug).limit(1),
        ])

      if (byIdErr || bySlugErr) {
        return {
          ok: false,
          error: `Erro ao verificar produtos vinculados: ${byIdErr?.message || bySlugErr?.message}`,
        }
      }

      if ((linkedById && linkedById.length > 0) || (linkedBySlug && linkedBySlug.length > 0)) {
        return {
          ok: false,
          error: "Não é possível converter para atalho enquanto houver produtos vinculados.",
        }
      }
    }

    // Slug is intentionally NOT updated on edit to prevent breaking links & legacy products
    const payload = {
      name: data.name,
      description: data.description?.trim() || null,
      kind: data.kind,
      icon_url: data.icon_type === "lucide" ? null : data.icon_url?.trim() || null,
      icon_type: data.icon_type,
      fallback_icon: data.fallback_icon,
      accent_color: data.accent_color,
      badge_text: data.badge_text?.trim() || null,
      badge_color: data.badge_color || "#C1440E",
      custom_href: data.kind === "home_shortcut" ? data.custom_href?.trim() || "/cardapio" : null,
      is_active: data.is_active,
      show_on_home_bar: data.show_on_home_bar,
      home_bar_order: data.home_bar_order,
      show_on_home_featured: data.kind === "product_category" ? data.show_on_home_featured : false,
      home_featured_order: data.home_featured_order,
      home_featured_limit: data.home_featured_limit,
      show_on_menu: data.kind === "product_category" ? data.show_on_menu : false,
      menu_order: data.menu_order,
      menu_layout_zone: data.menu_layout_zone,
      allows_addons: data.kind === "product_category" ? data.allows_addons : false,
      allows_notes: data.kind === "product_category" ? data.allows_notes : false,
      show_ranking: data.kind === "product_category" ? data.show_ranking : false,
    }

    const { data: updated, error } = await service
      .from("categories")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !updated) {
      return { ok: false, error: error?.message || "Não foi possível atualizar a categoria." }
    }

    revalidateCatalogPages()
    return { ok: true, data: mapCategoryRow(updated) }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao atualizar categoria." }
  }
}

export async function duplicateCategoryAction(id: string): Promise<ActionResult<Category>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    if (!z.string().uuid().safeParse(id).success) {
      return { ok: false, error: "ID de categoria inválido." }
    }

    const service = createServiceRoleClient()
    const { data: source, error: srcErr } = await service
      .from("categories")
      .select("*")
      .eq("id", id)
      .single()

    if (srcErr || !source) {
      return { ok: false, error: "Categoria original não encontrada." }
    }

    const baseSlug =
      sanitizeCategorySlug(String(source.slug || source.name || "categoria"))
        .slice(0, 36)
        .replace(/-+$/g, "") || "categoria"
    let suffix = 1
    let candidateSlug = sanitizeCategorySlug(`${baseSlug}-copia`)
    let foundUnique = false
    while (suffix <= 100) {
      const { data: clash } = await service
        .from("categories")
        .select("id")
        .eq("slug", candidateSlug)
        .maybeSingle()
      if (!clash) {
        foundUnique = true
        break
      }
      suffix += 1
      candidateSlug = sanitizeCategorySlug(`${baseSlug}-copia-${suffix}`)
    }

    if (!foundUnique) {
      return { ok: false, error: "Limite máximo de cópias atingido para esta categoria." }
    }

    const { data: inserted, error } = await service
      .from("categories")
      .insert({
        slug: candidateSlug,
        name: `${source.name} (Cópia)`.slice(0, 60),
        description: source.description,
        kind: source.kind,
        icon_url: source.icon_url,
        icon_type: source.icon_type,
        fallback_icon: source.fallback_icon,
        accent_color: source.accent_color,
        badge_text: source.badge_text,
        badge_color: source.badge_color,
        custom_href: source.custom_href,
        is_active: false,
        show_on_home_bar: source.show_on_home_bar,
        home_bar_order: Number(source.home_bar_order || 0) + 1,
        show_on_home_featured: source.show_on_home_featured,
        home_featured_order: Number(source.home_featured_order || 0) + 1,
        home_featured_limit: source.home_featured_limit,
        show_on_menu: source.show_on_menu,
        menu_order: Number(source.menu_order || 0) + 1,
        menu_layout_zone: source.menu_layout_zone,
        allows_addons: source.allows_addons,
        allows_notes: source.allows_notes,
        show_ranking: source.show_ranking,
      })
      .select("*")
      .single()

    if (error || !inserted) {
      return { ok: false, error: error?.message || "Erro ao duplicar categoria." }
    }

    revalidateCatalogPages()
    return { ok: true, data: mapCategoryRow(inserted) }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao duplicar categoria." }
  }
}

export async function toggleCategoryActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult<Category>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) {
      return { ok: false, error: "ID inválido." }
    }

    const parsedActive = z.boolean().safeParse(isActive)
    if (!parsedActive.success) {
      return { ok: false, error: "Valor de status inválido." }
    }

    const service = createServiceRoleClient()
    const { data: updated, error } = await service
      .from("categories")
      .update({ is_active: parsedActive.data })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !updated) {
      return { ok: false, error: error?.message || "Erro ao alterar status da categoria." }
    }

    revalidateCatalogPages()
    return { ok: true, data: mapCategoryRow(updated) }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao alterar status." }
  }
}

export async function toggleCategoryHomeBarAction(
  id: string,
  showOnHomeBar: boolean
): Promise<ActionResult<Category>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const parsedId = z.string().uuid().safeParse(id)
    if (!parsedId.success) {
      return { ok: false, error: "ID inválido." }
    }

    const parsedShow = z.boolean().safeParse(showOnHomeBar)
    if (!parsedShow.success) {
      return { ok: false, error: "Valor inválido para visibilidade na Home." }
    }

    const service = createServiceRoleClient()
    const { data: updated, error } = await service
      .from("categories")
      .update({ show_on_home_bar: parsedShow.data })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !updated) {
      return {
        ok: false,
        error: error?.message || "Erro ao alterar visibilidade na Home.",
      }
    }

    revalidateCatalogPages()
    return { ok: true, data: mapCategoryRow(updated) }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao alterar visibilidade na Home." }
  }
}

export async function reorderCategoriesAction(
  mode: "home_bar" | "home_featured" | "menu",
  items: ReorderItemInput[]
): Promise<ActionResult<null>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const parsed = ReorderPayloadSchema.safeParse({ mode, items })
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Lista de ordenação inválida." }
    }

    const service = createServiceRoleClient()
    await Promise.all(
      parsed.data.items.map(async (item) => {
        const patch: Record<string, any> = {}
        if (mode === "home_bar") {
          patch.home_bar_order = item.order
          if (typeof item.show_on_home_bar === "boolean") {
            patch.show_on_home_bar = item.show_on_home_bar
          }
        } else if (mode === "home_featured") {
          patch.home_featured_order = item.order
          if (typeof item.show_on_home_featured === "boolean") {
            patch.show_on_home_featured = item.show_on_home_featured
          }
          if (typeof item.home_featured_limit === "number") {
            patch.home_featured_limit = item.home_featured_limit
          }
        } else {
          patch.menu_order = item.order
          if (typeof item.show_on_menu === "boolean") {
            patch.show_on_menu = item.show_on_menu
          }
          if (item.menu_layout_zone) {
            patch.menu_layout_zone = item.menu_layout_zone
          }
        }

        const { error } = await service.from("categories").update(patch).eq("id", item.id)
        if (error) {
          throw new Error(error.message)
        }
      })
    )

    revalidateCatalogPages()
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao salvar nova ordenação." }
  }
}

export async function deleteCategorySafeAction(
  id: string,
  options?: { migrateToCategoryId?: string }
): Promise<ActionResult<null>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    if (!z.string().uuid().safeParse(id).success) {
      return { ok: false, error: "ID de categoria inválido." }
    }

    const service = createServiceRoleClient()
    const { data: cat, error: catErr } = await service
      .from("categories")
      .select("*")
      .eq("id", id)
      .single()

    if (catErr || !cat) {
      return { ok: false, error: "Categoria não encontrada." }
    }

    // Check linked products by category_id OR legacy slug
    const [{ data: linkedById, error: linkedByIdErr }, { data: linkedBySlug, error: linkedBySlugErr }] =
      await Promise.all([
        service.from("products").select("id").eq("category_id", id),
        service.from("products").select("id").eq("category", cat.slug),
      ])

    if (linkedByIdErr || linkedBySlugErr) {
      return {
        ok: false,
        error: `Erro ao verificar produtos vinculados: ${linkedByIdErr?.message || linkedBySlugErr?.message}`,
      }
    }

    const linkedIdSet = new Set<string>()
    for (const p of linkedById || []) linkedIdSet.add(String(p.id))
    for (const p of linkedBySlug || []) linkedIdSet.add(String(p.id))
    const linkedIds = Array.from(linkedIdSet)

    if (linkedIds.length > 0) {
      const targetId = options?.migrateToCategoryId
      if (!targetId) {
        return {
          ok: false,
          code: "HAS_PRODUCTS",
          productCount: linkedIds.length,
          error: `Esta categoria possui ${linkedIds.length} produto(s) vinculado(s). Migre os produtos antes de excluir ou apenas desative a categoria.`,
        }
      }

      if (!z.string().uuid().safeParse(targetId).success || targetId === id) {
        return { ok: false, error: "Selecione uma categoria de destino diferente para migração." }
      }

      const { data: targetCat, error: targetErr } = await service
        .from("categories")
        .select("id, slug, kind")
        .eq("id", targetId)
        .single()

      if (targetErr || !targetCat || targetCat.kind !== "product_category") {
        return { ok: false, error: "Categoria de destino inválida para receber produtos." }
      }

      const { error: migrateErr } = await service
        .from("products")
        .update({ category_id: targetCat.id, category: targetCat.slug })
        .in("id", linkedIds)

      if (migrateErr) {
        return { ok: false, error: `Erro ao migrar produtos: ${migrateErr.message}` }
      }
    }

    const { error: deleteErr } = await service.from("categories").delete().eq("id", id)
    if (deleteErr) {
      return { ok: false, error: `Não foi possível excluir a categoria: ${deleteErr.message}` }
    }

    // Best-effort cleanup of uploaded icon in category-icons bucket
    if (cat.icon_type === "upload" && cat.icon_url) {
      const storagePath = extractStoragePathFromPublicUrl(cat.icon_url)
      if (storagePath) {
        const { data: refs, error: refsErr } = await service
          .from("categories")
          .select("id")
          .eq("icon_url", cat.icon_url)
          .limit(1)

        if (!refsErr && refs && refs.length === 0) {
          await service.storage.from("category-icons").remove([storagePath]).catch(() => {})
        }
      }
    }

    revalidateCatalogPages()
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro inesperado ao excluir categoria." }
  }
}

export async function uploadCategoryIconAction(
  formData: FormData
): Promise<ActionResult<{ publicUrl: string }>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const file = formData.get("file")
    const removeOld = formData.get("removeOld") === "true"
    const oldUrl = typeof formData.get("oldUrl") === "string" ? String(formData.get("oldUrl")) : null

    if (!(file instanceof File)) {
      return { ok: false, error: "Selecione um arquivo de imagem válido." }
    }

    if (!ALLOWED_CATEGORY_ICON_MIME_TYPES.includes(file.type as any)) {
      return {
        ok: false,
        error: "Formato não permitido. Use PNG, WebP, JPG ou SVG.",
      }
    }

    if (file.size <= 0 || file.size > MAX_CATEGORY_ICON_BYTES) {
      return {
        ok: false,
        error: "Arquivo excede o limite máximo de 2MB.",
      }
    }

    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/webp": "webp",
      "image/jpeg": "jpg",
      "image/svg+xml": "svg",
    }
    const ext = extMap[file.type] || "png"
    const safeBase = sanitizeCategorySlug(file.name.replace(/\.[^/.]+$/, "")) || "icon"
    const filePath = `${Date.now()}-${safeBase}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    if (file.type === "image/svg+xml") {
      const svgText = fileBuffer.toString("utf8")
      const dangerousSvgPatterns = [
        /<script\b/i,
        /\bon[a-z]+\s*=/i,
        /javascript\s*:/i,
        /vbscript\s*:/i,
        /data\s*:\s*text\/html/i,
        /data\s*:\s*image\/svg\+xml/i,
        /&#x?[0-9a-f]+;?/i,
        /<foreignObject\b/i,
        /<iframe\b/i,
        /<object\b/i,
        /<embed\b/i,
        /<use\b/i,
        /<animate[a-z]*\b/i,
        /<set\b/i,
        /<meta\b/i,
      ]
      if (!/<svg\b/i.test(svgText) || dangerousSvgPatterns.some((pattern) => pattern.test(svgText))) {
        return {
          ok: false,
          error: "SVG bloqueado por conter conteúdo potencialmente inseguro.",
        }
      }
    } else {
      const hasValidMagicBytes =
        (file.type === "image/png" &&
          fileBuffer.length >= 4 &&
          fileBuffer[0] === 0x89 &&
          fileBuffer[1] === 0x50 &&
          fileBuffer[2] === 0x4e &&
          fileBuffer[3] === 0x47) ||
        (file.type === "image/jpeg" &&
          fileBuffer.length >= 3 &&
          fileBuffer[0] === 0xff &&
          fileBuffer[1] === 0xd8 &&
          fileBuffer[2] === 0xff) ||
        (file.type === "image/webp" &&
          fileBuffer.length >= 12 &&
          fileBuffer[0] === 0x52 &&
          fileBuffer[1] === 0x49 &&
          fileBuffer[2] === 0x46 &&
          fileBuffer[3] === 0x46 &&
          fileBuffer[8] === 0x57 &&
          fileBuffer[9] === 0x45 &&
          fileBuffer[10] === 0x42 &&
          fileBuffer[11] === 0x50)

      if (!hasValidMagicBytes) {
        return {
          ok: false,
          error: "Conteúdo do arquivo não corresponde a uma imagem válida.",
        }
      }
    }

    const service = createServiceRoleClient()

    const { error: uploadErr } = await service.storage
      .from("category-icons")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      })

    if (uploadErr) {
      return { ok: false, error: `Falha no upload para o Storage: ${uploadErr.message}` }
    }

    const { data: urlData } = service.storage.from("category-icons").getPublicUrl(filePath)

    if (removeOld && oldUrl) {
      const oldPath = extractStoragePathFromPublicUrl(oldUrl)
      if (oldPath && oldPath !== filePath) {
        const { data: refs, error: refsErr } = await service
          .from("categories")
          .select("id")
          .eq("icon_url", oldUrl)
          .limit(1)

        if (!refsErr && refs && refs.length === 0) {
          await service.storage.from("category-icons").remove([oldPath]).catch(() => {})
        }
      }
    }

    return { ok: true, data: { publicUrl: urlData.publicUrl } }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao enviar imagem." }
  }
}

export interface CategoryBankIconItem {
  id: string
  name: string
  url: string
  source: "storage" | "preset_3d"
  createdAt?: string | null
}

export async function listCategoryIconsAction(): Promise<
  ActionResult<{ icons: CategoryBankIconItem[] }>
> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const service = createServiceRoleClient()
    const pageSize = 100
    const maxPages = 5
    const allItems: Array<{ name: string; id: string | null; created_at?: string | null }> = []

    for (let page = 0; page < maxPages; page++) {
      const { data: batch, error } = await service.storage
        .from("category-icons")
        .list("", {
          limit: pageSize,
          offset: page * pageSize,
          sortBy: { column: "created_at", order: "desc" },
        })

      if (error) {
        return { ok: false, error: `Erro ao listar banco de ícones 3D: ${error.message}` }
      }

      if (!batch || batch.length === 0) break
      allItems.push(...batch)
      if (batch.length < pageSize) break
    }

    const allowedImageExt = /\.(png|webp|jpe?g|svg)$/i
    const storageIcons: CategoryBankIconItem[] = allItems
      .filter(
        (item) =>
          Boolean(item.name) &&
          !item.name.startsWith(".") &&
          !item.name.endsWith("/") &&
          item.id !== null &&
          allowedImageExt.test(item.name)
      )
      .map((item) => {
        const { data: urlData } = service.storage.from("category-icons").getPublicUrl(item.name)
        return {
          id: `storage:${item.name}`,
          name: item.name
            .replace(/^\d+-/, "")
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]+/g, " ")
            .trim() || "Ícone 3D",
          url: urlData.publicUrl,
          source: "storage" as const,
          createdAt: item.created_at ?? null,
        }
      })

    return { ok: true, data: { icons: storageIcons } }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro ao carregar banco de ícones 3D." }
  }
}

export async function getHomeGridLayoutAdminAction(): Promise<
  ActionResult<{ layout: HomeGridLayout; migrationPending?: boolean }>
> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const service = createServiceRoleClient()
    const { data, error } = await service
      .from("home_grid_layout")
      .select(HOME_GRID_LAYOUT_SELECT_COLUMNS)
      .eq("id", "default")
      .maybeSingle()

    if (error) {
      if (isMissingTableError(error)) {
        return {
          ok: true,
          data: { layout: { ...DEFAULT_HOME_GRID_LAYOUT }, migrationPending: true },
        }
      }
      return { ok: false, error: `Erro ao carregar layout da grade: ${error.message}` }
    }

    return { ok: true, data: { layout: normalizeHomeGridLayout(data) } }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro inesperado ao carregar layout da grade." }
  }
}

export async function saveHomeGridLayoutAction(
  rawInput: unknown
): Promise<ActionResult<HomeGridLayout>> {
  try {
    const auth = await assertAdmin()
    if (!auth.authorized) return { ok: false, error: auth.error }

    const parsed = HomeGridLayoutSchema.safeParse(rawInput)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || "Configuração da grade inválida.",
      }
    }

    const service = createServiceRoleClient()
    const { data, error } = await service
      .from("home_grid_layout")
      .upsert({ id: "default", ...parsed.data }, { onConflict: "id" })
      .select(HOME_GRID_LAYOUT_SELECT_COLUMNS)
      .single()

    if (error && isMissingTableError(error)) {
      return {
        ok: false,
        code: "MIGRATION_PENDING",
        error: "Schema home_grid_layout pendente. Execute scripts/031_home_grid_layout.sql e scripts/032_home_grid_layout_app_profile.sql no Supabase.",
      }
    }

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || "Não foi possível salvar a configuração da grade.",
      }
    }

    revalidateCatalogPages()
    return { ok: true, data: normalizeHomeGridLayout(data) }
  } catch (err: any) {
    return { ok: false, error: err?.message || "Erro inesperado ao salvar configuração da grade." }
  }
}
