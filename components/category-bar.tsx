"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

const CATEGORIES = [
  {
    id: "todos",
    name: "Todos",
    iconSrc: "/assets/icones3d/iconetodos.png",
    href: "/cardapio",
  },
  {
    id: "batata",
    name: "Batatas",
    iconSrc: "/assets/icones3d/icone batata.png",
    href: "/cardapio?category=batata",
  },
  {
    id: "macarrao",
    name: "Macarrão",
    iconSrc: "/assets/icones3d/icone macarrao.png",
    href: "/cardapio?category=macarrao",
  },
  {
    id: "bebida",
    name: "Bebidas",
    iconSrc: "/assets/icones3d/icone bebidas geladas.png",
    href: "/cardapio?category=bebida",
  },
  {
    id: "cupons",
    name: "Cupons",
    iconSrc: "/assets/icones3d/icone cupom.png",
    href: "#cupons",
  },
]

// Sistema inspirado em CategoriasFlutuantes.js:
// ICON_SIZE (44px) > PILL_HEIGHT (36px), permitindo que o ícone 3D
// flutue/ultrapasse levemente a cápsula sem esticar a altura da barra.
const HEADER_SCROLL_THRESHOLD = 64

export function CategoryBar() {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const [isFixed, setIsFixed] = useState(false)
  const [isHeaderHidden, setIsHeaderHidden] = useState(false)
  const [activeId, setActiveId] = useState("todos")

  useEffect(() => {
    let rafId: number | null = null

    const updateScrollState = (headerHiddenOverride?: boolean) => {
      const currentScrollY = window.scrollY
      const headerHidden =
        typeof headerHiddenOverride === "boolean"
          ? headerHiddenOverride
          : document.documentElement.dataset.headerHidden === "true"
      setIsHeaderHidden((prev) => (prev !== headerHidden ? headerHidden : prev))

      if (!headerHidden || currentScrollY <= 40) {
        setIsFixed((prev) => (prev ? false : prev))
        return
      }

      const el = placeholderRef.current
      const rectTop = el ? el.getBoundingClientRect().top : Infinity
      const shouldFix = currentScrollY > HEADER_SCROLL_THRESHOLD || rectTop <= HEADER_SCROLL_THRESHOLD
      setIsFixed((prev) => (prev !== shouldFix ? shouldFix : prev))
    }

    const onScroll = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        updateScrollState()
        rafId = null
      })
    }

    const onHeaderScrollSwap = (event: Event) => {
      const customEvent = event as CustomEvent<{ headerHidden?: boolean }>
      const hidden =
        typeof customEvent.detail?.headerHidden === "boolean"
          ? customEvent.detail.headerHidden
          : document.documentElement.dataset.headerHidden === "true"
      updateScrollState(hidden)
    }

    updateScrollState()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    window.addEventListener("header-scroll-swap", onHeaderScrollSwap)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      window.removeEventListener("header-scroll-swap", onHeaderScrollSwap)
      if (rafId !== null) window.cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div ref={placeholderRef} className="w-full min-h-[60px] h-[60px] relative">
      <nav
        aria-label="Categorias rápidas"
        className={
          isFixed && isHeaderHidden
            ? "fixed top-0 left-0 right-0 z-40 h-[60px] bg-white/95 backdrop-blur-md shadow-sm border-b border-[#ECE7E0] transition-transform duration-300 ease-in-out translate-y-0 flex items-center"
            : "relative w-full h-[60px] bg-white border-b border-[#ECE7E0] transition-transform duration-300 ease-in-out translate-y-0 flex items-center"
        }
      >
        <div className="container mx-auto px-4 max-w-5xl w-full">
          <div
            className="flex items-center justify-start md:justify-center gap-2.5 overflow-x-auto no-scrollbar py-1.5 px-1 mx-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CATEGORIES.map((cat, idx) => {
              const isActive = activeId ? activeId === cat.id : idx === 0
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={() => setActiveId(cat.id)}
                  className="group relative flex items-center shrink-0 py-1 active:scale-[0.98] transition-transform"
                >
                  {/* Cápsula compacta (PILL_HEIGHT = 36px) com espaço reservado à esquerda para o ícone 3D */}
                  <span
                    className={`h-9 pl-11 pr-3.5 rounded-full flex items-center text-xs font-bold leading-none transition-colors border ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207]"
                        : "bg-[#F3F0EB] md:bg-white border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50"
                    }`}
                  >
                    {cat.name}
                  </span>

                  {/* Badge do ícone 3D flutuando sobre a cápsula (ICON_SIZE = 44px > PILL_HEIGHT = 36px) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center"
                  >
                    <img
                      src={cat.iconSrc}
                      alt=""
                      className="w-9 h-9 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 group-hover:scale-105"
                    />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
