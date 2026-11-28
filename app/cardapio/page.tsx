import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { CardapioContentWrapper, type MenuSectionData } from "@/components/cardapio-content-wrapper"
import { productsManager, type Product } from "@/lib/products-db"
import { getCachedActiveCategories, getCachedHomeGridLayout } from "@/lib/categories-server"
import { getMenuCategories, matchProductToCategory, type Category } from "@/lib/categories-db"
import { DEFAULT_HOME_GRID_LAYOUT, type HomeGridLayout } from "@/lib/home-grid-layout"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"

// Força a revalidação da página para ser dinâmica (sempre atualizada)
export const revalidate = 0

export default async function CardapioPage() {
  let categories: Category[] = []
  let homeGridLayout: HomeGridLayout = DEFAULT_HOME_GRID_LAYOUT
  let allProducts: Product[] = []
  let rankingNames: string[] = []
  let loadError: string | null = null

  try {
    // Rankings REAIS baseados nas vendas do banco de dados (isolado para não derrubar o catálogo)
    ;[categories, homeGridLayout, allProducts, rankingNames] = await Promise.all([
      getCachedActiveCategories(),
      getCachedHomeGridLayout().catch(() => DEFAULT_HOME_GRID_LAYOUT),
      productsManager.getProducts(),
      productsManager.getGlobalRankingNames(80).catch((rankErr) => {
        console.warn("[cardapio] Falha não impeditiva ao carregar ranking:", rankErr)
        return []
      }),
    ])
  } catch (err) {
    console.error("[cardapio] Erro ao carregar dados do cardápio:", err)
    loadError = "Não foi possível carregar o cardápio no momento. Tente novamente em instantes."
  }

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

  const menuCategories = getMenuCategories(categories, activeCountsBySlug)

  const sections: MenuSectionData[] = menuCategories
    .map((cat) => {
      const matched = availableProducts.filter((p) => matchProductToCategory(p, cat))
      const matchedNameByNorm = new Map(matched.map((p) => [p.name.toLowerCase().trim(), p.name]))

      const topNames = cat.show_ranking
        ? Array.from(
            new Set(
              rankingNames
                .map((n) => matchedNameByNorm.get(n.toLowerCase().trim()))
                .filter((name): name is string => Boolean(name)),
            ),
          )
        : []

      const topIndexMap = new Map(topNames.map((n, i) => [n.toLowerCase().trim(), i]))
      const orderedProducts =
        cat.show_ranking && topNames.length > 0
          ? [...matched].sort((a, b) => {
              const indexA = topIndexMap.get(a.name.toLowerCase().trim()) ?? Infinity
              const indexB = topIndexMap.get(b.name.toLowerCase().trim()) ?? Infinity
              return indexA - indexB
            })
          : matched

      return {
        category: cat,
        products: orderedProducts,
        topNames,
      }
    })
    .filter((section) => section.products.length > 0)

  const todosCategory = categories.find((c) => normalizeLegacyCategorySlug(c.slug) === "todos") ?? null

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderWrapper />
      <CardapioContentWrapper
        sections={sections}
        todosCategory={todosCategory}
        homeGridLayout={homeGridLayout}
        loadError={loadError}
      />
      <Footer />
      <OrderSummary />
    </div>
  )
}
