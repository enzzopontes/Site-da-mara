"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, Clock, MapPin, CheckCircle2, ChevronRight, Sparkles } from "lucide-react"
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
    <section className="bg-white border-b border-[#ECE7E0]">
      {/* Capa de Restaurante Estilo iFood */}
      <div className="relative h-24 sm:h-52 md:h-64 w-full bg-[#1F1B16] overflow-hidden">
        <img
          src="/products/costela.jpg"
          alt="Batata Top Capa"
          className="w-full h-full object-cover opacity-60 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
        {/* Card de Identidade do Restaurante iFood */}
        <div className="relative -mt-8 sm:-mt-16 bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-sm border border-[#ECE7E0] mb-3 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6 text-center sm:text-left">
            {/* Top row mobile / logo desktop */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Logo Oficial Redonda com Borda de Destaque */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-white p-1 sm:p-1.5 shadow-md border-2 border-[#E3A008] flex items-center justify-center overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="Batata Top Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#27AE60] text-white p-0.5 sm:p-1 rounded-full shadow-xs" title="Restaurante Verificado">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>

              {/* Informações de cabeçalho no mobile */}
              <div className="flex-1 min-w-0 sm:hidden">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h1 className="text-lg font-black text-[#1F1B16] tracking-tight truncate">
                      Batata Top
                    </h1>
                    <span className="inline-flex items-center gap-0.5 bg-[#FEF8EC] text-[#8A6100] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#FCE8C3] shrink-0">
                      <Sparkles className="w-2.5 h-2.5 text-[#E3A008]" />
                      Super
                    </span>
                  </div>

                  {/* Rating badge no topo direito preenchendo o espaço vazio */}
                  <div className="shrink-0 inline-flex items-center gap-1 bg-[#FEF8EC] border border-[#FCE8C3] px-2 py-0.5 rounded-full text-[11px] font-bold text-[#1F1B16]">
                    <Star className="w-3 h-3 fill-[#FCBB00] text-[#FCBB00]" />
                    <span>4.9</span>
                    <span className="text-[#9C9188] font-normal text-[10px]">(500+)</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B6157] font-medium min-w-0 flex items-center gap-1">
                  <span className="truncate min-w-0">Batatas Recheadas • Macarrão • Bebidas</span>
                  <span className="text-[#ECE7E0] shrink-0">•</span>
                  <span className="text-[#C1440E] font-semibold shrink-0">Iacanga - SP</span>
                </p>
              </div>
            </div>

            {/* Dados do Restaurante no Desktop */}
            <div className="flex-1 min-w-0 w-full">
              <div className="hidden sm:flex flex-wrap items-center justify-start gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black text-[#1F1B16] tracking-tight">
                  Batata Top
                </h1>
                <span className="inline-flex items-center gap-1 bg-[#FEF8EC] text-[#8A6100] text-xs font-bold px-2 py-0.5 rounded-full border border-[#FCE8C3]">
                  <Sparkles className="w-3 h-3 text-[#E3A008]" />
                  Super Restaurante
                </span>
              </div>

              <p className="hidden sm:block text-xs sm:text-sm text-[#6B6157] font-medium mb-3">
                Batatas Recheadas • Macarrão • Bebidas
              </p>

              {/* Linha de Indicadores Operacionais iFood - 3 indicadores principais no mobile */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-4 text-xs pt-1 sm:pt-0">
                {/* Status Aberto com Ponto Pulsante */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border shrink-0 ${
                    isStoreOpen
                      ? "bg-[#27AE60]/10 text-[#27AE60] border-[#27AE60]/30"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isStoreOpen ? "bg-[#27AE60]" : "bg-red-500"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isStoreOpen ? "bg-[#27AE60]" : "bg-red-500"
                      }`}
                    />
                  </span>
                  <span>{isStoreOpen ? "Loja aberta" : "Fechada"}</span>
                </div>

                {/* Tempo de Espera */}
                <div className="inline-flex items-center gap-1 bg-[#F5F2ED] sm:bg-transparent px-2.5 sm:px-0 py-1 sm:py-0 rounded-full sm:rounded-none font-medium text-[#6B6157] shrink-0 text-[11px] sm:text-xs">
                  <Clock className="w-3.5 h-3.5 text-[#E3A008]" />
                  <span>{waitTime.min}-{waitTime.max} min</span>
                </div>

                <span className="text-[#ECE7E0] hidden sm:inline">•</span>

                {/* Taxa de Entrega */}
                <div className="inline-flex items-center gap-1 bg-[#F5F2ED] sm:bg-transparent px-2.5 sm:px-0 py-1 sm:py-0 rounded-full sm:rounded-none font-bold shrink-0 text-[11px] sm:text-xs">
                  {isDeliveryFeeEnabled ? (
                    <span className="text-[#1F1B16]">
                      Entrega R$ {deliveryFee.toFixed(2).replace(".", ",")}
                    </span>
                  ) : (
                    <span className="text-[#27AE60] sm:bg-[#27AE60]/10 sm:px-2 sm:py-0.5 sm:rounded">
                      Entrega Grátis
                    </span>
                  )}
                </div>

                <span className="text-[#ECE7E0] hidden sm:inline">•</span>

                {/* Avaliação (Desktop) */}
                <div className="hidden sm:inline-flex items-center gap-1 bg-transparent py-0 font-bold text-[#1F1B16] shrink-0 text-xs">
                  <Star className="w-3.5 h-3.5 fill-[#FCBB00] text-[#FCBB00]" />
                  <span>4.9</span>
                  <span className="text-[#9C9188] font-normal">(500+)</span>
                </div>

                <span className="text-[#ECE7E0] hidden sm:inline">•</span>

                {/* Localização (Desktop) */}
                <div className="hidden sm:inline-flex items-center gap-1 bg-transparent py-0 text-[#6B6157] shrink-0 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#C1440E]" />
                  <span>Iacanga - SP</span>
                </div>
              </div>
            </div>

            {/* Status da Loja e Botão Primário no Desktop */}
            <div className="shrink-0 hidden sm:flex flex-col items-end gap-2.5 w-auto">
              <Link href="/cardapio">
                <Button
                  className="h-11 bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-sm px-6 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Fazer pedido</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Banner de Oferta Especial (se houver configurada) */}
        {(superPromoActive || itemPromoActive) && (superPromoImage || itemPromoImage) && (
          <div className="mb-3 sm:mb-6">
            <Link href="/cardapio">
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#ECE7E0] shadow-xs cursor-pointer hover:opacity-95 transition-opacity">
                <img
                  src={superPromoImage || itemPromoImage}
                  alt="Promoção Batata Top"
                  className="w-full h-24 sm:h-48 md:h-56 object-cover"
                />
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
