"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"
import { RestaurantHeaderCard } from "@/components/restaurant-header-card"

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
  totalOrders = 0,
  customerPhotos = [],
  totalCustomers = 0,
}: HeroProps) {
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [waitTime, setWaitTime] = useState({ min: 15, max: 22 })
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [isDeliveryFeeEnabled, setIsDeliveryFeeEnabled] = useState(false)

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
        setWaitTime({ min: status.waitTimeMin || 15, max: status.waitTimeMax || 22 })
        setIsDeliveryFeeEnabled(status.isDeliveryFeeEnabled ?? false)
        setDeliveryFee(Number(status.deliveryFee) || 0)

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
    <section className="bg-[#FAF8F5] border-b border-[#ECE7E0]">
      {/* Capa de Restaurante Estilo iFood - altura ampliada no mobile para ver a comida totalmente */}
      <div className="relative h-36 sm:h-52 md:h-64 w-full bg-[#1F1B16] overflow-hidden">
        <img
          src="/products/costela.jpg"
          alt="Batata Top Capa"
          className="w-full h-full object-cover object-center opacity-95 scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      </div>

      <div className="container mx-auto px-2 sm:px-4 max-w-5xl">
        {/* Card de Identidade do Restaurante com Barra de Fidelidade */}
        <RestaurantHeaderCard
          isOpen={isStoreOpen}
          waitTimeMin={waitTime.min}
          waitTimeMax={waitTime.max}
          isDeliveryFeeEnabled={isDeliveryFeeEnabled}
          deliveryFee={deliveryFee}
        />

        {/* Banner de Oferta Especial */}
        {(superPromoActive || itemPromoActive) && (superPromoImage || itemPromoImage) && (
          <div className="mb-3 sm:mb-6">
            <Link href="/cardapio">
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#ECE7E0] shadow-xs cursor-pointer hover:opacity-95 transition-opacity aspect-[2.6/1] sm:aspect-[2.8/1]">
                <img
                  src={superPromoImage || itemPromoImage}
                  alt="Promoção Batata Top"
                  className="w-full h-full object-contain sm:object-cover"
                />
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
