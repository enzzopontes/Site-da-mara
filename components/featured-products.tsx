"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { ChevronRight } from "lucide-react"
import type { Product } from "@/lib/products-db"

interface FeaturedProductsProps {
  products: Product[]
  mostRequestedProductId?: string
  topBatatasNames?: string[]
}

export function FeaturedProducts({
  products,
  mostRequestedProductId,
  topBatatasNames = [],
}: FeaturedProductsProps) {
  // Ordenar os produtos: ranking real primeiro
  const sortedProducts = [...products].sort((a, b) => {
    if (topBatatasNames.length === 0) return 0

    const indexA = topBatatasNames.findIndex(
      (name) => name.toLowerCase() === a.name.toLowerCase()
    )
    const indexB = topBatatasNames.findIndex(
      (name) => name.toLowerCase() === b.name.toLowerCase()
    )

    if (indexA !== -1 && indexB !== -1) return indexA - indexB
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return 0
  })

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Cabeçalho da Seção no Estilo iFood */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-3 border-b border-[#ECE7E0]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1F1B16] tracking-tight">
              Mais pedidos
            </h2>
            <p className="text-xs text-[#6B6157] mt-0.5">
              Os pratos mais pedidos da nossa cozinha em Iacanga
            </p>
          </div>

          <Link href="/cardapio" className="shrink-0">
            <span className="text-xs font-bold text-[#C1440E] hover:text-[#E3A008] flex items-center gap-0.5 transition-colors">
              Ver cardápio completo
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {/* Grid de Pratos no Padrão iFood (1 col no mobile estilo lista, 2 ou 3 cols em desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 mb-8">
          {sortedProducts.map((product) => {
            const rankIndex = topBatatasNames.findIndex(
              (name) => name.toLowerCase() === product.name.toLowerCase()
            )
            let rank: 1 | 2 | 3 | null = null
            if (rankIndex !== -1) {
              rank = (rankIndex + 1) as 1 | 2 | 3
            }

            return (
              <ProductCard
                key={product.id}
                product={product}
                rank={rank}
                isMostRequested={product.id === mostRequestedProductId}
              />
            )
          })}
        </div>

        {/* Banner Simples de Apoio iFood */}
        <div className="rounded-2xl bg-[#F7F4EF] border border-[#ECE7E0] p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-base font-bold text-[#1F1B16]">
              Quer montar do seu jeito?
            </h3>
            <p className="text-xs text-[#6B6157] mt-0.5">
              Escolha seus recheios favoritos, adicionais generosos e monte sua batata personalizada.
            </p>
          </div>
          <Link href="/cardapio" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-11 bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-sm px-6 rounded-xl shadow-xs">
              Abrir cardápio
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
