import { getSupabase } from "@/lib/supabase-fix"

export interface HomeGridLayout {
  mobile_columns: number
  mobile_card_padding: number
  mobile_card_gap: number
  mobile_icon_size: number
  mobile_label_size: number
  desktop_columns: number
  desktop_card_padding: number
  desktop_card_gap: number
  desktop_icon_size: number
  desktop_label_size: number
}

export type HomeGridViewport = "mobile" | "desktop"
export type HomeGridPresetKey = "compact" | "default" | "large"

export const HOME_GRID_LAYOUT_LIMITS = {
  mobile_columns: { min: 2, max: 4 },
  mobile_card_padding: { min: 4, max: 20 },
  mobile_card_gap: { min: 4, max: 16 },
  mobile_icon_size: { min: 28, max: 68 },
  mobile_label_size: { min: 9, max: 14 },
  desktop_columns: { min: 3, max: 8 },
  desktop_card_padding: { min: 6, max: 24 },
  desktop_card_gap: { min: 6, max: 24 },
  desktop_icon_size: { min: 36, max: 80 },
  desktop_label_size: { min: 11, max: 16 },
} as const

export const DEFAULT_HOME_GRID_LAYOUT: HomeGridLayout = {
  mobile_columns: 3,
  mobile_card_padding: 12,
  mobile_card_gap: 10,
  mobile_icon_size: 52,
  mobile_label_size: 12,
  desktop_columns: 6,
  desktop_card_padding: 16,
  desktop_card_gap: 16,
  desktop_icon_size: 64,
  desktop_label_size: 14,
}

export const HOME_GRID_LAYOUT_PRESETS: {
  mobile: Record<
    HomeGridPresetKey,
    Pick<
      HomeGridLayout,
      | "mobile_columns"
      | "mobile_card_padding"
      | "mobile_card_gap"
      | "mobile_icon_size"
      | "mobile_label_size"
    >
  >
  desktop: Record<
    HomeGridPresetKey,
    Pick<
      HomeGridLayout,
      | "desktop_columns"
      | "desktop_card_padding"
      | "desktop_card_gap"
      | "desktop_icon_size"
      | "desktop_label_size"
    >
  >
} = {
  mobile: {
    compact: {
      mobile_columns: 4,
      mobile_card_padding: 8,
      mobile_card_gap: 6,
      mobile_icon_size: 38,
      mobile_label_size: 10,
    },
    default: {
      mobile_columns: DEFAULT_HOME_GRID_LAYOUT.mobile_columns,
      mobile_card_padding: DEFAULT_HOME_GRID_LAYOUT.mobile_card_padding,
      mobile_card_gap: DEFAULT_HOME_GRID_LAYOUT.mobile_card_gap,
      mobile_icon_size: DEFAULT_HOME_GRID_LAYOUT.mobile_icon_size,
      mobile_label_size: DEFAULT_HOME_GRID_LAYOUT.mobile_label_size,
    },
    large: {
      mobile_columns: 3,
      mobile_card_padding: 14,
      mobile_card_gap: 12,
      mobile_icon_size: 60,
      mobile_label_size: 13,
    },
  },
  desktop: {
    compact: {
      desktop_columns: 8,
      desktop_card_padding: 10,
      desktop_card_gap: 10,
      desktop_icon_size: 48,
      desktop_label_size: 12,
    },
    default: {
      desktop_columns: DEFAULT_HOME_GRID_LAYOUT.desktop_columns,
      desktop_card_padding: DEFAULT_HOME_GRID_LAYOUT.desktop_card_padding,
      desktop_card_gap: DEFAULT_HOME_GRID_LAYOUT.desktop_card_gap,
      desktop_icon_size: DEFAULT_HOME_GRID_LAYOUT.desktop_icon_size,
      desktop_label_size: DEFAULT_HOME_GRID_LAYOUT.desktop_label_size,
    },
    large: {
      desktop_columns: 5,
      desktop_card_padding: 18,
      desktop_card_gap: 18,
      desktop_icon_size: 72,
      desktop_label_size: 15,
    },
  },
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

export function normalizeHomeGridLayout(
  row?: Record<string, unknown> | Partial<HomeGridLayout> | null
): HomeGridLayout {
  if (!row || typeof row !== "object") {
    return { ...DEFAULT_HOME_GRID_LAYOUT }
  }

  const r = row as Record<string, unknown>
  return {
    mobile_columns: clampInt(
      r.mobile_columns,
      HOME_GRID_LAYOUT_LIMITS.mobile_columns.min,
      HOME_GRID_LAYOUT_LIMITS.mobile_columns.max,
      DEFAULT_HOME_GRID_LAYOUT.mobile_columns
    ),
    mobile_card_padding: clampInt(
      r.mobile_card_padding,
      HOME_GRID_LAYOUT_LIMITS.mobile_card_padding.min,
      HOME_GRID_LAYOUT_LIMITS.mobile_card_padding.max,
      DEFAULT_HOME_GRID_LAYOUT.mobile_card_padding
    ),
    mobile_card_gap: clampInt(
      r.mobile_card_gap,
      HOME_GRID_LAYOUT_LIMITS.mobile_card_gap.min,
      HOME_GRID_LAYOUT_LIMITS.mobile_card_gap.max,
      DEFAULT_HOME_GRID_LAYOUT.mobile_card_gap
    ),
    mobile_icon_size: clampInt(
      r.mobile_icon_size,
      HOME_GRID_LAYOUT_LIMITS.mobile_icon_size.min,
      HOME_GRID_LAYOUT_LIMITS.mobile_icon_size.max,
      DEFAULT_HOME_GRID_LAYOUT.mobile_icon_size
    ),
    mobile_label_size: clampInt(
      r.mobile_label_size,
      HOME_GRID_LAYOUT_LIMITS.mobile_label_size.min,
      HOME_GRID_LAYOUT_LIMITS.mobile_label_size.max,
      DEFAULT_HOME_GRID_LAYOUT.mobile_label_size
    ),
    desktop_columns: clampInt(
      r.desktop_columns,
      HOME_GRID_LAYOUT_LIMITS.desktop_columns.min,
      HOME_GRID_LAYOUT_LIMITS.desktop_columns.max,
      DEFAULT_HOME_GRID_LAYOUT.desktop_columns
    ),
    desktop_card_padding: clampInt(
      r.desktop_card_padding,
      HOME_GRID_LAYOUT_LIMITS.desktop_card_padding.min,
      HOME_GRID_LAYOUT_LIMITS.desktop_card_padding.max,
      DEFAULT_HOME_GRID_LAYOUT.desktop_card_padding
    ),
    desktop_card_gap: clampInt(
      r.desktop_card_gap,
      HOME_GRID_LAYOUT_LIMITS.desktop_card_gap.min,
      HOME_GRID_LAYOUT_LIMITS.desktop_card_gap.max,
      DEFAULT_HOME_GRID_LAYOUT.desktop_card_gap
    ),
    desktop_icon_size: clampInt(
      r.desktop_icon_size,
      HOME_GRID_LAYOUT_LIMITS.desktop_icon_size.min,
      HOME_GRID_LAYOUT_LIMITS.desktop_icon_size.max,
      DEFAULT_HOME_GRID_LAYOUT.desktop_icon_size
    ),
    desktop_label_size: clampInt(
      r.desktop_label_size,
      HOME_GRID_LAYOUT_LIMITS.desktop_label_size.min,
      HOME_GRID_LAYOUT_LIMITS.desktop_label_size.max,
      DEFAULT_HOME_GRID_LAYOUT.desktop_label_size
    ),
  }
}

export function isSameHomeGridLayout(a: HomeGridLayout, b: HomeGridLayout): boolean {
  return (
    a.mobile_columns === b.mobile_columns &&
    a.mobile_card_padding === b.mobile_card_padding &&
    a.mobile_card_gap === b.mobile_card_gap &&
    a.mobile_icon_size === b.mobile_icon_size &&
    a.mobile_label_size === b.mobile_label_size &&
    a.desktop_columns === b.desktop_columns &&
    a.desktop_card_padding === b.desktop_card_padding &&
    a.desktop_card_gap === b.desktop_card_gap &&
    a.desktop_icon_size === b.desktop_icon_size &&
    a.desktop_label_size === b.desktop_label_size
  )
}

export async function fetchHomeGridLayoutFromDb(): Promise<HomeGridLayout> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("home_grid_layout")
      .select(
        "mobile_columns, mobile_card_padding, mobile_card_gap, mobile_icon_size, mobile_label_size, desktop_columns, desktop_card_padding, desktop_card_gap, desktop_icon_size, desktop_label_size"
      )
      .eq("id", "default")
      .maybeSingle()

    if (error || !data) {
      return { ...DEFAULT_HOME_GRID_LAYOUT }
    }

    return normalizeHomeGridLayout(data)
  } catch {
    return { ...DEFAULT_HOME_GRID_LAYOUT }
  }
}
