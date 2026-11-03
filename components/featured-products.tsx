"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { ChevronRight } from "lucide-react"
import type { Product } from "@/lib/products-db"

interface FeaturedProductsProps {
  products?: Product[]
  topBatatas?: Product[]
  topMacarrao?: Product[]
  mostRequestedProductId?: string
  topBatatasNames?: string[]
  topMacarraoNames?: string[]
}

export function FeaturedProducts({
  products = [],
  topBatatas,
  topMacarrao,
  mostRequestedProductId,
  topBatatasNames = [],
  topMacarraoNames = [],
}: FeaturedProductsProps) {
  // Define listas de batatas e macarrão separadas com fallback
  const batatasList =
    topBatatas && topBatatas.length > 0
      ? topBatatas
      : products.filter((p) => p.category === "batata" || !p.category)

  const macarraoList =
    topMacarrao && topMacarrao.length > 0
      ? topMacarrao
      : products.filter((p) => p.category === "macarrao")

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* ========================================================
            SEÇÃO A: Batatas Recheadas Mais Pedidas
           ======================================================== */}
        {batatasList.length > 0 && (
          <div className="mb-10 sm:mb-14">
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1F1B16] tracking-tight flex items-center gap-2">
                  <span>🥔</span>
                  <span>Batatas Recheadas Mais Pedidas</span>
                </h2>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  As queridinhas de Iacanga, recheadas na medida certa com muito sabor
                </p>
              </div>

              <Link href="/cardapio" className="shrink-0">
                <span className="text-xs font-bold text-[#C1440E] hover:text-[#E3A008] flex items-center gap-0.5 transition-colors">
                  Ver todas as batatas
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {batatasList.map((product, index) => (
                <div key={product.id} className="relative group">
                  {/* Badge de Ranking no Estilo iFood */}
                  <div className="absolute top-2 left-2 z-10 pointer-events-none">
                    <span
                      className={`inline-flex items-center justify-center font-black text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-2xs ${
                        index === 0
                          ? "bg-[#E3A008] text-white"
                          : index === 1
                          ? "bg-[#C1440E] text-white"
                          : index === 2
                          ? "bg-[#8A6100] text-white"
                          : "bg-white/95 text-[#6B6157] border border-[#ECE7E0]"
                      }`}
                    >
                      {index + 1}º
                    </span>
                  </div>
                  <ProductCard
                    product={product}
                    rank={null}
                    isMostRequested={product.id === mostRequestedProductId}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SEÇÃO B: Massas e Macarrão Mais Pedidos
           ======================================================== */}
        {macarraoList.length > 0 && (
          <div className="mb-10 sm:mb-14">
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1F1B16] tracking-tight flex items-center gap-2">
                  <span>🍝</span>
                  <span>Massas e Macarrão Mais Pedidos</span>
                </h2>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  Macarrão artesanal preparado na hora com molhos especiais e queijo derretido
                </p>
              </div>

              <Link href="/cardapio" className="shrink-0">
                <span className="text-xs font-bold text-[#C1440E] hover:text-[#E3A008] flex items-center gap-0.5 transition-colors">
                  Ver todas as massas
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {macarraoList.map((product, index) => (
                <div key={product.id} className="relative group">
                  {/* Badge de Ranking no Estilo iFood */}
                  <div className="absolute top-2 left-2 z-10 pointer-events-none">
                    <span
                      className={`inline-flex items-center justify-center font-black text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-2xs ${
                        index === 0
                          ? "bg-[#E3A008] text-white"
                          : index === 1
                          ? "bg-[#C1440E] text-white"
                          : index === 2
                          ? "bg-[#8A6100] text-white"
                          : "bg-white/95 text-[#6B6157] border border-[#ECE7E0]"
                      }`}
                    >
                      {index + 1}º
                    </span>
                  </div>
                  <ProductCard
                    product={product}
                    rank={null}
                    isMostRequested={product.id === mostRequestedProductId}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Banner de Personalização / Montar do seu jeito */}
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
            <Button className="w-full sm:w-auto h-11 bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-sm px-6 rounded-xl shadow-xs transition-colors">
              Abrir cardápio
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
