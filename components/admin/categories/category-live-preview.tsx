"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Eye,
  EyeOff,
  LayoutGrid,
  Monitor,
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
} from "@/lib/categories-db"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"
import { CategoryIcon } from "@/components/category-icon"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface CategoryLivePreviewProps {
  categories: CategoryWithCounts[]
  activeTab?: string
}

type PreviewViewport = "mobile" | "desktop"

export function CategoryLivePreview({
  categories,
  activeTab,
}: CategoryLivePreviewProps) {
  const [viewport, setViewport] = useState<PreviewViewport>("mobile")
  const [simulateStoreAutoHide, setSimulateStoreAutoHide] = useState(false)

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

  const hasSidebarColumn = menuSidebarItems.length > 0

  return (
    <div className="rounded-2xl border border-[#ECE7E0] bg-[#F7F5F0] shadow-sm overflow-hidden">
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
              Atualiza em tempo real conforme você organiza
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
      <div className="space-y-3.5 p-3.5 max-h-[calc(100vh-14rem)] overflow-y-auto">
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

          {homeBarItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#ECE7E0] bg-[#F7F5F0]/70 px-3 py-5 text-center text-[11px] text-[#7A6E63]">
              Nenhum item ativo configurado para a barra da Home.
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-2",
                viewport === "desktop" ? "grid-cols-6" : "grid-cols-3"
              )}
            >
              {homeBarItems.map((cat) => {
                const isEmptyProductCat =
                  cat.kind === "product_category" && cat.active_products === 0
                return (
                  <div
                    key={cat.id}
                    title={
                      isEmptyProductCat
                        ? `${cat.name}: 0 ativos (oculta na loja)`
                        : cat.name
                    }
                    className={cn(
                      "relative flex flex-col items-center rounded-xl border px-1.5 py-2 text-center transition-colors",
                      isEmptyProductCat
                        ? "border-amber-300/80 bg-[#FEF8EC]/60 opacity-75"
                        : "border-[#ECE7E0] bg-[#F7F5F0]/60"
                    )}
                  >
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

                    <CategoryIcon
                      iconUrl={cat.icon_url}
                      iconType={cat.icon_type}
                      fallbackIcon={cat.fallback_icon}
                      accentColor={cat.accent_color}
                      alt={cat.name}
                      sizeClassName={
                        viewport === "desktop" ? "w-7 h-7" : "w-9 h-9"
                      }
                      iconClassName={
                        viewport === "desktop" ? "w-3.5 h-3.5" : "w-4 h-4"
                      }
                      className="mt-0.5"
                    />
                    <span className="mt-1 w-full truncate text-[10px] font-semibold text-[#1F1A17]">
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
                return (
                  <li
                    key={cat.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2",
                      isEmpty
                        ? "border-amber-300/80 bg-[#FEF8EC]/70"
                        : "border-[#ECE7E0] bg-[#F7F5F0]/50"
                    )}
                  >
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
              {viewport === "desktop" && hasSidebarColumn
                ? "2 colunas"
                : "Empilhado"}
            </span>
          </div>

          {menuItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#ECE7E0] bg-[#F7F5F0]/70 px-3 py-4 text-center text-[11px] text-[#7A6E63]">
              Nenhuma categoria ativa configurada no Cardápio.
            </div>
          ) : viewport === "desktop" && hasSidebarColumn ? (
            <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-2 items-start">
              {/* Main column */}
              <div className="space-y-1.5">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#7A6E63]">
                  Coluna Principal
                </div>
                {menuMainItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#ECE7E0] p-2 text-[10px] text-[#8B7E72] text-center">
                    Vazia
                  </div>
                ) : (
                  menuMainItems.map((cat) => (
                    <MenuWireframeCard key={cat.id} category={cat} compact />
                  ))
                )}
              </div>

              {/* Sticky right sidebar column */}
              <div className="space-y-1.5 rounded-xl border border-[#E3A008]/35 bg-[#FEF8EC]/60 p-2">
                <div className="flex items-center justify-between gap-1 text-[9.5px] font-bold uppercase tracking-wider text-[#8A6100]">
                  <span>Lateral Fixa</span>
                  <span className="rounded bg-[#E3A008]/20 px-1 text-[8.5px]">
                    sticky
                  </span>
                </div>
                {menuSidebarItems.map((cat) => (
                  <MenuWireframeCard key={cat.id} category={cat} compact />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {menuItems.map((cat, idx) => (
                <MenuWireframeCard
                  key={cat.id}
                  category={cat}
                  orderNumber={idx + 1}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MenuWireframeCard({
  category,
  orderNumber,
  compact = false,
}: {
  category: CategoryWithCounts
  orderNumber?: number
  compact?: boolean
}) {
  const isEmpty = category.active_products === 0
  return (
    <div
      title={
        isEmpty
          ? `${category.name}: 0 ativos (oculta na loja)`
          : `${category.name} (${category.active_products} ativos)`
      }
      className={cn(
        "rounded-lg border bg-white transition-colors",
        compact ? "p-1.5" : "px-2.5 py-2",
        isEmpty ? "border-amber-300/80 bg-[#FEF8EC]/50" : "border-[#ECE7E0]"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
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
