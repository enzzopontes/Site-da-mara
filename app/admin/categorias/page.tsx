"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Columns2,
  Copy,
  Database,
  Eye,
  GripVertical,
  Layers,
  Link2,
  Loader2,
  MessageSquare,
  Minus,
  Package,
  PanelRight,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  UtensilsCrossed,
  WifiOff,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type {
  Category,
  CategoryWithCounts,
  MenuLayoutZone,
} from "@/lib/categories-db"
import {
  deleteCategorySafeAction,
  duplicateCategoryAction,
  getHomeGridLayoutAdminAction,
  listCategoriesAdminAction,
  reorderCategoriesAction,
  saveHomeGridLayoutAction,
  toggleCategoryActiveAction,
  type ReorderItemInput,
} from "./actions"
import {
  DEFAULT_HOME_GRID_LAYOUT,
  isSameHomeGridLayout,
  type HomeGridLayout,
} from "@/lib/home-grid-layout"
import { CategoryFormModal } from "@/components/admin/categories/category-form-modal"
import { CategoryDeleteModal } from "@/components/admin/categories/category-delete-modal"
import { CategoryLivePreview } from "@/components/admin/categories/category-live-preview"
import { CategoryIcon } from "@/components/category-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type TabKey = "todas" | "home_bar" | "home_featured" | "menu"
type KindFilter = "all" | "product_category" | "home_shortcut"
type OrderMode = "home_bar" | "home_featured" | "menu"

function moveArrayItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list
  }
  const next = [...list]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<CategoryWithCounts[]>([])
  const [savedCategories, setSavedCategories] = useState<CategoryWithCounts[]>([])
  const [homeGridLayout, setHomeGridLayout] = useState<HomeGridLayout>(
    DEFAULT_HOME_GRID_LAYOUT
  )
  const [savedHomeGridLayout, setSavedHomeGridLayout] =
    useState<HomeGridLayout>(DEFAULT_HOME_GRID_LAYOUT)
  const savedHomeGridLayoutRef = useRef<HomeGridLayout>(
    DEFAULT_HOME_GRID_LAYOUT
  )
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [migrationPending, setMigrationPending] = useState(false)
  const [layoutMigrationPending, setLayoutMigrationPending] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Navigation, search & filters
  const [activeTab, setActiveTab] = useState<TabKey>("todas")
  const [searchQuery, setSearchQuery] = useState("")
  const [kindFilter, setKindFilter] = useState<KindFilter>("all")
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false)

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] =
    useState<CategoryWithCounts | null>(null)
  const [deleteModalCategory, setDeleteModalCategory] =
    useState<CategoryWithCounts | null>(null)
  const [deleteModalProductCount, setDeleteModalProductCount] = useState(0)
  const [confirmDeleteCategory, setConfirmDeleteCategory] =
    useState<CategoryWithCounts | null>(null)

  // Row-level & batch pending states
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({})
  const [duplicatingIds, setDuplicatingIds] = useState<Record<string, boolean>>(
    {}
  )
  const [deletingSimple, setDeletingSimple] = useState(false)
  const [savingMode, setSavingMode] = useState<OrderMode | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  // Dirty flags per ordering tab
  const [dirtyTabs, setDirtyTabs] = useState<Record<OrderMode, boolean>>({
    home_bar: false,
    home_featured: false,
    menu: false,
  })

  // HTML5 Drag & Drop state
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const writesDisabled = migrationPending || isOffline
  const isHomeGridLayoutDirty = !isSameHomeGridLayout(
    homeGridLayout,
    savedHomeGridLayout
  )
  const hasAnyUnsavedChanges =
    dirtyTabs.home_bar ||
    dirtyTabs.home_featured ||
    dirtyTabs.menu ||
    isHomeGridLayoutDirty
  const isSavingOrder = savingAll || savingMode !== null
  const orderControlsDisabled = writesDisabled || isSavingOrder

  // Online / offline listener
  useEffect(() => {
    const syncOnlineStatus = () => {
      setIsOffline(typeof navigator !== "undefined" && !navigator.onLine)
    }
    syncOnlineStatus()
    window.addEventListener("online", syncOnlineStatus)
    window.addEventListener("offline", syncOnlineStatus)
    return () => {
      window.removeEventListener("online", syncOnlineStatus)
      window.removeEventListener("offline", syncOnlineStatus)
    }
  }, [])

  const loadCategories = useCallback(
    async (showSpinner = true, showToastOnError = true) => {
      if (showSpinner) setLoading(true)
      setErrorMessage(null)

      try {
        const [res, layoutRes] = await Promise.all([
          listCategoriesAdminAction(),
          getHomeGridLayoutAdminAction().catch(() => null),
        ])
        if (!res.ok) {
          setErrorMessage(res.error || "Não foi possível carregar as categorias.")
          return
        }
        setCategories(res.data.categories)
        setSavedCategories(res.data.categories)
        setMigrationPending(Boolean(res.data.migrationPending))
        setDirtyTabs({ home_bar: false, home_featured: false, menu: false })
        if (layoutRes && layoutRes.ok) {
          setLayoutMigrationPending(Boolean(layoutRes.data.migrationPending))
          setHomeGridLayout(layoutRes.data.layout)
          setSavedHomeGridLayout(layoutRes.data.layout)
          savedHomeGridLayoutRef.current = layoutRes.data.layout
        } else {
          setHomeGridLayout(savedHomeGridLayoutRef.current)
          if (showToastOnError) {
            toast.error(
              (layoutRes && !layoutRes.ok ? layoutRes.error : undefined) ||
                "Não foi possível carregar o layout da grade."
            )
          }
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Erro de conexão ao carregar categorias."
        setErrorMessage(msg)
      } finally {
        if (showSpinner) setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadCategories(true)
  }, [loadCategories])

  // KPIs
  const kpis = useMemo(() => {
    const total = categories.length
    const active = categories.filter((c) => c.is_active).length
    const products = categories.filter(
      (c) => c.kind === "product_category"
    ).length
    const shortcuts = categories.filter((c) => c.kind === "home_shortcut").length
    const pendingHomeBar = categories.filter(
      (c) => c.kind === "product_category" && !c.show_on_home_bar
    ).length
    return { total, active, products, shortcuts, pendingHomeBar }
  }, [categories])

  // Next default orders for new categories
  const nextOrders = useMemo(() => {
    const maxHomeBar = categories.reduce(
      (acc, c) => Math.max(acc, c.home_bar_order),
      -1
    )
    const maxHomeFeatured = categories.reduce(
      (acc, c) => Math.max(acc, c.home_featured_order),
      -1
    )
    const maxMenu = categories.reduce(
      (acc, c) => Math.max(acc, c.menu_order),
      -1
    )
    return {
      homeBar: maxHomeBar + 1,
      homeFeatured: maxHomeFeatured + 1,
      menu: maxMenu + 1,
    }
  }, [categories])

  // Filtered list for "Todas" tab
  const filteredAllCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return categories.filter((cat) => {
      if (kindFilter !== "all" && cat.kind !== kindFilter) return false
      if (!q) return true
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        (cat.description?.toLowerCase().includes(q) ?? false) ||
        (cat.badge_text?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [categories, searchQuery, kindFilter])

  // Ordered lists per showcase tab
  const homeBarList = useMemo(
    () =>
      [...categories].sort(
        (a, b) => a.home_bar_order - b.home_bar_order || a.name.localeCompare(b.name)
      ),
    [categories]
  )

  const homeFeaturedList = useMemo(
    () =>
      categories
        .filter((c) => c.kind === "product_category")
        .sort(
          (a, b) =>
            a.home_featured_order - b.home_featured_order ||
            a.name.localeCompare(b.name)
        ),
    [categories]
  )

  const menuList = useMemo(
    () =>
      categories
        .filter((c) => c.kind === "product_category")
        .sort(
          (a, b) => a.menu_order - b.menu_order || a.name.localeCompare(b.name)
        ),
    [categories]
  )

  // Modal helpers
  function openCreateModal() {
    if (writesDisabled) {
      toast.error(
        migrationPending
          ? "Execute a migração 030_dynamic_categories.sql antes de criar categorias."
          : "Você está offline. Reconecte-se para criar categorias."
      )
      return
    }
    if (hasAnyUnsavedChanges) {
      toast.warning(
        "Salve ou descarte as alterações de ordem ou layout da grade antes de continuar."
      )
      return
    }
    setEditingCategory(null)
    setFormOpen(true)
  }

  function openEditModal(category: CategoryWithCounts) {
    if (writesDisabled) {
      toast.error(
        migrationPending
          ? "Execute a migração 030_dynamic_categories.sql antes de editar."
          : "Você está offline. Reconecte-se para editar."
      )
      return
    }
    if (hasAnyUnsavedChanges) {
      toast.warning(
        "Salve ou descarte as alterações de ordem ou layout da grade antes de editar uma categoria."
      )
      return
    }
    setEditingCategory(category)
    setFormOpen(true)
  }

  function handleFormSaved(saved: Category) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx === -1) {
        return [...prev, { ...saved, total_products: 0, active_products: 0 }]
      }
      const next = [...prev]
      next[idx] = {
        ...saved,
        total_products: prev[idx].total_products,
        active_products: prev[idx].active_products,
      }
      return next
    })
    loadCategories(false)
  }

  async function handleToggleActive(
    category: CategoryWithCounts,
    nextValue: boolean
  ) {
    if (writesDisabled) return
    setTogglingIds((prev) => ({ ...prev, [category.id]: true }))

    // Optimistic update so Live Preview reflects immediately
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, is_active: nextValue } : c))
    )

    try {
      const res = await toggleCategoryActiveAction(category.id, nextValue)
      if (!res.ok) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === category.id ? { ...c, is_active: !nextValue } : c
          )
        )
        toast.error(res.error)
        return
      }
      setSavedCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, is_active: nextValue } : c
        )
      )
      toast.success(
        nextValue
          ? `"${category.name}" ativada na loja.`
          : `"${category.name}" desativada.`
      )
    } catch {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, is_active: !nextValue } : c
        )
      )
      toast.error("Erro ao alterar status da categoria.")
    } finally {
      setTogglingIds((prev) => ({ ...prev, [category.id]: false }))
    }
  }

  async function handleDuplicate(category: CategoryWithCounts) {
    if (writesDisabled) return
    if (hasAnyUnsavedChanges) {
      toast.warning(
        "Salve ou descarte as alterações de ordem ou layout da grade antes de continuar."
      )
      return
    }
    setDuplicatingIds((prev) => ({ ...prev, [category.id]: true }))
    try {
      const res = await duplicateCategoryAction(category.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`"${res.data.name}" criada como rascunho inativo.`)
      await loadCategories(false)
    } catch {
      toast.error("Erro ao duplicar categoria.")
    } finally {
      setDuplicatingIds((prev) => ({ ...prev, [category.id]: false }))
    }
  }

  function handleRequestDelete(category: CategoryWithCounts) {
    if (writesDisabled) return
    if (hasAnyUnsavedChanges) {
      toast.warning(
        "Salve ou descarte as alterações de ordem ou layout da grade antes de continuar."
      )
      return
    }
    if (category.total_products > 0) {
      setDeleteModalCategory(category)
      setDeleteModalProductCount(category.total_products)
    } else {
      setConfirmDeleteCategory(category)
    }
  }

  async function handleConfirmSimpleDelete() {
    if (!confirmDeleteCategory || deletingSimple) return
    const target = confirmDeleteCategory
    setDeletingSimple(true)
    try {
      const res = await deleteCategorySafeAction(target.id)
      if (!res.ok) {
        if (res.code === "HAS_PRODUCTS") {
          setConfirmDeleteCategory(null)
          setDeleteModalCategory(target)
          setDeleteModalProductCount(res.productCount ?? target.total_products)
          return
        }
        toast.error(res.error)
        return
      }
      toast.success(`Categoria "${target.name}" excluída.`)
      setConfirmDeleteCategory(null)
      await loadCategories(false)
    } catch {
      toast.error("Erro ao excluir categoria.")
    } finally {
      setDeletingSimple(false)
    }
  }

  // Ordering & inline showcase mutations (update `categories` immediately for real-time Live Preview!)
  function applyOrderedIds(mode: OrderMode, orderedIds: string[]) {
    const orderById = new Map(orderedIds.map((id, idx) => [id, idx]))
    setCategories((prev) =>
      prev.map((cat) => {
        const nextOrder = orderById.get(cat.id)
        if (typeof nextOrder !== "number") return cat
        if (mode === "home_bar") return { ...cat, home_bar_order: nextOrder }
        if (mode === "home_featured")
          return { ...cat, home_featured_order: nextOrder }
        return { ...cat, menu_order: nextOrder }
      })
    )
    setDirtyTabs((prev) => ({ ...prev, [mode]: true }))
  }

  function handleMoveStep(
    mode: OrderMode,
    list: CategoryWithCounts[],
    index: number,
    direction: -1 | 1
  ) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= list.length) return
    const reordered = moveArrayItem(list, index, nextIndex)
    applyOrderedIds(
      mode,
      reordered.map((c) => c.id)
    )
  }

  function handleDragStart(e: DragEvent<HTMLElement>, id: string) {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", id)
  }

  function handleDragOver(e: DragEvent<HTMLElement>, targetId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverId !== targetId) {
      setDragOverId(targetId)
    }
  }

  function handleDrop(
    e: DragEvent<HTMLElement>,
    mode: OrderMode,
    list: CategoryWithCounts[],
    targetId: string
  ) {
    e.preventDefault()
    const sourceId = draggedId || e.dataTransfer.getData("text/plain")
    setDraggedId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return
    const fromIndex = list.findIndex((c) => c.id === sourceId)
    const toIndex = list.findIndex((c) => c.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const reordered = moveArrayItem(list, fromIndex, toIndex)
    applyOrderedIds(
      mode,
      reordered.map((c) => c.id)
    )
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverId(null)
  }

  function updateCategoryInline(
    mode: OrderMode,
    id: string,
    patch: Partial<CategoryWithCounts>
  ) {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat))
    )
    setDirtyTabs((prev) => ({ ...prev, [mode]: true }))
  }

  function handleDiscardTabChanges(mode: OrderMode) {
    const savedById = new Map(savedCategories.map((c) => [c.id, c]))
    setCategories((prev) =>
      prev.map((cat) => {
        const saved = savedById.get(cat.id)
        if (!saved) return cat
        if (mode === "home_bar") {
          return {
            ...cat,
            home_bar_order: saved.home_bar_order,
            show_on_home_bar: saved.show_on_home_bar,
          }
        }
        if (mode === "home_featured") {
          return {
            ...cat,
            home_featured_order: saved.home_featured_order,
            show_on_home_featured: saved.show_on_home_featured,
            home_featured_limit: saved.home_featured_limit,
          }
        }
        return {
          ...cat,
          menu_order: saved.menu_order,
          show_on_menu: saved.show_on_menu,
          menu_layout_zone: saved.menu_layout_zone,
        }
      })
    )
    setDirtyTabs((prev) => ({ ...prev, [mode]: false }))
    toast.info("Alterações descartadas.")
  }

  function buildReorderPayload(mode: OrderMode): ReorderItemInput[] {
    if (mode === "home_bar") {
      return homeBarList.map((cat, idx) => ({
        id: cat.id,
        order: idx,
        show_on_home_bar: cat.show_on_home_bar,
      }))
    }
    if (mode === "home_featured") {
      return homeFeaturedList.map((cat, idx) => ({
        id: cat.id,
        order: idx,
        show_on_home_featured: cat.show_on_home_featured,
        home_featured_limit: Math.min(24, Math.max(1, cat.home_featured_limit)),
      }))
    }
    return menuList.map((cat, idx) => ({
      id: cat.id,
      order: idx,
      show_on_menu: cat.show_on_menu,
      menu_layout_zone: cat.menu_layout_zone,
    }))
  }

  async function handleSaveOrder(mode: OrderMode) {
    if (writesDisabled || savingMode || savingAll) return

    const items = buildReorderPayload(mode)

    if (items.length === 0) return

    setSavingMode(mode)
    try {
      const res = await reorderCategoriesAction(mode, items)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const label =
        mode === "home_bar"
          ? "Ordem da barra da Home salva!"
          : mode === "home_featured"
          ? "Destaques da Home salvos!"
          : "Estrutura do Cardápio salva!"
      toast.success(label)
      setDirtyTabs((prev) => ({ ...prev, [mode]: false }))
      setSavedCategories((prev) => {
        const currentById = new Map(categories.map((cat) => [cat.id, cat]))
        return prev.map((saved) => {
          const current = currentById.get(saved.id)
          if (!current) return saved
          if (mode === "home_bar") {
            return {
              ...saved,
              home_bar_order: current.home_bar_order,
              show_on_home_bar: current.show_on_home_bar,
            }
          }
          if (mode === "home_featured") {
            return {
              ...saved,
              home_featured_order: current.home_featured_order,
              show_on_home_featured: current.show_on_home_featured,
              home_featured_limit: current.home_featured_limit,
            }
          }
          return {
            ...saved,
            menu_order: current.menu_order,
            show_on_menu: current.show_on_menu,
            menu_layout_zone: current.menu_layout_zone,
          }
        })
      })
    } catch {
      toast.error("Erro ao salvar alterações.")
    } finally {
      setSavingMode(null)
    }
  }

  function handlePreviewReorderHomeBar(orderedVisibleIds: string[]) {
    if (writesDisabled || isSavingOrder) return
    const visibleSet = new Set(orderedVisibleIds)
    const remainingIds = homeBarList
      .filter((cat) => !visibleSet.has(cat.id))
      .map((cat) => cat.id)
    applyOrderedIds("home_bar", [...orderedVisibleIds, ...remainingIds])
  }

  function handlePreviewReorderHomeFeatured(orderedVisibleIds: string[]) {
    if (writesDisabled || isSavingOrder) return
    const visibleSet = new Set(orderedVisibleIds)
    const remainingIds = homeFeaturedList
      .filter((cat) => !visibleSet.has(cat.id))
      .map((cat) => cat.id)
    applyOrderedIds("home_featured", [...orderedVisibleIds, ...remainingIds])
  }

  function handlePreviewReorderMenu(
    items: Array<{ id: string; menu_layout_zone: MenuLayoutZone }>
  ) {
    if (writesDisabled || isSavingOrder) return
    const visibleSet = new Set(items.map((item) => item.id))
    const remainingItems = menuList
      .filter((cat) => !visibleSet.has(cat.id))
      .map((cat) => ({
        id: cat.id,
        menu_layout_zone: cat.menu_layout_zone,
      }))
    const combined = [...items, ...remainingItems]
    const updateById = new Map(
      combined.map((item, idx) => [
        item.id,
        { menu_order: idx, menu_layout_zone: item.menu_layout_zone },
      ])
    )
    setCategories((prev) =>
      prev.map((cat) => {
        const next = updateById.get(cat.id)
        if (!next) return cat
        return {
          ...cat,
          menu_order: next.menu_order,
          menu_layout_zone: next.menu_layout_zone,
        }
      })
    )
    setDirtyTabs((prev) => ({ ...prev, menu: true }))
  }

  async function handleSaveAllDirtyOrders() {
    if (writesDisabled || savingAll || savingMode) return

    const modesToSave: OrderMode[] = []
    if (dirtyTabs.home_bar) modesToSave.push("home_bar")
    if (dirtyTabs.home_featured) modesToSave.push("home_featured")
    if (dirtyTabs.menu) modesToSave.push("menu")
    const saveLayout = isHomeGridLayoutDirty
    if (modesToSave.length === 0 && !saveLayout) return

    setSavingAll(true)
    const succeededModes: OrderMode[] = []
    let savedLayoutData: HomeGridLayout | null = null
    const failures: string[] = []

    try {
      for (const mode of modesToSave) {
        const items = buildReorderPayload(mode)
        if (items.length === 0) {
          succeededModes.push(mode)
          continue
        }
        try {
          const res = await reorderCategoriesAction(mode, items)
          if (!res.ok) {
            failures.push(res.error || "Erro ao salvar alterações de ordem.")
            continue
          }
          succeededModes.push(mode)
        } catch (err: unknown) {
          failures.push(
            err instanceof Error
              ? err.message
              : "Erro ao salvar alterações de ordem."
          )
        }
      }

      if (saveLayout) {
        try {
          const layoutRes = await saveHomeGridLayoutAction(homeGridLayout)
          if (layoutRes.ok) {
            savedLayoutData = layoutRes.data
          } else {
            if (layoutRes.code === "MIGRATION_PENDING") {
              setLayoutMigrationPending(true)
            }
            failures.push(
              layoutRes.error || "Erro ao salvar layout da Grade 3D."
            )
          }
        } catch (err: unknown) {
          failures.push(
            err instanceof Error
              ? err.message
              : "Erro ao salvar layout da Grade 3D."
          )
        }
      }

      if (succeededModes.length > 0) {
        const savedSet = new Set(succeededModes)
        setDirtyTabs((prev) => ({
          home_bar: savedSet.has("home_bar") ? false : prev.home_bar,
          home_featured: savedSet.has("home_featured")
            ? false
            : prev.home_featured,
          menu: savedSet.has("menu") ? false : prev.menu,
        }))
        setSavedCategories((prev) => {
          const currentById = new Map(categories.map((cat) => [cat.id, cat]))
          return prev.map((saved) => {
            const current = currentById.get(saved.id)
            if (!current) return saved
            return {
              ...saved,
              ...(savedSet.has("home_bar")
                ? {
                    home_bar_order: current.home_bar_order,
                    show_on_home_bar: current.show_on_home_bar,
                  }
                : {}),
              ...(savedSet.has("home_featured")
                ? {
                    home_featured_order: current.home_featured_order,
                    show_on_home_featured: current.show_on_home_featured,
                    home_featured_limit: current.home_featured_limit,
                  }
                : {}),
              ...(savedSet.has("menu")
                ? {
                    menu_order: current.menu_order,
                    show_on_menu: current.show_on_menu,
                    menu_layout_zone: current.menu_layout_zone,
                  }
                : {}),
            }
          })
        })
      }

      if (savedLayoutData) {
        setHomeGridLayout(savedLayoutData)
        setSavedHomeGridLayout(savedLayoutData)
        savedHomeGridLayoutRef.current = savedLayoutData
      }

      const hasSuccesses = succeededModes.length > 0 || Boolean(savedLayoutData)

      if (failures.length > 0 && hasSuccesses) {
        toast.warning(
          `Parte das alterações foi salva, mas houve falha em outra parte: ${failures.join(" ")}`
        )
      } else if (failures.length > 0) {
        toast.error(failures.join(" "))
      } else if (savedLayoutData && succeededModes.length > 0) {
        toast.success("Alterações da grade e ordem salvas com sucesso!")
      } else if (savedLayoutData) {
        toast.success("Layout da Grade 3D salvo e publicado!")
      } else {
        toast.success("Ordem da vitrine e cardápio salva!")
      }
    } finally {
      setSavingAll(false)
    }
  }

  function handleDiscardAllOrderChanges() {
    setCategories(savedCategories)
    setHomeGridLayout(savedHomeGridLayout)
    setDirtyTabs({ home_bar: false, home_featured: false, menu: false })
    toast.info("Alterações descartadas.")
  }

  function handlePreviewEditCategory(cat: CategoryWithCounts) {
    if (hasAnyUnsavedChanges) {
      toast.warning(
        "Salve ou descarte as alterações de ordem ou layout da grade antes de editar uma categoria."
      )
      return
    }
    setPreviewSheetOpen(false)
    openEditModal(cat)
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Offline Banner */}
      {isOffline && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-[#C1440E]/35 bg-[#FFF4EE] px-4 py-3 text-sm text-[#8F2E07]"
        >
          <WifiOff className="size-4 shrink-0 text-[#C1440E]" />
          <div className="flex-1">
            <strong className="font-semibold">Sem conexão com a internet.</strong>{" "}
            Você pode visualizar as categorias carregadas, mas alterações só
            serão salvas quando a conexão retornar.
          </div>
        </div>
      )}

      {/* Migration Pending Banner */}
      {migrationPending && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[#E3A008]/50 bg-[#FEF8EC] px-4 py-3.5 text-sm text-[#6E4D00]"
        >
          <Database className="size-5 shrink-0 text-[#E3A008]" />
          <div className="flex-1 space-y-0.5">
            <p className="font-semibold text-[#1F1A17]">
              Tabela de categorias dinâmicas ainda não criada no Supabase
            </p>
            <p className="text-xs text-[#6E5620]">
              Exibindo categorias padrão em modo somente leitura. Execute o
              arquivo{" "}
              <code className="rounded bg-[#E3A008]/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#6E4D00]">
                scripts/030_dynamic_categories.sql
              </code>{" "}
              no SQL Editor do Supabase e clique em recarregar para liberar
              criação, edição e ordenação.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadCategories(true)}
            className="border-[#E3A008]/50 bg-white text-[#6E4D00] hover:bg-[#FEF8EC] shrink-0"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Verificar novamente
          </Button>
        </div>
      )}

      {/* Page Header */}
      <header className="rounded-2xl border border-[#ECE7E0] bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#FEF8EC] border border-[#E3A008]/35 text-[#E3A008]">
                <Layers className="size-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#1F1A17]">
                  Vitrine, Ícones 3D &amp; Categorias
                </h1>
                <p className="text-xs sm:text-sm text-[#6E6258]">
                  Organize a Vitrine da Home, faça upload de ícones 3D e arraste
                  a ordem na Prévia ao Vivo. Novas categorias de produtos podem
                  ser criadas em Produtos ou aqui.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Mobile / Tablet Live Preview Sheet */}
            <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || Boolean(errorMessage)}
                  className="xl:hidden border-[#ECE7E0] bg-[#FEF8EC] text-[#8A6100] hover:bg-[#FDEFC9]"
                >
                  <Eye className="size-4 mr-1.5" />
                  Prévia ao Vivo
                  {hasAnyUnsavedChanges && (
                    <span
                      className="ml-1.5 size-2 rounded-full bg-[#C1440E]"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md bg-[#F7F5F0] p-4 overflow-y-auto"
              >
                <SheetHeader className="p-0 pb-3">
                  <SheetTitle className="text-[#1F1A17]">
                    Prévia ao Vivo
                  </SheetTitle>
                  <SheetDescription className="text-[#6E6258]">
                    Veja como a Home e o Cardápio ficam com suas alterações.
                  </SheetDescription>
                </SheetHeader>
                <CategoryLivePreview
                  categories={categories}
                  activeTab={activeTab}
                  hasUnsavedChanges={hasAnyUnsavedChanges}
                  savingChanges={isSavingOrder}
                  writesDisabled={writesDisabled}
                  layoutWritesDisabled={writesDisabled || layoutMigrationPending}
                  layoutMigrationPending={layoutMigrationPending}
                  homeGridLayout={homeGridLayout}
                  onChangeHomeGridLayout={setHomeGridLayout}
                  onEditCategory={handlePreviewEditCategory}
                  onReorderHomeBar={handlePreviewReorderHomeBar}
                  onReorderHomeFeatured={handlePreviewReorderHomeFeatured}
                  onReorderMenu={handlePreviewReorderMenu}
                  onSaveChanges={handleSaveAllDirtyOrders}
                  onDiscardChanges={handleDiscardAllOrderChanges}
                />
              </SheetContent>
            </Sheet>

            <Button
              type="button"
              onClick={openCreateModal}
              disabled={writesDisabled}
              className="bg-[#E3A008] hover:bg-[#B5860A] text-white font-semibold shadow-xs"
            >
              <Plus className="size-4 mr-1.5" />
              Nova Categoria
            </Button>
          </div>
        </div>

        {/* KPI Pills + Search & Kind Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-[#F2EDE6]">
          {/* Compact KPI pills */}
          {loading ? (
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE7E0] bg-[#F7F5F0] px-3 py-1 text-xs font-medium text-[#5C5248]">
                Total
                <strong className="font-bold text-[#1F1A17]">{kpis.total}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800">
                Ativas
                <strong className="font-bold">{kpis.active}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3A008]/35 bg-[#FEF8EC] px-3 py-1 text-xs font-medium text-[#8A6100]">
                <Package className="size-3.5" />
                Categorias de Produto
                <strong className="font-bold">{kpis.products}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C1440E]/25 bg-[#FFF5F0] px-3 py-1 text-xs font-medium text-[#C1440E]">
                <Link2 className="size-3.5" />
                Atalhos
                <strong className="font-bold">{kpis.shortcuts}</strong>
              </span>
              {kpis.pendingHomeBar > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3A008]/55 bg-[#FEF8EC] px-3 py-1 text-xs font-semibold text-[#8A6100]">
                  <Sparkles className="size-3.5 text-[#E3A008]" />
                  Fora da Home
                  <strong className="font-bold">{kpis.pendingHomeBar}</strong>
                </span>
              )}
            </div>
          )}

          {/* Search & Kind Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8B7E72]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nome ou slug..."
                aria-label="Buscar categorias"
                className="pl-9 pr-8 h-9 border-[#ECE7E0] bg-[#F7F5F0]/70 focus-visible:ring-[#E3A008]/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B7E72] hover:text-[#1F1A17]"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Filtrar por tipo de categoria"
              className="inline-flex items-center rounded-lg border border-[#ECE7E0] bg-[#F7F5F0] p-0.5 shrink-0"
            >
              {(
                [
                  { value: "all", label: "Todas" },
                  { value: "product_category", label: "Produtos" },
                  { value: "home_shortcut", label: "Atalhos" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKindFilter(opt.value)}
                  aria-pressed={kindFilter === opt.value}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    kindFilter === opt.value
                      ? "bg-white text-[#1F1A17] shadow-xs"
                      : "text-[#6E6258] hover:text-[#1F1A17]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content States */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_370px] gap-6 items-start">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full max-w-md rounded-xl" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-[#ECE7E0] bg-white p-4"
              >
                <Skeleton className="size-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="hidden xl:block rounded-2xl border border-[#ECE7E0] bg-white p-4 space-y-4">
            <Skeleton className="h-6 w-44" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-[#C1440E]/30 bg-white p-8 text-center shadow-xs"
        >
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#FFF4EE] text-[#C1440E]">
            <AlertTriangle className="size-6" />
          </div>
          <h2 className="text-base font-bold text-[#1F1A17]">
            Não foi possível carregar as categorias
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#6E6258]">
            {errorMessage}
          </p>
          <Button
            type="button"
            onClick={() => loadCategories(true)}
            className="mt-4 bg-[#E3A008] hover:bg-[#B5860A] text-white"
          >
            <RefreshCw className="size-4 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DFD7CC] bg-white p-10 text-center shadow-xs">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#FEF8EC] border border-[#E3A008]/35 text-[#E3A008]">
            <Layers className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-[#1F1A17]">
            Nenhuma categoria encontrada
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#6E6258]">
            Crie sua primeira categoria de produto ou atalho 3D para organizar a
            vitrine da Home e as seções do Cardápio.
          </p>
          <Button
            type="button"
            onClick={openCreateModal}
            disabled={writesDisabled}
            className="mt-5 bg-[#E3A008] hover:bg-[#B5860A] text-white font-semibold"
          >
            <Plus className="size-4 mr-1.5" />
            Nova Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_370px] gap-6 items-start">
          {/* Left Column: Tabs & Interactive Lists */}
          <div className="min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabKey)}
              className="gap-4"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] p-1">
                <TabsTrigger
                  value="todas"
                  className="rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1F1A17] data-[state=active]:shadow-xs"
                >
                  Todas ({categories.length})
                </TabsTrigger>
                <TabsTrigger
                  value="home_bar"
                  className="rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1F1A17] data-[state=active]:shadow-xs"
                >
                  Barra 3D da Home
                  {dirtyTabs.home_bar && (
                    <span className="ml-1 size-2 rounded-full bg-[#C1440E]" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="home_featured"
                  className="rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1F1A17] data-[state=active]:shadow-xs"
                >
                  Destaques Home
                  {dirtyTabs.home_featured && (
                    <span className="ml-1 size-2 rounded-full bg-[#C1440E]" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="menu"
                  className="rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#1F1A17] data-[state=active]:shadow-xs"
                >
                  Cardápio
                  {dirtyTabs.menu && (
                    <span className="ml-1 size-2 rounded-full bg-[#C1440E]" />
                  )}
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: TODAS */}
              <TabsContent value="todas" className="space-y-3 mt-0">
                {filteredAllCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DFD7CC] bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-[#1F1A17]">
                      Nenhuma categoria encontrada para o filtro atual
                    </p>
                    <p className="mt-1 text-xs text-[#6E6258]">
                      Ajuste o termo de busca ou limpe os filtros para ver todas
                      as categorias.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("")
                          setKindFilter("all")
                        }}
                      >
                        Limpar filtros
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={openCreateModal}
                        disabled={writesDisabled}
                        className="bg-[#E3A008] hover:bg-[#B5860A] text-white"
                      >
                        <Plus className="size-3.5 mr-1" />
                        Nova Categoria
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredAllCategories.map((cat) => {
                    const isProductCat = cat.kind === "product_category"
                    const isToggling = Boolean(togglingIds[cat.id])
                    const isDuplicating = Boolean(duplicatingIds[cat.id])
                    const isPendingHomeBar =
                      isProductCat && !cat.show_on_home_bar
                    const needs3dIcon =
                      !cat.icon_url || cat.icon_type === "lucide"

                    return (
                      <article
                        key={cat.id}
                        className={cn(
                          "rounded-2xl border bg-white p-3.5 sm:p-4 shadow-xs transition-all",
                          !cat.is_active
                            ? "border-[#ECE7E0]/80 bg-[#FAF9F7] opacity-80"
                            : isPendingHomeBar
                            ? "border-[#E3A008]/55 bg-[#FEF8EC]/25 hover:border-[#E3A008]"
                            : "border-[#ECE7E0] hover:border-[#E3A008]/50"
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Icon + Info */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="relative shrink-0 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] p-1.5">
                              <CategoryIcon
                                iconUrl={cat.icon_url}
                                iconType={cat.icon_type}
                                fallbackIcon={cat.fallback_icon}
                                accentColor={cat.accent_color}
                                alt={cat.name}
                                sizeClassName="w-10 h-10"
                                iconClassName="w-5 h-5"
                              />
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-sm sm:text-base font-bold text-[#1F1A17] truncate">
                                  {cat.name}
                                </h3>
                                <span className="rounded-md bg-[#F7F5F0] border border-[#ECE7E0] px-1.5 py-0.5 font-mono text-[11px] text-[#6E6258]">
                                  /{cat.slug}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10.5px] font-semibold",
                                    isProductCat
                                      ? "border-[#E3A008]/40 bg-[#FEF8EC] text-[#8A6100]"
                                      : "border-[#C1440E]/30 bg-[#FFF5F0] text-[#C1440E]"
                                  )}
                                >
                                  {isProductCat ? "Produto" : "Atalho"}
                                </Badge>
                                {cat.badge_text && (
                                  <span
                                    style={{
                                      backgroundColor:
                                        cat.badge_color || "#C1440E",
                                    }}
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
                                  >
                                    {cat.badge_text}
                                  </span>
                                )}
                              </div>

                              {/* Counts & Business Rule Badges */}
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#6E6258]">
                                {isProductCat ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                      cat.active_products === 0
                                        ? "bg-[#FEF8EC] text-[#8A6100] border border-[#E3A008]/35"
                                        : "bg-[#F7F5F0] text-[#4A4139] border border-[#ECE7E0]"
                                    )}
                                  >
                                    <Package className="size-3" />
                                    {cat.active_products} ativos /{" "}
                                    {cat.total_products} total
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F5F0] border border-[#ECE7E0] px-2 py-0.5 text-[11px] text-[#5C5248]">
                                    <Link2 className="size-3 text-[#C1440E]" />
                                    {cat.custom_href || "/cardapio"}
                                  </span>
                                )}

                                {isProductCat && cat.allows_addons && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#ECE7E0] px-2 py-0.5 text-[11px] font-medium text-[#5C5248]">
                                    <PlusCircle className="size-3 text-[#E3A008]" />
                                    Adicionais
                                  </span>
                                )}
                                {isProductCat && cat.allows_notes && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#ECE7E0] px-2 py-0.5 text-[11px] font-medium text-[#5C5248]">
                                    <MessageSquare className="size-3 text-[#E3A008]" />
                                    Obs.
                                  </span>
                                )}
                                {isProductCat && cat.show_ranking && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF8EC] border border-[#E3A008]/30 px-2 py-0.5 text-[11px] font-medium text-[#8A6100]">
                                    <Trophy className="size-3 text-[#E3A008]" />
                                    Ranking
                                  </span>
                                )}
                                {isPendingHomeBar && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF8EC] border border-[#E3A008]/50 px-2 py-0.5 text-[11px] font-semibold text-[#8A6100]">
                                    <Sparkles className="size-3 text-[#E3A008]" />
                                    {needs3dIcon
                                      ? "Aguardando ícone 3D / fora da Home"
                                      : "Fora da Home (Vitrine)"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Switch + Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F2EDE6] shrink-0">
                            <div className="flex items-center gap-2 pr-1">
                              <span className="text-[11px] font-medium text-[#6E6258]">
                                {cat.is_active ? "Ativa" : "Inativa"}
                              </span>
                              <Switch
                                checked={cat.is_active}
                                disabled={writesDisabled || isToggling}
                                onCheckedChange={(checked) =>
                                  handleToggleActive(cat, checked)
                                }
                                aria-label={`Ativar ou desativar ${cat.name}`}
                                className="data-[state=checked]:bg-[#E3A008]"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={writesDisabled}
                                onClick={() => openEditModal(cat)}
                                aria-label={`Editar ${cat.name}`}
                                title="Editar"
                                className="size-8 border-[#ECE7E0] text-[#5C5248] hover:border-[#E3A008] hover:text-[#1F1A17]"
                              >
                                <Pencil className="size-3.5" />
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={writesDisabled || isDuplicating}
                                onClick={() => handleDuplicate(cat)}
                                aria-label={`Duplicar ${cat.name}`}
                                title="Duplicar"
                                className="size-8 border-[#ECE7E0] text-[#5C5248] hover:border-[#E3A008] hover:text-[#1F1A17]"
                              >
                                {isDuplicating ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={writesDisabled}
                                onClick={() => handleRequestDelete(cat)}
                                aria-label={`Excluir ${cat.name}`}
                                title="Excluir"
                                className="size-8 border-[#ECE7E0] text-[#C1440E] hover:border-[#C1440E]/50 hover:bg-[#FFF4EE]"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })
                )}
              </TabsContent>

              {/* TAB 2: BARRA 3D DA HOME */}
              <TabsContent value="home_bar" className="space-y-3 mt-0">
                <OrderTabToolbar
                  title="Ordem da Grade 3D da Home"
                  subtitle="Arraste os cartões ou use as setas para definir a ordem dos ícones 3D na página inicial."
                  dirty={dirtyTabs.home_bar}
                  saving={
                    savingMode === "home_bar" ||
                    (savingAll && dirtyTabs.home_bar)
                  }
                  disabled={orderControlsDisabled}
                  saveLabel="Salvar ordem da Home"
                  onSave={() => handleSaveOrder("home_bar")}
                  onDiscard={() => handleDiscardTabChanges("home_bar")}
                />

                <div className="space-y-2">
                  {homeBarList.map((cat, idx) => {
                    const isPendingHomeBar =
                      cat.kind === "product_category" && !cat.show_on_home_bar
                    const needs3dIcon =
                      !cat.icon_url || cat.icon_type === "lucide"

                    return (
                    <div
                      key={cat.id}
                      draggable={!orderControlsDisabled}
                      onDragStart={(e) => handleDragStart(e, cat.id)}
                      onDragOver={(e) => handleDragOver(e, cat.id)}
                      onDrop={(e) =>
                        handleDrop(e, "home_bar", homeBarList, cat.id)
                      }
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border bg-white p-3 transition-all",
                        draggedId === cat.id && "opacity-50 scale-[0.99]",
                        dragOverId === cat.id && draggedId !== cat.id
                          ? "border-[#E3A008] ring-2 ring-[#E3A008]/25 bg-[#FEF8EC]/50"
                          : isPendingHomeBar
                          ? "border-[#E3A008]/55 bg-[#FEF8EC]/25"
                          : "border-[#ECE7E0]",
                        (!cat.is_active || !cat.show_on_home_bar) &&
                          !isPendingHomeBar &&
                          "bg-[#FAF9F7] opacity-80",
                        !cat.is_active && isPendingHomeBar && "opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          aria-hidden="true"
                          className="cursor-grab active:cursor-grabbing text-[#9E9185] hover:text-[#1F1A17]"
                        >
                          <GripVertical className="size-4" />
                        </span>
                        <span className="flex size-6 items-center justify-center rounded-full bg-[#FEF8EC] border border-[#E3A008]/35 text-[11px] font-bold text-[#8A6100]">
                          {idx + 1}
                        </span>
                      </div>

                      <CategoryIcon
                        iconUrl={cat.icon_url}
                        iconType={cat.icon_type}
                        fallbackIcon={cat.fallback_icon}
                        accentColor={cat.accent_color}
                        alt={cat.name}
                        sizeClassName="w-9 h-9"
                        iconClassName="w-4 h-4"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#1F1A17] truncate">
                            {cat.name}
                          </span>
                          {!cat.is_active && (
                            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                              Inativa
                            </span>
                          )}
                          {isPendingHomeBar && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF8EC] border border-[#E3A008]/50 px-2 py-0.5 text-[10px] font-semibold text-[#8A6100]">
                              <Sparkles className="size-2.5 text-[#E3A008]" />
                              {needs3dIcon
                                ? "Aguardando ícone 3D / fora da Home"
                                : "Fora da Home (Vitrine)"}
                            </span>
                          )}
                          {cat.badge_text && (
                            <span
                              style={{
                                backgroundColor: cat.badge_color || "#C1440E",
                              }}
                              className="rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase text-white"
                            >
                              {cat.badge_text}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6E6258] truncate">
                          {cat.kind === "home_shortcut"
                            ? `Atalho para ${cat.custom_href || "/cardapio"}`
                            : `${cat.active_products} produto(s) ativo(s)`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 ml-auto shrink-0">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#5C5248] cursor-pointer">
                          <span className="hidden sm:inline">Exibir</span>
                          <Switch
                            checked={cat.show_on_home_bar}
                            disabled={orderControlsDisabled}
                            onCheckedChange={(checked) =>
                              updateCategoryInline("home_bar", cat.id, {
                                show_on_home_bar: checked,
                              })
                            }
                            aria-label={`Exibir ${cat.name} na barra da Home`}
                            className="data-[state=checked]:bg-[#E3A008]"
                          />
                        </label>

                        <ReorderArrowControls
                          index={idx}
                          total={homeBarList.length}
                          disabled={orderControlsDisabled}
                          itemName={cat.name}
                          onMoveUp={() =>
                            handleMoveStep("home_bar", homeBarList, idx, -1)
                          }
                          onMoveDown={() =>
                            handleMoveStep("home_bar", homeBarList, idx, 1)
                          }
                        />
                      </div>
                    </div>
                    )
                  })}
                </div>
              </TabsContent>

              {/* TAB 3: DESTAQUES HOME */}
              <TabsContent value="home_featured" className="space-y-3 mt-0">
                <OrderTabToolbar
                  title="Destaques da Página Inicial"
                  subtitle="Escolha quais categorias de produto aparecem em destaque na Home, a ordem e o limite de itens (1 a 24)."
                  dirty={dirtyTabs.home_featured}
                  saving={
                    savingMode === "home_featured" ||
                    (savingAll && dirtyTabs.home_featured)
                  }
                  disabled={orderControlsDisabled}
                  saveLabel="Salvar destaques"
                  onSave={() => handleSaveOrder("home_featured")}
                  onDiscard={() => handleDiscardTabChanges("home_featured")}
                />

                {homeFeaturedList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DFD7CC] bg-white p-8 text-center text-sm text-[#6E6258]">
                    Nenhuma categoria de produto cadastrada para destacar na
                    Home.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {homeFeaturedList.map((cat, idx) => (
                      <div
                        key={cat.id}
                        draggable={!orderControlsDisabled}
                        onDragStart={(e) => handleDragStart(e, cat.id)}
                        onDragOver={(e) => handleDragOver(e, cat.id)}
                        onDrop={(e) =>
                          handleDrop(
                            e,
                            "home_featured",
                            homeFeaturedList,
                            cat.id
                          )
                        }
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border bg-white p-3 transition-all",
                          draggedId === cat.id && "opacity-50 scale-[0.99]",
                          dragOverId === cat.id && draggedId !== cat.id
                            ? "border-[#E3A008] ring-2 ring-[#E3A008]/25 bg-[#FEF8EC]/50"
                            : "border-[#ECE7E0]",
                          (!cat.is_active || !cat.show_on_home_featured) &&
                            "bg-[#FAF9F7] opacity-80"
                        )}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            aria-hidden="true"
                            className="cursor-grab active:cursor-grabbing text-[#9E9185] hover:text-[#1F1A17]"
                          >
                            <GripVertical className="size-4" />
                          </span>
                          <span className="flex size-6 items-center justify-center rounded-full bg-[#FEF8EC] border border-[#E3A008]/35 text-[11px] font-bold text-[#8A6100]">
                            {idx + 1}
                          </span>
                        </div>

                        <CategoryIcon
                          iconUrl={cat.icon_url}
                          iconType={cat.icon_type}
                          fallbackIcon={cat.fallback_icon}
                          accentColor={cat.accent_color}
                          alt={cat.name}
                          sizeClassName="w-9 h-9"
                          iconClassName="w-4 h-4"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-[#1F1A17] truncate">
                              {cat.name}
                            </span>
                            {cat.show_ranking && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FEF8EC] border border-[#E3A008]/35 px-1.5 py-0.5 text-[10px] font-semibold text-[#8A6100]">
                                <Sparkles className="size-2.5 text-[#E3A008]" />
                                Ranking
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6E6258]">
                            {cat.active_products} ativo(s) de{" "}
                            {cat.total_products} produto(s)
                          </p>
                        </div>

                        {/* Inline Limit Stepper + Switch + Arrows */}
                        <div className="flex flex-wrap items-center gap-2.5 ml-auto shrink-0">
                          <div className="flex items-center gap-1 rounded-lg border border-[#ECE7E0] bg-[#F7F5F0] p-0.5">
                            <span className="px-1.5 text-[11px] font-medium text-[#6E6258]">
                              Limite
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={
                                orderControlsDisabled ||
                                cat.home_featured_limit <= 1
                              }
                              onClick={() =>
                                updateCategoryInline("home_featured", cat.id, {
                                  home_featured_limit: Math.max(
                                    1,
                                    cat.home_featured_limit - 1
                                  ),
                                })
                              }
                              aria-label={`Diminuir limite de ${cat.name}`}
                              className="size-6 rounded-md hover:bg-white"
                            >
                              <Minus className="size-3" />
                            </Button>
                            <input
                              type="number"
                              min={1}
                              max={24}
                              disabled={orderControlsDisabled}
                              value={cat.home_featured_limit}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10)
                                if (!Number.isNaN(parsed)) {
                                  updateCategoryInline(
                                    "home_featured",
                                    cat.id,
                                    {
                                      home_featured_limit: Math.min(
                                        24,
                                        Math.max(1, parsed)
                                      ),
                                    }
                                  )
                                }
                              }}
                              aria-label={`Limite de itens em destaque para ${cat.name}`}
                              className="w-10 rounded-md bg-white py-0.5 text-center text-xs font-bold text-[#1F1A17] border border-[#ECE7E0] focus:outline-none focus:ring-1 focus:ring-[#E3A008]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={
                                orderControlsDisabled ||
                                cat.home_featured_limit >= 24
                              }
                              onClick={() =>
                                updateCategoryInline("home_featured", cat.id, {
                                  home_featured_limit: Math.min(
                                    24,
                                    cat.home_featured_limit + 1
                                  ),
                                })
                              }
                              aria-label={`Aumentar limite de ${cat.name}`}
                              className="size-6 rounded-md hover:bg-white"
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>

                          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5248] cursor-pointer">
                            <Switch
                              checked={cat.show_on_home_featured}
                              disabled={orderControlsDisabled}
                              onCheckedChange={(checked) =>
                                updateCategoryInline("home_featured", cat.id, {
                                  show_on_home_featured: checked,
                                })
                              }
                              aria-label={`Destacar ${cat.name} na Home`}
                              className="data-[state=checked]:bg-[#E3A008]"
                            />
                          </label>

                          <ReorderArrowControls
                            index={idx}
                            total={homeFeaturedList.length}
                            disabled={orderControlsDisabled}
                            itemName={cat.name}
                            onMoveUp={() =>
                              handleMoveStep(
                                "home_featured",
                                homeFeaturedList,
                                idx,
                                -1
                              )
                            }
                            onMoveDown={() =>
                              handleMoveStep(
                                "home_featured",
                                homeFeaturedList,
                                idx,
                                1
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: CARDÁPIO */}
              <TabsContent value="menu" className="space-y-3 mt-0">
                <OrderTabToolbar
                  title="Ordem e Colunas do Cardápio"
                  subtitle="Defina a sequência no cardápio e escolha quais categorias ficam na coluna Principal ou na Lateral Direita (sticky no desktop)."
                  dirty={dirtyTabs.menu}
                  saving={
                    savingMode === "menu" || (savingAll && dirtyTabs.menu)
                  }
                  disabled={orderControlsDisabled}
                  saveLabel="Salvar ordem do Cardápio"
                  onSave={() => handleSaveOrder("menu")}
                  onDiscard={() => handleDiscardTabChanges("menu")}
                />

                {menuList.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DFD7CC] bg-white p-8 text-center text-sm text-[#6E6258]">
                    Nenhuma categoria de produto cadastrada para o Cardápio.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {menuList.map((cat, idx) => (
                      <div
                        key={cat.id}
                        draggable={!orderControlsDisabled}
                        onDragStart={(e) => handleDragStart(e, cat.id)}
                        onDragOver={(e) => handleDragOver(e, cat.id)}
                        onDrop={(e) => handleDrop(e, "menu", menuList, cat.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-2xl border bg-white p-3 transition-all",
                          draggedId === cat.id && "opacity-50 scale-[0.99]",
                          dragOverId === cat.id && draggedId !== cat.id
                            ? "border-[#E3A008] ring-2 ring-[#E3A008]/25 bg-[#FEF8EC]/50"
                            : "border-[#ECE7E0]",
                          (!cat.is_active || !cat.show_on_menu) &&
                            "bg-[#FAF9F7] opacity-80"
                        )}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            aria-hidden="true"
                            className="cursor-grab active:cursor-grabbing text-[#9E9185] hover:text-[#1F1A17]"
                          >
                            <GripVertical className="size-4" />
                          </span>
                          <span className="flex size-6 items-center justify-center rounded-full bg-[#FEF8EC] border border-[#E3A008]/35 text-[11px] font-bold text-[#8A6100]">
                            {idx + 1}
                          </span>
                        </div>

                        <CategoryIcon
                          iconUrl={cat.icon_url}
                          iconType={cat.icon_type}
                          fallbackIcon={cat.fallback_icon}
                          accentColor={cat.accent_color}
                          alt={cat.name}
                          sizeClassName="w-9 h-9"
                          iconClassName="w-4 h-4"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#1F1A17] truncate">
                              {cat.name}
                            </span>
                            {!cat.is_active && (
                              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                                Inativa
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6E6258] flex items-center gap-1">
                            <UtensilsCrossed className="size-3 text-[#E3A008]" />
                            {cat.active_products} produto(s) ativo(s)
                          </p>
                        </div>

                        {/* Inline Zone Toggle + Show Switch + Arrows */}
                        <div className="flex flex-wrap items-center gap-2.5 ml-auto shrink-0">
                          <div
                            role="group"
                            aria-label={`Zona do cardápio para ${cat.name}`}
                            className="inline-flex items-center rounded-lg border border-[#ECE7E0] bg-[#F7F5F0] p-0.5"
                          >
                            {(
                              [
                                {
                                  zone: "main" as MenuLayoutZone,
                                  label: "Principal",
                                  icon: Columns2,
                                },
                                {
                                  zone: "sidebar_right" as MenuLayoutZone,
                                  label: "Lateral Direita",
                                  icon: PanelRight,
                                },
                              ] as const
                            ).map(({ zone, label, icon: Icon }) => {
                              const active = cat.menu_layout_zone === zone
                              return (
                                <button
                                  key={zone}
                                  type="button"
                                  disabled={orderControlsDisabled}
                                  onClick={() =>
                                    updateCategoryInline("menu", cat.id, {
                                      menu_layout_zone: zone,
                                    })
                                  }
                                  aria-pressed={active}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                                    active
                                      ? zone === "sidebar_right"
                                        ? "bg-[#FEF8EC] text-[#8A6100] border border-[#E3A008]/40 shadow-2xs"
                                        : "bg-white text-[#1F1A17] shadow-2xs"
                                      : "text-[#6E6258] hover:text-[#1F1A17]"
                                  )}
                                >
                                  <Icon className="size-3" />
                                  <span>{label}</span>
                                </button>
                              )
                            })}
                          </div>

                          <Switch
                            checked={cat.show_on_menu}
                            disabled={orderControlsDisabled}
                            onCheckedChange={(checked) =>
                              updateCategoryInline("menu", cat.id, {
                                show_on_menu: checked,
                              })
                            }
                            aria-label={`Exibir ${cat.name} no Cardápio`}
                            className="data-[state=checked]:bg-[#E3A008]"
                          />

                          <ReorderArrowControls
                            index={idx}
                            total={menuList.length}
                            disabled={orderControlsDisabled}
                            itemName={cat.name}
                            onMoveUp={() =>
                              handleMoveStep("menu", menuList, idx, -1)
                            }
                            onMoveDown={() =>
                              handleMoveStep("menu", menuList, idx, 1)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Sticky Live Preview (Desktop >= xl) */}
          <aside className="hidden xl:block xl:sticky xl:top-6">
            <CategoryLivePreview
              categories={categories}
              activeTab={activeTab}
              hasUnsavedChanges={hasAnyUnsavedChanges}
              savingChanges={isSavingOrder}
              writesDisabled={writesDisabled}
              layoutWritesDisabled={writesDisabled || layoutMigrationPending}
              layoutMigrationPending={layoutMigrationPending}
              homeGridLayout={homeGridLayout}
              onChangeHomeGridLayout={setHomeGridLayout}
              onEditCategory={handlePreviewEditCategory}
              onReorderHomeBar={handlePreviewReorderHomeBar}
              onReorderHomeFeatured={handlePreviewReorderHomeFeatured}
              onReorderMenu={handlePreviewReorderMenu}
              onSaveChanges={handleSaveAllDirtyOrders}
              onDiscardChanges={handleDiscardAllOrderChanges}
            />
          </aside>
        </div>
      )}

      {/* Create / Edit Modal */}
      <CategoryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialCategory={editingCategory}
        nextOrders={nextOrders}
        onSaved={handleFormSaved}
      />

      {/* Safe Delete / Migration Modal (when total_products > 0 or server reports HAS_PRODUCTS) */}
      <CategoryDeleteModal
        open={Boolean(deleteModalCategory)}
        onOpenChange={(open) => {
          if (!open) setDeleteModalCategory(null)
        }}
        category={deleteModalCategory}
        productCount={deleteModalProductCount}
        targetCategories={categories}
        onCompleted={() => loadCategories(false)}
      />

      {/* Quick Delete Confirmation Dialog (when total_products === 0) */}
      <AlertDialog
        open={Boolean(confirmDeleteCategory)}
        onOpenChange={(open) => {
          if (!open && !deletingSimple) setConfirmDeleteCategory(null)
        }}
      >
        <AlertDialogContent className="border-[#ECE7E0] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#1F1A17]">
              Excluir categoria &ldquo;{confirmDeleteCategory?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6E6258]">
              Esta categoria não possui produtos vinculados e será removida
              permanentemente da vitrine e do banco de dados. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingSimple}
              className="border-[#ECE7E0]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingSimple}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmSimpleDelete()
              }}
              className="bg-[#C1440E] hover:bg-[#9E3509] text-white"
            >
              {deletingSimple ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir categoria"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function OrderTabToolbar({
  title,
  subtitle,
  dirty,
  saving,
  disabled,
  saveLabel,
  onSave,
  onDiscard,
}: {
  title: string
  subtitle: string
  dirty: boolean
  saving: boolean
  disabled: boolean
  saveLabel: string
  onSave: () => void
  onDiscard: () => void
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors",
        dirty
          ? "border-[#E3A008] bg-[#FEF8EC]"
          : "border-[#ECE7E0] bg-white"
      )}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#1F1A17]">{title}</h2>
          {dirty && (
            <span className="rounded-full bg-[#C1440E] px-2 py-0.5 text-[10px] font-bold text-white">
              Alterações não salvas
            </span>
          )}
        </div>
        <p className="text-xs text-[#6E6258]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {dirty && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving}
            onClick={onDiscard}
            className="border-[#ECE7E0] bg-white text-[#5C5248]"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Descartar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={disabled || saving || !dirty}
          onClick={onSave}
          className={cn(
            "font-semibold transition-all",
            dirty
              ? "bg-[#E3A008] hover:bg-[#B5860A] text-white shadow-sm"
              : "bg-[#ECE7E0] text-[#7A6E63]"
          )}
        >
          {saving ? (
            <>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="size-3.5 mr-1.5" />
              {saveLabel}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function ReorderArrowControls({
  index,
  total,
  disabled,
  itemName,
  onMoveUp,
  onMoveDown,
}: {
  index: number
  total: number
  disabled: boolean
  itemName: string
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || index === 0}
        onClick={onMoveUp}
        aria-label={`Mover ${itemName} para cima`}
        className="size-7 border-[#ECE7E0] text-[#5C5248] hover:border-[#E3A008] hover:text-[#1F1A17]"
      >
        <ArrowUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || index >= total - 1}
        onClick={onMoveDown}
        aria-label={`Mover ${itemName} para baixo`}
        className="size-7 border-[#ECE7E0] text-[#5C5248] hover:border-[#E3A008] hover:text-[#1F1A17]"
      >
        <ArrowDown className="size-3.5" />
      </Button>
    </div>
  )
}
