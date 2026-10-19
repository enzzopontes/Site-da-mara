"use client"

import Link from "next/link"
import { Sparkles, Utensils, Flame, Ticket, GlassWater } from "lucide-react"

const CATEGORIES = [
  {
    id: "todas",
    name: "Tudo",
    icon: Flame,
    href: "/cardapio",
    badge: "Completo",
  },
  {
    id: "batata",
    name: "Batatas",
    icon: Utensils,
    href: "/cardapio?category=batata",
    badge: "Carro-chefe",
  },
  {
    id: "macarrao",
    name: "Macarrão",
    icon: Sparkles,
    href: "/cardapio?category=macarrao",
    badge: "Artesanal",
  },
  {
    id: "bebida",
    name: "Bebidas",
    icon: GlassWater,
    href: "/cardapio?category=bebida",
    badge: "Geladas",
  },
  {
    id: "cupons",
    name: "Cupons",
    icon: Ticket,
    href: "#cupons",
    badge: "Ofertas",
  },
]

export function CategoryBar() {
  return (
    <section className="py-4 bg-white border-y border-gray-100 sticky top-16 z-30 shadow-xs">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -my-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 hover:bg-amber-50 border border-gray-200/80 hover:border-amber-300 text-gray-800 hover:text-amber-900 font-black text-xs transition-all active:scale-95 group shadow-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100 group-hover:bg-amber-500 text-amber-700 group-hover:text-white flex items-center justify-center transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{cat.name}</span>
                {cat.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-200/80 group-hover:bg-amber-200/80 text-gray-700 group-hover:text-amber-900 px-1.5 py-0.5 rounded-full">
                    {cat.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
