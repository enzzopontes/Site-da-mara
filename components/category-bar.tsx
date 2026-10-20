"use client"

import Link from "next/link"
import { Utensils, Sparkles, GlassWater, Flame, Tag } from "lucide-react"

const CATEGORIES = [
  {
    id: "todos",
    name: "Tudo",
    icon: Flame,
    href: "/cardapio",
  },
  {
    id: "batata",
    name: "Batatas Recheadas",
    icon: Utensils,
    href: "/cardapio?category=batata",
  },
  {
    id: "macarrao",
    name: "Massas Artesanais",
    icon: Sparkles,
    href: "/cardapio?category=macarrao",
  },
  {
    id: "bebida",
    name: "Bebidas",
    icon: GlassWater,
    href: "/cardapio?category=bebida",
  },
  {
    id: "cupons",
    name: "Cupons de Desconto",
    icon: Tag,
    href: "#cupons",
  },
]

export function CategoryBar() {
  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-[#ECE7E0] py-3">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon
            const isFirst = idx === 0
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className={`shrink-0 h-9 px-4 rounded-full flex items-center gap-2 text-xs font-bold transition-all border ${
                  isFirst
                    ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207]"
                    : "bg-white border-[#ECE7E0] text-[#1F1B16] hover:bg-[#F7F4EF] hover:border-[#E3A008]/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isFirst ? "text-[#E3A008]" : "text-[#6B6157]"}`} />
                <span>{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
