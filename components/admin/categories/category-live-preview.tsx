"use client"

import { useMemo, useRef, useState, type DragEvent } from "react"
import {
  AlertCircle,
  ArrowLeftRight,
  ChevronDown,
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
  HOME_GRID_LAYOUT_LIMITS,
  HOME_GRID_LAYOUT_PRESETS,
  type HomeGridLayout,
  type HomeGridPresetKey,
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

type PreviewViewport = "mobile" | "desktop"
type PreviewDragSection = "home_bar" | "home_featured" | "menu"

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
  const isLayoutDisabled = Boolean(
    writesDisabled ||
      layoutWritesDisabled ||
      savingChanges ||
      !onChangeHomeGridLayout
  )

  const activeCols = isDesktop
    ? homeGridLayout.desktop_columns
    : homeGridLayout.mobile_columns
  const activePad = isDesktop
    ? homeGridLayout.desktop_card_padding
    : homeGridLayout.mobile_card_padding
  const activeGap = isDesktop
    ? homeGridLayout.desktop_card_gap
    : homeGridLayout.mobile_card_gap
  const activeIcon = isDesktop
    ? homeGridLayout.desktop_icon_size
    : homeGridLayout.mobile_icon_size
  const activeLabel = isDesktop
    ? homeGridLayout.desktop_label_size
    : homeGridLayout.mobile_label_size

  const activeLimits = isDesktop
    ? {
        columns: HOME_GRID_LAYOUT_LIMITS.desktop_columns,
        card_padding: HOME_GRID_LAYOUT_LIMITS.desktop_card_padding,
        card_gap: HOME_GRID_LAYOUT_LIMITS.desktop_card_gap,
        icon_size: HOME_GRID_LAYOUT_LIMITS.desktop_icon_size,
        label_size: HOME_GRID_LAYOUT_LIMITS.desktop_label_size,
      }
    : {
        columns: HOME_GRID_LAYOUT_LIMITS.mobile_columns,
        card_padding: HOME_GRID_LAYOUT_LIMITS.mobile_card_padding,
        card_gap: HOME_GRID_LAYOUT_LIMITS.mobile_card_gap,
        icon_size: HOME_GRID_LAYOUT_LIMITS.mobile_icon_size,
        label_size: HOME_GRID_LAYOUT_LIMITS.mobile_label_size,
      }

  const previewGap = isDesktop
    ? Math.max(3, Math.round(activeGap * 0.35))
    : Math.max(4, Math.round(activeGap * 0.7))
  const previewPadY = isDesktop
    ? Math.max(3, Math.round(activePad * 0.4))
    : Math.max(4, Math.round(activePad * 0.72))
  const previewPadX = isDesktop
    ? Math.max(2, Math.round(activePad * 0.3))
    : Math.max(3, Math.round(activePad * 0.5))
  const previewIcon = isDesktop
    ? Math.max(16, Math.min(36, Math.round(activeIcon * 0.44)))
    : Math.max(22, Math.min(54, Math.round(activeIcon * 0.76)))
  const previewLabel = isDesktop
    ? Math.max(7.5, Math.round(activeLabel * 0.68 * 10) / 10)
    : Math.max(8.5, Math.round(activeLabel * 0.86 * 10) / 10)

  function matchesPreset(presetKey: HomeGridPresetKey): boolean {
    if (isDesktop) {
      const p = HOME_GRID_LAYOUT_PRESETS.desktop[presetKey]
      return (
        homeGridLayout.desktop_columns === p.desktop_columns &&
        homeGridLayout.desktop_card_padding === p.desktop_card_padding &&
        homeGridLayout.desktop_card_gap === p.desktop_card_gap &&
        homeGridLayout.desktop_icon_size === p.desktop_icon_size &&
        homeGridLayout.desktop_label_size === p.desktop_label_size
      )
    }
    const p = HOME_GRID_LAYOUT_PRESETS.mobile[presetKey]
    return (
      homeGridLayout.mobile_columns === p.mobile_columns &&
      homeGridLayout.mobile_card_padding === p.mobile_card_padding &&
      homeGridLayout.mobile_card_gap === p.mobile_card_gap &&
      homeGridLayout.mobile_icon_size === p.mobile_icon_size &&
      homeGridLayout.mobile_label_size === p.mobile_label_size
    )
  }

  function applyPreset(presetKey: HomeGridPresetKey) {
    if (isLayoutDisabled || !onChangeHomeGridLayout) return
    onChangeHomeGridLayout({
      ...homeGridLayout,
      ...HOME_GRID_LAYOUT_PRESETS[viewport][presetKey],
    })
  }

  function updateActiveLayoutField(
    field: "columns" | "card_padding" | "card_gap" | "icon_size" | "label_size",
    value: number
  ) {
    if (isLayoutDisabled || !onChangeHomeGridLayout) return
    const key = `${viewport}_${field}` as keyof HomeGridLayout
    if (homeGridLayout[key] === value) return
    onChangeHomeGridLayout({
      ...homeGridLayout,
      [key]: value,
    })
  }

  const isActiveViewportDefault = isDesktop
    ? homeGridLayout.desktop_columns ===
        DEFAULT_HOME_GRID_LAYOUT.desktop_columns &&
      homeGridLayout.desktop_card_padding ===
        DEFAULT_HOME_GRID_LAYOUT.desktop_card_padding &&
      homeGridLayout.desktop_card_gap ===
        DEFAULT_HOME_GRID_LAYOUT.desktop_card_gap &&
      homeGridLayout.desktop_icon_size ===
        DEFAULT_HOME_GRID_LAYOUT.desktop_icon_size &&
      homeGridLayout.desktop_label_size ===
        DEFAULT_HOME_GRID_LAYOUT.desktop_label_size
    : homeGridLayout.mobile_columns ===
        DEFAULT_HOME_GRID_LAYOUT.mobile_columns &&
      homeGridLayout.mobile_card_padding ===
        DEFAULT_HOME_GRID_LAYOUT.mobile_card_padding &&
      homeGridLayout.mobile_card_gap ===
        DEFAULT_HOME_GRID_LAYOUT.mobile_card_gap &&
      homeGridLayout.mobile_icon_size ===
        DEFAULT_HOME_GRID_LAYOUT.mobile_icon_size &&
      homeGridLayout.mobile_label_size ===
        DEFAULT_HOME_GRID_LAYOUT.mobile_label_size

  function resetActiveViewportLayout() {
    if (
      isLayoutDisabled ||
      !onChangeHomeGridLayout ||
      isActiveViewportDefault
    ) {
      return
    }
    if (isDesktop) {
      onChangeHomeGridLayout({
        ...homeGridLayout,
        desktop_columns: DEFAULT_HOME_GRID_LAYOUT.desktop_columns,
        desktop_card_padding: DEFAULT_HOME_GRID_LAYOUT.desktop_card_padding,
        desktop_card_gap: DEFAULT_HOME_GRID_LAYOUT.desktop_card_gap,
        desktop_icon_size: DEFAULT_HOME_GRID_LAYOUT.desktop_icon_size,
        desktop_label_size: DEFAULT_HOME_GRID_LAYOUT.desktop_label_size,
      })
    } else {
      onChangeHomeGridLayout({
        ...homeGridLayout,
        mobile_columns: DEFAULT_HOME_GRID_LAYOUT.mobile_columns,
        mobile_card_padding: DEFAULT_HOME_GRID_LAYOUT.mobile_card_padding,
        mobile_card_gap: DEFAULT_HOME_GRID_LAYOUT.mobile_card_gap,
        mobile_icon_size: DEFAULT_HOME_GRID_LAYOUT.mobile_icon_size,
        mobile_label_size: DEFAULT_HOME_GRID_LAYOUT.mobile_label_size,
      })
    }
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
        <div className="flex items-center justify-between gap-2">
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
            aria-label="Alternar visualização"
            className="inline-flex items-center rounded-lg border border-[#ECE7E0] bg-white p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              aria-pressed={viewport === "mobile"}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                viewport === "mobile"
                  ? "bg-[#E3A008] text-white shadow-xs"
                  : "text-[#6E6258] hover:text-[#1F1A17]"
              )}
            >
              <Smartphone className="size-3.5" />
              <span>Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              aria-pressed={viewport === "desktop"}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                viewport === "desktop"
                  ? "bg-[#E3A008] text-white shadow-xs"
                  : "text-[#6E6258] hover:text-[#1F1A17]"
              )}
            >
              <Monitor className="size-3.5" />
              <span>Desktop</span>
            </button>
          </div>
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
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="size-3.5 text-[#E3A008]" />
              <h4 className="text-xs font-bold text-[#1F1A17]">
                Grade 3D da Home
              </h4>
            </div>
            <span className="rounded-full bg-[#FEF8EC] px-2 py-0.5 text-[10px] font-semibold text-[#8A6100] border border-[#E3A008]/30">
              {storeVisibleHomeBarCount} na loja
            </span>
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
                  <span className="rounded-full border border-[#E3A008]/35 bg-[#FEF8EC] px-1.5 py-0.5 text-[9.5px] font-bold text-[#A16207]">
                    {viewport === "mobile" ? "Mobile" : "Desktop"}
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
                      ? "Migration 031 pendente no Supabase. Execute scripts/031_home_grid_layout.sql para salvar o layout."
                      : "Somente leitura (offline ou banco indisponível)."}
                  </span>
                </div>
              )}

              {/* Presets Rápidos */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6E63]">
                  Presets Rápidos ({viewport === "mobile" ? "Mobile" : "Desktop"})
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

              {/* 4 grupos de Sliders Finos */}
              <div className="space-y-2.5">
                {/* 1. Colunas por linha */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#1F1A17]">
                      Colunas por linha
                    </span>
                    <span className="rounded bg-white border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
                      {activeCols} cols
                    </span>
                  </div>
                  <Slider
                    min={activeLimits.columns.min}
                    max={activeLimits.columns.max}
                    step={1}
                    value={[activeCols]}
                    disabled={isLayoutDisabled}
                    onValueChange={([v]) => {
                      if (typeof v === "number") {
                        updateActiveLayoutField("columns", v)
                      }
                    }}
                    aria-label="Colunas por linha"
                    className="[&_[data-slot=slider-range]]:bg-[#E3A008] [&_[data-slot=slider-thumb]]:border-[#E3A008] [&_[data-slot=slider-thumb]]:size-3.5"
                  />
                </div>

                {/* 2. Altura / Espessura do Card */}
                <div className="space-y-2 rounded-md border border-[#ECE7E0]/80 bg-white/70 p-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A6E63]">
                    Altura / Espessura do Card
                  </span>
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
                </div>

                {/* 3. Tamanho do Ícone 3D */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#1F1A17]">
                      Tamanho do Ícone 3D
                    </span>
                    <span className="rounded bg-white border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
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
                    <span className="text-[11px] font-semibold text-[#1F1A17]">
                      Tamanho do Texto
                    </span>
                    <span className="rounded bg-white border border-[#ECE7E0] px-1.5 py-0.5 text-[10px] font-bold text-[#5C5248] tabular-nums">
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
              </div>

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
                  Restaurar Padrão ({isDesktop ? "Desktop" : "Mobile"})
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {homeBarItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#ECE7E0] bg-[#F7F5F0]/70 px-3 py-5 text-center text-[11px] text-[#7A6E63]">
              Nenhum item ativo configurado para a barra da Home.
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${activeCols}, minmax(0, 1fr))`,
                gap: `${previewGap}px`,
              }}
            >
              {homeBarItems.map((cat) => {
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
                    }}
                    className={cn(
                      "group relative min-w-0 flex flex-col items-center rounded-xl border text-center transition-all select-none",
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
              onClick={onDiscardChanges}
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
