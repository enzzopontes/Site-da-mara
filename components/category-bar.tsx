"use client"

import { ScrollReveal } from "@/components/ui/scroll-reveal"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { DEFAULT_CATEGORIES, getCategoryHref, type Category } from "@/lib/categories-db"
import {
  DEFAULT_HOME_GRID_LAYOUT,
  normalizeHomeGridLayout,
  type HomeGridLayout,
} from "@/lib/home-grid-layout"
import { CategoryIcon } from "@/components/category-icon"

const DEFAULT_HOME_BAR_ITEMS = DEFAULT_CATEGORIES.filter(
  (c) => c.is_active && (c.show_on_home_bar_mobile || c.show_on_home_bar_desktop),
)

export interface CategoryBarProps {
  items?: Category[]
  layout?: HomeGridLayout
}

export function CategoryBar({
  items = DEFAULT_HOME_BAR_ITEMS,
  layout = DEFAULT_HOME_GRID_LAYOUT,
}: CategoryBarProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [isFloating, setIsFloating] = useState(false)
  const isFloatingRef = useRef(false)
  const visibleItems = items.filter(
    (c) => c.show_on_home_bar_mobile || c.show_on_home_bar_desktop,
  )
  const hasMobileItems = visibleItems.some((c) => c.show_on_home_bar_mobile)
  const hasDesktopItems = visibleItems.some((c) => c.show_on_home_bar_desktop)
  const [activeId, setActiveId] = useState<string>(() => visibleItems[0]?.id ?? "")
  const gridLayout = useMemo(() => normalizeHomeGridLayout(layout), [layout])

  useEffect(() => {
    if (visibleItems.length === 0) {
      if (isFloatingRef.current) {
        isFloatingRef.current = false
        setIsFloating(false)
        window.dispatchEvent(
          new CustomEvent("header-scroll-swap", { detail: { headerHidden: false } }),
        )
      }
      return
    }

    let rafId: number | null = null

    const checkScroll = () => {
      if (!gridRef.current) return
      const rect = gridRef.current.getBoundingClientRect()
      const currentFloating = isFloatingRef.current
      let shouldFloat = currentFloating

      // Quando o topo da grade de categorias alcança o topo da tela (<= 64px, altura do header)
      // O header sobe suavemente e a barra de categorias desce
      if (rect.width === 0 && rect.height === 0) {
        shouldFloat = false
      } else if (!currentFloating && rect.top <= 64) {
        shouldFloat = true
      } else if (currentFloating && (rect.top >= 80 || window.scrollY <= 40)) {
        shouldFloat = false
      }

      if (shouldFloat !== currentFloating) {
        isFloatingRef.current = shouldFloat
        setIsFloating(shouldFloat)
        window.dispatchEvent(
          new CustomEvent("header-scroll-swap", { detail: { headerHidden: shouldFloat } })
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
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [visibleItems.length])

  if (visibleItems.length === 0) return null

  const orderedItems = [...visibleItems].sort(
    (a, b) => a.home_bar_order - b.home_bar_order || a.name.localeCompare(b.name),
  )
  const todosItem = orderedItems.find((c) => c.slug === "todos")
  const floatingItems = todosItem
    ? [todosItem, ...orderedItems.filter((c) => c.id !== todosItem.id)]
    : orderedItems
  const sectionVisibilityClass =
    hasMobileItems && !hasDesktopItems
      ? "sm:hidden"
      : !hasMobileItems && hasDesktopItems
        ? "hidden sm:block"
        : ""
  const floatingNavVisibilityClass =
    hasMobileItems && !hasDesktopItems
      ? "flex sm:hidden"
      : !hasMobileItems && hasDesktopItems
        ? "hidden sm:flex"
        : "flex"

  const gridVars = {
    "--cat-cols-m": String(gridLayout.mobile_columns),
    "--cat-cols-d": String(gridLayout.desktop_columns),
    "--cat-pad-m": `${gridLayout.mobile_card_padding}px`,
    "--cat-pad-d": `${gridLayout.desktop_card_padding}px`,
    "--cat-gap-m": `${gridLayout.mobile_card_gap}px`,
    "--cat-gap-d": `${gridLayout.desktop_card_gap}px`,
    "--cat-icon-m": `${gridLayout.mobile_icon_size}px`,
    "--cat-icon-d": `${gridLayout.desktop_icon_size}px`,
    "--cat-text-m": `${gridLayout.mobile_label_size}px`,
    "--cat-text-d": `${gridLayout.desktop_label_size}px`,
    "--cat-radius-m": `${gridLayout.mobile_card_radius}px`,
    "--cat-radius-d": `${gridLayout.desktop_card_radius}px`,
  } as React.CSSProperties

  return (
    <>
      {/* 1. Grade de Categorias "Gordinhas" no fluxo da página (estilo App Batata Top) */}
      <section
        ref={gridRef}
        aria-label="Categorias"
        className={`py-4 px-4 bg-white border-b border-[#ECE7E0] ${sectionVisibilityClass}`.trim()}
      >
        <div className="container mx-auto max-w-5xl">
          <div
            style={gridVars}
            className="grid [grid-template-columns:repeat(var(--cat-cols-m),minmax(0,1fr))] sm:[grid-template-columns:repeat(var(--cat-cols-d),minmax(0,1fr))] [gap:var(--cat-gap-m)] sm:[gap:var(--cat-gap-d)]"
          >
            {orderedItems.map((cat) => {
              const isActive = activeId === cat.id
              const href = getCategoryHref(cat)
              const showMobile = cat.show_on_home_bar_mobile
              const showDesktop = cat.show_on_home_bar_desktop
              const itemGridVisibility =
                showMobile && !showDesktop
                  ? "grid sm:hidden min-w-0"
                  : !showMobile && showDesktop
                    ? "hidden sm:grid min-w-0"
                    : "grid min-w-0"
              return (
                <ScrollReveal key={cat.id} className={itemGridVisibility}>
                  <Link
                    href={href}
                    onClick={() => setActiveId(cat.id)}
                    className={`group relative flex flex-col items-center justify-center min-w-0 [padding:var(--cat-pad-m)] sm:[padding:var(--cat-pad-d)] [border-radius:var(--cat-radius-m)] sm:[border-radius:var(--cat-radius-d)] border transition-all active:scale-[0.95] ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] shadow-xs"
                        : "bg-[#F7F4EF] hover:bg-[#FEF8EC] border-[#ECE7E0] hover:border-[#E3A008]/60 shadow-2xs"
                    }`}
                  >
                    {cat.badge_text && (
                      <span
                        style={{ backgroundColor: cat.badge_color || "#C1440E" }}
                        className="absolute top-1.5 right-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate text-white uppercase tracking-wide text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shadow-2xs pointer-events-none"
                      >
                        {cat.badge_text}
                      </span>
                    )}
                    <div className="aspect-square [width:var(--cat-icon-m)] sm:[width:var(--cat-icon-d)] max-w-full flex items-center justify-center mb-1.5 sm:mb-2">
                      <CategoryIcon
                        iconUrl={cat.icon_url}
                        iconType={cat.icon_type}
                        iconScale={cat.icon_scale}
                        fallbackIcon={cat.fallback_icon}
                        accentColor={cat.accent_color}
                        alt={cat.name}
                        sizeClassName="w-full h-full"
                        iconClassName="w-[54%] h-[54%]"
                        className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.08)] group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span
                      className={`[font-size:var(--cat-text-m)] sm:[font-size:var(--cat-text-d)] leading-[1.333] sm:leading-[1.429] font-bold text-center truncate w-full transition-colors ${
                        isActive ? "text-[#A16207]" : "text-[#1A1A1A] group-hover:text-[#A16207]"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </Link>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* 2. Barra Flutuante de Categorias Fixa no topo com transição suave */}
      <nav
        aria-label="Categorias fixas no topo"
        aria-hidden={!isFloating}
        inert={!isFloating}
        className={`fixed top-0 left-0 right-0 z-40 h-[60px] bg-white/95 backdrop-blur-md shadow-sm border-b border-[#ECE7E0] ${floatingNavVisibilityClass} items-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFloating
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="container mx-auto px-4 max-w-5xl w-full">
          <div
            className="flex items-center justify-start md:justify-center gap-2.5 overflow-x-auto no-scrollbar py-1.5 px-1 mx-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {floatingItems.map((cat) => {
              const isActive = activeId === cat.id
              const href = getCategoryHref(cat)
              const itemFloatVisibility =
                cat.show_on_home_bar_mobile && !cat.show_on_home_bar_desktop
                  ? "flex sm:hidden"
                  : !cat.show_on_home_bar_mobile && cat.show_on_home_bar_desktop
                    ? "hidden sm:flex"
                    : "flex"
              const isTodos = cat.slug === "todos"
              const label = isTodos ? cat.name || "Ver mais" : cat.name
              const showBadge = !isTodos && Boolean(cat.badge_text)
              return (
                <Link
                  key={cat.id}
                  href={href}
                  aria-label={isTodos ? label : undefined}
                  onClick={() => setActiveId(cat.id)}
                  className={`group ${itemFloatVisibility} items-center shrink-0 py-1 active:scale-[0.98] transition-transform`}
                >
                  <span
                    className={`h-9 px-3.5 rounded-full flex items-center ${showBadge ? "gap-1.5 " : ""}text-xs font-bold leading-none transition-colors border ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207]"
                        : "bg-[#F3F0EB] md:bg-white border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50"
                    }`}
                  >
                    <span>{label}</span>
                    {showBadge && (
                      <span
                        style={{ backgroundColor: cat.badge_color || "#C1440E" }}
                        className="text-white uppercase tracking-wide text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none"
                      >
                        {cat.badge_text}
                      </span>
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
