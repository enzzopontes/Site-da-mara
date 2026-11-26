"use client"

import { useMemo, useRef, useState, type DragEvent } from "react"
import {
  AlertCircle,
  ArrowLeftRight,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Loader2,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TabletSmartphone,
  Trophy,
  UtensilsCrossed,
} from "lucide-react"
import {
  getHomeBarCategories,
  getHomeFeaturedCategories,
  getMenuCategories,
  type CategoryWithCounts,
  type MenuLayoutZone,
} from "@/lib/categories-db"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"
import {
  DEFAULT_HOME_GRID_LAYOUT,
  HOME_GRID_LAYOUT_PRESETS,
  HOME_GRID_SCALE_LIMITS,
  applyProfileValues,
  computeBalancedProfile,
  copyMobileToAppProfile,
  estimateProfileScalePercent,
  getProfileLimits,
  getProfileValues,
  type HomeGridLayout,
  type HomeGridPresetKey,
  type HomeGridProfile,
  type HomeGridProfileValues,
} from "@/lib/home-grid-layout"
import { CategoryIcon } from "@/components/category-icon"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface CategoryLivePreviewProps {
  categories: CategoryWithCounts[]
  activeTab?: string
  hasUnsavedChanges?: boolean
  savingChanges?: boolean
  writesDisabled?: boolean
  layoutWritesDisabled?: boolean
  layoutMigrationPending?: boolean
  homeGridLayout?: HomeGridLayout
  onChangeHomeGridLayout?: (next: HomeGridLayout) => void
  onEditCategory?: (category: CategoryWithCounts) => void
  onReorderHomeBar?: (orderedVisibleIds: string[]) => void
  onReorderHomeFeatured?: (orderedVisibleIds: string[]) => void
  onReorderMenu?: (
    items: Array<{ id: string; menu_layout_zone: MenuLayoutZone }>
  ) => void
  onSaveChanges?: () => void
  onDiscardChanges?: () => void
}

type PreviewViewport = HomeGridProfile
type PreviewDragSection = "home_bar" | "home_featured" | "menu"
type PreviewSimCount = "real" | 8 | 10

interface SimulatedPreviewItem {
  id: string
  name: string
  fallback_icon: string
  accent_color: string
  badge_text?: string
  badge_color?: string
}

type HomeBarRenderItem =
  | { kind: "real"; category: CategoryWithCounts }
  | { kind: "simulated"; demo: SimulatedPreviewItem }

const PROFILE_LABELS: Record<HomeGridProfile, string> = {
  mobile: "Site Mobile",
  desktop: "Site Desktop",
  app: "App",
}

const SIMULATED_DEMO_CATEGORIES: SimulatedPreviewItem[] = [
  {
    id: "__demo_sobremesas",
    name: "Sobremesas",
    fallback_icon: "IceCreamCone",
    accent_color: "#C1440E",
  },
  {
    id: "__demo_lasanhas",
    name: "Lasanhas",
    fallback_icon: "UtensilsCrossed",
    accent_color: "#E3A008",
  },
  {
    id: "__demo_porcoes",
    name: "Porções",
    fallback_icon: "Flame",
    accent_color: "#D97706",
  },
  {
    id: "__demo_combos",
    name: "Combos",
    fallback_icon: "Sparkles",
    accent_color: "#B45309",
  },
  {
    id: "__demo_panquecas",
    name: "Panquecas",
    fallback_icon: "Cookie",
    accent_color: "#A16207",
  },
  {
    id: "__demo_caldos",
    name: "Caldos",
    fallback_icon: "Soup",
    accent_color: "#C1440E",
  },
  {
    id: "__demo_esfihas",
    name: "Esfihas",
    fallback_icon: "Pizza",
    accent_color: "#E3A008",
  },
  {
    id: "__demo_sucos",
    name: "Sucos",
    fallback_icon: "CupSoda",
    accent_color: "#15803D",
  },
  {
    id: "__demo_acai",
    name: "Açaí",
    fallback_icon: "Coffee",
    accent_color: "#7E22CE",
  },
  {
    id: "__demo_kits",
    name: "Kits Festa",
    fallback_icon: "Gift",
    accent_color: "#C1440E",
  },
]

interface DragState {
  section: PreviewDragSection
  id: string
}

interface DragOverTarget {
  section: PreviewDragSection
  id?: string
  zone?: MenuLayoutZone
}

function reorderIds(
  ids: string[],
  sourceId: string,
  targetId: string
): string[] | null {
  const fromIndex = ids.indexOf(sourceId)
  const toIndex = ids.indexOf(targetId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return null
  const next = [...ids]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function CategoryLivePreview({
  categories,
  activeTab,
  hasUnsavedChanges = false,
  savingChanges = false,
  writesDisabled = false,
  layoutWritesDisabled = false,
  layoutMigrationPending = false,
  homeGridLayout = DEFAULT_HOME_GRID_LAYOUT,
  onChangeHomeGridLayout,
  onEditCategory,
  onReorderHomeBar,
  onReorderHomeFeatured,
  onReorderMenu,
  onSaveChanges,
  onDiscardChanges,
}: CategoryLivePreviewProps) {
  const [viewport, setViewport] = useState<PreviewViewport>("mobile")
  const [simulateStoreAutoHide, setSimulateStoreAutoHide] = useState(false)
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false)
  const [fineTuningOpen, setFineTuningOpen] = useState(false)
  const [simCount, setSimCount] = useState<PreviewSimCount>("real")
  const [scaleOverride, setScaleOverride] = useState<
    Partial<Record<HomeGridProfile, number>>
  >({})
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<DragOverTarget | null>(
    null
  )

  const lastDragEndAtRef = useRef(0)
  const isDraggingRef = useRef(false)

  const canDragHomeBar =
    !writesDisabled && !savingChanges && Boolean(onReorderHomeBar)
  const canDragHomeFeatured =
    !writesDisabled && !savingChanges && Boolean(onReorderHomeFeatured)
  const canDragMenu =
    !writesDisabled && !savingChanges && Boolean(onReorderMenu)

  const isDesktop = viewport === "desktop"
  const isApp = viewport === "app"
  const activeProfileLabel = PROFILE_LABELS[viewport]
  const isLayoutDisabled = Boolean(
    writesDisabled ||
      layoutWritesDisabled ||
      savingChanges ||
      !onChangeHomeGridLayout
  )

  const activeValues = getProfileValues(homeGridLayout, viewport)
  const activeCols = activeValues.columns
  const activePad = activeValues.card_padding
  const activeGap = activeValues.card_gap
  const activeIcon = activeValues.icon_size
  const activeLabel = activeValues.label_size
  const activeRadius = activeValues.card_radius

  const activeLimits = getProfileLimits(viewport)
  const estimatedScalePercent = estimateProfileScalePercent(
    viewport,
    activeValues
  )
  const activeScalePercent = scaleOverride[viewport] ?? estimatedScalePercent
  const columnOptions = isDesktop ? [3, 4, 5, 6, 7, 8] : [2, 3, 4]

  // Escala proporcional do preview (Site Desktop / Site Mobile)
  const previewGap = isDesktop
    ? Math.max(3, Math.round(activeGap * 0.35))
    : Math.max(4, Math.round(activeGap * 0.72))
  const previewPadY = isDesktop
    ? Math.max(3, Math.round(activePad * 0.4))
    : Math.max(4, Math.round(activePad * 0.74))
  const previewPadX = isDesktop
    ? Math.max(2, Math.round(activePad * 0.3))
    : Math.max(3, Math.round(activePad * 0.55))
  const previewIcon = isDesktop
    ? Math.max(16, Math.min(36, Math.round(activeIcon * 0.44)))
    : Math.max(22, Math.min(54, Math.round(activeIcon * 0.78)))
  const previewLabel = isDesktop
    ? Math.max(7.5, Math.round(activeLabel * 0.68 * 10) / 10)
    : Math.max(8.5, Math.round(activeLabel * 0.88 * 10) / 10)
  const previewRadius = isDesktop
    ? Math.max(6, Math.round(activeRadius * 0.65))
    : Math.max(6, Math.round(activeRadius * 0.85))

  // Escala fiel ao Batatop-app/app/index.js dentro da moldura ~390px
  const appColGap = activeGap
  const appRowGap = Math.max(activeGap, 12)
  const appPadY = activePad
  const appPadX = Math.max(4, Math.round(activePad * 0.75))
  const appApproxSlotWidth = Math.floor(
    (326 - appColGap * (activeCols - 1)) / activeCols
  )
  const appMaxSafeIcon = Math.max(24, appApproxSlotWidth - appPadX * 2)
  const appIconSize = Math.min(activeIcon, appMaxSafeIcon)
  const appLabelSize = activeLabel
  const appLabelLineHeight = Math.round(activeLabel * 1.35)
  const appCardRadius = activeRadius

  function matchesPreset(presetKey: HomeGridPresetKey): boolean {
    const preset = HOME_GRID_LAYOUT_PRESETS[viewport][presetKey] as Record<
      string,
      number
    >
    return (
      activeCols === preset[`${viewport}_columns`] &&
      activePad === preset[`${viewport}_card_padding`] &&
      activeGap === preset[`${viewport}_card_gap`] &&
      activeIcon === preset[`${viewport}_icon_size`] &&
      activeLabel === preset[`${viewport}_label_size`] &&
      activeRadius === preset[`${viewport}_card_radius`]
    )
  }

  function clearProfileScaleOverride(profile: HomeGridProfile) {
    setScaleOverride((prev) => {
      if (prev[profile] === undefined) return prev
      const next = { ...prev }
      delete next[profile]
      return next
    })
  }

  function applyPreset(presetKey: HomeGridPresetKey) {
    if (isLayoutDisabled || !onChangeHomeGridLayout) return
    clearProfileScaleOverride(viewport)
    onChangeHomeGridLayout({
      ...homeGridLayout,
      ...HOME_GRID_LAYOUT_PRESETS[viewport][presetKey],
    })
  }

  function handleSelectColumns(nextColumns: number) {
    if (isLayoutDisabled || !onChangeHomeGridLayout) return
    if (nextColumns === activeCols) return
    clearProfileScaleOverride(viewport)
    const balanced = computeBalancedProfile(
      viewport,
      nextColumns,
      HOME_GRID_SCALE_LIMITS.default
    )
    onChangeHomeGridLayout(applyProfileValues(homeGridLayout, viewport, balanced))
  }

  function handleMasterScaleChange(nextScale: number) {
    if (isLayoutDisabled || !onChangeHomeGridLayout) return
    setScaleOverride((prev) => ({ ...prev, [viewport]: nextScale }))
    const balanced = computeBalancedProfile(viewport, activeCols, nextScale)
    onChangeHomeGridLayout(applyProfileValues(homeGridLayout, viewport, balanced))
  }

  function updateActiveLayoutField(
    field: keyof HomeGridProfileValues,
    value: number
  ) {
    if (isLayoutDisabled || !onChangeHomeGridLayout) return
    if (activeValues[field] === value) return
    clearProfileScaleOverride(viewport)
    onChangeHomeGridLayout(
      applyProfileValues(homeGridLayout, viewport, { [field]: value })
    )
  }

  const defaultActiveValues = getProfileValues(DEFAULT_HOME_GRID_LAYOUT, viewport)
  const isActiveViewportDefault =
    activeCols === defaultActiveValues.columns &&
    activePad === defaultActiveValues.card_padding &&
    activeGap === defaultActiveValues.card_gap &&
    activeIcon === defaultActiveValues.icon_size &&
    activeLabel === defaultActiveValues.label_size &&
    activeRadius === defaultActiveValues.card_radius

  const mobileValues = getProfileValues(homeGridLayout, "mobile")
  const appValues = getProfileValues(homeGridLayout, "app")
  const isAppSameAsMobile =
    appValues.columns === mobileValues.columns &&
    appValues.card_padding === mobileValues.card_padding &&
    appValues.card_gap === mobileValues.card_gap &&
    appValues.icon_size === mobileValues.icon_size &&
    appValues.label_size === mobileValues.label_size &&
    appValues.card_radius === mobileValues.card_radius

  function handleCopyMobileToApp() {
    if (isLayoutDisabled || !onChangeHomeGridLayout || isAppSameAsMobile) return
    clearProfileScaleOverride("app")
    onChangeHomeGridLayout(copyMobileToAppProfile(homeGridLayout))
  }

  function resetActiveViewportLayout() {
    if (
      isLayoutDisabled ||
      !onChangeHomeGridLayout ||
      isActiveViewportDefault
    ) {
      return
    }
    clearProfileScaleOverride(viewport)
    onChangeHomeGridLayout(
      applyProfileValues(homeGridLayout, viewport, defaultActiveValues)
    )
  }

  const categoryById = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat])),
    [categories]
  )

  const { realCountsBySlug, previewCountsBySlug } = useMemo(() => {
    const real: Record<string, number> = {}
    const preview: Record<string, number> = {}
    for (const cat of categories) {
      const normalized = normalizeLegacyCategorySlug(cat.slug)
      real[normalized] = cat.active_products
      preview[normalized] = simulateStoreAutoHide
        ? cat.active_products
        : Math.max(1, cat.active_products)
    }
    return { realCountsBySlug: real, previewCountsBySlug: preview }
  }, [categories, simulateStoreAutoHide])

  const homeBarItems = useMemo(() => {
    return getHomeBarCategories(categories, previewCountsBySlug)
      .map((cat) => categoryById.get(cat.id))
      .filter((cat): cat is CategoryWithCounts => Boolean(cat))
  }, [categories, previewCountsBySlug, categoryById])

  const displayedHomeBarItems = useMemo<HomeBarRenderItem[]>(() => {
    const realItems: HomeBarRenderItem[] = homeBarItems.map((category) => ({
      kind: "real",
      category,
    }))
    if (simCount === "real" || realItems.length >= simCount) {
      return realItems
    }
    const existingNames = new Set(
      homeBarItems.map((c) => c.name.trim().toLowerCase())
    )
    const needed = simCount - realItems.length
    const demoPool = SIMULATED_DEMO_CATEGORIES.filter(
      (d) => !existingNames.has(d.name.trim().toLowerCase())
    )
    const simulatedItems: HomeBarRenderItem[] = demoPool
      .slice(0, needed)
      .map((demo) => ({ kind: "simulated", demo }))
    return [...realItems, ...simulatedItems]
  }, [homeBarItems, simCount])

  const simulatedSlotsCount =
    displayedHomeBarItems.length - homeBarItems.length

  const homeFeaturedItems = useMemo(() => {
    return getHomeFeaturedCategories(categories, previewCountsBySlug)
      .map((cat) => categoryById.get(cat.id))
      .filter((cat): cat is CategoryWithCounts => Boolean(cat))
  }, [categories, previewCountsBySlug, categoryById])

  const menuItems = useMemo(() => {
    return getMenuCategories(categories, previewCountsBySlug)
      .map((cat) => categoryById.get(cat.id))
      .filter((cat): cat is CategoryWithCounts => Boolean(cat))
  }, [categories, previewCountsBySlug, categoryById])

  const storeVisibleHomeBarCount = useMemo(
    () => getHomeBarCategories(categories, realCountsBySlug).length,
    [categories, realCountsBySlug]
  )

  const emptyHiddenCount = useMemo(() => {
    return categories.filter(
      (cat) =>
        cat.is_active &&
        cat.kind === "product_category" &&
        cat.active_products === 0 &&
        (cat.show_on_home_bar || cat.show_on_home_featured || cat.show_on_menu)
    ).length
  }, [categories])

  const menuMainItems = useMemo(
    () => menuItems.filter((cat) => cat.menu_layout_zone !== "sidebar_right"),
    [menuItems]
  )

  const menuSidebarItems = useMemo(
    () => menuItems.filter((cat) => cat.menu_layout_zone === "sidebar_right"),
    [menuItems]
  )

  function startDrag(
    e: DragEvent<HTMLElement>,
    section: PreviewDragSection,
    id: string
  ) {
    isDraggingRef.current = true
    setDragState({ section, id })
    setDragOverTarget(null)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", `${section}:${id}`)
  }

  function finishDrag() {
    lastDragEndAtRef.current = Date.now()
    isDraggingRef.current = false
    setDragState(null)
    setDragOverTarget(null)
  }

  function resolveDraggedId(
    e: DragEvent<HTMLElement>,
    expectedSection: PreviewDragSection
  ): string | null {
    if (dragState?.section === expectedSection) return dragState.id
    const raw = e.dataTransfer.getData("text/plain")
    if (raw.startsWith(`${expectedSection}:`)) {
      return raw.slice(expectedSection.length + 1)
    }
    return null
  }

  function handleCardClick(category: CategoryWithCounts) {
    if (isDraggingRef.current || Date.now() - lastDragEndAtRef.current < 300) {
      return
    }
    onEditCategory?.(category)
  }

  function handleDropHomeBar(e: DragEvent<HTMLElement>, targetId: string) {
    e.preventDefault()
    const sourceId = resolveDraggedId(e, "home_bar")
    finishDrag()
    if (!canDragHomeBar || !sourceId || sourceId === targetId) return
    const nextIds = reorderIds(
      homeBarItems.map((c) => c.id),
      sourceId,
      targetId
    )
    if (nextIds) onReorderHomeBar?.(nextIds)
  }

  function handleDropHomeFeatured(e: DragEvent<HTMLElement>, targetId: string) {
    e.preventDefault()
    const sourceId = resolveDraggedId(e, "home_featured")
    finishDrag()
    if (!canDragHomeFeatured || !sourceId || sourceId === targetId) return
    const nextIds = reorderIds(
      homeFeaturedItems.map((c) => c.id),
      sourceId,
      targetId
    )
    if (nextIds) onReorderHomeFeatured?.(nextIds)
  }

  function emitDesktopZones(
    nextMainIds: string[],
    nextSidebarIds: string[]
  ) {
    onReorderMenu?.([
      ...nextMainIds.map((id) => ({
        id,
        menu_layout_zone: "main" as MenuLayoutZone,
      })),
      ...nextSidebarIds.map((id) => ({
        id,
        menu_layout_zone: "sidebar_right" as MenuLayoutZone,
      })),
    ])
  }

  function handleDropMenuDesktopCard(
    e: DragEvent<HTMLElement>,
    targetId: string,
    targetZone: MenuLayoutZone
  ) {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = resolveDraggedId(e, "menu")
    finishDrag()
    if (!canDragMenu || !sourceId || sourceId === targetId) return

    const mainIds = menuMainItems.map((c) => c.id)
    const sidebarIds = menuSidebarItems.map((c) => c.id)
    const sourceInSidebar = sidebarIds.includes(sourceId)
    const sourceZone: MenuLayoutZone = sourceInSidebar
      ? "sidebar_right"
      : "main"

    if (sourceZone === targetZone) {
      if (targetZone === "main") {
        const nextMain = reorderIds(mainIds, sourceId, targetId)
        if (nextMain) emitDesktopZones(nextMain, sidebarIds)
      } else {
        const nextSidebar = reorderIds(sidebarIds, sourceId, targetId)
        if (nextSidebar) emitDesktopZones(mainIds, nextSidebar)
      }
      return
    }

    const nextMain = mainIds.filter((id) => id !== sourceId)
    const nextSidebar = sidebarIds.filter((id) => id !== sourceId)

    if (targetZone === "main") {
      const insertAt = nextMain.indexOf(targetId)
      if (insertAt === -1) nextMain.push(sourceId)
      else nextMain.splice(insertAt, 0, sourceId)
    } else {
      const insertAt = nextSidebar.indexOf(targetId)
      if (insertAt === -1) nextSidebar.push(sourceId)
      else nextSidebar.splice(insertAt, 0, sourceId)
    }

    emitDesktopZones(nextMain, nextSidebar)
  }

  function handleDropMenuDesktopZone(
    e: DragEvent<HTMLElement>,
    targetZone: MenuLayoutZone
  ) {
    e.preventDefault()
    const sourceId = resolveDraggedId(e, "menu")
    finishDrag()
    if (!canDragMenu || !sourceId) return
    if (!menuItems.some((c) => c.id === sourceId)) return

    const currentMainIds = menuMainItems.map((c) => c.id)
    const currentSidebarIds = menuSidebarItems.map((c) => c.id)

    const nextMain = currentMainIds.filter((id) => id !== sourceId)
    const nextSidebar = currentSidebarIds.filter((id) => id !== sourceId)

    if (targetZone === "main") {
      nextMain.push(sourceId)
    } else {
      nextSidebar.push(sourceId)
    }

    const mainUnchanged =
      nextMain.length === currentMainIds.length &&
      nextMain.every((id, idx) => id === currentMainIds[idx])
    const sidebarUnchanged =
      nextSidebar.length === currentSidebarIds.length &&
      nextSidebar.every((id, idx) => id === currentSidebarIds[idx])

    if (mainUnchanged && sidebarUnchanged) return

    emitDesktopZones(nextMain, nextSidebar)
  }

  function handleDropMenuMobileCard(
    e: DragEvent<HTMLElement>,
    targetId: string
  ) {
    e.preventDefault()
    const sourceId = resolveDraggedId(e, "menu")
    finishDrag()
    if (!canDragMenu || !sourceId || sourceId === targetId) return

    const nextIds = reorderIds(
      menuItems.map((c) => c.id),
      sourceId,
      targetId
    )
    if (!nextIds) return

    onReorderMenu?.(
      nextIds.map((id) => {
        const cat = categoryById.get(id)
        const zone: MenuLayoutZone =
          cat?.menu_layout_zone === "sidebar_right" ? "sidebar_right" : "main"
        return { id, menu_layout_zone: zone }
      })
    )
  }

  function handleToggleMobileZone(categoryId: string) {
    if (writesDisabled || savingChanges || !onReorderMenu) return
    onReorderMenu(
      menuItems.map((cat) => {
        const currentZone: MenuLayoutZone =
          cat.menu_layout_zone === "sidebar_right" ? "sidebar_right" : "main"
        if (cat.id !== categoryId) {
          return { id: cat.id, menu_layout_zone: currentZone }
        }
        return {
          id: cat.id,
          menu_layout_zone:
            currentZone === "sidebar_right" ? "main" : "sidebar_right",
        }
      })
    )
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[#ECE7E0] bg-[#F7F5F0] shadow-sm overflow-hidden">
      {/* Preview Header */}
      <div className="border-b border-[#ECE7E0] bg-[#FEF8EC] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-[#E3A008] animate-pulse" />
            <h3 className="text-sm font-bold tracking-tight text-[#1F1A17] truncate">
              Prévia ao Vivo da Loja
            </h3>
          </div>
          <p className="text-[11px] text-[#6E6258]">
            {!writesDisabled &&
            (onReorderHomeBar || onReorderHomeFeatured || onReorderMenu)
              ? "Arraste para reordenar · Clique para editar"
              : "Atualiza em tempo real conforme você organiza"}
          </p>
        </div>

        <div
          role="group"
          aria-label="Alternar perfil de visualização"
          className="mt-2.5 grid grid-cols-3 items-center rounded-lg border border-[#ECE7E0] bg-white p-0.5 gap-0.5"
        >
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            aria-pressed={viewport === "mobile"}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              viewport === "mobile"
                ? "bg-[#E3A008] text-white shadow-xs"
                : "text-[#6E6258] hover:text-[#1F1A17]"
            )}
          >
            <Smartphone className="size-3.5 shrink-0" />
            <span className="truncate">Site Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            aria-pressed={viewport === "desktop"}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              viewport === "desktop"
                ? "bg-[#E3A008] text-white shadow-xs"
                : "text-[#6E6258] hover:text-[#1F1A17]"
            )}
          >
            <Monitor className="size-3.5 shrink-0" />
            <span className="truncate">Site Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport("app")}
            aria-pressed={viewport === "app"}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              viewport === "app"
                ? "bg-[#C1440E] text-white shadow-xs"
                : "text-[#6E6258] hover:text-[#1F1A17]"
            )}
          >
            <TabletSmartphone className="size-3.5 shrink-0" />
            <span className="truncate">App</span>
          </button>
        </div>

        {/* Auto-hide toggle & note */}
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#ECE7E0] bg-white/85 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5C5248] min-w-0">
            {simulateStoreAutoHide ? (
              <EyeOff className="size-3.5 shrink-0 text-[#C1440E]" />
            ) : (
              <Eye className="size-3.5 shrink-0 text-[#E3A008]" />
            )}
            <span className="truncate">
              Simular auto-ocultação de vazias
            </span>
          </div>
          <Switch
            checked={simulateStoreAutoHide}
            onCheckedChange={setSimulateStoreAutoHide}
            aria-label="Simular auto-ocultação de categorias sem produtos ativos"
            className="data-[state=checked]:bg-[#E3A008]"
          />
        </div>

        {emptyHiddenCount > 0 && (
          <p className="mt-1.5 flex items-start gap-1 text-[10.5px] leading-snug text-[#8A6100]">
            <AlertCircle className="size-3 shrink-0 mt-0.5 text-[#E3A008]" />
            <span>
              Categorias de produto com <strong>0 ativos</strong> ficam ocultas
              automaticamente na loja ({emptyHiddenCount}{" "}
              {emptyHiddenCount === 1 ? "vazia" : "vazias"}).
            </span>
          </p>
        )}
      </div>

      {/* Preview Sections */}
      <div className="flex-1 min-h-0 space-y-3.5 p-3.5 max-h-[calc(100vh-14rem)] overflow-y-auto">
        {/* Section A: Grade 3D da Home */}
        <section
          aria-label="Prévia da Grade 3D da Home"
          className={cn(
            "rounded-xl border bg-white p-3 transition-all",
            activeTab === "home_bar"
              ? "border-[#E3A008] ring-2 ring-[#E3A008]/20"
              : "border-[#ECE7E0]"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <LayoutGrid className="size-3.5 shrink-0 text-[#E3A008]" />
              <h4 className="text-xs font-bold text-[#1F1A17] truncate">
                Grade 3D da Home
              </h4>
            </div>
            <span className="shrink-0 rounded-full bg-[#FEF8EC] px-2 py-0.5 text-[10px] font-semibold text-[#8A6100] border border-[#E3A008]/30">
              {storeVisibleHomeBarCount} na loja
            </span>
          </div>

          {/* Simulador visual de quantidade (somente preview) */}
          <div className="mb-2.5 flex items-center justify-between gap-2 rounded-lg border border-[#ECE7E0] bg-[#FAF8F5] px-2 py-1">
            <span className="text-[10px] font-semibold text-[#6E6258] truncate">
              Simulador
              {simulatedSlotsCount > 0 && (
                <span className="ml-1 text-[#C1440E]">
                  (+{simulatedSlotsCount} demo)
                </span>
              )}
            </span>
            <div
              role="group"
              aria-label="Simular quantidade de categorias na grade"
              className="inline-flex items-center rounded-md border border-[#ECE7E0] bg-white p-0.5 shrink-0"
            >
              {(
                [
                  { value: "real", label: "Reais" },
                  { value: 8, label: "Simular 8" },
                  { value: 10, label: "Simular 10" },
                ] as const
              ).map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setSimCount(opt.value)}
                  aria-pressed={simCount === opt.value}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                    simCount === opt.value
                      ? "bg-[#E3A008] text-white"
                      : "text-[#6E6258] hover:text-[#1F1A17]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Collapsible
            open={layoutEditorOpen}
            onOpenChange={setLayoutEditorOpen}
            className="mb-2.5"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#ECE7E0] bg-[#FAF8F5] px-2.5 py-1.5 text-left transition-colors hover:border-[#E3A008]/60 hover:bg-[#FEF8EC]/50"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <SlidersHorizontal className="size-3.5 shrink-0 text-[#E3A008]" />
                  <span className="text-[11px] font-semibold text-[#1F1A17] truncate">
                    Ajustar Tamanho &amp; Colunas
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold",
                      isApp
                        ? "border-[#C1440E]/35 bg-[#FFF4EE] text-[#C1440E]"
                        : "border-[#E3A008]/35 bg-[#FEF8EC] text-[#A16207]"
                    )}
                  >
                    {activeProfileLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-[#7A6E63] transition-transform duration-200",
                      layoutEditorOpen && "rotate-180"
                    )}
                  />
                </span>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-2.5 rounded-lg border border-[#ECE7E0] bg-[#FAF8F5] p-2.5 space-y-3">
              {(layoutMigrationPending || writesDisabled) && (
                <div
                  role="status"
                  className="flex items-start gap-1.5 rounded-md border border-[#E3A008]/40 bg-[#FEF8EC] px-2 py-1.5 text-[10.5px] leading-snug text-[#8A6100]"
                >
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-[#E3A008]" />
                  <span>
                    {layoutMigrationPending
                      ? "Migrations 031/032 pendentes no Supabase. Execute os scripts em scripts/ para salvar o layout."
                      : "Somente leitura (offline ou banco indisponível)."}
                  </span>
                </div>
              )}

              {/* Ação rápida exclusiva da aba App */}
              {isApp && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-[#C1440E]/20 bg-[#FFF8F4] px-2 py-1.5">
                  <span className="text-[10.5px] font-medium text-[#7A3519]">
                    Perfil independente do App Mobile
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isLayoutDisabled || isAppSameAsMobile}
                    onClick={handleCopyMobileToApp}
                    className="h-6 px-2 text-[10px] font-semibold border-[#C1440E]/30 bg-white text-[#C1440E] hover:bg-[#FFF4EE] hover:text-[#9A3309] shrink-0"
                  >
                    <Copy className="size-3 mr-1" />
                    Copiar do Site Mobile
                  </Button>
                </div>
              )}

              {/* Seletor de Colunas com auto-equilíbrio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#1F1A17]">
                    Colunas por linha
                  </span>
                  <span className="text-[10px] font-medium text-[#7A6E63]">
                    Auto-equilíbrio
                  </span>
                </div>
                <div
                  role="group"
                  aria-label={`Colunas por linha (${activeProfileLabel})`}
                  className={cn(
                    "grid gap-1",
                    isDesktop ? "grid-cols-6" : "grid-cols-3"
                  )}
                >
                  {columnOptions.map((cols) => {
                    const active = activeCols === cols
                    return (
                      <button
                        key={cols}
                        type="button"
                        disabled={isLayoutDisabled}
                        onClick={() => handleSelectColumns(cols)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-md border py-1 text-[11px] font-bold tabular-nums transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                          active
                            ? isApp
                              ? "border-[#C1440E] bg-[#FFF4EE] text-[#C1440E]"
                              : "border-[#E3A008] bg-[#FEF8EC] text-[#A16207]"
                            : "border-[#ECE7E0] bg-white text-[#5C5248] hover:border-[#E3A008]/60 hover:text-[#1F1A17]"
                        )}
                      >
                        {cols}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Slider Mestre: Tamanho Geral (70% a 120%) */}
              <div className="space-y-1.5 rounded-md border border-[#ECE7E0] bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#1F1A17]">
                    Tamanho Geral
                  </span>
                  <span className="rounded bg-[#FEF8EC] border border-[#E3A008]/35 px-1.5 py-0.5 text-[10px] font-bold text-[#A16207] tabular-nums">
                    {activeScalePercent}%
                  </span>
                </div>
                <Slider
                  min={HOME_GRID_SCALE_LIMITS.min}
                  max={HOME_GRID_SCALE_LIMITS.max}
                  step={1}
                  value={[activeScalePercent]}
                  disabled={isLayoutDisabled}
                  onValueChange={([v]) => {
                    if (typeof v === "number") {
                      handleMasterScaleChange(v)
                    }
                  }}
                  aria-label={`Tamanho geral (${activeProfileLabel})`}
                  className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                />
                <div className="flex items-center justify-between text-[9.5px] text-[#8B7E72] tabular-nums">
                  <span>{HOME_GRID_SCALE_LIMITS.min}%</span>
                  <span>100% harmônico</span>
                  <span>{HOME_GRID_SCALE_LIMITS.max}%</span>
                </div>
              </div>

              {/* Presets Rápidos */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6E63]">
                  Presets Rápidos ({activeProfileLabel})
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { key: "compact", label: "Compacto" },
                      { key: "default", label: "Padrão" },
                      { key: "large", label: "Grande" },
                    ] as const
                  ).map(({ key, label }) => {
                    const active = matchesPreset(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isLayoutDisabled}
                        onClick={() => applyPreset(key)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                          active
                            ? "border-[#E3A008] bg-[#FEF8EC] text-[#A16207]"
                            : "border-[#ECE7E0] bg-white text-[#6E6258] hover:border-[#E3A008]/60 hover:text-[#1F1A17]"
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Bloco Recolhível: Ajuste Fino (fechado por padrão) */}
              <Collapsible
                open={fineTuningOpen}
                onOpenChange={setFineTuningOpen}
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-[#ECE7E0] bg-white px-2 py-1.5 text-left text-[11px] font-semibold text-[#5C5248] hover:border-[#E3A008]/60 hover:text-[#1F1A17] transition-colors"
                  >
                    <span>Ajuste Fino</span>
                    <span className="inline-flex items-center gap-1.5 text-[9.5px] font-medium text-[#8B7E72] tabular-nums">
                      <span>
                        {activePad}/{activeGap}/{activeIcon}/{activeLabel}/{activeRadius}px
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-3.5 transition-transform duration-200",
                          fineTuningOpen && "rotate-180"
                        )}
                      />
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-2 space-y-2.5 rounded-md border border-[#ECE7E0]/80 bg-white/80 p-2.5">
                  {/* 1. Padding interno */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#5C5248]">
                        Padding interno
                      </span>
                      <span className="rounded bg-[#FAF8F5] border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
                        {activePad}px
                      </span>
                    </div>
                    <Slider
                      min={activeLimits.card_padding.min}
                      max={activeLimits.card_padding.max}
                      step={1}
                      value={[activePad]}
                      disabled={isLayoutDisabled}
                      onValueChange={([v]) => {
                        if (typeof v === "number") {
                          updateActiveLayoutField("card_padding", v)
                        }
                      }}
                      aria-label="Padding interno do card"
                      className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                    />
                  </div>

                  {/* 2. Espaço (gap) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#5C5248]">
                        Espaço (gap)
                      </span>
                      <span className="rounded bg-[#FAF8F5] border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
                        {activeGap}px
                      </span>
                    </div>
                    <Slider
                      min={activeLimits.card_gap.min}
                      max={activeLimits.card_gap.max}
                      step={1}
                      value={[activeGap]}
                      disabled={isLayoutDisabled}
                      onValueChange={([v]) => {
                        if (typeof v === "number") {
                          updateActiveLayoutField("card_gap", v)
                        }
                      }}
                      aria-label="Espaço entre cards"
                      className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                    />
                  </div>

                  {/* 3. Tamanho do Ícone 3D */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#5C5248]">
                        Tamanho do Ícone 3D
                      </span>
                      <span className="rounded bg-[#FAF8F5] border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
                        {activeIcon}px
                      </span>
                    </div>
                    <Slider
                      min={activeLimits.icon_size.min}
                      max={activeLimits.icon_size.max}
                      step={1}
                      value={[activeIcon]}
                      disabled={isLayoutDisabled}
                      onValueChange={([v]) => {
                        if (typeof v === "number") {
                          updateActiveLayoutField("icon_size", v)
                        }
                      }}
                      aria-label="Tamanho do Ícone 3D"
                      className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                    />
                  </div>

                  {/* 4. Tamanho do Texto */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#5C5248]">
                        Tamanho do Texto
                      </span>
                      <span className="rounded bg-[#FAF8F5] border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
                        {activeLabel}px
                      </span>
                    </div>
                    <Slider
                      min={activeLimits.label_size.min}
                      max={activeLimits.label_size.max}
                      step={1}
                      value={[activeLabel]}
                      disabled={isLayoutDisabled}
                      onValueChange={([v]) => {
                        if (typeof v === "number") {
                          updateActiveLayoutField("label_size", v)
                        }
                      }}
                      aria-label="Tamanho do Texto"
                      className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                    />
                  </div>

                  {/* 5. Arredondamento (border-radius) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[#5C5248]">
                        Arredondamento
                      </span>
                      <span className="rounded bg-[#FAF8F5] border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
                        {activeRadius}px
                      </span>
                    </div>
                    <Slider
                      min={activeLimits.card_radius.min}
                      max={activeLimits.card_radius.max}
                      step={1}
                      value={[activeRadius]}
                      disabled={isLayoutDisabled}
                      onValueChange={([v]) => {
                        if (typeof v === "number") {
                          updateActiveLayoutField("card_radius", v)
                        }
                      }}
                      aria-label="Arredondamento dos cards"
                      className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Footer: Restaurar Padrão */}
              <div className="flex items-center justify-end border-t border-[#ECE7E0] pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isLayoutDisabled || isActiveViewportDefault}
                  onClick={resetActiveViewportLayout}
                  className="h-7 px-2 text-[11px] font-semibold text-[#6E6258] hover:bg-white hover:text-[#1F1A17]"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Restaurar Padrão ({activeProfileLabel})
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {displayedHomeBarItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#ECE7E0] bg-[#F7F5F0]/70 px-3 py-5 text-center text-[11px] text-[#7A6E63]">
              Nenhum item ativo configurado para a barra da Home.
            </div>
          ) : isApp ? (
            /* Moldura Fiel do App Batata Top (~390px) */
            <div className="mx-auto w-full max-w-[390px] rounded-[26px] border-[4px] border-[#26211D] bg-white shadow-sm overflow-hidden">
              {/* Status bar discreta do aparelho */}
              <div className="flex items-center justify-between px-4 pt-2 pb-1.5 border-b border-[#F2EDE6] bg-white">
                <span className="text-[10px] font-bold text-[#1F1B16] tabular-nums">
                  9:41
                </span>
                <span className="h-2.5 w-14 rounded-full bg-[#26211D]" />
                <span className="rounded-full bg-[#FFF4EE] px-1.5 py-0.5 text-[9px] font-bold text-[#C1440E]">
                  App · 390px
                </span>
              </div>

              {/* Superfície fiel a C:\dev\Batatop-app\app\index.js (bg #FFFFFF, px responsivo no frame) */}
              <div className="bg-white px-3.5 sm:px-5 py-4">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${activeCols}, minmax(0, 1fr))`,
                    columnGap: `${appColGap}px`,
                    rowGap: `${appRowGap}px`,
                  }}
                >
                  {displayedHomeBarItems.map((entry) => {
                    if (entry.kind === "simulated") {
                      const { demo } = entry
                      return (
                        <div
                          key={demo.id}
                          aria-disabled="true"
                          title={`${demo.name} (item demonstrativo do simulador)`}
                          className="min-w-0 flex flex-col items-center select-none opacity-85"
                        >
                          <div
                            style={{
                              borderRadius: appCardRadius,
                              paddingTop: appPadY,
                              paddingBottom: appPadY,
                              paddingLeft: appPadX,
                              paddingRight: appPadX,
                              marginBottom: 8,
                            }}
                            className="relative w-full flex items-center justify-center bg-[#F7F4EF] outline-1 outline-dashed outline-[#D9CFC2]"
                          >
                            <span className="absolute -top-[5px] -right-[3px] rounded-full bg-[#6E6258] px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wide text-white leading-none">
                              Demo
                            </span>
                            <div
                              style={{ width: appIconSize }}
                              className="aspect-square max-w-full flex items-center justify-center pointer-events-none"
                            >
                              <CategoryIcon
                                iconUrl={null}
                                iconType="lucide"
                                fallbackIcon={demo.fallback_icon}
                                accentColor={demo.accent_color}
                                alt={demo.name}
                                sizeClassName="w-full h-full"
                                iconClassName="w-[54%] h-[54%]"
                                className="pointer-events-none"
                              />
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: appLabelSize,
                              lineHeight: `${appLabelLineHeight}px`,
                            }}
                            className="w-full truncate text-center font-bold text-[#1F1B16]"
                          >
                            {demo.name}
                          </span>
                        </div>
                      )
                    }

                    const { category: cat } = entry
                    const isEmptyProductCat =
                      cat.kind === "product_category" &&
                      cat.active_products === 0
                    const isDragging =
                      dragState?.section === "home_bar" &&
                      dragState.id === cat.id
                    const isDropTarget =
                      dragOverTarget?.section === "home_bar" &&
                      dragOverTarget.id === cat.id &&
                      dragState?.id !== cat.id

                    return (
                      <div
                        key={cat.id}
                        draggable={canDragHomeBar}
                        onDragStart={(e) =>
                          canDragHomeBar && startDrag(e, "home_bar", cat.id)
                        }
                        onDragOver={(e) => {
                          if (
                            !canDragHomeBar ||
                            dragState?.section !== "home_bar"
                          )
                            return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = "move"
                          if (
                            dragOverTarget?.section !== "home_bar" ||
                            dragOverTarget.id !== cat.id
                          ) {
                            setDragOverTarget({
                              section: "home_bar",
                              id: cat.id,
                            })
                          }
                        }}
                        onDrop={(e) => handleDropHomeBar(e, cat.id)}
                        onDragEnd={finishDrag}
                        onClick={() => handleCardClick(cat)}
                        role={onEditCategory ? "button" : undefined}
                        tabIndex={onEditCategory ? 0 : undefined}
                        onKeyDown={
                          onEditCategory
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  handleCardClick(cat)
                                }
                              }
                            : undefined
                        }
                        title={
                          isEmptyProductCat
                            ? `${cat.name}: 0 ativos (oculta no app)`
                            : cat.name
                        }
                        className={cn(
                          "group min-w-0 flex flex-col items-center transition-all select-none",
                          canDragHomeBar
                            ? "cursor-grab active:cursor-grabbing"
                            : onEditCategory
                            ? "cursor-pointer"
                            : "",
                          isDragging && "opacity-45 scale-[0.96]"
                        )}
                      >
                        <div
                          style={{
                            borderRadius: appCardRadius,
                            paddingTop: appPadY,
                            paddingBottom: appPadY,
                            paddingLeft: appPadX,
                            paddingRight: appPadX,
                            marginBottom: 8,
                          }}
                          className={cn(
                            "relative w-full flex items-center justify-center transition-all",
                            isDropTarget
                              ? "bg-[#FEF8EC] ring-2 ring-[#E3A008]"
                              : isEmptyProductCat
                              ? "bg-[#FEF8EC]/80 opacity-75"
                              : "bg-[#F7F4EF] group-hover:bg-[#F3ECE0]"
                          )}
                        >
                          {canDragHomeBar && (
                            <GripVertical
                              aria-hidden="true"
                              className="pointer-events-none absolute top-1 left-1 size-3 text-[#B5A99B] opacity-0 group-hover:opacity-90 transition-opacity"
                            />
                          )}

                          {cat.badge_text && (
                            <span
                              style={{
                                backgroundColor: cat.badge_color || "#C1440E",
                              }}
                              className="absolute -top-[5px] -right-[3px] z-10 max-w-full truncate rounded-full px-1.5 py-[2px] text-[9px] font-extrabold uppercase tracking-[0.03em] text-white leading-none"
                            >
                              {cat.badge_text}
                            </span>
                          )}

                          {isEmptyProductCat && (
                            <span
                              title="0 ativos (oculta no app)"
                              aria-label="0 ativos (oculta no app)"
                              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#E3A008] ring-2 ring-white"
                            />
                          )}

                          <div
                            style={{ width: appIconSize }}
                            className="aspect-square max-w-full flex items-center justify-center pointer-events-none"
                          >
                            <CategoryIcon
                              iconUrl={cat.icon_url}
                              iconType={cat.icon_type}
                              fallbackIcon={cat.fallback_icon}
                              accentColor={cat.accent_color}
                              alt={cat.name}
                              sizeClassName="w-full h-full"
                              iconClassName="w-[54%] h-[54%]"
                              className="pointer-events-none"
                            />
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: appLabelSize,
                            lineHeight: `${appLabelLineHeight}px`,
                          }}
                          className="w-full truncate text-center font-bold text-[#1F1B16]"
                        >
                          {cat.name}
                        </span>
                        {isEmptyProductCat && (
                          <span className="mt-0.5 text-[8.5px] font-medium text-[#8A6100] leading-tight">
                            0 ativos
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${activeCols}, minmax(0, 1fr))`,
                gap: `${previewGap}px`,
              }}
            >
              {displayedHomeBarItems.map((entry) => {
                if (entry.kind === "simulated") {
                  const { demo } = entry
                  return (
                    <div
                      key={demo.id}
                      aria-disabled="true"
                      title={`${demo.name} (item demonstrativo do simulador)`}
                      style={{
                        paddingTop: previewPadY,
                        paddingBottom: previewPadY,
                        paddingLeft: previewPadX,
                        paddingRight: previewPadX,
                        borderRadius: previewRadius,
                      }}
                      className="relative min-w-0 flex flex-col items-center border border-dashed border-[#D8CEC1] bg-[#F7F5F0]/55 text-center select-none opacity-85"
                    >
                      <span className="absolute top-1 right-1 rounded bg-[#6E6258]/85 px-1 py-[1px] text-[7.5px] font-bold uppercase text-white leading-none">
                        Demo
                      </span>
                      {demo.badge_text && (
                        <span
                          style={{
                            backgroundColor: demo.badge_color || "#C1440E",
                          }}
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 max-w-[90%] truncate rounded-full px-1.5 py-[1px] text-[8.5px] font-extrabold uppercase tracking-wide text-white shadow-xs"
                        >
                          {demo.badge_text}
                        </span>
                      )}
                      <div
                        style={{ width: previewIcon }}
                        className="mt-0.5 aspect-square max-w-full flex items-center justify-center pointer-events-none"
                      >
                        <CategoryIcon
                          iconUrl={null}
                          iconType="lucide"
                          fallbackIcon={demo.fallback_icon}
                          accentColor={demo.accent_color}
                          alt={demo.name}
                          sizeClassName="w-full h-full"
                          iconClassName="w-[54%] h-[54%]"
                          className="pointer-events-none"
                        />
                      </div>
                      <span
                        style={{ fontSize: previewLabel, lineHeight: 1.25 }}
                        className="mt-1 w-full truncate font-semibold text-[#1F1A17]"
                      >
                        {demo.name}
                      </span>
                    </div>
                  )
                }

                const { category: cat } = entry
                const isEmptyProductCat =
                  cat.kind === "product_category" && cat.active_products === 0
                const isDragging =
                  dragState?.section === "home_bar" && dragState.id === cat.id
                const isDropTarget =
                  dragOverTarget?.section === "home_bar" &&
                  dragOverTarget.id === cat.id &&
                  dragState?.id !== cat.id

                return (
                  <div
                    key={cat.id}
                    draggable={canDragHomeBar}
                    onDragStart={(e) =>
                      canDragHomeBar && startDrag(e, "home_bar", cat.id)
                    }
                    onDragOver={(e) => {
                      if (!canDragHomeBar || dragState?.section !== "home_bar")
                        return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                      if (
                        dragOverTarget?.section !== "home_bar" ||
                        dragOverTarget.id !== cat.id
                      ) {
                        setDragOverTarget({ section: "home_bar", id: cat.id })
                      }
                    }}
                    onDrop={(e) => handleDropHomeBar(e, cat.id)}
                    onDragEnd={finishDrag}
                    onClick={() => handleCardClick(cat)}
                    role={onEditCategory ? "button" : undefined}
                    tabIndex={onEditCategory ? 0 : undefined}
                    onKeyDown={
                      onEditCategory
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleCardClick(cat)
                            }
                          }
                        : undefined
                    }
                    title={
                      isEmptyProductCat
                        ? `${cat.name}: 0 ativos (oculta na loja)`
                        : cat.name
                    }
                    style={{
                      paddingTop: previewPadY,
                      paddingBottom: previewPadY,
                      paddingLeft: previewPadX,
                      paddingRight: previewPadX,
                      borderRadius: previewRadius,
                    }}
                    className={cn(
                      "group relative min-w-0 flex flex-col items-center border text-center transition-all select-none",
                      canDragHomeBar
                        ? "cursor-grab active:cursor-grabbing"
                        : onEditCategory
                        ? "cursor-pointer"
                        : "",
                      isDragging && "opacity-45 scale-[0.97]",
                      isDropTarget
                        ? "border-[#E3A008] ring-2 ring-[#E3A008]/40 bg-[#FEF8EC]"
                        : isEmptyProductCat
                        ? "border-amber-300/80 bg-[#FEF8EC]/60 opacity-75 hover:border-[#E3A008]"
                        : "border-[#ECE7E0] bg-[#F7F5F0]/60 hover:border-[#E3A008]/70 hover:bg-[#FEF8EC]/30"
                    )}
                  >
                    {canDragHomeBar && (
                      <GripVertical
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute top-1 left-1 size-3 text-[#B5A99B] group-hover:opacity-100 transition-opacity",
                          isDesktop && activeCols >= 7
                            ? "opacity-0"
                            : "opacity-50"
                        )}
                      />
                    )}

                    {/* Badge pill */}
                    {cat.badge_text && (
                      <span
                        style={{
                          backgroundColor: cat.badge_color || "#C1440E",
                        }}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 max-w-[90%] truncate rounded-full px-1.5 py-[1px] text-[8.5px] font-extrabold uppercase tracking-wide text-white shadow-xs"
                      >
                        {cat.badge_text}
                      </span>
                    )}

                    {/* Subtle amber dot if 0 active products */}
                    {isEmptyProductCat && (
                      <span
                        title="0 ativos (oculta na loja)"
                        aria-label="0 ativos (oculta na loja)"
                        className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#E3A008] ring-2 ring-white"
                      />
                    )}

                    <div
                      style={{ width: previewIcon }}
                      className="mt-0.5 aspect-square max-w-full flex items-center justify-center pointer-events-none"
                    >
                      <CategoryIcon
                        iconUrl={cat.icon_url}
                        iconType={cat.icon_type}
                        fallbackIcon={cat.fallback_icon}
                        accentColor={cat.accent_color}
                        alt={cat.name}
                        sizeClassName="w-full h-full"
                        iconClassName="w-[54%] h-[54%]"
                        className="pointer-events-none"
                      />
                    </div>
                    <span
                      style={{ fontSize: previewLabel, lineHeight: 1.25 }}
                      className="mt-1 w-full truncate font-semibold text-[#1F1A17]"
                    >
                      {cat.name}
                    </span>
                    {isEmptyProductCat && viewport === "mobile" && (
                      <span className="mt-0.5 text-[8.5px] font-medium text-[#8A6100] leading-tight">
                        0 ativos
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Section B: Destaques da Home */}
        <section
          aria-label="Prévia dos Destaques da Home"
          className={cn(
            "rounded-xl border bg-white p-3 transition-all",
            activeTab === "home_featured"
              ? "border-[#E3A008] ring-2 ring-[#E3A008]/20"
              : "border-[#ECE7E0]"
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#C1440E]" />
              <h4 className="text-xs font-bold text-[#1F1A17]">
                Destaques da Home
              </h4>
            </div>
            <span className="text-[10px] font-medium text-[#7A6E63]">
              {homeFeaturedItems.length}{" "}
              {homeFeaturedItems.length === 1 ? "seção" : "seções"}
            </span>
          </div>

          {homeFeaturedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#ECE7E0] bg-[#F7F5F0]/70 px-3 py-4 text-center text-[11px] text-[#7A6E63]">
              Nenhuma categoria destacada na página inicial.
            </div>
          ) : (
            <ol className="space-y-2">
              {homeFeaturedItems.map((cat, idx) => {
                const isEmpty = cat.active_products === 0
                const isDragging =
                  dragState?.section === "home_featured" &&
                  dragState.id === cat.id
                const isDropTarget =
                  dragOverTarget?.section === "home_featured" &&
                  dragOverTarget.id === cat.id &&
                  dragState?.id !== cat.id

                return (
                  <li
                    key={cat.id}
                    draggable={canDragHomeFeatured}
                    onDragStart={(e) =>
                      canDragHomeFeatured &&
                      startDrag(e, "home_featured", cat.id)
                    }
                    onDragOver={(e) => {
                      if (
                        !canDragHomeFeatured ||
                        dragState?.section !== "home_featured"
                      )
                        return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                      if (
                        dragOverTarget?.section !== "home_featured" ||
                        dragOverTarget.id !== cat.id
                      ) {
                        setDragOverTarget({
                          section: "home_featured",
                          id: cat.id,
                        })
                      }
                    }}
                    onDrop={(e) => handleDropHomeFeatured(e, cat.id)}
                    onDragEnd={finishDrag}
                    onClick={() => handleCardClick(cat)}
                    role={onEditCategory ? "button" : undefined}
                    tabIndex={onEditCategory ? 0 : undefined}
                    onKeyDown={
                      onEditCategory
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleCardClick(cat)
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all select-none",
                      canDragHomeFeatured
                        ? "cursor-grab active:cursor-grabbing"
                        : onEditCategory
                        ? "cursor-pointer"
                        : "",
                      isDragging && "opacity-45 scale-[0.98]",
                      isDropTarget
                        ? "border-[#E3A008] ring-2 ring-[#E3A008]/40 bg-[#FEF8EC]"
                        : isEmpty
                        ? "border-amber-300/80 bg-[#FEF8EC]/70 hover:border-[#E3A008]"
                        : "border-[#ECE7E0] bg-[#F7F5F0]/50 hover:border-[#E3A008]/70 hover:bg-[#FEF8EC]/25"
                    )}
                  >
                    {canDragHomeFeatured && (
                      <GripVertical
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-[#B5A99B] opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                    )}

                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#E3A008] text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>

                    <CategoryIcon
                      iconUrl={cat.icon_url}
                      iconType={cat.icon_type}
                      fallbackIcon={cat.fallback_icon}
                      accentColor={cat.accent_color}
                      alt={cat.name}
                      sizeClassName="w-7 h-7"
                      iconClassName="w-3.5 h-3.5"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold text-[#1F1A17]">
                          {cat.name}
                        </span>
                        {cat.show_ranking && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FEF8EC] px-1.5 py-[1px] text-[9px] font-bold text-[#8A6100] border border-[#E3A008]/35 shrink-0">
                            <Trophy className="size-2.5 text-[#E3A008]" />
                            Ranking
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#6E6258]">
                        <span>limite: {cat.home_featured_limit} itens</span>
                        {isEmpty && (
                          <span
                            title="0 ativos (oculta na loja)"
                            className="inline-flex items-center gap-0.5 font-semibold text-[#C1440E]"
                          >
                            <AlertCircle className="size-2.5" />0 ativos (oculta)
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Section C: Estrutura do Cardápio */}
        <section
          aria-label="Prévia da Estrutura do Cardápio"
          className={cn(
            "rounded-xl border bg-white p-3 transition-all",
            activeTab === "menu"
              ? "border-[#E3A008] ring-2 ring-[#E3A008]/20"
              : "border-[#ECE7E0]"
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed className="size-3.5 text-[#E3A008]" />
              <h4 className="text-xs font-bold text-[#1F1A17]">
                Estrutura do Cardápio
              </h4>
            </div>
            <span className="text-[10px] font-medium text-[#7A6E63]">
              {viewport === "desktop" ? "2 colunas" : "Empilhado"}
            </span>
          </div>

          {menuItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#ECE7E0] bg-[#F7F5F0]/70 px-3 py-4 text-center text-[11px] text-[#7A6E63]">
              Nenhuma categoria ativa configurada no Cardápio.
            </div>
          ) : viewport === "desktop" ? (
            <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-2 items-start">
              {/* Main column */}
              <div
                onDragOver={(e) => {
                  if (!canDragMenu || dragState?.section !== "menu") return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  if (
                    dragOverTarget?.section !== "menu" ||
                    dragOverTarget.zone !== "main" ||
                    dragOverTarget.id
                  ) {
                    setDragOverTarget({ section: "menu", zone: "main" })
                  }
                }}
                onDrop={(e) => handleDropMenuDesktopZone(e, "main")}
                className={cn(
                  "space-y-1.5 rounded-xl border p-2 transition-colors min-h-[96px]",
                  dragOverTarget?.section === "menu" &&
                    dragOverTarget.zone === "main"
                    ? "border-[#E3A008] bg-[#FEF8EC]/60 ring-2 ring-[#E3A008]/30"
                    : "border-[#ECE7E0] bg-[#F7F5F0]/35"
                )}
              >
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#7A6E63]">
                  Principal
                </div>
                {menuMainItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D8CEC1] bg-white/70 px-2 py-4 text-[10px] text-[#8B7E72] text-center">
                    Arraste uma categoria aqui
                  </div>
                ) : (
                  menuMainItems.map((cat) => (
                    <MenuWireframeCard
                      key={cat.id}
                      category={cat}
                      compact
                      draggable={canDragMenu}
                      isDragging={
                        dragState?.section === "menu" &&
                        dragState.id === cat.id
                      }
                      isDropTarget={
                        dragOverTarget?.section === "menu" &&
                        dragOverTarget.id === cat.id &&
                        dragState?.id !== cat.id
                      }
                      onDragStart={(e) =>
                        canDragMenu && startDrag(e, "menu", cat.id)
                      }
                      onDragOver={(e) => {
                        if (!canDragMenu || dragState?.section !== "menu")
                          return
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = "move"
                        if (
                          dragOverTarget?.section !== "menu" ||
                          dragOverTarget.id !== cat.id ||
                          dragOverTarget.zone !== "main"
                        ) {
                          setDragOverTarget({
                            section: "menu",
                            id: cat.id,
                            zone: "main",
                          })
                        }
                      }}
                      onDrop={(e) =>
                        handleDropMenuDesktopCard(e, cat.id, "main")
                      }
                      onDragEnd={finishDrag}
                      onClick={
                        onEditCategory ? () => handleCardClick(cat) : undefined
                      }
                    />
                  ))
                )}
              </div>

              {/* Sticky right sidebar column */}
              <div
                onDragOver={(e) => {
                  if (!canDragMenu || dragState?.section !== "menu") return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  if (
                    dragOverTarget?.section !== "menu" ||
                    dragOverTarget.zone !== "sidebar_right" ||
                    dragOverTarget.id
                  ) {
                    setDragOverTarget({
                      section: "menu",
                      zone: "sidebar_right",
                    })
                  }
                }}
                onDrop={(e) => handleDropMenuDesktopZone(e, "sidebar_right")}
                className={cn(
                  "space-y-1.5 rounded-xl border p-2 transition-colors min-h-[96px]",
                  dragOverTarget?.section === "menu" &&
                    dragOverTarget.zone === "sidebar_right"
                    ? "border-[#E3A008] bg-[#FEF8EC] ring-2 ring-[#E3A008]/35"
                    : "border-[#E3A008]/35 bg-[#FEF8EC]/60"
                )}
              >
                <div className="flex items-center justify-between gap-1 text-[9.5px] font-bold uppercase tracking-wider text-[#8A6100]">
                  <span>Lateral Direita</span>
                  <span className="rounded bg-[#E3A008]/20 px-1 text-[8.5px]">
                    sticky
                  </span>
                </div>
                {menuSidebarItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#E3A008]/45 bg-white/70 px-2 py-4 text-[10px] text-[#8A6100] text-center">
                    Arraste uma categoria aqui
                  </div>
                ) : (
                  menuSidebarItems.map((cat) => (
                    <MenuWireframeCard
                      key={cat.id}
                      category={cat}
                      compact
                      draggable={canDragMenu}
                      isDragging={
                        dragState?.section === "menu" &&
                        dragState.id === cat.id
                      }
                      isDropTarget={
                        dragOverTarget?.section === "menu" &&
                        dragOverTarget.id === cat.id &&
                        dragState?.id !== cat.id
                      }
                      onDragStart={(e) =>
                        canDragMenu && startDrag(e, "menu", cat.id)
                      }
                      onDragOver={(e) => {
                        if (!canDragMenu || dragState?.section !== "menu")
                          return
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = "move"
                        if (
                          dragOverTarget?.section !== "menu" ||
                          dragOverTarget.id !== cat.id ||
                          dragOverTarget.zone !== "sidebar_right"
                        ) {
                          setDragOverTarget({
                            section: "menu",
                            id: cat.id,
                            zone: "sidebar_right",
                          })
                        }
                      }}
                      onDrop={(e) =>
                        handleDropMenuDesktopCard(e, cat.id, "sidebar_right")
                      }
                      onDragEnd={finishDrag}
                      onClick={
                        onEditCategory ? () => handleCardClick(cat) : undefined
                      }
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {menuItems.map((cat, idx) => (
                <MenuWireframeCard
                  key={cat.id}
                  category={cat}
                  orderNumber={idx + 1}
                  draggable={canDragMenu}
                  isDragging={
                    dragState?.section === "menu" && dragState.id === cat.id
                  }
                  isDropTarget={
                    dragOverTarget?.section === "menu" &&
                    dragOverTarget.id === cat.id &&
                    dragState?.id !== cat.id
                  }
                  onDragStart={(e) =>
                    canDragMenu && startDrag(e, "menu", cat.id)
                  }
                  onDragOver={(e) => {
                    if (!canDragMenu || dragState?.section !== "menu") return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                    if (
                      dragOverTarget?.section !== "menu" ||
                      dragOverTarget.id !== cat.id
                    ) {
                      setDragOverTarget({ section: "menu", id: cat.id })
                    }
                  }}
                  onDrop={(e) => handleDropMenuMobileCard(e, cat.id)}
                  onDragEnd={finishDrag}
                  onClick={
                    onEditCategory ? () => handleCardClick(cat) : undefined
                  }
                  showMobileZoneToggle={Boolean(onReorderMenu)}
                  zoneToggleDisabled={writesDisabled || Boolean(savingChanges)}
                  onToggleZone={() => handleToggleMobileZone(cat.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sticky Save / Discard Footer Bar */}
      {hasUnsavedChanges && (
        <div className="sticky bottom-0 z-10 border-t border-[#E3A008]/40 bg-[#FEF8EC] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C1440E]/12 px-2.5 py-1 text-[11px] font-bold text-[#C1440E]">
            <span className="size-1.5 rounded-full bg-[#C1440E]" />
            Alterações não salvas
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setScaleOverride({})
                onDiscardChanges?.()
              }}
              disabled={savingChanges}
              className="h-7 px-2.5 text-xs border-[#ECE7E0] bg-white text-[#5C5248] hover:bg-[#F7F5F0]"
            >
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSaveChanges}
              disabled={savingChanges || writesDisabled}
              className="h-7 px-2.5 text-xs bg-[#E3A008] hover:bg-[#c88c06] text-white font-bold"
            >
              {savingChanges ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuWireframeCard({
  category,
  orderNumber,
  compact = false,
  draggable = false,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  showMobileZoneToggle = false,
  zoneToggleDisabled = false,
  onToggleZone,
}: {
  category: CategoryWithCounts
  orderNumber?: number
  compact?: boolean
  draggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onClick?: () => void
  showMobileZoneToggle?: boolean
  zoneToggleDisabled?: boolean
  onToggleZone?: () => void
}) {
  const isEmpty = category.active_products === 0
  const isSidebar = category.menu_layout_zone === "sidebar_right"

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (
                e.target === e.currentTarget &&
                (e.key === "Enter" || e.key === " ")
              ) {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      title={
        isEmpty
          ? `${category.name}: 0 ativos (oculta na loja)`
          : `${category.name} (${category.active_products} ativos)`
      }
      className={cn(
        "group rounded-lg border bg-white transition-all select-none",
        compact ? "p-1.5" : "px-2.5 py-2",
        draggable
          ? "cursor-grab active:cursor-grabbing"
          : onClick
          ? "cursor-pointer"
          : "",
        isDragging && "opacity-45 scale-[0.98]",
        isDropTarget
          ? "border-[#E3A008] ring-2 ring-[#E3A008]/40 bg-[#FEF8EC]"
          : isEmpty
          ? "border-amber-300/80 bg-[#FEF8EC]/50 hover:border-[#E3A008]"
          : "border-[#ECE7E0] hover:border-[#E3A008]/70"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {draggable && (
          <GripVertical
            aria-hidden="true"
            className="size-3 shrink-0 text-[#B5A99B] opacity-50 group-hover:opacity-100 transition-opacity"
          />
        )}
        {typeof orderNumber === "number" && (
          <span className="text-[10px] font-bold text-[#8A6100] w-4 shrink-0">
            #{orderNumber}
          </span>
        )}
        <CategoryIcon
          iconUrl={category.icon_url}
          iconType={category.icon_type}
          fallbackIcon={category.fallback_icon}
          accentColor={category.accent_color}
          alt={category.name}
          sizeClassName={compact ? "w-5 h-5" : "w-6 h-6"}
          iconClassName={compact ? "w-3 h-3" : "w-3.5 h-3.5"}
        />
        <span className="truncate text-[11px] font-semibold text-[#1F1A17] flex-1">
          {category.name}
        </span>

        {showMobileZoneToggle && (
          <button
            type="button"
            disabled={zoneToggleDisabled}
            onClick={(e) => {
              e.stopPropagation()
              onToggleZone?.()
            }}
            title="Alternar zona no desktop entre Principal e Lateral Direita"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
              isSidebar
                ? "border-[#E3A008]/45 bg-[#FEF8EC] text-[#8A6100] hover:bg-[#FDEFC9]"
                : "border-[#ECE7E0] bg-[#F7F5F0] text-[#5C5248] hover:border-[#E3A008]/60 hover:text-[#1F1A17]"
            )}
          >
            <ArrowLeftRight className="size-2.5" />
            <span>{isSidebar ? "Lateral" : "Principal"}</span>
          </button>
        )}

        {isEmpty ? (
          <span
            title="0 ativos (oculta na loja)"
            className="size-2 rounded-full bg-[#E3A008] shrink-0"
          />
        ) : (
          <span className="text-[9.5px] font-medium text-[#7A6E63] shrink-0">
            {category.active_products}
          </span>
        )}
      </div>
      {/* Mini wireframe skeleton bars */}
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 w-4/5 rounded-full bg-[#ECE7E0]" />
        <div className="h-1.5 w-3/5 rounded-full bg-[#F2EDE6]" />
      </div>
    </div>
  )
}
