"use client"

import { memo, useState, useEffect } from "react"
import { AnimatedSearchBar } from "./animated-search-bar"

export interface MenuCategory {
  id: string
  label: string
  iconSrc: string
  count: number
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

  // Detecta rolagem para exibir o carrinho com animação suave apenas após o topo
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 45
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev))
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      aria-label="Navegação e busca do cardápio"
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] transition-shadow duration-300 ${
        isScrolled ? "shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "shadow-xs"
      }`}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-2.5 pb-2.5 flex flex-col items-center gap-2.5">
        {/* Barra de Busca + Carrinho Animado no Scroll (Centralizada no Desktop) */}
        <div className="w-full max-w-2xl flex items-center justify-center">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={onSearchChange}
            onClear={onSearchClear}
            inputRef={searchInputRef}
            showCart={isScrolled}
          />
        </div>

        {/* Carrossel de Categorias (Centralizado no Desktop / Touch no Mobile) */}
        <div
          ref={tabsContainerRef}
          role="tablist"
          aria-label="Categorias de produtos"
          className="flex items-center md:justify-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth touch-pan-x w-full"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
        >
          {categories.map((cat) => {
            const isActive = activeTab === cat.id
            return (
              <button
                key={cat.id}
                id={`tab-${cat.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={cat.id === "todos" ? undefined : cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`shrink-0 h-9.5 md:h-10 px-3.5 md:px-4 rounded-full flex items-center gap-2 text-xs md:text-sm font-bold transition-all border whitespace-nowrap active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207] shadow-xs"
                    : "bg-[#F7F5F0] border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50 hover:bg-[#FFF9EE]"
                }`}
              >
                <img
                  src={cat.iconSrc}
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 md:w-5.5 md:h-5.5 object-contain shrink-0 drop-shadow-xs"
                />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold leading-none ${
                    isActive
                      ? "bg-[#FDE68A] text-[#854D0E]"
                      : "bg-[#ECE7E0] text-[#717171]"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
})
