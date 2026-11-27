"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { ProductCard } from "@/components/product-card"
import { CategoryIcon } from "@/components/category-icon"
import { ChevronRight, Sparkles, Tag, Flame } from "lucide-react"
import { DEFAULT_CATEGORIES, type Category } from "@/lib/categories-db"
import { normalizeLegacyCategorySlug, PRESET_3D_ICONS } from "@/lib/category-icons"
import type { Product } from "@/lib/products-db"

export interface FeaturedCategorySection {
  category: Category
  products: Product[]
  showRanking: boolean
}

export interface FeaturedProductsProps {
  products?: Product[]
  featuredSections?: FeaturedCategorySection[]
  categoryRulesBySlug?: Record<string, { allowsAddons: boolean; allowsNotes: boolean }>
  mostRequestedProductId?: string | null
  topBatatas?: Product[]
  topMacarrao?: Product[]
  topBatatasNames?: string[]
  topMacarraoNames?: string[]
}

export function FeaturedProducts({
  products = [],
  featuredSections,
  categoryRulesBySlug,
  topBatatas,
  topMacarrao,
  mostRequestedProductId,
}: FeaturedProductsProps) {
  // Lista de batatas e macarrão separadas com fallback legado quando featuredSections não é passado
  const batatasList =
    topBatatas && topBatatas.length > 0
      ? topBatatas
      : products.filter((p) => normalizeLegacyCategorySlug(p.category) === "batata" || !p.category)

  const macarraoList =
    topMacarrao && topMacarrao.length > 0
      ? topMacarrao
      : products.filter((p) => normalizeLegacyCategorySlug(p.category) === "macarrao")

  const defaultBatataCategory =
    DEFAULT_CATEGORIES.find((c) => c.slug === "batata") ?? DEFAULT_CATEGORIES[1]
  const defaultMacarraoCategory =
    DEFAULT_CATEGORIES.find((c) => c.slug === "macarrao") ?? DEFAULT_CATEGORIES[2]

  const effectiveSections: FeaturedCategorySection[] = (
    featuredSections !== undefined
      ? featuredSections
      : [
          {
            category: defaultBatataCategory,
            products: batatasList,
            showRanking: true,
          },
          {
            category: defaultMacarraoCategory,
            products: macarraoList,
            showRanking: true,
          },
        ]
  ).filter((section) => section.products.length > 0)

  // Todos os produtos agregados
  const sectionProducts = effectiveSections.flatMap((section) => section.products)
  const allAvailableProducts = [...sectionProducts, ...products].filter(
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
            <ScrollReveal className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
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
            </ScrollReveal>

            {/* Carrossel Horizontal com Snap e Scroll Suave */}
            <ScrollReveal className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {displayFeatured.map((product) => (
                <div
                  key={`feat-${product.id}`}
                  className="w-[230px] sm:w-[260px] shrink-0 snap-start flex flex-col"
                >
                  <ProductCard
                    product={product}
                    isMostRequested={Boolean(
                      mostRequestedProductId && product.id === mostRequestedProductId,
                    )}
                    categoryRules={
                      categoryRulesBySlug?.[normalizeLegacyCategorySlug(product.category)]
                    }
                    layout="vertical"
                  />
                </div>
              ))}
            </ScrollReveal>
          </div>
        )}

        {/* ========================================================
            SEÇÃO 2: PROMOÇÕES (Lista Vertical com Foto à Direita)
           ======================================================== */}
        {displayPromos.length > 0 && (
          <div>
            <ScrollReveal className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
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
            </ScrollReveal>

            {/* Grade 2 Colunas no Desktop com foto à direita */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {displayPromos.map((product) => (
                <ScrollReveal key={`promo-${product.id}`} className="grid">
                  <ProductCard
                    product={product}
                    categoryRules={
                      categoryRulesBySlug?.[normalizeLegacyCategorySlug(product.category)]
                    }
                    layout="horizontal"
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SEÇÕES DINÂMICAS POR CATEGORIA (Grid Padronizado)
           ======================================================== */}
        {effectiveSections.map((section, sectionIdx) => {
          const cat = section.category
          const slugNorm = normalizeLegacyCategorySlug(cat.slug)
          const title =
            slugNorm === "batata"
              ? "Batatas Recheadas Mais Pedidas"
              : slugNorm === "macarrao"
              ? "Massas e Macarrão Mais Pedidos"
              : section.showRanking
              ? `${cat.name} Mais Pedidos`
              : cat.name
          const ctaLabel =
            slugNorm === "batata"
              ? "Ver todas as batatas"
              : slugNorm === "macarrao"
              ? "Ver todas as massas"
              : "Ver todas"
          const is3dCategory = slugNorm === "batata" || slugNorm === "macarrao"
          const preset3dUrl = is3dCategory
            ? (PRESET_3D_ICONS.find((icon) => icon.id === slugNorm)?.path ?? null)
            : null
          const section3dIconUrl = is3dCategory
            ? (cat.icon_type !== "lucide" && cat.icon_url ? cat.icon_url : preset3dUrl)
            : null
          const showFlameBadge = !is3dCategory && sectionIdx === 0

          return (
            <div key={cat.id}>
              <ScrollReveal className="flex items-center justify-between gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#ECE7E0]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {is3dCategory && section3dIconUrl ? (
                      <CategoryIcon
                        iconUrl={section3dIconUrl}
                        iconType="preset_3d"
                        iconScale={cat.icon_scale}
                        fallbackIcon={cat.fallback_icon}
                        accentColor={cat.accent_color}
                        sizeClassName="w-7 h-7 sm:w-8 sm:h-8"
                        iconClassName="w-4 h-4"
                        className="shrink-0"
                      />
                    ) : showFlameBadge ? (
                      <span className="p-1.5 rounded-lg bg-[#FEF8EC] text-[#8A6100] shrink-0">
                        <Flame className="w-4 h-4 fill-[#E3A008] text-[#E3A008]" />
                      </span>
                    ) : null}
                    <h2 className="text-lg sm:text-xl font-bold text-[#1F1B16] tracking-tight min-w-0">
                      {title}
                    </h2>
                    {cat.badge_text && (
                      <span
                        style={{ backgroundColor: cat.badge_color || "#C1440E" }}
                        className="inline-flex items-center text-white uppercase tracking-wide text-[10px] font-extrabold px-2 py-0.5 rounded-full leading-none shadow-2xs shrink-0"
                      >
                        {cat.badge_text}
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-xs text-[#6B6157] mt-0.5">{cat.description}</p>
                  )}
                </div>

                <Link
                  href={`/cardapio?category=${encodeURIComponent(cat.slug)}`}
                  className="shrink-0"
                >
                  <span className="text-xs font-bold text-[#C1440E] hover:text-[#E3A008] flex items-center gap-0.5 transition-colors">
                    {ctaLabel}
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </ScrollReveal>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {section.products.map((product, idx) => (
                  <ScrollReveal key={`${cat.id}-${product.id}`} className="relative group">
                    {section.showRanking && (
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        <span
                          className={`inline-flex items-center justify-center font-black text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full shadow-2xs ${
                            idx === 0
                              ? "bg-[#E3A008] text-white"
                              : idx === 1
                              ? "bg-[#C1440E] text-white"
                              : idx === 2
                              ? "bg-[#8A6100] text-white"
                              : "bg-white/95 text-[#6B6157] border border-[#ECE7E0]"
                          }`}
                        >
                          {idx + 1}º
                        </span>
                      </div>
                    )}
                    <ProductCard
                      product={product}
                      rank={null}
                      isMostRequested={Boolean(
                        mostRequestedProductId && product.id === mostRequestedProductId,
                      )}
                      categoryRules={{
                        allowsAddons: cat.allows_addons,
                        allowsNotes: cat.allows_notes,
                      }}
                      layout="vertical"
                    />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )
        })}

        {/* Banner de Personalização / Montar do seu jeito */}
        <ScrollReveal className="rounded-2xl bg-[#F7F4EF] border border-[#ECE7E0] p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-base font-bold text-[#1F1B16]">
              Quer montar do seu jeito?
            </h3>
            <p className="text-xs text-[#6B6157] mt-0.5">
              Escolha seus recheios favoritos, adicionais generosos e monte sua batata personalizada.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 w-full sm:w-auto h-11 bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-sm px-6 rounded-xl shadow-xs transition-colors"
          >
            <Link href="/cardapio">Abrir cardápio</Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  )
}
