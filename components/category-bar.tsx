"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

const CATEGORIES = [
  {
    id: "cardapio",
    name: "Cardápio",
    iconSrc: "/assets/icones3d/icone cardapio.png",
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
  {
    id: "todos",
    name: "Ver mais",
    iconSrc: "/assets/icones3d/iconetodos.png",
    href: "/cardapio",
  },
]

export function CategoryBar() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [isFloating, setIsFloating] = useState(false)
  const isFloatingRef = useRef(false)
  const [activeId, setActiveId] = useState("cardapio")

  useEffect(() => {
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
  }, [])

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
            {CATEGORIES.map((cat) => {
              const isActive = activeId === cat.id
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={() => setActiveId(cat.id)}
                  className={`group flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all active:scale-[0.95] ${
                    isActive
                      ? "bg-[#FEF8EC] border-[#E3A008] shadow-xs"
                      : "bg-[#F7F4EF] hover:bg-[#FEF8EC] border-[#ECE7E0] hover:border-[#E3A008]/60 shadow-2xs"
                  }`}
                >
                  <div className="w-13 h-13 sm:w-16 sm:h-16 flex items-center justify-center mb-1.5 sm:mb-2">
                    <img
                      src={cat.iconSrc}
                      alt={cat.name}
                      className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.08)] group-hover:scale-105 transition-transform"
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
            {CATEGORIES.map((cat) => {
              const isActive = activeId === cat.id
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  onClick={() => setActiveId(cat.id)}
                  className="group relative flex items-center shrink-0 py-1 active:scale-[0.98] transition-transform"
                >
                  <span
                    className={`h-9 pl-11 pr-3.5 rounded-full flex items-center text-xs font-bold leading-none transition-colors border ${
                      isActive
                        ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207]"
                        : "bg-[#F3F0EB] md:bg-white border-[#ECE7E0] text-[#1A1A1A] hover:border-[#E3A008]/50"
                    }`}
                  >
                    {cat.name}
                  </span>
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
    </>
  )
}
