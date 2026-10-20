import { HeaderWrapper } from "@/components/header-wrapper"
import { Hero } from "@/components/hero"
import { CategoryBar } from "@/components/category-bar"
import { HomeCouponBanner } from "@/components/home-coupon-banner"
import { FeaturedProducts } from "@/components/featured-products"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { productsManager } from "@/lib/products-db"
import { couponsManager } from "@/lib/cupons-manager"

// ISR: revalidação a cada 60 segundos para carregamento instantâneo no mobile sem onerar o banco
export const revalidate = 60

export default async function Home() {
  // Busca em paralelo com tolerância a falhas
  const [batatas, macarrao, mostRequestedData, totalCustomers, topBatatasNames, topMacarraoNames, homeCoupon] =
    await Promise.all([
      productsManager.getBatatas().catch(() => [] as any[]),
      productsManager.getMacarrao().catch(() => [] as any[]),
      productsManager.getMostRequestedProduct().catch(() => ({
        product: {
          id: "default",
          name: "Batata Especial da Casa",
          description: "Recheio generoso e queijo derretido",
          price: 29.9,
          image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80",
        },
        totalOrders: 1540,
        customerPhotos: [],
      })),
      productsManager.getTotalCustomers().catch(() => 5000),
      productsManager.getRealRankingByCategory("batata").catch(() => [] as string[]),
      productsManager.getRealRankingByCategory("macarrao").catch(() => [] as string[]),
      couponsManager.getActiveHomeCoupon().catch(() => null),
    ])

  // Ordena batatas pelo ranking real (top 3)
  const topBatatas = [...batatas]
    .sort((a, b) => {
      const indexA = topBatatasNames.indexOf(a.name)
      const indexB = topBatatasNames.indexOf(b.name)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    .slice(0, 3)

  // Ordena macarrão pelo ranking real (top 3)
  const topMacarrao = [...macarrao]
    .sort((a, b) => {
      const indexA = topMacarraoNames.indexOf(a.name)
      const indexB = topMacarraoNames.indexOf(b.name)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    .slice(0, 3)

  const allTopNames = [...topBatatasNames, ...topMacarraoNames]
  const topProducts = [...topBatatas, ...topMacarrao]

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <HeaderWrapper />

      <main className="flex-1">
        {/* Hero com dados reais, status da loja e chamada de alta conversão */}
        <Hero
          mostRequestedProduct={mostRequestedData.product}
          totalOrders={mostRequestedData.totalOrders}
          customerPhotos={mostRequestedData.customerPhotos}
          totalCustomers={totalCustomers}
        />

        {/* Barra de Categorias Rápidas (Chips estilo iFood) */}
        <CategoryBar />

        {/* Banner de Cupom Promocional da Home (dinâmico configurado no Admin) */}
        <HomeCouponBanner
          couponCode={homeCoupon?.code || "PRIMEIRACOMPRA"}
          discountText={homeCoupon?.description || homeCoupon?.title || "Ganhe desconto especial no seu pedido!"}
          badgeLabel={homeCoupon?.badgeLabel || "CUPOM EXCLUSIVO"}
          bannerImageUrl={homeCoupon?.bannerImageUrl}
          discountValue={homeCoupon?.discount || 15}
          discountType={homeCoupon?.type || "percentage"}
          minOrderValue={homeCoupon?.minOrderValue}
        />

        {/* Grid de Produtos em Destaque (2 colunas mobile) e Pilares de Confiança */}
        <FeaturedProducts
          products={topProducts}
          mostRequestedProductId={mostRequestedData.product.id}
          topBatatasNames={allTopNames}
        />
      </main>


      <Footer />
      <OrderSummary />
    </div>
  )
}
