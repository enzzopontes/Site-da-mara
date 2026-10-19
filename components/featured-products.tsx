"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { Sparkles, ArrowRight, Flame, ShieldCheck, HeartHandshake, Award } from "lucide-react"
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
    <section className="py-12 md:py-20 bg-[#F9FAFB]">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header da Seção */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-amber-700 font-black text-xs uppercase tracking-widest bg-amber-100/70 px-3 py-1 rounded-full mb-2">
              <Flame className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
              <span>Mais Pedidas da Cidade</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Destaques que dão <span className="text-amber-500">água na boca</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              As combinações mais votadas e pedidas pelos clientes em Iacanga.
            </p>
          </div>

          <Link href="/cardapio" className="shrink-0">
            <Button
              variant="ghost"
              className="text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 font-black text-xs sm:text-sm p-2 flex items-center gap-1.5 rounded-xl"
            >
              <span>Ver Cardápio</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Grid de Produtos: 2 Colunas no Mobile estilo App iFood */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-12">
          {sortedProducts.map((product) => {
            const rankIndex = topBatatasNames.findIndex(
              (name) => name.toLowerCase() === product.name.toLowerCase()
            )
            let rank: 1 | 2 | 3 | null = null
            if (rankIndex !== -1) {
              rank = (rankIndex + 1) as 1 | 2 | 3
            }

            return (
              <div key={product.id} className="transition-transform duration-300 hover:-translate-y-1">
                <ProductCard
                  product={product}
                  rank={rank}
                  isMostRequested={product.id === mostRequestedProductId}
                />
              </div>
            )
          })}
        </div>

        {/* Banner CTA Cardápio */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm text-center mb-16">
          <h3 className="text-lg sm:text-2xl font-black text-gray-900 mb-2">
            Quer ver todas as opções e acompanhamentos?
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-lg mx-auto mb-6">
            Temos batatas recheadas, massas artesanais, bebidas trincando de geladas e muito mais no nosso cardápio completo.
          </p>
          <Link href="/cardapio">
            <Button
              size="lg"
              className="h-14 px-8 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <span>Abrir Cardápio Completo</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Seção Por que Pedir na Batata Top (Gatilhos de Confiança e Conversão) */}
        <div className="pt-8 border-t border-gray-200/60">
          <div className="text-center mb-8">
            <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full">
              Diferenciais da Casa
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-gray-900 mt-2">
              Por que a Batata Top é a favorita de Iacanga?
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <Flame className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-900 mb-1">Batatas Gigantes</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Recheios transbordando e queijo derretido em porções generosas.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-900 mb-1">Chega Quentinha</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Embalagem térmica exclusiva que conserva o sabor e a crocância.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-900 mb-1">Pix Direto no Site</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Pague em segundos sem precisar esperar atendimento no WhatsApp.
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-gray-900 mb-1">Qualidade Nota 10</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Mais de 5.000 clientes felizes e ingredientes rigorosamente frescos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
