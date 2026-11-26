export interface Preset3DIcon {
  id: string
  label: string
  path: string
}

export const PRESET_3D_ICONS: Preset3DIcon[] = [
  { id: "cardapio", label: "Cardápio", path: "/assets/icones3d/icone cardapio.png" },
  { id: "batata", label: "Batata Recheada", path: "/assets/icones3d/icone batata.png" },
  { id: "macarrao", label: "Macarrão", path: "/assets/icones3d/icone macarrao.png" },
  { id: "bebida", label: "Bebidas Geladas", path: "/assets/icones3d/icone bebidas geladas.png" },
  { id: "cupom", label: "Cupons", path: "/assets/icones3d/icone cupom.png" },
  { id: "todos", label: "Ver Tudo", path: "/assets/icones3d/iconetodos.png" },
]

export const FALLBACK_ICON_NAMES = [
  "UtensilsCrossed",
  "Flame",
  "Utensils",
  "CupSoda",
  "BookOpen",
  "Ticket",
  "LayoutGrid",
  "Pizza",
  "Sandwich",
  "IceCreamCone",
  "Coffee",
  "Soup",
  "Beef",
  "Salad",
  "Cookie",
  "Sparkles",
  "Tag",
  "ShoppingBag",
  "Star",
  "ChefHat",
  "Percent",
  "Gift",
  "CookingPot",
  "HandPlatter",
  "Microwave",
  "Cake",
  "CakeSlice",
  "Dessert",
  "Donut",
  "Candy",
  "IceCreamBowl",
  "Popsicle",
  "Croissant",
  "Drumstick",
  "Ham",
  "Fish",
  "EggFried",
  "Popcorn",
  "Beer",
  "Wine",
  "Martini",
  "GlassWater",
  "Citrus",
  "Milk",
  "Wheat",
  "Cherry",
  "Carrot",
  "Package",
  "ShoppingBasket",
  "Crown",
] as const

export type FallbackIconName = (typeof FALLBACK_ICON_NAMES)[number]

export const ACCENT_COLOR_PRESETS = [
  { label: "Âmbar Batata Top", hex: "#E3A008" },
  { label: "Terracota", hex: "#C1440E" },
  { label: "Dourado Escuro", hex: "#8A6100" },
  { label: "Azul Gelado", hex: "#0284C7" },
  { label: "Verde Frescor", hex: "#15803D" },
  { label: "Roxo Especial", hex: "#7E22CE" },
  { label: "Rosa Doce", hex: "#DB2777" },
  { label: "Grafite", hex: "#374151" },
] as const

export const BADGE_PRESETS = [
  { text: "NOVO", color: "#15803D" },
  { text: "PROMO", color: "#C1440E" },
  { text: "CHEF", color: "#8A6100" },
  { text: "TOP", color: "#E3A008" },
  { text: "LIMITADO", color: "#7E22CE" },
] as const

export const ALLOWED_CATEGORY_ICON_MIME_TYPES = [
  "image/png",
  "image/webp",
  "image/jpeg",
  "image/svg+xml",
] as const

export const MAX_CATEGORY_ICON_BYTES = 2 * 1024 * 1024

export function sanitizeCategorySlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function normalizeLegacyCategorySlug(raw?: string | null): string {
  if (!raw) return ""
  const clean = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (clean === "batatas") return "batata"
  if (clean === "bebidas") return "bebida"
  if (clean === "macarroes" || clean === "massas") return "macarrao"
  return clean
}

export function isSafeCategoryHref(raw?: string | null): boolean {
  if (!raw) return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return false
  if (trimmed.includes("\\")) return false

  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false
  }

  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return false
    return true
  }

  if (lower.startsWith("https://")) {
    try {
      const url = new URL(trimmed)
      return url.protocol === "https:"
    } catch {
      return false
    }
  }

  return false
}

export function isSafeIconUrl(raw?: string | null): boolean {
  return isSafeCategoryHref(raw)
}
