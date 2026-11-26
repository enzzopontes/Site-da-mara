import { getSupabase } from "@/lib/supabase-fix"

export interface HomeGridLayout {
  mobile_columns: number
  mobile_card_padding: number
  mobile_card_gap: number
  mobile_icon_size: number
  mobile_label_size: number
  mobile_card_radius: number
  desktop_columns: number
  desktop_card_padding: number
  desktop_card_gap: number
  desktop_icon_size: number
  desktop_label_size: number
  desktop_card_radius: number
  app_columns: number
  app_card_padding: number
  app_card_gap: number
  app_icon_size: number
  app_label_size: number
  app_card_radius: number
}

export type HomeGridProfile = "mobile" | "desktop" | "app"
export type HomeGridViewport = HomeGridProfile
export type HomeGridPresetKey = "compact" | "default" | "large"

export interface HomeGridProfileValues {
  columns: number
  card_padding: number
  card_gap: number
  icon_size: number
  label_size: number
  card_radius: number
}

export const HOME_GRID_LAYOUT_LIMITS = {
  mobile_columns: { min: 2, max: 4 },
  mobile_card_padding: { min: 4, max: 20 },
  mobile_card_gap: { min: 4, max: 16 },
  mobile_icon_size: { min: 28, max: 68 },
  mobile_label_size: { min: 9, max: 14 },
  mobile_card_radius: { min: 8, max: 24 },
  desktop_columns: { min: 3, max: 8 },
  desktop_card_padding: { min: 6, max: 24 },
  desktop_card_gap: { min: 6, max: 24 },
  desktop_icon_size: { min: 36, max: 80 },
  desktop_label_size: { min: 11, max: 16 },
  desktop_card_radius: { min: 8, max: 24 },
  app_columns: { min: 2, max: 4 },
  app_card_padding: { min: 4, max: 20 },
  app_card_gap: { min: 4, max: 16 },
  app_icon_size: { min: 28, max: 68 },
  app_label_size: { min: 9, max: 14 },
  app_card_radius: { min: 8, max: 24 },
} as const

export const HOME_GRID_SCALE_LIMITS = {
  min: 70,
  max: 120,
  default: 100,
} as const

export const DEFAULT_HOME_GRID_LAYOUT: HomeGridLayout = {
  mobile_columns: 3,
  mobile_card_padding: 12,
  mobile_card_gap: 10,
  mobile_icon_size: 52,
  mobile_label_size: 12,
  mobile_card_radius: 16,
  desktop_columns: 6,
  desktop_card_padding: 16,
  desktop_card_gap: 16,
  desktop_icon_size: 64,
  desktop_label_size: 14,
  desktop_card_radius: 16,
  app_columns: 3,
  app_card_padding: 12,
  app_card_gap: 10,
  app_icon_size: 52,
  app_label_size: 12,
  app_card_radius: 16,
}

export const HOME_GRID_LAYOUT_SELECT_COLUMNS =
  "mobile_columns, mobile_card_padding, mobile_card_gap, mobile_icon_size, mobile_label_size, mobile_card_radius, desktop_columns, desktop_card_padding, desktop_card_gap, desktop_icon_size, desktop_label_size, desktop_card_radius, app_columns, app_card_padding, app_card_gap, app_icon_size, app_label_size, app_card_radius"

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
      | "mobile_card_radius"
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
      | "desktop_card_radius"
    >
  >
  app: Record<
    HomeGridPresetKey,
    Pick<
      HomeGridLayout,
      | "app_columns"
      | "app_card_padding"
      | "app_card_gap"
      | "app_icon_size"
      | "app_label_size"
      | "app_card_radius"
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
      mobile_card_radius: 12,
    },
    default: {
      mobile_columns: DEFAULT_HOME_GRID_LAYOUT.mobile_columns,
      mobile_card_padding: DEFAULT_HOME_GRID_LAYOUT.mobile_card_padding,
      mobile_card_gap: DEFAULT_HOME_GRID_LAYOUT.mobile_card_gap,
      mobile_icon_size: DEFAULT_HOME_GRID_LAYOUT.mobile_icon_size,
      mobile_label_size: DEFAULT_HOME_GRID_LAYOUT.mobile_label_size,
      mobile_card_radius: DEFAULT_HOME_GRID_LAYOUT.mobile_card_radius,
    },
    large: {
      mobile_columns: 3,
      mobile_card_padding: 14,
      mobile_card_gap: 12,
      mobile_icon_size: 60,
      mobile_label_size: 13,
      mobile_card_radius: 18,
    },
  },
  desktop: {
    compact: {
      desktop_columns: 8,
      desktop_card_padding: 10,
      desktop_card_gap: 10,
      desktop_icon_size: 48,
      desktop_label_size: 12,
      desktop_card_radius: 12,
    },
    default: {
      desktop_columns: DEFAULT_HOME_GRID_LAYOUT.desktop_columns,
      desktop_card_padding: DEFAULT_HOME_GRID_LAYOUT.desktop_card_padding,
      desktop_card_gap: DEFAULT_HOME_GRID_LAYOUT.desktop_card_gap,
      desktop_icon_size: DEFAULT_HOME_GRID_LAYOUT.desktop_icon_size,
      desktop_label_size: DEFAULT_HOME_GRID_LAYOUT.desktop_label_size,
      desktop_card_radius: DEFAULT_HOME_GRID_LAYOUT.desktop_card_radius,
    },
    large: {
      desktop_columns: 5,
      desktop_card_padding: 18,
      desktop_card_gap: 18,
      desktop_icon_size: 72,
      desktop_label_size: 15,
      desktop_card_radius: 18,
    },
  },
  app: {
    compact: {
      app_columns: 4,
      app_card_padding: 8,
      app_card_gap: 6,
      app_icon_size: 38,
      app_label_size: 10,
      app_card_radius: 12,
    },
    default: {
      app_columns: DEFAULT_HOME_GRID_LAYOUT.app_columns,
      app_card_padding: DEFAULT_HOME_GRID_LAYOUT.app_card_padding,
      app_card_gap: DEFAULT_HOME_GRID_LAYOUT.app_card_gap,
      app_icon_size: DEFAULT_HOME_GRID_LAYOUT.app_icon_size,
      app_label_size: DEFAULT_HOME_GRID_LAYOUT.app_label_size,
      app_card_radius: DEFAULT_HOME_GRID_LAYOUT.app_card_radius,
    },
    large: {
      app_columns: 3,
      app_card_padding: 14,
      app_card_gap: 12,
      app_icon_size: 60,
      app_label_size: 13,
      app_card_radius: 18,
    },
  },
}

type HarmonicBaseValues = Omit<HomeGridProfileValues, "columns">

const COMPACT_HARMONIC_TABLE: Record<number, HarmonicBaseValues> = {
  2: { card_padding: 16, card_gap: 12, icon_size: 62, label_size: 13, card_radius: 18 },
  3: { card_padding: 12, card_gap: 10, icon_size: 52, label_size: 12, card_radius: 16 },
  4: { card_padding: 8, card_gap: 8, icon_size: 40, label_size: 11, card_radius: 13 },
}

const DESKTOP_HARMONIC_TABLE: Record<number, HarmonicBaseValues> = {
  3: { card_padding: 22, card_gap: 20, icon_size: 76, label_size: 15, card_radius: 20 },
  4: { card_padding: 20, card_gap: 18, icon_size: 72, label_size: 15, card_radius: 18 },
  5: { card_padding: 18, card_gap: 18, icon_size: 68, label_size: 14, card_radius: 17 },
  6: { card_padding: 16, card_gap: 16, icon_size: 64, label_size: 14, card_radius: 16 },
  7: { card_padding: 13, card_gap: 13, icon_size: 56, label_size: 13, card_radius: 14 },
  8: { card_padding: 10, card_gap: 10, icon_size: 48, label_size: 12, card_radius: 12 },
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

export function getProfileLimits(profile: HomeGridProfile) {
  if (profile === "desktop") {
    return {
      columns: HOME_GRID_LAYOUT_LIMITS.desktop_columns,
      card_padding: HOME_GRID_LAYOUT_LIMITS.desktop_card_padding,
      card_gap: HOME_GRID_LAYOUT_LIMITS.desktop_card_gap,
      icon_size: HOME_GRID_LAYOUT_LIMITS.desktop_icon_size,
      label_size: HOME_GRID_LAYOUT_LIMITS.desktop_label_size,
      card_radius: HOME_GRID_LAYOUT_LIMITS.desktop_card_radius,
    } as const
  }
  if (profile === "app") {
    return {
      columns: HOME_GRID_LAYOUT_LIMITS.app_columns,
      card_padding: HOME_GRID_LAYOUT_LIMITS.app_card_padding,
      card_gap: HOME_GRID_LAYOUT_LIMITS.app_card_gap,
      icon_size: HOME_GRID_LAYOUT_LIMITS.app_icon_size,
      label_size: HOME_GRID_LAYOUT_LIMITS.app_label_size,
      card_radius: HOME_GRID_LAYOUT_LIMITS.app_card_radius,
    } as const
  }
  return {
    columns: HOME_GRID_LAYOUT_LIMITS.mobile_columns,
    card_padding: HOME_GRID_LAYOUT_LIMITS.mobile_card_padding,
    card_gap: HOME_GRID_LAYOUT_LIMITS.mobile_card_gap,
    icon_size: HOME_GRID_LAYOUT_LIMITS.mobile_icon_size,
    label_size: HOME_GRID_LAYOUT_LIMITS.mobile_label_size,
    card_radius: HOME_GRID_LAYOUT_LIMITS.mobile_card_radius,
  } as const
}

export function computeBalancedProfile(
  profileKind: HomeGridProfile,
  columns: number,
  scalePercent: number = HOME_GRID_SCALE_LIMITS.default
): HomeGridProfileValues {
  const limits = getProfileLimits(profileKind)
  const defaultCols =
    profileKind === "desktop"
      ? DEFAULT_HOME_GRID_LAYOUT.desktop_columns
      : profileKind === "app"
        ? DEFAULT_HOME_GRID_LAYOUT.app_columns
        : DEFAULT_HOME_GRID_LAYOUT.mobile_columns

  const clampedColumns = clampInt(columns, limits.columns.min, limits.columns.max, defaultCols)
  const clampedScale = clampInt(
    scalePercent,
    HOME_GRID_SCALE_LIMITS.min,
    HOME_GRID_SCALE_LIMITS.max,
    HOME_GRID_SCALE_LIMITS.default
  )

  const table = profileKind === "desktop" ? DESKTOP_HARMONIC_TABLE : COMPACT_HARMONIC_TABLE
  const base = table[clampedColumns] ?? table[defaultCols]
  const factor = clampedScale / 100

  return {
    columns: clampedColumns,
    card_padding: clampInt(
      Math.round(base.card_padding * factor),
      limits.card_padding.min,
      limits.card_padding.max,
      base.card_padding
    ),
    card_gap: clampInt(
      Math.round(base.card_gap * (1 + (factor - 1) * 0.85)),
      limits.card_gap.min,
      limits.card_gap.max,
      base.card_gap
    ),
    icon_size: clampInt(
      Math.round(base.icon_size * factor),
      limits.icon_size.min,
      limits.icon_size.max,
      base.icon_size
    ),
    label_size: clampInt(
      Math.round(base.label_size * (1 + (factor - 1) * 0.55)),
      limits.label_size.min,
      limits.label_size.max,
      base.label_size
    ),
    card_radius: clampInt(
      Math.round(base.card_radius * (1 + (factor - 1) * 0.7)),
      limits.card_radius.min,
      limits.card_radius.max,
      base.card_radius
    ),
  }
}

export function estimateProfileScalePercent(
  profileKind: HomeGridProfile,
  values: HomeGridProfileValues
): number {
  const base = computeBalancedProfile(profileKind, values.columns, 100)
  if (
    values.columns === base.columns &&
    values.card_padding === base.card_padding &&
    values.card_gap === base.card_gap &&
    values.icon_size === base.icon_size &&
    values.label_size === base.label_size &&
    values.card_radius === base.card_radius
  ) {
    return 100
  }

  const weightedRatio =
    0.6 * (values.icon_size / base.icon_size) + 0.4 * (values.card_padding / base.card_padding)
  return clampInt(
    Math.round(weightedRatio * 100),
    HOME_GRID_SCALE_LIMITS.min,
    HOME_GRID_SCALE_LIMITS.max,
    HOME_GRID_SCALE_LIMITS.default
  )
}

export function getProfileValues(
  layout: HomeGridLayout,
  profile: HomeGridProfile
): HomeGridProfileValues {
  if (profile === "desktop") {
    return {
      columns: layout.desktop_columns,
      card_padding: layout.desktop_card_padding,
      card_gap: layout.desktop_card_gap,
      icon_size: layout.desktop_icon_size,
      label_size: layout.desktop_label_size,
      card_radius: layout.desktop_card_radius,
    }
  }
  if (profile === "app") {
    return {
      columns: layout.app_columns,
      card_padding: layout.app_card_padding,
      card_gap: layout.app_card_gap,
      icon_size: layout.app_icon_size,
      label_size: layout.app_label_size,
      card_radius: layout.app_card_radius,
    }
  }
  return {
    columns: layout.mobile_columns,
    card_padding: layout.mobile_card_padding,
    card_gap: layout.mobile_card_gap,
    icon_size: layout.mobile_icon_size,
    label_size: layout.mobile_label_size,
    card_radius: layout.mobile_card_radius,
  }
}

export function applyProfileValues(
  layout: HomeGridLayout,
  profile: HomeGridProfile,
  values: Partial<HomeGridProfileValues>
): HomeGridLayout {
  const limits = getProfileLimits(profile)
  const current = getProfileValues(layout, profile)
  const next: HomeGridProfileValues = {
    columns: clampInt(values.columns, limits.columns.min, limits.columns.max, current.columns),
    card_padding: clampInt(
      values.card_padding,
      limits.card_padding.min,
      limits.card_padding.max,
      current.card_padding
    ),
    card_gap: clampInt(values.card_gap, limits.card_gap.min, limits.card_gap.max, current.card_gap),
    icon_size: clampInt(
      values.icon_size,
      limits.icon_size.min,
      limits.icon_size.max,
      current.icon_size
    ),
    label_size: clampInt(
      values.label_size,
      limits.label_size.min,
      limits.label_size.max,
      current.label_size
    ),
    card_radius: clampInt(
      values.card_radius,
      limits.card_radius.min,
      limits.card_radius.max,
      current.card_radius
    ),
  }

  if (profile === "desktop") {
    return {
      ...layout,
      desktop_columns: next.columns,
      desktop_card_padding: next.card_padding,
      desktop_card_gap: next.card_gap,
      desktop_icon_size: next.icon_size,
      desktop_label_size: next.label_size,
      desktop_card_radius: next.card_radius,
    }
  }
  if (profile === "app") {
    return {
      ...layout,
      app_columns: next.columns,
      app_card_padding: next.card_padding,
      app_card_gap: next.card_gap,
      app_icon_size: next.icon_size,
      app_label_size: next.label_size,
      app_card_radius: next.card_radius,
    }
  }
  return {
    ...layout,
    mobile_columns: next.columns,
    mobile_card_padding: next.card_padding,
    mobile_card_gap: next.card_gap,
    mobile_icon_size: next.icon_size,
    mobile_label_size: next.label_size,
    mobile_card_radius: next.card_radius,
  }
}

export function copyMobileToAppProfile(layout: HomeGridLayout): HomeGridLayout {
  return applyProfileValues(layout, "app", getProfileValues(layout, "mobile"))
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
    mobile_card_radius: clampInt(
      r.mobile_card_radius,
      HOME_GRID_LAYOUT_LIMITS.mobile_card_radius.min,
      HOME_GRID_LAYOUT_LIMITS.mobile_card_radius.max,
      DEFAULT_HOME_GRID_LAYOUT.mobile_card_radius
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
    desktop_card_radius: clampInt(
      r.desktop_card_radius,
      HOME_GRID_LAYOUT_LIMITS.desktop_card_radius.min,
      HOME_GRID_LAYOUT_LIMITS.desktop_card_radius.max,
      DEFAULT_HOME_GRID_LAYOUT.desktop_card_radius
    ),
    app_columns: clampInt(
      r.app_columns,
      HOME_GRID_LAYOUT_LIMITS.app_columns.min,
      HOME_GRID_LAYOUT_LIMITS.app_columns.max,
      DEFAULT_HOME_GRID_LAYOUT.app_columns
    ),
    app_card_padding: clampInt(
      r.app_card_padding,
      HOME_GRID_LAYOUT_LIMITS.app_card_padding.min,
      HOME_GRID_LAYOUT_LIMITS.app_card_padding.max,
      DEFAULT_HOME_GRID_LAYOUT.app_card_padding
    ),
    app_card_gap: clampInt(
      r.app_card_gap,
      HOME_GRID_LAYOUT_LIMITS.app_card_gap.min,
      HOME_GRID_LAYOUT_LIMITS.app_card_gap.max,
      DEFAULT_HOME_GRID_LAYOUT.app_card_gap
    ),
    app_icon_size: clampInt(
      r.app_icon_size,
      HOME_GRID_LAYOUT_LIMITS.app_icon_size.min,
      HOME_GRID_LAYOUT_LIMITS.app_icon_size.max,
      DEFAULT_HOME_GRID_LAYOUT.app_icon_size
    ),
    app_label_size: clampInt(
      r.app_label_size,
      HOME_GRID_LAYOUT_LIMITS.app_label_size.min,
      HOME_GRID_LAYOUT_LIMITS.app_label_size.max,
      DEFAULT_HOME_GRID_LAYOUT.app_label_size
    ),
    app_card_radius: clampInt(
      r.app_card_radius,
      HOME_GRID_LAYOUT_LIMITS.app_card_radius.min,
      HOME_GRID_LAYOUT_LIMITS.app_card_radius.max,
      DEFAULT_HOME_GRID_LAYOUT.app_card_radius
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
    a.mobile_card_radius === b.mobile_card_radius &&
    a.desktop_columns === b.desktop_columns &&
    a.desktop_card_padding === b.desktop_card_padding &&
    a.desktop_card_gap === b.desktop_card_gap &&
    a.desktop_icon_size === b.desktop_icon_size &&
    a.desktop_label_size === b.desktop_label_size &&
    a.desktop_card_radius === b.desktop_card_radius &&
    a.app_columns === b.app_columns &&
    a.app_card_padding === b.app_card_padding &&
    a.app_card_gap === b.app_card_gap &&
    a.app_icon_size === b.app_icon_size &&
    a.app_label_size === b.app_label_size &&
    a.app_card_radius === b.app_card_radius
  )
}

export async function fetchHomeGridLayoutFromDb(): Promise<HomeGridLayout> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("home_grid_layout")
      .select(HOME_GRID_LAYOUT_SELECT_COLUMNS)
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
