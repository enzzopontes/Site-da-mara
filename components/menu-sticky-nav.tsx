"use client"

import { memo, useState, useEffect, useRef } from "react"
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
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-2 pb-2.5 flex flex-col items-center">
        {/* Barra de Busca + Carrinho: Sempre ativa no Mobile; No Desktop, desce suavemente no scroll */}
        <div
          className={`w-full max-w-2xl flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
