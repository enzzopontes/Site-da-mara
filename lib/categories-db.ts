import { getSupabase } from "@/lib/supabase-fix"
import { isSafeCategoryHref, normalizeLegacyCategorySlug } from "@/lib/category-icons"

export type CategoryKind = "product_category" | "home_shortcut"
export type CategoryIconType = "upload" | "preset_3d" | "lucide"
export type MenuLayoutZone = "main" | "sidebar_right"

export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  kind: CategoryKind
  icon_url: string | null
  icon_type: CategoryIconType
  fallback_icon: string
  accent_color: string
  badge_text: string | null
  badge_color: string | null
  custom_href: string | null
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
  created_at?: string
  updated_at?: string
}

export interface CategoryWithCounts extends Category {
  total_products: number
  active_products: number
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "default-cardapio",
    slug: "cardapio",
    name: "Cardápio",
    description: "Veja todas as opções do nosso cardápio",
    kind: "home_shortcut",
    icon_url: "/assets/icones3d/icone cardapio.png",
    icon_type: "preset_3d",
    fallback_icon: "BookOpen",
    accent_color: "#E3A008",
    badge_text: null,
    badge_color: "#C1440E",
    custom_href: "/cardapio",
    is_active: true,
    show_on_home_bar: true,
    home_bar_order: 0,
    show_on_home_featured: false,
    home_featured_order: 10,
    home_featured_limit: 6,
    show_on_menu: false,
    menu_order: 10,
    menu_layout_zone: "main",
    allows_addons: false,
    allows_notes: false,
    show_ranking: false,
  },
  {
    id: "default-batata",
    slug: "batata",
    name: "Batatas",
    description: "Batatas recheadas generosas preparadas na hora",
    kind: "product_category",
    icon_url: "/assets/icones3d/icone batata.png",
    icon_type: "preset_3d",
    fallback_icon: "Flame",
    accent_color: "#E3A008",
    badge_text: null,
    badge_color: "#C1440E",
    custom_href: null,
    is_active: true,
    show_on_home_bar: true,
    home_bar_order: 1,
    show_on_home_featured: true,
    home_featured_order: 0,
    home_featured_limit: 8,
    show_on_menu: true,
    menu_order: 0,
    menu_layout_zone: "main",
    allows_addons: true,
    allows_notes: true,
    show_ranking: true,
  },
  {
    id: "default-macarrao",
    slug: "macarrao",
    name: "Macarrão",
    description: "Massas artesanais com molhos cremosos e tempero especial",
    kind: "product_category",
    icon_url: "/assets/icones3d/icone macarrao.png",
    icon_type: "preset_3d",
    fallback_icon: "Utensils",
    accent_color: "#C1440E",
    badge_text: null,
    badge_color: "#C1440E",
    custom_href: null,
    is_active: true,
    show_on_home_bar: true,
    home_bar_order: 2,
    show_on_home_featured: true,
    home_featured_order: 1,
    home_featured_limit: 4,
    show_on_menu: true,
    menu_order: 1,
    menu_layout_zone: "main",
    allows_addons: true,
    allows_notes: true,
    show_ranking: true,
  },
  {
    id: "default-bebida",
    slug: "bebida",
    name: "Bebidas",
    description: "Bebidas bem geladas para acompanhar seu pedido",
    kind: "product_category",
    icon_url: "/assets/icones3d/icone bebidas geladas.png",
    icon_type: "preset_3d",
    fallback_icon: "CupSoda",
    accent_color: "#0284C7",
    badge_text: null,
    badge_color: "#C1440E",
    custom_href: null,
    is_active: true,
    show_on_home_bar: true,
    home_bar_order: 3,
    show_on_home_featured: false,
    home_featured_order: 2,
    home_featured_limit: 6,
    show_on_menu: true,
    menu_order: 2,
    menu_layout_zone: "sidebar_right",
    allows_addons: false,
    allows_notes: false,
    show_ranking: false,
  },
  {
    id: "default-cupons",
    slug: "cupons",
    name: "Cupons",
    description: "Descontos exclusivos para o seu pedido",
    kind: "home_shortcut",
    icon_url: "/assets/icones3d/icone cupom.png",
    icon_type: "preset_3d",
    fallback_icon: "Ticket",
    accent_color: "#C1440E",
    badge_text: null,
    badge_color: "#C1440E",
    custom_href: "/cupons",
    is_active: true,
    show_on_home_bar: true,
    home_bar_order: 4,
    show_on_home_featured: false,
    home_featured_order: 11,
    home_featured_limit: 6,
    show_on_menu: false,
    menu_order: 11,
    menu_layout_zone: "main",
    allows_addons: false,
    allows_notes: false,
    show_ranking: false,
  },
  {
    id: "default-todos",
    slug: "todos",
    name: "Ver mais",
    description: "Explorar o cardápio completo",
    kind: "home_shortcut",
    icon_url: "/assets/icones3d/iconetodos.png",
    icon_type: "preset_3d",
    fallback_icon: "LayoutGrid",
    accent_color: "#E3A008",
    badge_text: null,
    badge_color: "#C1440E",
    custom_href: "/cardapio",
    is_active: true,
    show_on_home_bar: true,
    home_bar_order: 5,
    show_on_home_featured: false,
    home_featured_order: 12,
    home_featured_limit: 6,
    show_on_menu: false,
    menu_order: 12,
    menu_layout_zone: "main",
    allows_addons: false,
    allows_notes: false,
    show_ranking: false,
  },
]

export function mapCategoryRow(row: Record<string, any>): Category {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description ?? null,
    kind: row.kind === "home_shortcut" ? "home_shortcut" : "product_category",
    icon_url: row.icon_url ?? null,
    icon_type:
      row.icon_type === "upload" || row.icon_type === "lucide"
        ? row.icon_type
        : "preset_3d",
    fallback_icon: row.fallback_icon || "UtensilsCrossed",
    accent_color: row.accent_color || "#E3A008",
    badge_text: row.badge_text ?? null,
    badge_color: row.badge_color || "#C1440E",
    custom_href: row.custom_href ?? null,
    is_active: row.is_active !== false,
    show_on_home_bar: row.show_on_home_bar !== false,
    home_bar_order: Number.isFinite(Number(row.home_bar_order)) ? Number(row.home_bar_order) : 0,
    show_on_home_featured: Boolean(row.show_on_home_featured),
    home_featured_order: Number.isFinite(Number(row.home_featured_order)) ? Number(row.home_featured_order) : 0,
    home_featured_limit: Math.min(24, Math.max(1, Number(row.home_featured_limit) || 6)),
    show_on_menu: row.show_on_menu !== false,
    menu_order: Number.isFinite(Number(row.menu_order)) ? Number(row.menu_order) : 0,
    menu_layout_zone: row.menu_layout_zone === "sidebar_right" ? "sidebar_right" : "main",
    allows_addons: row.allows_addons !== false,
    allows_notes: row.allows_notes !== false,
    show_ranking: row.show_ranking !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function fetchCategoriesFromDb(options?: {
  includeInactive?: boolean
  kind?: CategoryKind
}): Promise<Category[]> {
  try {
    const supabase = getSupabase()
    let query = supabase.from("categories").select("*")
    if (!options?.includeInactive) {
      query = query.eq("is_active", true)
    }
    if (options?.kind) {
      query = query.eq("kind", options.kind)
    }
    query = query.order("home_bar_order", { ascending: true }).order("name", { ascending: true })

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      return filterDefaultCategories(options)
    }
    return data.map(mapCategoryRow)
  } catch {
    return filterDefaultCategories(options)
  }
}

function filterDefaultCategories(options?: {
  includeInactive?: boolean
  kind?: CategoryKind
}): Category[] {
  return DEFAULT_CATEGORIES.filter((cat) => {
    if (!options?.includeInactive && !cat.is_active) return false
    if (options?.kind && cat.kind !== options.kind) return false
    return true
  })
}

export function getCategoryHref(category: Category): string {
  if (category.kind === "home_shortcut") {
    const href = category.custom_href?.trim()
    return href && isSafeCategoryHref(href) ? href : "/cardapio"
  }
  return `/cardapio?category=${encodeURIComponent(category.slug)}`
}

export function matchProductToCategory(
  product: { category?: string | null; categoryId?: string | null; category_id?: string | null },
  category: Category
): boolean {
  const prodCatId = product.categoryId ?? product.category_id
  if (prodCatId && prodCatId === category.id) return true
  return normalizeLegacyCategorySlug(product.category) === normalizeLegacyCategorySlug(category.slug)
}

export function findCategoryForProduct(
  product: { category?: string | null; categoryId?: string | null; category_id?: string | null },
  categories: Category[]
): Category | undefined {
  return categories.find((cat) => cat.kind === "product_category" && matchProductToCategory(product, cat))
}

export function getHomeBarCategories(
  categories: Category[],
  activeProductCountsBySlug: Record<string, number>
): Category[] {
  return categories
    .filter((cat) => {
      if (!cat.is_active || !cat.show_on_home_bar) return false
      if (cat.kind === "product_category") {
        const count = activeProductCountsBySlug[normalizeLegacyCategorySlug(cat.slug)] ?? 0
        return count > 0
      }
      return true
    })
    .sort((a, b) => a.home_bar_order - b.home_bar_order || a.name.localeCompare(b.name))
}

export function getHomeFeaturedCategories(
  categories: Category[],
  activeProductCountsBySlug: Record<string, number>
): Category[] {
  return categories
    .filter((cat) => {
      if (!cat.is_active || cat.kind !== "product_category" || !cat.show_on_home_featured) return false
      const count = activeProductCountsBySlug[normalizeLegacyCategorySlug(cat.slug)] ?? 0
      return count > 0
    })
    .sort((a, b) => a.home_featured_order - b.home_featured_order || a.name.localeCompare(b.name))
}

export function getMenuCategories(
  categories: Category[],
  activeProductCountsBySlug: Record<string, number>
): Category[] {
  return categories
    .filter((cat) => {
      if (!cat.is_active || cat.kind !== "product_category" || !cat.show_on_menu) return false
      const count = activeProductCountsBySlug[normalizeLegacyCategorySlug(cat.slug)] ?? 0
      return count > 0
    })
    .sort((a, b) => a.menu_order - b.menu_order || a.name.localeCompare(b.name))
}
