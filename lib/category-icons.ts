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

export const CATEGORY_ICON_SCALE_MIN = 60
export const CATEGORY_ICON_SCALE_MAX = 150
export const CATEGORY_ICON_SCALE_DEFAULT = 100

export function normalizeCategoryIconScale(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN
  if (!Number.isFinite(parsed)) return CATEGORY_ICON_SCALE_DEFAULT
  return Math.min(CATEGORY_ICON_SCALE_MAX, Math.max(CATEGORY_ICON_SCALE_MIN, Math.round(parsed)))
}

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

function isPrivateOrLocalHostname(rawHostname: string): boolean {
  const host = rawHostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "")
  if (!host) return true

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true
  }

  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (ipv4Match) {
    const a = Number(ipv4Match[1])
    const b = Number(ipv4Match[2])
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }

  if (host.includes(":")) {
    if (host === "::" || host === "::1" || host === "0:0:0:0:0:0:0:1" || host === "0:0:0:0:0:0:0:0") {
      return true
    }
    if (/^(?:fc|fd)[0-9a-f]{0,2}:/i.test(host)) return true
    if (/^fe[89ab][0-9a-f]:/i.test(host)) return true
    if (host.startsWith("::ffff:")) {
      const mapped = host.slice("::ffff:".length)
      if (mapped.includes(".")) {
        return isPrivateOrLocalHostname(mapped)
      }
      const hexMatch = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(mapped)
      if (hexMatch) {
        const hi = parseInt(hexMatch[1], 16)
        const lo = parseInt(hexMatch[2], 16)
        const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
        return isPrivateOrLocalHostname(ipv4)
      }
    }
  }

  return false
}

export function isSafeCategoryHref(raw?: string | null): boolean {
  if (!raw) return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return false
  if (/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(trimmed)) return false
  if (trimmed.includes("\\")) return false
  if (trimmed.includes("..")) return false

  let decoded: string
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    return false
  }
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return false
  if (/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded)) return false
  if (decoded.includes("\\") || decoded.includes("..")) return false

  try {
    const twiceDecoded = decodeURIComponent(decoded)
    if (/[\u0000-\u001f\u007f]/.test(twiceDecoded)) return false
    if (twiceDecoded.includes("\\") || twiceDecoded.includes("..")) return false
  } catch {
    // Allow literal percent signs produced by decoding valid "%25" sequences
  }

  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false
  }

  if (trimmed.startsWith("/")) {
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/\\") ||
      decoded.startsWith("//") ||
      decoded.startsWith("/\\")
    ) {
      return false
    }
    return true
  }

  if (lower.startsWith("https://")) {
    try {
      const url = new URL(trimmed)
      if (url.username || url.password) return false
      if (url.protocol !== "https:") return false
      if (isPrivateOrLocalHostname(url.hostname)) return false
      return true
    } catch {
      return false
    }
  }

  return false
}

export function isSafeIconUrl(raw?: string | null): boolean {
  return isSafeCategoryHref(raw)
}
