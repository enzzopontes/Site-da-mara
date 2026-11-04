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
  const [batatas, macarrao, mostRequestedData, totalCustomers, topBatatasNames, topMacarraoNames, allCoupons] =
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
        totalOrders: 0,
        customerPhotos: [],
      })),
      productsManager.getTotalCustomers().catch(() => 0),
      productsManager.getRealRankingByCategory("batata").catch(() => [] as string[]),
      productsManager.getRealRankingByCategory("macarrao").catch(() => [] as string[]),
      couponsManager.getCoupons().catch(() => [] as any[]),
    ])

  const activeCoupons = allCoupons.filter((c: any) => c.isActive)
  const homeCoupon = activeCoupons.find((c: any) => c.showOnHome) || activeCoupons[0]

  // Ordena batatas pelo ranking real (exibe até 8 no destaque)
  const topBatatas = [...batatas]
    .sort((a, b) => {
      const indexA = topBatatasNames.indexOf(a.name)
      const indexB = topBatatasNames.indexOf(b.name)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    .slice(0, 8)

  // Ordena macarrão pelo ranking real (exibe até 4 no destaque)
  const topMacarrao = [...macarrao]
    .sort((a, b) => {
      const indexA = topMacarraoNames.indexOf(a.name)
      const indexB = topMacarraoNames.indexOf(b.name)
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    .slice(0, 4)

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1A1A1A] antialiased">
      <HeaderWrapper />

      <main className="flex-1 flex flex-col">
        {/* Hero com dados reais, status da loja e chamada de alta conversão */}
        <Hero
          mostRequestedProduct={mostRequestedData.product}
          totalOrders={mostRequestedData.totalOrders}
          customerPhotos={mostRequestedData.customerPhotos}
          totalCustomers={totalCustomers}
        />

        {/* Barra de Categorias Rápidas (Chips estilo iFood com espaço reservado CLS = 0) */}
        <section aria-label="Navegação por categorias" className="w-full min-h-[60px] bg-white">
          <CategoryBar />
        </section>

        {/* Carrossel Rotativo de Cupons da Home (Estilo Mobile iFood) */}
        <HomeCouponBanner
          coupons={activeCoupons}
          couponCode={homeCoupon?.code || "PRIMEIRACOMPRA"}
          discountText={homeCoupon?.description || homeCoupon?.title || "Desconto especial no seu pedido!"}
          badgeLabel={homeCoupon?.badgeLabel || "CUPOM EXCLUSIVO"}
          discountValue={homeCoupon?.discount || 15}
          discountType={homeCoupon?.type || "percentage"}
          minOrderValue={homeCoupon?.minOrderValue}
        />

        {/* Blocos de Produtos em Destaque divididos por categoria */}
        <FeaturedProducts
          topBatatas={topBatatas}
          topMacarrao={topMacarrao}
          mostRequestedProductId={mostRequestedData.product.id}
          topBatatasNames={topBatatasNames}
          topMacarraoNames={topMacarraoNames}
        />
      </main>

      <Footer />
      <OrderSummary />
    </div>
  )
}
