import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { Clock, Truck, Heart, Star, MapPin, Utensils, Trophy } from "lucide-react"
import { productsManager } from "@/lib/products-db"
import Image from "next/image"

// Força a revalidação da página a cada 24 horas (86400 segundos)
export const revalidate = 86400

export default async function SobrePage() {
  // Busca o produto Nº1 dinamicamente do ranking do Supabase
  const mostRequestedData = await productsManager.getMostRequestedProduct()
  const topProduct = mostRequestedData.product

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <HeaderWrapper />
      <main className="flex-1">
        
        {/* HERO DA PÁGINA SOBRE */}
        <section className="relative py-20 md:py-32 overflow-hidden bg-yellow-500">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-20" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold">
                <Heart className="h-4 w-4 fill-current" />
                Nossa História
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
                Muito Prazer, <br /> Somos a <span className="text-gray-900">batata top!</span>
              </h1>
              <p className="text-xl text-yellow-50 font-medium max-w-2xl mx-auto leading-relaxed">
                Paixão por batatas recheadas desde 2020, levando o melhor sabor de Iacanga direto para sua mesa.
              </p>
            </div>
          </div>
          {/* ONDA DECORATIVA */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[60px] fill-white">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
          </div>
        </section>

        {/* CONTEÚDO PRINCIPAL */}
        <section className="py-20 bg-white overflow-hidden">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                    O Segredo está no <span className="text-yellow-500">Carinho</span>
                  </h2>
                  <div className="w-20 h-2 bg-yellow-500 rounded-full" />
                </div>
                
                <div className="prose prose-lg text-gray-600 space-y-6">
                  <p className="text-lg leading-relaxed">
                    A <span className="font-bold text-gray-800">batata top</span> nasceu da paixão por criar as melhores batatas recheadas de Iacanga. Trabalhamos com dedicação para oferecer produtos de qualidade, sempre frescos e preparados com muito carinho para nossos clientes.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Cada batata é cuidadosamente selecionada e preparada na hora. Nossos recheios generosos e saborosos fazem a diferença, e nosso compromisso é garantir que cada pedido chegue quentinho e delicioso até você.
                  </p>
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-yellow-500">4+</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Anos de Sabor</span>
                  </div>
                  <div className="w-px h-12 bg-gray-100" />
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-yellow-500">10k+</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Batatas Entregues</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="space-y-6">
                  <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border-8 border-white bg-gray-100 relative">
                    {/* FOTO DINÂMICA DO PRODUTO Nº1 */}
                    <Image 
                      src={topProduct.image} 
                      alt={`Nossa Batata Recheada Nº1: ${topProduct.name}`} 
                      fill
                      className="object-cover"
                    />
                    
                    {/* OVERLAY COM NOME DO PRODUTO */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8">
                      <p className="text-yellow-400 font-black text-xs uppercase tracking-[0.3em] mb-1">Campeã de Vendas</p>
                    </div>
                  </div>
                  
                  {/* NOME DO PRODUTO ABAIXO DA FOTO */}
                  <div className="text-center lg:text-left pl-4">
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">
                      {topProduct.name}
                    </h3>
                    <p className="text-gray-500 font-medium line-clamp-2">
                      {topProduct.description}
                    </p>
                  </div>
                </div>

                {/* FLOATING BADGE Nº1 */}
                <div className="absolute -top-6 right-2 sm:-right-6 bg-white p-4 rounded-2xl shadow-2xl border border-yellow-100 animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-400 p-2 rounded-xl text-white">
                      <Trophy className="h-6 w-6 fill-current" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-yellow-600 uppercase leading-none">Ranking Real</p>
                      <p className="text-sm font-black text-gray-900">Nº 1 da Casa</p>
                    </div>
                  </div>
                </div>

                {/* FLOATING BADGE QUALIDADE */}
                <div className="absolute -bottom-6 left-2 sm:-bottom-12 sm:-left-6 bg-white p-5 sm:p-6 rounded-2xl shadow-xl border border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 p-3 rounded-xl text-yellow-600">
                      <Star className="h-6 w-6 fill-current" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-800">Qualidade 5 Estrelas</p>
                      <p className="text-xs text-gray-500">Avaliação dos clientes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DIFERENCIAIS EM CARDS PREMIUM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group bg-gray-50 p-8 rounded-3xl border border-transparent hover:border-yellow-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Heart className="h-8 w-8 fill-current" />
                </div>
                <h3 className="font-black text-xl mb-3 text-gray-900">Feito com Amor</h3>
                <p className="text-gray-500 leading-relaxed">
                  Cada batata é preparada como se fosse para nossa própria família. O ingrediente principal é sempre o carinho.
                </p>
              </div>

              <div className="group bg-gray-50 p-8 rounded-3xl border border-transparent hover:border-yellow-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Utensils className="h-8 w-8" />
                </div>
                <h3 className="font-black text-xl mb-3 text-gray-900">Sempre Fresco</h3>
                <p className="text-gray-500 leading-relaxed">
                  Trabalhamos apenas com ingredientes selecionados e frescos. Nada de congelados genéricos por aqui!
                </p>
              </div>

              <div className="group bg-gray-50 p-8 rounded-3xl border border-transparent hover:border-yellow-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Truck className="h-8 w-8" />
                </div>
                <h3 className="font-black text-xl mb-3 text-gray-900">Entrega Rápida</h3>
                <p className="text-gray-500 leading-relaxed">
                  Nossa logística é focada em garantir que sua batata chegue quentinha e com o queijo derretendo.
                </p>
              </div>
            </div>

            {/* ONDE ESTAMOS - CORES AJUSTADAS */}
            <div className="mt-24 p-8 md:p-12 bg-gray-900 rounded-[40px] text-white relative overflow-hidden border-4 border-yellow-500/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-black">Onde estamos?</h2>
                  <div className="space-y-2">
                    <p className="text-yellow-500 font-bold flex items-center justify-center md:justify-start gap-2">
                      <MapPin className="h-5 w-5" />
                      Rua Carlos Roberto Crepaldi, 120
                    </p>
                    <p className="text-gray-400 font-medium ml-7">
                      Centro, Iacanga - SP (Portão de ferro preto)
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center">
                    <p className="text-xs font-bold text-yellow-500 uppercase mb-2 tracking-widest">Horário de Funcionamento</p>
                    <p className="font-black text-xl">Segunda a Segunda</p>
                    <p className="text-gray-400">10:00 às 01:30</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <OrderSummary />
    </div>
  )
}
