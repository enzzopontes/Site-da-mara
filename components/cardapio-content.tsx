"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { CategoryIcon } from "@/components/category-icon"
import {
  SearchX,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react"
import { CardapioSkeleton } from "@/components/skeletons/cardapio-skeleton"
import { MenuStickyNav, type MenuCategory } from "@/components/menu-sticky-nav"
import type { Category } from "@/lib/categories-db"
import type { Product } from "@/lib/products-db"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"
import type {
  CardapioContentProps,
  MenuSectionData,
} from "./cardapio-content-wrapper"

export function CardapioContent({
  sections,
  loadError = null,
}: CardapioContentProps) {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [activeTab, setActiveTab] = useState("todos")
  const [mounted, setMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)

  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const activeTabRef = useRef(activeTab)
  const isManualScrollRef = useRef(false)
  const manualScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [promoProductIds, setPromoProductIds] = useState<string[]>([])
  const [, setSuperPromoActive] = useState(false)

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Monitoramento de conectividade (estado Offline)
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Detecta viewport desktop (>= 1024px) para renderizar uma única árvore DOM (sem IDs duplicados)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  // Ordenação determinística das seções pelo menu_order configurado no banco
  const orderedSections = useMemo<MenuSectionData[]>(
    () =>
      [...sections].sort(
        (a, b) =>
          a.category.menu_order - b.category.menu_order ||
          a.category.name.localeCompare(b.category.name, "pt-BR")
      ),
    [sections]
  )

  // Centralizar aba selecionada no carrossel horizontal
  const centerActiveTab = useCallback((tabId: string) => {
    const container = tabsContainerRef.current
    const tabElement = document.getElementById(`tab-${tabId}`)
    if (!container || !tabElement) return

    const containerWidth = container.offsetWidth
    const tabOffset = tabElement.offsetLeft
    const tabWidth = tabElement.offsetWidth

    container.scrollTo({
      left: tabOffset - containerWidth / 2 + tabWidth / 2,
      behavior: "smooth",
    })
  }, [])

  // Escutar evento global de foco na busca vindo da MobileNavbar ou URL
  useEffect(() => {
    const handleFocusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
        searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }

    window.addEventListener("focus-search", handleFocusSearch)

    return () => window.removeEventListener("focus-search", handleFocusSearch)
  }, [])

  // Sincronizar busca vinda do Header Desktop
  useEffect(() => {
    const handleCatalogSearch = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string }>
      if (typeof customEvent.detail?.query === "string") {
        setSearchQuery(customEvent.detail.query)
      }
    }

    window.addEventListener("catalog-search", handleCatalogSearch)
    return () => window.removeEventListener("catalog-search", handleCatalogSearch)
  }, [])

  // Sincronizar parâmetros de busca e categoria da URL (?q= e ?category=)
  useEffect(() => {
    const q = searchParams.get("q")
    if (q !== null) {
      setSearchQuery(q)
    }

    if (!mounted) return

    const cat = searchParams.get("category")
    if (cat) {
      const normalizedParam = normalizeLegacyCategorySlug(cat)
      const matchedSection = orderedSections.find(
        (sec) =>
          sec.category.slug === cat ||
          normalizeLegacyCategorySlug(sec.category.slug) === normalizedParam
      )
      const matchedSlug = matchedSection ? matchedSection.category.slug : "todos"

      setActiveTab(matchedSlug)
      centerActiveTab(matchedSlug)

      if (matchedSlug !== "todos") {
        const timer = setTimeout(() => {
          const target = document.getElementById(matchedSlug)
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 250)
        return () => clearTimeout(timer)
      }
    }
  }, [searchParams, mounted, orderedSections, centerActiveTab])

  // Carregar dados de promoção
  useEffect(() => {
    const loadPromoData = async () => {
      try {
        const { storeStatusManager } = await import("@/lib/store-status-manager")
        const status = await storeStatusManager.getStatus()

        if (status.superPromo?.isActive) {
          setSuperPromoActive(true)
          const batataIds = sections
            .flatMap((sec) =>
              normalizeLegacyCategorySlug(sec.category.slug) === "batata"
                ? sec.products
                : sec.products.filter(
                    (p) => normalizeLegacyCategorySlug(p.category) === "batata"
                  )
            )
            .map((p) => p.id)
          setPromoProductIds(Array.from(new Set(batataIds)))
        } else if (status.itemPromo?.isActive && status.promoProducts) {
          setSuperPromoActive(false)
          setPromoProductIds(status.promoProducts.map((p) => p.productId))
        } else {
          setSuperPromoActive(false)
          setPromoProductIds([])
        }
      } catch (error) {
        console.error("Erro ao carregar dados de promoção:", error)
      }
    }

    loadPromoData()
    const interval = setInterval(loadPromoData, 5000)
    return () => clearInterval(interval)
  }, [sections])

  // Filtragem e ordenação inteligente dos produtos (com normalização NFD sem acentos)
  const filterAndSortProducts = useCallback(
    (products: Product[], topNames: string[]) => {
      const normalize = (str: string) =>
        str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()

      const term = normalize(searchQuery.trim())

      const filtered = products.filter((product) => {
        if (!term) return true
        const name = normalize(product.name)
        const description = normalize(product.description)
        return name.includes(term) || description.includes(term)
      })

      return [...filtered].sort((a, b) => {
        const aInPromo = promoProductIds.includes(a.id)
        const bInPromo = promoProductIds.includes(b.id)

        if (aInPromo && !bInPromo) return -1
        if (!aInPromo && bInPromo) return 1

        const indexA = topNames.findIndex(
          (name) => name.toLowerCase() === a.name.toLowerCase()
        )
        const indexB = topNames.findIndex(
          (name) => name.toLowerCase() === b.name.toLowerCase()
        )

        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return 0
      })
    },
    [searchQuery, promoProductIds]
  )

  const processedSections = useMemo<MenuSectionData[]>(
    () =>
      orderedSections.map((sec) => ({
        ...sec,
        products: filterAndSortProducts(sec.products, sec.topNames),
      })),
    [orderedSections, filterAndSortProducts]
  )

  const filteredSections = useMemo<MenuSectionData[]>(
    () => processedSections.filter((sec) => sec.products.length > 0),
    [processedSections]
  )

  const totalProductCount = useMemo(
    () => processedSections.reduce((acc, sec) => acc + sec.products.length, 0),
    [processedSections]
  )

  const hasActiveSearch = searchQuery.trim().length > 0

  const menuTabs: MenuCategory[] = useMemo(() => {
    const tabSections = hasActiveSearch ? filteredSections : processedSections
    return [
      {
        id: "todos",
        label: "Todos",
        iconSrc: "/assets/icones3d/iconetodos.png",
        count: totalProductCount,
      },
      ...tabSections.map((sec) => ({
        id: sec.category.slug,
        label: sec.category.name,
        iconSrc: sec.category.icon_url || "",
        category: sec.category,
        count: sec.products.length,
      })),
    ]
  }, [hasActiveSearch, filteredSections, processedSections, totalProductCount])

  const mainSections = useMemo(
    () =>
      filteredSections.filter(
        (s) => s.category.menu_layout_zone !== "sidebar_right"
      ),
    [filteredSections]
  )

  const sidebarSections = useMemo(
    () =>
      filteredSections.filter(
        (s) => s.category.menu_layout_zone === "sidebar_right"
      ),
    [filteredSections]
  )

  const useSplitDesktopLayout =
    isDesktop && mainSections.length > 0 && sidebarSections.length > 0

  // Ação ao selecionar aba no carrossel de categorias
  const handleSelectCategory = useCallback(
    (catId: string) => {
      setActiveTab(catId)
      centerActiveTab(catId)

      isManualScrollRef.current = true
      if (manualScrollTimerRef.current) {
        clearTimeout(manualScrollTimerRef.current)
      }

      const releaseManualScroll = () => {
        isManualScrollRef.current = false
      }

      if (catId === "todos") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        const target = document.getElementById(catId)
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }

      // Desbloqueia após scroll terminar (tempo seguro com suporte a scrollend)
      if ("onscrollend" in window) {
        window.addEventListener("scrollend", releaseManualScroll, { once: true })
      }
      manualScrollTimerRef.current = setTimeout(releaseManualScroll, 750)
    },
    [centerActiveTab]
  )

  const renderedSlugsKey = useMemo(
    () => filteredSections.map((s) => s.category.slug).join("|"),
    [filteredSections]
  )

  // IntersectionObserver: ScrollSpy dinâmico de alta performance (sem listeners pesados de scroll)
  useEffect(() => {
    if (!mounted) return

    const sectionIds = renderedSlugsKey ? renderedSlugsKey.split("|") : []
    const observedElements: HTMLElement[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observedElements.push(el)
    })

    if (observedElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollRef.current || window.scrollY < 60) return

        // Procura a seção que intersecta a zona de leitura do topo
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (visibleEntry?.target?.id) {
          const newActiveId = visibleEntry.target.id
          if (newActiveId !== activeTabRef.current) {
            activeTabRef.current = newActiveId
            setActiveTab(newActiveId)
            centerActiveTab(newActiveId)
          }
        }
      },
      {
        // Linha de disparo logo abaixo do header sticky (110px do topo)
        rootMargin: "-110px 0px -65% 0px",
        threshold: [0, 0.15],
      }
    )

    observedElements.forEach((el) => observer.observe(el))

    // Listener passivo ultra-leve apenas para resetar "todos" no topo absoluto da página
    const handleTopBoundary = () => {
      if (
        window.scrollY < 60 &&
        activeTabRef.current !== "todos" &&
        !isManualScrollRef.current
      ) {
        activeTabRef.current = "todos"
        setActiveTab("todos")
        centerActiveTab("todos")
      }
    }

    window.addEventListener("scroll", handleTopBoundary, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", handleTopBoundary)
      if (manualScrollTimerRef.current) {
        clearTimeout(manualScrollTimerRef.current)
      }
    }
  }, [mounted, centerActiveTab, renderedSlugsKey, useSplitDesktopLayout])

  const handleClearSearch = useCallback(() => {
    setSearchQuery("")
    window.dispatchEvent(new CustomEvent("catalog-search", { detail: { query: "" } }))
  }, [])

  const renderSectionHeader = (
    category: Category,
    productCount: number,
    compact = false
  ) => {
    const countLabel = `${productCount} ${productCount === 1 ? "item" : "itens"}`
    const badgeColor = category.badge_color || "#C1440E"

    if (compact) {
      return (
        <div className="mb-3.5 pb-3 border-b border-[#ECE7E0]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CategoryIcon
                iconUrl={category.icon_url}
                iconType={category.icon_type}
                fallbackIcon={category.fallback_icon}
                accentColor={category.accent_color}
                sizeClassName="w-7 h-7"
                iconClassName="w-4 h-4"
              />
              <h2
                id={`heading-${category.slug}`}
                className="text-base font-black text-[#1A1A1A] truncate"
              >
                {category.name}
              </h2>
              {category.badge_text && (
                <span
                  style={{ backgroundColor: badgeColor }}
                  className="shrink-0 text-[10px] font-black uppercase tracking-wide text-white px-2 py-0.5 rounded-full"
                >
                  {category.badge_text}
                </span>
              )}
            </div>
            <span className="shrink-0 text-[11px] font-bold text-[#717171] bg-[#F7F5F0] border border-[#ECE7E0] px-2 py-0.5 rounded-full">
              {countLabel}
            </span>
          </div>
          {category.description && (
            <p className="text-xs text-[#717171] mt-1.5 leading-snug">
              {category.description}
            </p>
          )}
        </div>
      )
    }

    return (
      <ScrollReveal className="mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <CategoryIcon
              iconUrl={category.icon_url}
              iconType={category.icon_type}
              fallbackIcon={category.fallback_icon}
              accentColor={category.accent_color}
              sizeClassName="w-8 h-8 sm:w-9 sm:h-9"
              iconClassName="w-4 h-4 sm:w-5 sm:h-5"
            />
            <h2
              id={`heading-${category.slug}`}
              className="text-xl sm:text-2xl font-black text-[#1A1A1A] leading-tight"
            >
              {category.name}
            </h2>
            {category.badge_text && (
              <span
                style={{ backgroundColor: badgeColor }}
                className="inline-flex items-center text-[10px] sm:text-[11px] font-black uppercase tracking-wide text-white px-2.5 py-0.5 rounded-full shadow-2xs"
              >
                {category.badge_text}
              </span>
            )}
          </div>
          <span className="shrink-0 text-xs font-bold text-[#717171] bg-white border border-[#ECE7E0] px-2.5 py-1 rounded-full">
            {countLabel}
          </span>
        </div>
        {category.description && (
          <p className="text-xs sm:text-sm text-[#717171] mt-1.5 leading-relaxed">
            {category.description}
          </p>
        )}
      </ScrollReveal>
    )
  }

  // Estado Loading (hidratação inicial)
  if (!mounted) return <CardapioSkeleton />

  const offlineBanner = !isOnline ? (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#FEF8EC] border-b border-[#FCE8C3] text-[#8A6100] px-4 py-2.5"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-center">
        <WifiOff className="w-4 h-4 shrink-0 text-[#C1440E]" />
        <span>
          Você está offline. Alguns itens e preços podem estar desatualizados até a conexão retornar.
        </span>
      </div>
    </div>
  ) : null

  // Estado Error (falha ao carregar o cardápio sem fallback disponível)
  if (loadError && sections.length === 0) {
    return (
      <main className="flex-1 bg-gray-50 pb-24 min-h-screen">
        {offlineBanner}
        <div className="max-w-lg mx-auto px-4 py-16 sm:py-24">
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-[#ECE7E0] shadow-xs animate-in fade-in-50 duration-200">
            <div className="w-14 h-14 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#C1440E] mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-black text-[#1F1B16] mb-1.5">
              Não foi possível carregar o cardápio
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6157] max-w-sm mb-5 leading-relaxed">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#E3A008] hover:bg-[#C1440E] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar novamente</span>
            </button>
          </div>
        </div>
      </main>
    )
  }

  const isSearchActive = searchQuery.trim().length > 0

  return (
    <main className="flex-1 bg-gray-50 pb-24 min-h-screen">
      {/* Aviso Offline */}
      {offlineBanner}

      {/* Cabeçalho Sticky Inteligente (Busca + Abas Dinâmicas) */}
      <MenuStickyNav
        categories={menuTabs}
        activeTab={activeTab}
        onSelectCategory={handleSelectCategory}
        tabsContainerRef={tabsContainerRef}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={handleClearSearch}
        searchInputRef={searchInputRef}
      />

      {/* Estado Empty (busca sem resultados ou cardápio sem itens) */}
      {filteredSections.length === 0 ? (
        <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
          {isSearchActive ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#ECE7E0] shadow-xs my-4 animate-in fade-in-50 duration-200">
              <div className="w-14 h-14 rounded-full bg-[#FEF8EC] flex items-center justify-center text-[#E3A008] mb-3">
                <SearchX className="h-7 w-7" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-1">
                Nenhum item encontrado para &ldquo;{searchQuery}&rdquo;
              </h2>
              <p className="text-xs sm:text-sm text-[#717171] max-w-sm mb-4">
                Tente buscar por outro sabor, ingrediente ou limpe a busca para ver o cardápio completo.
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="h-10 px-5 rounded-full bg-[#E3A008] hover:bg-[#C1440E] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#ECE7E0] shadow-xs my-4 animate-in fade-in-50 duration-200">
              <div className="w-14 h-14 rounded-full bg-[#FEF8EC] flex items-center justify-center text-[#E3A008] mb-3">
                <UtensilsCrossed className="h-7 w-7" />
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-1">
                Cardápio temporariamente sem itens disponíveis
              </h2>
              <p className="text-xs sm:text-sm text-[#717171] max-w-sm">
                Estamos atualizando nossos produtos. Volte em instantes para conferir as novidades.
              </p>
            </div>
          )}
        </div>
      ) : useSplitDesktopLayout ? (
        /* Desktop Split Layout: Coluna Principal (main) + Painel Lateral Fixo (sidebar_right) */
        <div className="max-w-6xl mx-auto px-4 py-5 sm:py-7">
          <div className="grid grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] gap-7 items-start">
            {/* Zona Principal */}
            <div className="space-y-10 min-w-0">
              {mainSections.map((sec) => (
                <section
                  key={sec.category.id}
                  id={sec.category.slug}
                  className="w-full px-0.5 scroll-mt-28 sm:scroll-mt-32"
                  aria-labelledby={`heading-${sec.category.slug}`}
                >
                  {renderSectionHeader(sec.category, sec.products.length, false)}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {sec.products.map((product, idx) => (
                      <ScrollReveal key={product.id} className="grid">
                        <ProductCard
                          product={product}
                          layout="vertical"
                          rank={
                            sec.category.show_ranking && idx < 3
                              ? ((idx + 1) as 1 | 2 | 3)
                              : null
                          }
                          categoryRules={{
                            allowsAddons: sec.category.allows_addons,
                            allowsNotes: sec.category.allows_notes,
                          }}
                        />
                      </ScrollReveal>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Zona Lateral Direita (Sidebar Fixa) */}
            <aside className="sticky top-28 space-y-6">
              {sidebarSections.map((sec) => (
                <section
                  key={sec.category.id}
                  id={sec.category.slug}
                  className="bg-white border border-[#ECE7E0] rounded-2xl p-4 shadow-xs scroll-mt-28 sm:scroll-mt-32"
                  aria-labelledby={`heading-${sec.category.slug}`}
                >
                  {renderSectionHeader(sec.category, sec.products.length, true)}

                  <div className="space-y-3">
                    {sec.products.map((product, idx) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        layout="horizontal"
                        rank={
                          sec.category.show_ranking && idx < 3
                            ? ((idx + 1) as 1 | 2 | 3)
                            : null
                        }
                        categoryRules={{
                          allowsAddons: sec.category.allows_addons,
                          allowsNotes: sec.category.allows_notes,
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </aside>
          </div>
        </div>
      ) : (
        /* Layout Unificado (Mobile < 1024px ou quando apenas uma zona existe) */
        <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7 space-y-10">
          {filteredSections.map((sec) => (
            <section
              key={sec.category.id}
              id={sec.category.slug}
              className="w-full px-0.5 scroll-mt-28 sm:scroll-mt-32"
              aria-labelledby={`heading-${sec.category.slug}`}
            >
              {renderSectionHeader(sec.category, sec.products.length, false)}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {sec.products.map((product, idx) => (
                  <ScrollReveal key={product.id} className="grid">
                    <ProductCard
                      product={product}
                      layout="vertical"
                      rank={
                        sec.category.show_ranking && idx < 3
                          ? ((idx + 1) as 1 | 2 | 3)
                          : null
                      }
                      categoryRules={{
                        allowsAddons: sec.category.allows_addons,
                        allowsNotes: sec.category.allows_notes,
                      }}
                    />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
