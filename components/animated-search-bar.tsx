"use client"

import { useState, useEffect, memo } from "react"
import { Search, X, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/lib/cart-context"

const PLACEHOLDERS = [
  "Busque por batata recheada...",
  "Busque por strogonoff de alcatra...",
  "Busque por macarrão cremoso...",
  "Busque por bebidas geladas...",
  "Busque por bacon crocante...",
  "Busque por combos e adicionais..."
]

interface AnimatedSearchBarProps {
  value: string
  onChange: (val: string) => void
  onClear: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  showCart?: boolean
}

export const AnimatedSearchBar = memo(function AnimatedSearchBar({
  value,
  onChange,
  onClear,
  inputRef,
  showCart = false
}: AnimatedSearchBarProps) {
  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)
  const { items } = useCart()
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    if (value) return

    const interval = setInterval(() => {
      setFade(false)
      const timeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
        setFade(true)
      }, 220)
      return () => clearTimeout(timeout)
    }, 3200)

    return () => clearInterval(interval)
  }, [value])

  return (
    <div className="flex items-center w-full">
      {/* Campo de Busca */}
      <div className="relative flex-1 flex items-center bg-[#F7F5F0] hover:bg-[#F3EFE6] border border-[#ECE7E0] focus-within:border-[#E3A008] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#E3A008]/20 rounded-xl h-11 px-3.5 transition-all shadow-xs">
        <Search className="h-4 w-4 text-[#717171] shrink-0 pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Buscar produtos no cardápio"
          placeholder=""
          className="w-full h-full bg-transparent pl-2.5 pr-7 text-sm font-medium text-[#1A1A1A] placeholder-transparent outline-none z-10"
        />

        {!value && (
          <span
            className={`absolute left-9.5 text-sm font-medium text-[#717171] pointer-events-none select-none transition-all duration-300 transform truncate max-w-[calc(100%-4rem)] ${
              fade ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5"
            }`}
          >
            {PLACEHOLDERS[index]}
          </span>
        )}

        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 text-[#717171] hover:text-[#1A1A1A] active:scale-90 transition-transform z-20 cursor-pointer"
            aria-label="Limpar campo de busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Carrinho Animado no Scroll (Aparece suave de cima para baixo) */}
      <div
        className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center shrink-0 ${
          showCart
            ? "max-w-[60px] opacity-100 translate-y-0 scale-100 ml-2.5"
            : "max-w-0 opacity-0 -translate-y-4 scale-75 ml-0 pointer-events-none"
        }`}
        aria-hidden={!showCart}
      >
        <Link
          href="/carrinho"
          tabIndex={showCart ? 0 : -1}
          className="relative flex items-center justify-center w-11 h-11 bg-[#F7F5F0] hover:bg-[#ECE7E0] border border-[#ECE7E0] hover:border-[#E3A008] rounded-xl shrink-0 active:scale-95 transition-all cursor-pointer shadow-xs group"
          aria-label="Ver carrinho"
          title="Ver carrinho"
        >
          <ShoppingCart className="h-5 w-5 text-[#1A1A1A] group-hover:text-[#E3A008] transition-colors" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#E63535] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white leading-none shadow-xs animate-in zoom-in-75 duration-300">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
})
