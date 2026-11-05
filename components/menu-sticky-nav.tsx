"use client"

import { memo } from "react"
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
  isStickyShadow?: boolean
}

export const MenuStickyNav = memo(function MenuStickyNav({
  categories,
  activeTab,
  onSelectCategory,
  tabsContainerRef,
  searchQuery,
  onSearchChange,
  onSearchClear,
  searchInputRef,
  isStickyShadow = true
}: MenuStickyNavProps) {
  return (
    <nav
      aria-label="Navegação e busca do cardápio"
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] transition-shadow duration-300 ${
        isStickyShadow ? "shadow-[0_4px_12px_rgba(0,0,0,0.05)]" : "shadow-xs"
      }`}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-2.5 pb-2 flex flex-col gap-2">
        {/* Barra de Busca + Carrinho Integrado */}
        <AnimatedSearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onClear={onSearchClear}
          inputRef={searchInputRef}
        />

        {/* Carrossel de Categorias com Rolagem Touch Suave */}
        <div
          ref={tabsContainerRef}
          role="tablist"
          aria-label="Categorias de produtos"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth touch-pan-x"
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
                className={`shrink-0 h-9.5 px-3.5 rounded-full flex items-center gap-2 text-xs font-bold transition-all border whitespace-nowrap active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207] shadow-xs"
                    : "bg-[#F7F5F0] border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50 hover:bg-[#F3EFE6]"
                }`}
              >
                <img
                  src={cat.iconSrc}
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 object-contain shrink-0 drop-shadow-xs"
                />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
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
