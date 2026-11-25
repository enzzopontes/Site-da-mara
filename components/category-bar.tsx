"use client"

import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { DEFAULT_CATEGORIES, getCategoryHref, type Category } from "@/lib/categories-db"
import { CategoryIcon } from "@/components/category-icon"

const DEFAULT_HOME_BAR_ITEMS = DEFAULT_CATEGORIES.filter(
  (c) => c.is_active && c.show_on_home_bar,
)

export interface CategoryBarProps {
  items?: Category[]
}

export function CategoryBar({ items = DEFAULT_HOME_BAR_ITEMS }: CategoryBarProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [isFloating, setIsFloating] = useState(false)
  const isFloatingRef = useRef(false)
  const [activeId, setActiveId] = useState<string>(() => items[0]?.id ?? "")

  useEffect(() => {
    if (items.length === 0) {
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
      if (!currentFloating && rect.top <= 64) {
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
  }, [items.length])

  if (items.length === 0) return null

  const orderedItems = [...items].sort(
    (a, b) => a.home_bar_order - b.home_bar_order || a.name.localeCompare(b.name),
  )
  const todosItem = orderedItems.find((c) => c.slug === "todos")
  const floatingItems = todosItem
    ? [todosItem, ...orderedItems.filter((c) => c.id !== todosItem.id)]
    : orderedItems

  return (
    <>
      {/* 1. Grade de Categorias "Gordinhas" no fluxo da página (estilo App Batata Top) */}
      <section
        ref={gridRef}
        aria-label="Categorias"
        className="py-4 px-4 bg-white border-b border-[#ECE7E0]"
      >
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-4">
            {orderedItems.map((cat) => {
              const isActive = activeId === cat.id
              const href = getCategoryHref(cat)
              return (
                <ScrollReveal key={cat.id} className="grid">
                  <Link
                    href={href}
                    onClick={() => setActiveId(cat.id)}
                    className={`group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all active:scale-[0.95] ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] shadow-xs"
                        : "bg-[#F7F4EF] hover:bg-[#FEF8EC] border-[#ECE7E0] hover:border-[#E3A008]/60 shadow-2xs"
                    }`}
                  >
                    {cat.badge_text && (
                      <span
                        style={{ backgroundColor: cat.badge_color || "#C1440E" }}
                        className="absolute top-1.5 right-1.5 z-10 text-white uppercase tracking-wide text-[9px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shadow-2xs pointer-events-none"
                      >
                        {cat.badge_text}
                      </span>
                    )}
                    <div className="w-13 h-13 sm:w-16 sm:h-16 flex items-center justify-center mb-1.5 sm:mb-2">
                      <CategoryIcon
                        iconUrl={cat.icon_url}
                        iconType={cat.icon_type}
                        fallbackIcon={cat.fallback_icon}
                        accentColor={cat.accent_color}
                        alt={cat.name}
                        sizeClassName="w-full h-full"
                        iconClassName="w-7 h-7"
                        className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.08)] group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-bold text-center truncate w-full transition-colors ${
                        isActive ? "text-[#A16207]" : "text-[#1A1A1A] group-hover:text-[#E3A008]"
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
        className={`fixed top-0 left-0 right-0 z-40 h-[60px] bg-white/95 backdrop-blur-md shadow-sm border-b border-[#ECE7E0] flex items-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
              if (cat.slug === "todos") {
                return (
                  <Link
                    key={cat.id}
                    href={href}
                    aria-label={cat.name || "Ver mais"}
                    onClick={() => setActiveId(cat.id)}
                    className={`group flex items-center justify-center shrink-0 w-10 h-10 rounded-full border transition-all active:scale-[0.98] ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008]"
                        : "bg-[#F3F0EB] md:bg-white border-[#ECE7E0] hover:border-[#E3A008]/50"
                    }`}
                  >
                    <CategoryIcon
                      iconUrl={cat.icon_url}
                      iconType={cat.icon_type}
                      fallbackIcon={cat.fallback_icon}
                      accentColor={cat.accent_color}
                      alt=""
                      sizeClassName="w-8 h-8"
                      iconClassName="w-4 h-4"
                      className="rounded-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                    />
                  </Link>
                )
              }
              return (
                <Link
                  key={cat.id}
                  href={href}
                  onClick={() => setActiveId(cat.id)}
                  className="group relative flex items-center shrink-0 py-1 active:scale-[0.98] transition-transform"
                >
                  <span
                    className={`h-9 pl-11 pr-3.5 rounded-full flex items-center gap-1.5 text-xs font-bold leading-none transition-colors border ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207]"
                        : "bg-[#F3F0EB] md:bg-white border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.badge_text && (
                      <span
                        style={{ backgroundColor: cat.badge_color || "#C1440E" }}
                        className="text-white uppercase tracking-wide text-[8px] font-extrabold px-1.5 py-0.5 rounded-full leading-none"
                      >
                        {cat.badge_text}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center"
                  >
                    <CategoryIcon
                      iconUrl={cat.icon_url}
                      iconType={cat.icon_type}
                      fallbackIcon={cat.fallback_icon}
                      accentColor={cat.accent_color}
                      alt=""
                      sizeClassName="w-9 h-9"
                      iconClassName="w-4 h-4"
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                    />
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
