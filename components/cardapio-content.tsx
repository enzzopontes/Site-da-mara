"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { Utensils, GlassWater, Soup, Sparkles, SearchX } from "lucide-react"
import { CardapioSkeleton } from "@/components/skeletons/cardapio-skeleton"
import { MenuStickyNav, type MenuCategory } from "@/components/menu-sticky-nav"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
}

interface CardapioContentProps {
  batatas: Product[]
  macarrao: Product[]
  bebidas: Product[]
  topBatatasNames?: string[]
  topMacarraoNames?: string[]
}

export function CardapioContent({
  batatas,
  macarrao,
  bebidas,
  topBatatasNames = [],
  topMacarraoNames = []
}: CardapioContentProps) {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [activeTab, setActiveTab] = useState("todos")
  const [mounted, setMounted] = useState(false)

  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const activeTabRef = useRef(activeTab)
  const isManualScrollRef = useRef(false)
  const manualScrollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [promoProductIds, setPromoProductIds] = useState<string[]>([])
  const [superPromoActive, setSuperPromoActive] = useState(false)

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

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
      behavior: "smooth"
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

  // Sincronizar parâmetros de busca e categoria da URL
  useEffect(() => {
    const q = searchParams.get("q")
    if (q !== null && q !== searchQuery) {
      setSearchQuery(q)
    }
    const cat = searchParams.get("category")
    if (cat) {
      const normalizedCat =
        cat === "batata" || cat === "batatas"
          ? "batatas"
          : cat === "macarrao"
          ? "macarrao"
          : cat === "bebida" || cat === "bebidas"
          ? "bebidas"
          : "todos"

      setActiveTab(normalizedCat)
      centerActiveTab(normalizedCat)

      if (normalizedCat !== "todos") {
        setTimeout(() => {
          const target = document.getElementById(normalizedCat)
          if (target) {
            target.scrollIntoView({ behavior: "smooth" })
          }
        }, 300)
      }
    }
  }, [searchParams, centerActiveTab])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Carregar dados de promoção
  useEffect(() => {
    const loadPromoData = async () => {
      try {
        const { storeStatusManager } = await import("@/lib/store-status-manager")
        const status = await storeStatusManager.getStatus()

        if (status.superPromo?.isActive) {
          setSuperPromoActive(true)
          setPromoProductIds(batatas.map((b) => b.id))
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
  }, [batatas])

  // Filtragem e ordenação inteligente dos produtos
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

  const filteredBatatas = useMemo(
    () => filterAndSortProducts(batatas, topBatatasNames),
    [filterAndSortProducts, batatas, topBatatasNames]
  )
  const filteredMacarrao = useMemo(
    () => filterAndSortProducts(macarrao, topMacarraoNames),
    [filterAndSortProducts, macarrao, topMacarraoNames]
  )
  const filteredBebidas = useMemo(
    () => filterAndSortProducts(bebidas, []),
    [filterAndSortProducts, bebidas]
  )

  const totalCount =
    filteredBatatas.length + filteredMacarrao.length + filteredBebidas.length

  const categories: MenuCategory[] = useMemo(
    () => [
      {
        id: "todos",
        label: "Todos",
        iconSrc: "/assets/icones3d/iconetodos.png",
        count: totalCount
      },
      {
        id: "batatas",
        label: "Batatas",
        iconSrc: "/assets/icones3d/icone batata.png",
        count: filteredBatatas.length
      },
      {
        id: "macarrao",
        label: "Macarrão",
        iconSrc: "/assets/icones3d/icone macarrao.png",
        count: filteredMacarrao.length
      },
      {
        id: "bebidas",
        label: "Bebidas",
        iconSrc: "/assets/icones3d/icone bebidas geladas.png",
        count: filteredBebidas.length
      }
    ],
    [totalCount, filteredBatatas.length, filteredMacarrao.length, filteredBebidas.length]
  )

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

  // IntersectionObserver: ScrollSpy de alta performance (sem listeners de scroll no catálogo)
  useEffect(() => {
    if (!mounted) return

    const sectionIds = ["batatas", "macarrao", "bebidas"]
    const observedElements: HTMLElement[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observedElements.push(el)
    })

    if (observedElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollRef.current) return

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
        threshold: [0, 0.15]
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
  }, [mounted, centerActiveTab, filteredBatatas.length, filteredMacarrao.length, filteredBebidas.length])

  if (!mounted) return <CardapioSkeleton />

  const isSearchActive = searchQuery.trim().length > 0
  const hasNoResults = totalCount === 0

  return (
    <main className="flex-1 bg-gray-50 pb-24 min-h-screen">
      {/* Cabeçalho Sticky Inteligente (Busca + Abas Flush) */}
      <MenuStickyNav
        categories={categories}
        activeTab={activeTab}
        onSelectCategory={handleSelectCategory}
        tabsContainerRef={tabsContainerRef}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery("")}
        searchInputRef={searchInputRef}
      />

      <div className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        {/* Caso de busca sem nenhum resultado */}
        {isSearchActive && hasNoResults && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#ECE7E0] shadow-xs my-4 animate-in fade-in-50 duration-200">
            <div className="w-14 h-14 rounded-full bg-[#FEF8EC] flex items-center justify-center text-[#E3A008] mb-3">
              <SearchX className="h-7 w-7" />
            </div>
            <h2 className="text-base font-bold text-[#1A1A1A] mb-1">
              Nenhum produto encontrado
            </h2>
            <p className="text-xs sm:text-sm text-[#717171] max-w-sm mb-4">
              Não encontramos resultados para &ldquo;<span className="font-semibold text-[#1A1A1A]">{searchQuery}</span>&rdquo;. Tente outro termo ou limpe a busca.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="h-10 px-5 rounded-full bg-[#E3A008] hover:bg-[#C1440E] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Limpar busca e ver cardápio
            </button>
          </div>
        )}

        {/* Listagem Contínua dos Produtos (ScrollSpy) */}
        <div className="space-y-10 w-full">
          {/* Seção Batatas Recheadas */}
          {(!isSearchActive || filteredBatatas.length > 0) && (
            <section
              id="batatas"
              className="w-full px-0.5 scroll-mt-28 sm:scroll-mt-32"
              aria-labelledby="heading-batatas"
            >
              <div className="mb-4">
                <h2
                  id="heading-batatas"
                  className="text-xl sm:text-2xl font-black text-[#1A1A1A] mb-1 flex items-center gap-2"
                >
                  <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-[#E3A008]" />
                  <span>Batatas Recheadas</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#717171] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#E3A008]" />
                  <span className="font-medium">Personalize com seus adicionais favoritos!</span>
                </p>
              </div>

              {filteredBatatas.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredBatatas.map((product) => {
                    const rankIdx = topBatatasNames.findIndex(
                      (name) => name.toLowerCase() === product.name.toLowerCase()
                    )
                    const rank = rankIdx !== -1 ? ((rankIdx + 1) as 1 | 2 | 3) : null

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        rank={rank}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#ECE7E0]">
                  <Utensils className="h-10 w-10 mx-auto text-[#ECE7E0] mb-2" />
                  <p className="text-[#717171] text-xs font-semibold">
                    Nenhuma batata disponível no momento.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Seção Macarrão */}
          {(!isSearchActive || filteredMacarrao.length > 0) && (
            <section
              id="macarrao"
              className="w-full px-0.5 scroll-mt-28 sm:scroll-mt-32"
              aria-labelledby="heading-macarrao"
            >
              <div className="mb-4">
                <h2
                  id="heading-macarrao"
                  className="text-xl sm:text-2xl font-black text-[#1A1A1A] mb-1 flex items-center gap-2"
                >
                  <Soup className="h-5 w-5 sm:h-6 sm:w-6 text-[#E3A008]" />
                  <span>Macarrão</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#717171] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#E3A008]" />
                  <span className="font-medium">Adicione proteínas e queijo gratinado!</span>
                </p>
              </div>

              {filteredMacarrao.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredMacarrao.map((product) => {
                    const rankIdx = topMacarraoNames.findIndex(
                      (name) => name.toLowerCase() === product.name.toLowerCase()
                    )
                    const rank = rankIdx !== -1 ? ((rankIdx + 1) as 1 | 2 | 3) : null

                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        rank={rank}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#ECE7E0]">
                  <Soup className="h-10 w-10 mx-auto text-[#ECE7E0] mb-2" />
                  <p className="text-[#717171] text-xs font-semibold">
                    Nenhum macarrão disponível no momento.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Seção Bebidas */}
          {(!isSearchActive || filteredBebidas.length > 0) && (
            <section
              id="bebidas"
              className="w-full px-0.5 scroll-mt-28 sm:scroll-mt-32"
              aria-labelledby="heading-bebidas"
            >
              <div className="mb-4">
                <h2
                  id="heading-bebidas"
                  className="text-xl sm:text-2xl font-black text-[#1A1A1A] mb-1 flex items-center gap-2"
                >
                  <GlassWater className="h-5 w-5 sm:h-6 sm:w-6 text-[#E3A008]" />
                  <span>Bebidas Geladas</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#717171]">
                  Refrigerantes, sucos e complementos para o seu pedido.
                </p>
              </div>

              {filteredBebidas.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredBebidas.map((product) => (
                    <ProductCard key={product.id} product={product} rank={null} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#ECE7E0]">
                  <GlassWater className="h-10 w-10 mx-auto text-[#ECE7E0] mb-2" />
                  <p className="text-[#717171] text-xs font-semibold">
                    Nenhuma bebida disponível no momento.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
