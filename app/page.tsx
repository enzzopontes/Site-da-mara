import { HeaderWrapper } from "@/components/header-wrapper"
import { Hero } from "@/components/hero"
import { CampaignBanner } from "@/components/campaign-banner"
import { CategoryBar } from "@/components/category-bar"
import { HomeCouponBanner } from "@/components/home-coupon-banner"
import { FeaturedProducts, type FeaturedCategorySection } from "@/components/featured-products"
import { Footer } from "@/components/footer"
import { ScrollReveal } from "@/components/ui/scroll-reveal"
import { OrderSummary } from "@/components/order-summary"
import { productsManager, type Product } from "@/lib/products-db"
import { couponsManager } from "@/lib/cupons-manager"
import { getCachedActiveCategories, getCachedHomeGridLayout } from "@/lib/categories-server"
import { DEFAULT_HOME_GRID_LAYOUT } from "@/lib/home-grid-layout"
import {
  DEFAULT_CATEGORIES,
  getHomeBarCategories,
  getHomeFeaturedCategories,
  matchProductToCategory,
} from "@/lib/categories-db"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"

// ISR: revalidação a cada 60 segundos para carregamento instantâneo no mobile sem onerar o banco
export const revalidate = 60

export default async function Home() {
  let productsLoadError = false

  // Busca em paralelo com tolerância a falhas
  const [
    categories,
    homeGridLayout,
    allProducts,
    rankingNames,
    mostRequestedData,
    totalCustomers,
    allCoupons,
  ] = await Promise.all([
    getCachedActiveCategories().catch(() => DEFAULT_CATEGORIES),
    getCachedHomeGridLayout().catch(() => DEFAULT_HOME_GRID_LAYOUT),
    productsManager.getProducts({ strict: true }).catch(() => {
      productsLoadError = true
      return [] as Product[]
    }),
    productsManager.getGlobalRankingNames(60).catch(() => [] as string[]),
    productsManager.getMostRequestedProduct().catch(() => ({
      product: undefined as Product | undefined,
      totalOrders: 0,
      customerPhotos: [] as string[],
    })),
    productsManager.getTotalCustomers().catch(() => 0),
    couponsManager.getCoupons().catch(() => [] as any[]),
  ])

  const activeCoupons = allCoupons.filter((c: any) => c.isActive)
  const homeCoupon = activeCoupons.find((c: any) => c.showOnHome) || activeCoupons[0]

  const availableProducts = allProducts.filter((p) => p.available !== false)

  // Conta produtos ativos por slug normalizado (incluindo vínculo direto via category_id)
  const categorySlugById = new Map<string, string>()
  for (const cat of categories) {
    if (cat.kind === "product_category") {
      categorySlugById.set(cat.id, normalizeLegacyCategorySlug(cat.slug))
    }
  }

  const activeCountsBySlug: Record<string, number> = {}
  for (const product of availableProducts) {
    const prodCatId = product.categoryId ?? product.category_id
    const mappedSlug = prodCatId ? categorySlugById.get(prodCatId) : undefined
    const legacySlug = normalizeLegacyCategorySlug(product.category)

    if (mappedSlug) {
      activeCountsBySlug[mappedSlug] = (activeCountsBySlug[mappedSlug] ?? 0) + 1
    }
    if (legacySlug && legacySlug !== mappedSlug) {
      activeCountsBySlug[legacySlug] = (activeCountsBySlug[legacySlug] ?? 0) + 1
    }
  }

  const homeBarItems = getHomeBarCategories(categories, activeCountsBySlug)
  const hasMobileHomeBar = homeBarItems.some((c) => c.show_on_home_bar_mobile)
  const hasDesktopHomeBar = homeBarItems.some((c) => c.show_on_home_bar_desktop)
  const homeBarWrapperVisibility =
    hasMobileHomeBar && !hasDesktopHomeBar
      ? "sm:hidden"
      : !hasMobileHomeBar && hasDesktopHomeBar
        ? "hidden sm:block"
        : ""
  const featuredCategories = getHomeFeaturedCategories(categories, activeCountsBySlug)

  const rankIndexMap = new Map(rankingNames.map((n, i) => [n.toLowerCase().trim(), i]))

  // Monta seções dinâmicas em destaque ordenadas pelo ranking real quando habilitado
  const featuredSections: FeaturedCategorySection[] = featuredCategories
    .map((cat) => {
      const matched = availableProducts.filter((p) => matchProductToCategory(p, cat))
      const ordered = cat.show_ranking
        ? [...matched].sort((a, b) => {
            const rankA = rankIndexMap.get(a.name.toLowerCase().trim()) ?? Infinity
            const rankB = rankIndexMap.get(b.name.toLowerCase().trim()) ?? Infinity
            return rankA - rankB
          })
        : matched
      return {
        category: cat,
        products: ordered.slice(0, cat.home_featured_limit),
        showRanking: cat.show_ranking,
      }
    })
    .filter((section) => section.products.length > 0)

  const categoryRulesBySlug: Record<string, { allowsAddons: boolean; allowsNotes: boolean }> = {}
  for (const cat of categories) {
    if (cat.kind === "product_category") {
      categoryRulesBySlug[normalizeLegacyCategorySlug(cat.slug)] = {
        allowsAddons: cat.allows_addons,
        allowsNotes: cat.allows_notes,
      }
    }
  }

  const sidebarSlugs = new Set(
    categories
      .filter((c) => c.menu_layout_zone === "sidebar_right")
      .map((c) => normalizeLegacyCategorySlug(c.slug)),
  )
  const homeShowcaseProducts = availableProducts.filter((p) => {
    const slug = normalizeLegacyCategorySlug(p.category)
    return !sidebarSlugs.has(slug) && slug !== "bebida"
  })

  const mostRequested = mostRequestedData.product

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1A1A1A] antialiased">
      <HeaderWrapper />

      <main className="flex-1 flex flex-col">
        {/* Hero com dados reais, status da loja e chamada de alta conversão */}
        <ScrollReveal>
        <Hero
          mostRequestedProduct={mostRequested ?? availableProducts[0]}
          totalOrders={mostRequestedData.totalOrders}
          customerPhotos={mostRequestedData.customerPhotos}
          totalCustomers={totalCustomers}
        />
        </ScrollReveal>

        {/* Banner de Campanhas Promocionais Sincronizado com App */}
        <ScrollReveal>
          <CampaignBanner />
        </ScrollReveal>

        {/* Barra de Categorias Rápidas (Chips estilo iFood com espaço reservado CLS = 0) */}
        {(hasMobileHomeBar || hasDesktopHomeBar) && (
          <section
            aria-label="Navegação por categorias"
            className={`w-full min-h-[60px] bg-white ${homeBarWrapperVisibility}`.trim()}
          >
            <CategoryBar items={homeBarItems} layout={homeGridLayout} />
          </section>
        )}

        {/* Carrossel Rotativo de Cupons da Home (Estilo Mobile iFood) */}
        <ScrollReveal>
        <HomeCouponBanner
          coupons={activeCoupons}
          couponCode={homeCoupon?.code || "PRIMEIRACOMPRA"}
          discountText={homeCoupon?.description || homeCoupon?.title || "Desconto especial no seu pedido!"}
          badgeLabel={homeCoupon?.badgeLabel || "CUPOM EXCLUSIVO"}
          discountValue={homeCoupon?.discount || 15}
          discountType={homeCoupon?.type || "percentage"}
          minOrderValue={homeCoupon?.minOrderValue}
        />
        </ScrollReveal>

        {/* Blocos de Produtos em Destaque divididos por categoria */}
        <FeaturedProducts
          products={homeShowcaseProducts}
          featuredSections={featuredSections}
          categoryRulesBySlug={categoryRulesBySlug}
          mostRequestedProductId={mostRequested?.id}
          loadError={productsLoadError}
        />
      </main>

      <Footer />
      <OrderSummary />
    </div>
  )
}
