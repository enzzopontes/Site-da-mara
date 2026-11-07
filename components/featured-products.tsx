"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { ChevronRight, Sparkles, Tag, Flame } from "lucide-react"
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
}: FeaturedProductsProps) {
  // Lista de batatas e macarrão separadas com fallback
  const batatasList =
    topBatatas && topBatatas.length > 0
      ? topBatatas
      : products.filter((p) => p.category === "batata" || !p.category)

  const macarraoList =
    topMacarrao && topMacarrao.length > 0
      ? topMacarrao
      : products.filter((p) => p.category === "macarrao")

  // Todos os produtos agregados
  const allAvailableProducts = [...batatasList, ...macarraoList, ...products].filter(
    (item, index, self) => index === self.findIndex((t) => t.id === item.id),
  )

  // 1. Produtos em Destaque (Carrossel Horizontal)
  const featuredProducts = allAvailableProducts.filter((p) => p.isFeatured || p.is_featured)
  const displayFeatured =
    featuredProducts.length > 0
      ? featuredProducts
      : allAvailableProducts.slice(0, 6)

  // 2. Produtos em Promoção com Desconto Real Ativo (Lista Vertical com Foto à Direita)
  const promoProducts = allAvailableProducts.filter((p) => {
    const orig = p.originalPrice ?? p.original_price ?? null
    return orig !== null && orig > p.price
  })
  // Fallback para exibir seções de oferta caso não haja no banco ainda
  const displayPromos = promoProducts.length > 0 ? promoProducts : []

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div className="container mx-auto px-4 max-w-5xl space-y-10 sm:space-y-14">
        {/* ========================================================
            SEÇÃO 1: CARROSSEL HORIZONTAL DE DESTAQUES (Estilo iFood)
           ======================================================== */}
        {displayFeatured.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#FEF8EC] text-[#E3A008]">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-[#1F1B16] tracking-tight">
                    Destaques da Casa
                  </h2>
                </div>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  Os pratos mais amados de Iacanga em evidência
                </p>
              </div>

              <Link href="/cardapio" className="shrink-0">
                <span className="text-xs font-bold text-[#C1440E] hover:text-[#E3A008] flex items-center gap-0.5 transition-colors">
                  Ver cardápio completo
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            {/* Carrossel Horizontal com Snap e Scroll Suave */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {displayFeatured.map((product) => (
                <div
                  key={`feat-${product.id}`}
                  className="w-[230px] sm:w-[260px] shrink-0 snap-start flex flex-col"
                >
                  <ProductCard
                    product={product}
                    isMostRequested={product.id === mostRequestedProductId}
                    layout="vertical"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SEÇÃO 2: PROMOÇÕES (Lista Vertical com Foto à Direita)
           ======================================================== */}
        {displayPromos.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                    <Tag className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-[#1F1B16] tracking-tight">
                    Promoções Imperdíveis
                  </h2>
                </div>
                <p className="text-xs text-[#6B6157] mt-0.5">
                  Preços especiais e descontos exclusivos por tempo limitado
                </p>
              </div>

              <Link href="/cardapio" className="shrink-0">
                <span className="text-xs font-bold text-[#008941] hover:text-[#006831] flex items-center gap-0.5 transition-colors">
                  Aproveitar ofertas
                  <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            {/* Grade 2 Colunas no Desktop com foto à direita */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {displayPromos.map((product) => (
                <ProductCard
                  key={`promo-${product.id}`}
                  product={product}
                  layout="horizontal"
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SEÇÃO 3: Batatas Recheadas Mais Pedidas (Grid Padronizado)
           ======================================================== */}
        {batatasList.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#FEF8EC] text-[#8A6100]">
                    <Flame className="w-4 h-4 fill-[#E3A008] text-[#E3A008]" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1F1B16] tracking-tight">
                    Batatas Recheadas Mais Pedidas
                  </h2>
                </div>
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
                    layout="vertical"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SEÇÃO 4: Massas e Macarrão Mais Pedidos
           ======================================================== */}
        {macarraoList.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1F1B16] tracking-tight">
                  Massas e Macarrão Mais Pedidos
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
                    layout="vertical"
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
