"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { ProductCard } from "@/components/product-card"
import { Search, Utensils, GlassWater, Soup, Sparkles, Flame, Layers } from "lucide-react"

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
  const [activeTab, setActiveTab] = useState("batatas")
  const [mounted, setMounted] = useState(false)
  
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const sectionBatatasRef = useRef<HTMLElement>(null)
  const sectionMacarraoRef = useRef<HTMLElement>(null)
  const sectionBebidasRef = useRef<HTMLElement>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isManualScrolling = useRef(false)
  const manualScrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const [promoProductIds, setPromoProductIds] = useState<string[]>([])
  const [superPromoActive, setSuperPromoActive] = useState(false)

  // Função para centralizar a aba ativa
  const centerActiveTab = useCallback((tabId: string) => {
    if (tabsContainerRef.current) {
      const tabIds = ["todos", "batatas", "macarrao", "bebidas"]
      const index = tabIds.indexOf(tabId)
      
      if (index !== -1) {
        const activeTabElement = tabsContainerRef.current.children[index] as HTMLElement
        if (activeTabElement) {
          const container = tabsContainerRef.current
          const containerWidth = container.offsetWidth
          const tabOffset = activeTabElement.offsetLeft
          const tabWidth = activeTabElement.offsetWidth
          
          container.scrollTo({
            left: tabOffset - (containerWidth / 2) + (tabWidth / 2),
            behavior: "smooth"
          })
        }
      }
    }
  }, [])

  // Escutar evento global de pesquisa (Vindo da Navbar)
  useEffect(() => {
    const handleFocusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    window.addEventListener("focus-search", handleFocusSearch);
    
    // Se o parâmetro focus=search estiver na URL ao carregar
    if (searchParams.get("focus") === "search") {
      setTimeout(handleFocusSearch, 500);
    }

    return () => window.removeEventListener("focus-search", handleFocusSearch);
  }, [searchParams]);

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadPromoData = async () => {
      try {
        const { storeStatusManager } = await import("@/lib/store-status-manager")
        const status = await storeStatusManager.getStatus()
        
        if (status.superPromo?.isActive) {
          setSuperPromoActive(true)
          setPromoProductIds(batatas.map(b => b.id))
        } else if (status.itemPromo?.isActive && status.promoProducts) {
          setSuperPromoActive(false)
          setPromoProductIds(status.promoProducts.map(p => p.productId))
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

  const scrollToCategory = (catId: string) => {
    setActiveTab(catId)
    centerActiveTab(catId)
  }

  // Lógica para arrastar as abas (Drag to Scroll)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - tabsContainerRef.current.offsetLeft)
    setScrollLeft(tabsContainerRef.current.scrollLeft)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tabsContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - tabsContainerRef.current.offsetLeft
    const walk = (x - startX) * 2
    tabsContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const filterAndSortProducts = (products: Product[], topNames: string[]) => {
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    
    const term = normalize(searchQuery)
    
    const filtered = products.filter((product) => {
      const name = normalize(product.name)
      const description = normalize(product.description)
      return name.includes(term) || description.includes(term)
    })

    return [...filtered].sort((a, b) => {
      const aInPromo = promoProductIds.includes(a.id)
      const bInPromo = promoProductIds.includes(b.id)
      
      if (aInPromo && !bInPromo) return -1
      if (!aInPromo && bInPromo) return 1
      
      const indexA = topNames.findIndex(name => name.toLowerCase() === a.name.toLowerCase())
      const indexB = topNames.findIndex(name => name.toLowerCase() === b.name.toLowerCase())
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return 0
    })
  }

  const filteredBatatas = filterAndSortProducts(batatas, topBatatasNames)
  const filteredMacarrao = filterAndSortProducts(macarrao, topMacarraoNames)
  const filteredBebidas = filterAndSortProducts(bebidas, [])

  if (!mounted) return null

  const totalCount = filteredBatatas.length + filteredMacarrao.length + filteredBebidas.length

  const categories = [
    { id: "todos", label: "Todos", iconSrc: "/assets/icones3d/icone cardapio.png", count: totalCount },
    { id: "batatas", label: "Batatas", iconSrc: "/assets/icones3d/icone batata.png", count: filteredBatatas.length },
    { id: "macarrao", label: "Macarrão", iconSrc: "/assets/icones3d/icone macarrao.png", count: filteredMacarrao.length },
    { id: "bebidas", label: "Bebidas", iconSrc: "/assets/icones3d/icone bebidas geladas.png", count: filteredBebidas.length },
  ]

  return (
    <main className="flex-1 bg-gray-50 pb-20">
      {/* Header Sticky Travado Flush no Scroll (sem espaço em branco e sem sombras) */}
      <div className="bg-white border-b border-[#ECE7E0] sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center justify-center">
            <div
              ref={tabsContainerRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              className={`flex items-center justify-center overflow-x-auto no-scrollbar pt-3 pb-0 gap-6 px-4 md:px-0 w-full ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => !isDragging && scrollToCategory(cat.id)}
                  className={`flex items-center gap-1.5 xs:gap-2 whitespace-nowrap pb-3 border-b-[3px] -mb-[1px] transition-all font-bold text-[13px] xs:text-sm min-w-fit cursor-pointer ${
                    activeTab === cat.id 
                    ? "border-yellow-500 text-yellow-600" 
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <img src={cat.iconSrc} alt={cat.label} className="h-5 w-5 object-contain" />
                  <span>{cat.label}</span>
                  <span className={`px-1.5 xs:px-2 py-0.5 rounded-full text-[10px] xs:text-xs font-bold ${
                    activeTab === cat.id
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Busque por batatas, macarrão ou bebidas..."
              className="w-full h-11 pl-10 pr-4 bg-white border-2 border-gray-100 focus:border-yellow-300 rounded-xl text-sm outline-none"
            />
          </div>
        </div>

        <div className="space-y-10 w-full">
          {(activeTab === "todos" || activeTab === "batatas") && (
            <section 
              ref={sectionBatatasRef}
              id="batatas"
              className="w-full px-1"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-800 mb-2 flex items-center gap-2">
                  <Utensils className="h-6 w-6 text-yellow-500" /> 
                  Batatas Recheadas
                </h2>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Personalize com adicionais!</span>
                </p>
              </div>
              {filteredBatatas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredBatatas.map((product) => (
                    <ProductCard key={product.id} product={product} rank={topBatatasNames.findIndex(name => name.toLowerCase() === product.name.toLowerCase()) !== -1 ? (topBatatasNames.findIndex(name => name.toLowerCase() === product.name.toLowerCase()) + 1) as 1 | 2 | 3 : null} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <Utensils className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-semibold">Nenhuma batata encontrada.</p>
                </div>
              )}
            </section>
          )}

          {(activeTab === "todos" || activeTab === "macarrao") && (
            <section 
              ref={sectionMacarraoRef}
              id="macarrao"
              className="w-full px-1"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-800 mb-2 flex items-center gap-2">
                  <Soup className="h-6 w-6 text-yellow-500" /> 
                  Macarrão
                </h2>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Adicione proteínas!</span>
                </p>
              </div>
              {filteredMacarrao.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMacarrao.map((product) => (
                    <ProductCard key={product.id} product={product} rank={topMacarraoNames.findIndex(name => name.toLowerCase() === product.name.toLowerCase()) !== -1 ? (topMacarraoNames.findIndex(name => name.toLowerCase() === product.name.toLowerCase()) + 1) as 1 | 2 | 3 : null} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <Soup className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-semibold">Nenhum macarrão encontrado.</p>
                </div>
              )}
            </section>
          )}

          {(activeTab === "todos" || activeTab === "bebidas") && (
            <section 
              ref={sectionBebidasRef}
              id="bebidas"
              className="w-full px-1"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-800 mb-2 flex items-center gap-2">
                  <GlassWater className="h-6 w-6 text-yellow-500" /> 
                  Bebidas Geladas
                </h2>
                <p className="text-sm text-gray-500">Complemente seu pedido!</p>
              </div>
              {filteredBebidas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredBebidas.map((product) => (
                    <ProductCard key={product.id} product={product} rank={null} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <GlassWater className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-semibold">Nenhuma bebida encontrada.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
