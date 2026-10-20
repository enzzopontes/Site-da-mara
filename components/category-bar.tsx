"use client"

import Link from "next/link"

const CATEGORIES = [
  {
    id: "todos",
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
]

export function CategoryBar() {
  return (
    <div className="sticky top-16 z-30 bg-white border-b border-[#ECE7E0] py-2.5">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-0.5 mx-auto">
          {CATEGORIES.map((cat, idx) => {
            const isFirst = idx === 0
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className={`shrink-0 h-10 px-3.5 rounded-full flex items-center gap-2.5 text-xs font-bold transition-all border ${
                  isFirst
                    ? "bg-[#FEF8EC] border-[#E3A008] text-[#A16207]"
                    : "bg-white border-[#ECE7E0] text-[#1F1B16] hover:bg-[#F7F4EF] hover:border-[#E3A008]/40"
                }`}
              >
                <img
                  src={cat.iconSrc}
                  alt={cat.name}
                  className="h-6 w-6 object-contain"
                />
                <span>{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
