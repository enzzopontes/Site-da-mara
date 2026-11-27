"use client"

import { memo, useState, useEffect, useRef } from "react"
import { AnimatedSearchBar } from "./animated-search-bar"
import { CategoryIcon } from "@/components/category-icon"
import type { Category } from "@/lib/categories-db"

export interface MenuCategory {
  id: string
  label: string
  iconSrc: string
  iconScale?: number
  count: number
  category?: Category
}

interface MenuStickyNavProps {
  categories: MenuCategory[]
  activeTab: string
  onSelectCategory: (id: string) => void
  tabsContainerRef: React.RefObject<HTMLDivElement | null>
  searchQuery: string
  onSearchChange: (val: string) => void
  onSearchClear: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

export const MenuStickyNav = memo(function MenuStickyNav({
  categories,
  activeTab,
  onSelectCategory,
  tabsContainerRef,
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef
}: MenuStickyNavProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const isScrolledRef = useRef(false)

  // Sincroniza estado de scroll com o Header (Header sobe e barra de busca desce)
  useEffect(() => {
    let rafId: number | null = null

    const checkScroll = () => {
      const scrolled = window.scrollY > 45
      if (scrolled !== isScrolledRef.current) {
        isScrolledRef.current = scrolled
        setIsScrolled(scrolled)
        window.dispatchEvent(
          new CustomEvent("header-scroll-swap", { detail: { headerHidden: scrolled } })
        )
      }
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        checkScroll()
        rafId = null
      })
    }

    checkScroll()
    if (window.scrollY <= 45) {
      window.dispatchEvent(
        new CustomEvent("header-scroll-swap", { detail: { headerHidden: false } })
      )
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      window.dispatchEvent(
        new CustomEvent("header-scroll-swap", { detail: { headerHidden: false } })
      )
    }
  }, [])

  const handleSearchChange = (val: string) => {
    onSearchChange(val)
    window.dispatchEvent(new CustomEvent("catalog-search", { detail: { query: val } }))
  }

  const handleSearchClear = () => {
    onSearchClear()
    window.dispatchEvent(new CustomEvent("catalog-search", { detail: { query: "" } }))
  }

  return (
    <nav
      aria-label="Navegação e busca do cardápio"
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] transition-shadow duration-300 ${
        isScrolled ? "shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "shadow-xs"
      }`}
    >
      <div className="w-full pt-2 pb-2.5 flex flex-col items-center">
        {/* Barra de Busca + Carrinho: Sempre ativa no Mobile; No Desktop, desce suavemente no scroll */}
        <div
          className={`w-full max-w-2xl px-3 sm:px-6 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isScrolled
              ? "max-h-16 opacity-100 translate-y-0 mb-2.5 pointer-events-auto"
              : "max-h-16 opacity-100 translate-y-0 mb-2 md:max-h-0 md:opacity-0 md:-translate-y-4 md:mb-0 md:pointer-events-none md:overflow-hidden"
          }`}
        >
          <AnimatedSearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            onClear={handleSearchClear}
            inputRef={searchInputRef}
            showCart={isScrolled}
          />
        </div>

        {/* Carrossel de Categorias (Centralizado no Desktop / Touch no Mobile) */}
        <div
          ref={tabsContainerRef}
          className="relative w-full overflow-x-auto no-scrollbar py-0.5 scroll-smooth touch-pan-x"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        >
          <div
            role="tablist"
            aria-label="Categorias de produtos"
            className="flex items-center gap-2 sm:gap-2.5 w-max md:mx-auto px-3 sm:px-6"
          >
            {categories.map((cat) => {
              const isActive = activeTab === cat.id
              const isTodos = cat.id === "todos"
              return (
                <button
                  key={cat.id}
                  id={`tab-${cat.id}`}
                  role="tab"
                  aria-label={isTodos ? cat.label : undefined}
                  title={isTodos ? cat.label : undefined}
                  aria-selected={isActive}
                  aria-controls={isTodos ? undefined : cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`shrink-0 h-9.5 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all border whitespace-nowrap active:scale-95 cursor-pointer ${
                    isTodos ? "w-9.5 md:w-10 px-0" : "px-3.5 md:px-4 gap-2"
                  } ${
                    isActive
                      ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207] shadow-xs"
                      : "bg-[#F7F5F0] border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50 hover:bg-[#FFF9EE]"
                  }`}
                >
                  {cat.category ? (
                    <CategoryIcon
                      iconUrl={cat.category.icon_url || (cat.category.icon_type !== "lucide" ? cat.iconSrc : null)}
                      iconType={cat.category.icon_type}
                      iconScale={cat.category.icon_scale}
                      fallbackIcon={cat.category.fallback_icon}
                      accentColor={cat.category.accent_color}
                      sizeClassName={
                        isTodos ? "w-6 h-6 md:w-6.5 md:h-6.5" : "w-5 h-5 md:w-5.5 md:h-5.5"
                      }
                      iconClassName="w-3.5 h-3.5"
                      className="shrink-0 drop-shadow-xs"
                    />
                  ) : (
                    <CategoryIcon
                      iconUrl={cat.iconSrc}
                      iconType="preset_3d"
                      iconScale={cat.iconScale}
                      fallbackIcon={isTodos ? "LayoutGrid" : "UtensilsCrossed"}
                      accentColor="#E3A008"
                      sizeClassName={
                        isTodos ? "w-6 h-6 md:w-6.5 md:h-6.5" : "w-5 h-5 md:w-5.5 md:h-5.5"
                      }
                      iconClassName="w-3.5 h-3.5"
                      className="shrink-0 drop-shadow-xs"
                    />
                  )}
                  {!isTodos && (
                    <>
                      <span>{cat.label}</span>
                      {cat.category?.badge_text && (
                        <span
                          className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full text-white leading-none"
                          style={{ backgroundColor: cat.category.badge_color || "#C1440E" }}
                        >
                          {cat.category.badge_text}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold leading-none ${
                          isActive
                            ? "bg-[#FDE68A] text-[#854D0E]"
                            : "bg-[#ECE7E0] text-[#717171]"
                        }`}
                      >
                        {cat.count}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
})
