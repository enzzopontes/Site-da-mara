"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star, Clock, Truck, Trophy, Sparkles, MapPin, ShieldCheck, Flame } from "lucide-react"
import { useState, useEffect } from "react"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
}

interface HeroProps {
  mostRequestedProduct?: Product
  totalOrders?: number
  customerPhotos?: string[]
  totalCustomers?: number
}

export function Hero({
  mostRequestedProduct,
  totalOrders = 1258,
  customerPhotos = [],
  totalCustomers = 5234,
}: HeroProps) {
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [waitTime, setWaitTime] = useState({ min: 15, max: 25 })
  const [deliveryFee, setDeliveryFee] = useState(3.0)
  const [isDeliveryFeeEnabled, setIsDeliveryFeeEnabled] = useState(true)

  const [superPromoActive, setSuperPromoActive] = useState(false)
  const [superPromoImage, setSuperPromoImage] = useState<string | undefined>()
  const [itemPromoActive, setItemPromoActive] = useState(false)
  const [itemPromoImage, setItemPromoImage] = useState<string | undefined>()

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await storeStatusManager.getStatus()
        setStoreStatus(status)
        setIsStoreOpen(status.isOpen ?? true)
        setWaitTime({ min: status.waitTimeMin || 15, max: status.waitTimeMax || 25 })
        setIsDeliveryFeeEnabled(status.isDeliveryFeeEnabled ?? true)
        setDeliveryFee(Number(status.deliveryFee) || 3.0)

        if (status.superPromo?.isActive) {
          setSuperPromoActive(true)
          const imgUrl =
            status.superPromo.useUrl && status.superPromo.imageUrl
              ? status.superPromo.imageUrl
              : status.superPromo.imageId
              ? `/api/images/${status.superPromo.imageId}`
              : undefined
          setSuperPromoImage(imgUrl)
        } else {
          setSuperPromoActive(false)
        }

        if (status.itemPromo?.isActive) {
          setItemPromoActive(true)
          const imgUrl =
            status.itemPromo.useUrl && status.itemPromo.imageUrl
              ? status.itemPromo.imageUrl
              : status.itemPromo.imageId
              ? `/api/images/${status.itemPromo.imageId}`
              : undefined
          setItemPromoImage(imgUrl)
        } else {
          setItemPromoActive(false)
        }
      } catch {}
    }

    loadStatus()
  }, [])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/5 via-white to-white pt-6 pb-14 md:pt-10 md:pb-20">
      {/* Luzes de fundo decorativas */}
      <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-[420px] h-[420px] bg-amber-200/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[350px] h-[350px] bg-orange-100/40 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4 max-w-6xl">
        {/* Banner de Promoção se ativo */}
        {(superPromoActive || itemPromoActive) && (superPromoImage || itemPromoImage) && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <Link href="/cardapio">
              <div className="relative group overflow-hidden rounded-3xl shadow-lg border-2 border-amber-300 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]">
                <img
                  src={superPromoImage || itemPromoImage}
                  alt="Promoção Especial"
                  className="w-full h-auto object-cover max-h-[220px] md:max-h-[380px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 md:p-6">
                  <span className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-black text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-lg">
                    <span>Aproveitar Oferta</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Status da Loja em Tempo Real (Padrão iFood) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2.5 sm:p-3 rounded-2xl bg-white border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isStoreOpen ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isStoreOpen ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </div>
            <span className="text-xs font-black text-gray-800">
              {isStoreOpen ? "Aberto Agora" : "Fechado no Momento"}
            </span>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1 text-xs text-gray-600 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{waitTime.min}-{waitTime.max} min</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>Iacanga - SP</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-black">
              {isDeliveryFeeEnabled ? `Taxa R$ ${deliveryFee.toFixed(2).replace(".", ",")}` : "Taxa Grátis"}
            </span>
          </div>
        </div>

        {/* Grid Principal Hero */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12">
          {/* Coluna Texto & Ações */}
          <div className="flex-1 text-center lg:text-left space-y-5">
            <div className="inline-flex items-center gap-2 bg-amber-100/80 border border-amber-200 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs">
              <Flame className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>A Melhor Batata Recheada de Iacanga</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.1]">
                Fome de verdade? <br />
                Peça uma <span className="text-amber-500 underline decoration-amber-300 decoration-wavy">Batata Top!</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Batatas gigantes selecionadas, recheios artesanais generosos e queijo derretido quentinho na sua porta em minutos.
              </p>
            </div>

            {/* Ações Primárias */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link href="/cardapio" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 bg-amber-500 hover:bg-amber-600 text-white font-black text-base px-8 rounded-2xl shadow-lg shadow-amber-200 hover:shadow-amber-300 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Ver Cardápio Completo</span>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>

              <Link href="/cardapio?category=batata" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-14 border-2 border-gray-200 hover:border-amber-400 bg-white text-gray-800 font-black text-sm px-6 rounded-2xl transition-all active:scale-95"
                >
                  🥔 Escolher Batatas
                </Button>
              </Link>
            </div>

            {/* Prova Social */}
            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                ))}
                <span className="font-black text-sm text-gray-900 ml-1">4.9</span>
              </div>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <p className="text-xs font-bold text-gray-500">
                Mais de <strong>{totalOrders.toLocaleString("pt-BR")}</strong> batatas entregues com perfeição!
              </p>
            </div>
          </div>

          {/* Coluna Imagem em Destaque */}
          <div className="flex-1 w-full max-w-md lg:max-w-none relative">
            <div className="relative z-10">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/15 border-2 border-amber-200/80 group">
                <img
                  src={
                    mostRequestedProduct?.image ||
                    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={mostRequestedProduct?.name || "Batata Recheada Batata Top"}
                  className="w-full h-[280px] sm:h-[360px] object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Badge Flutuante "Nº 1 Mais Pedida" estilo iFood */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-amber-200 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                      Campeã de Vendas
                    </span>
                    <span className="text-xs font-black text-gray-900 line-clamp-1">
                      {mostRequestedProduct?.name || "Especial da Casa"}
                    </span>
                  </div>
                </div>

                {/* Tarja Inferior Transparente com CTA Direto */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs text-amber-300 font-black uppercase tracking-wider">Batata Top Original</p>
                    <p className="text-sm sm:text-base font-black line-clamp-1">{mostRequestedProduct?.name}</p>
                  </div>
                  <Link href="/cardapio">
                    <button className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5">
                      <span>Pedir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Círculo luminoso de profundidade */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-amber-400/20 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  )
}
