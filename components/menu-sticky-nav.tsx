"use client"

import { memo, useState, useEffect, useRef, useCallback, useMemo } from "react"
import type React from "react"
import Link from "next/link"
import { Search, X, ShoppingCart } from "lucide-react"
import { AnimatedSearchBar } from "./animated-search-bar"
import { CategoryIcon } from "@/components/category-icon"
import { useCart } from "@/lib/cart-context"
import type { Category } from "@/lib/categories-db"
import {
  DEFAULT_HOME_GRID_LAYOUT,
  getFloatingCategoryIconCssVars,
  type HomeGridLayout,
} from "@/lib/home-grid-layout"

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
  layout?: HomeGridLayout
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
  layout = DEFAULT_HOME_GRID_LAYOUT,
}: MenuStickyNavProps) {
  const floatingIconVars = useMemo(
    () => getFloatingCategoryIconCssVars(layout) as React.CSSProperties,
    [layout],
  )
  const [isScrolled, setIsScrolled] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const isScrolledRef = useRef(false)
  const desktopControlsRef = useRef<HTMLDivElement>(null)
  const desktopSearchInputRef = useRef<HTMLInputElement>(null)
  const { items } = useCart()
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  // Libera foco de descendentes desktop ao recolher controles no topo (evita foco dentro de aria-hidden)
  useEffect(() => {
    if (!isScrolled && desktopControlsRef.current) {
      const active = document.activeElement
      if (active instanceof HTMLElement && desktopControlsRef.current.contains(active)) {
        active.blur()
      }
    }
  }, [isScrolled])

  // Direciona evento focus-search para o input desktop quando visível no scroll
  useEffect(() => {
    const handleDesktopFocusSearch = () => {
      if (window.matchMedia("(min-width: 1024px)").matches && isScrolledRef.current) {
        desktopSearchInputRef.current?.focus()
      }
    }
    window.addEventListener("focus-search", handleDesktopFocusSearch)
    return () => window.removeEventListener("focus-search", handleDesktopFocusSearch)
  }, [])

  const updateOverflowFades = useCallback(() => {
    const el = tabsContainerRef.current
    if (!el) return
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    const hasOverflow = maxScrollLeft > 2
    setCanScrollLeft(hasOverflow && el.scrollLeft > 2)
    setCanScrollRight(hasOverflow && el.scrollLeft < maxScrollLeft - 2)
  }, [tabsContainerRef])

  useEffect(() => {
    const el = tabsContainerRef.current
    if (!el) return

    updateOverflowFades()
    el.addEventListener("scroll", updateOverflowFades, { passive: true })
    window.addEventListener("resize", updateOverflowFades, { passive: true })

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateOverflowFades)
        : null
    resizeObserver?.observe(el)

    return () => {
      el.removeEventListener("scroll", updateOverflowFades)
      window.removeEventListener("resize", updateOverflowFades)
      resizeObserver?.disconnect()
    }
  }, [tabsContainerRef, updateOverflowFades, categories.length, isScrolled])

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
      className={`sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] transition-shadow duration-300 motion-reduce:transition-none ${
        isScrolled ? "shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "shadow-xs"
      }`}
    >
      <div className="w-full pt-2 pb-2.5 flex flex-col items-center lg:max-w-7xl lg:mx-auto lg:px-6 lg:py-0 lg:h-16 lg:flex-row lg:items-center">
        {/* Barra de Busca + Carrinho: Sempre ativa no Mobile; No Desktop (< 1024px apenas) */}
        <div
          className={`lg:hidden w-full max-w-2xl px-3 sm:px-6 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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

        {/* Espaçador esquerdo animável (Desktop): centraliza no topo e desliza categorias para a esquerda no scroll */}
        <div
          aria-hidden="true"
          className={`hidden lg:block basis-0 min-w-0 transition-[flex-grow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            isScrolled ? "grow-0" : "grow"
          }`}
        />

        {/* Carrossel de Categorias (Centralizado no Desktop / Touch no Mobile) */}
        <div className="relative w-full lg:w-auto lg:min-w-0 lg:shrink">
          <div
            aria-hidden="true"
            className={`hidden lg:block pointer-events-none absolute inset-y-0 left-0 w-8 z-10 bg-linear-to-r from-white/95 via-white/75 to-transparent transition-opacity duration-200 motion-reduce:transition-none ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            aria-hidden="true"
            className={`hidden lg:block pointer-events-none absolute inset-y-0 right-0 w-8 z-10 bg-linear-to-l from-white/95 via-white/75 to-transparent transition-opacity duration-200 motion-reduce:transition-none ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            ref={tabsContainerRef}
            className="relative w-full overflow-x-auto no-scrollbar py-1.5 scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          >
            <div
              role="tablist"
              aria-label="Categorias de produtos"
              style={floatingIconVars}
              className="flex items-center gap-2 sm:gap-2.5 w-max md:mx-auto lg:mx-0 px-3 sm:px-6 lg:px-0.5"
            >
            {categories.map((cat) => {
              const isActive = activeTab === cat.id
              const isTodos = cat.id === "todos"
              if (isTodos) {
                return (
                  <button
                    key={cat.id}
                    type="button"
                    id={`tab-${cat.id}`}
                    role="tab"
                    aria-label={cat.label}
                    title={cat.label}
                    aria-selected={isActive}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`group shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all border active:scale-95 cursor-pointer ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] shadow-xs"
                        : "bg-[#F7F5F0] border-[#ECE7E0] hover:border-[#E3A008]/50 hover:bg-[#FFF9EE]"
                    }`}
                  >
                    {cat.category ? (
                      <CategoryIcon
                        iconUrl={cat.category.icon_url || (cat.category.icon_type !== "lucide" ? cat.iconSrc : null)}
                        iconType={cat.category.icon_type}
                        iconScale={cat.category.icon_scale}
                        fallbackIcon={cat.category.fallback_icon}
                        accentColor={cat.category.accent_color}
                        alt=""
                        sizeClassName="[width:var(--float-todos-m)] [height:var(--float-todos-m)] md:[width:var(--float-todos-d)] md:[height:var(--float-todos-d)]"
                        iconClassName="w-4 h-4"
                        className="rounded-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <CategoryIcon
                        iconUrl={cat.iconSrc}
                        iconType="preset_3d"
                        iconScale={cat.iconScale}
                        fallbackIcon="LayoutGrid"
                        accentColor="#E3A008"
                        alt=""
                        sizeClassName="[width:var(--float-todos-m)] [height:var(--float-todos-m)] md:[width:var(--float-todos-d)] md:[height:var(--float-todos-d)]"
                        iconClassName="w-4 h-4"
                        className="rounded-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                      />
                    )}
                  </button>
                )
              }

              return (
                <button
                  key={cat.id}
                  type="button"
                  id={`tab-${cat.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className="group relative shrink-0 py-1 flex items-center active:scale-95 transition-transform cursor-pointer"
                >
                  <span
                    className={`h-9 md:h-9.5 [padding-left:var(--float-pad-l-m)] md:[padding-left:var(--float-pad-l-d)] pr-3.5 md:pr-4 rounded-full flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold leading-none transition-colors border whitespace-nowrap ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207] shadow-xs"
                        : "bg-[#F7F5F0] border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50 hover:bg-[#FFF9EE]"
                    }`}
                  >
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
                          : "bg-[#ECE7E0] text-[#57534E]"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0.5 top-1/2 -translate-y-1/2 [width:calc(var(--float-icon-m)+6px)] [height:calc(var(--float-icon-m)+6px)] md:[width:calc(var(--float-icon-d)+6px)] md:[height:calc(var(--float-icon-d)+6px)] flex items-center justify-center"
                  >
                    {cat.category ? (
                      <CategoryIcon
                        iconUrl={cat.category.icon_url || (cat.category.icon_type !== "lucide" ? cat.iconSrc : null)}
                        iconType={cat.category.icon_type}
                        iconScale={cat.category.icon_scale}
                        fallbackIcon={cat.category.fallback_icon}
                        accentColor={cat.category.accent_color}
                        alt=""
                        sizeClassName="[width:var(--float-icon-m)] [height:var(--float-icon-m)] md:[width:var(--float-icon-d)] md:[height:var(--float-icon-d)]"
                        iconClassName="w-4 h-4"
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <CategoryIcon
                        iconUrl={cat.iconSrc}
                        iconType="preset_3d"
                        iconScale={cat.iconScale}
                        fallbackIcon="UtensilsCrossed"
                        accentColor="#E3A008"
                        alt=""
                        sizeClassName="[width:var(--float-icon-m)] [height:var(--float-icon-m)] md:[width:var(--float-icon-d)] md:[height:var(--float-icon-d)]"
                        iconClassName="w-4 h-4"
                        className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                      />
                    )}
                  </span>
                </button>
              )
            })}
            </div>
          </div>
        </div>

        {/* Espaçador direito (Desktop): equilibra centralização no topo e ancora busca + carrinho à direita */}
        <div
          aria-hidden="true"
          className="hidden lg:block basis-0 min-w-0 grow"
        />

        {/* Busca Pill + Carrinho Circular (Desktop >= 1024px): entra deslizando da direita no scroll */}
        <div
          ref={desktopControlsRef}
          aria-hidden={!isScrolled}
          inert={!isScrolled}
          className={`hidden lg:flex items-center shrink-0 overflow-hidden transition-[width,opacity,margin] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            isScrolled
              ? "lg:w-[268px] xl:w-[316px] lg:ml-4 opacity-100 pointer-events-auto"
              : "lg:w-0 lg:ml-0 opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`w-[268px] xl:w-[316px] shrink-0 flex items-center gap-2.5 py-2 pl-1 pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              isScrolled ? "translate-x-0" : "translate-x-8"
            }`}
          >
            <div className="relative flex items-center lg:w-52 xl:w-64 h-10 bg-[#F3F0EB] hover:bg-[#ECE7E0]/75 border border-[#ECE7E0] focus-within:border-[#E3A008] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E3A008]/20 rounded-full px-3.5 transition-colors motion-reduce:transition-none">
              <Search className="h-4 w-4 text-[#717171] shrink-0 pointer-events-none" />
              <input
                ref={desktopSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar produtos no cardápio"
                tabIndex={isScrolled ? 0 : -1}
                className="w-full h-full bg-transparent pl-2 pr-6 text-sm font-medium text-[#1A1A1A] placeholder:text-[#717171] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  tabIndex={isScrolled ? 0 : -1}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 p-0.5 text-[#717171] hover:text-[#1A1A1A] active:scale-90 transition-transform motion-reduce:transition-none cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Link
              href="/checkout"
              prefetch={false}
              tabIndex={isScrolled ? 0 : -1}
              aria-label="Ver sacola"
              title="Ver sacola"
              className={`relative w-10 h-10 rounded-full bg-[#F3F0EB] hover:bg-[#ECE7E0] border border-transparent hover:border-[#E3A008]/60 flex items-center justify-center shrink-0 active:scale-95 transition-[transform,opacity,background-color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none group ${
                isScrolled
                  ? "delay-75 opacity-100 scale-100 translate-x-0"
                  : "delay-0 opacity-0 scale-90 translate-x-2"
              }`}
            >
              <ShoppingCart className="h-5 w-5 text-[#1A1A1A] group-hover:text-[#E3A008] transition-colors motion-reduce:transition-none" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E63535] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full border-2 border-white flex items-center justify-center leading-none shadow-xs">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
})
