"use client"

import { useState, useEffect } from "react"
import { Plus, Tag, Flame, Sparkles } from "lucide-react"
import { AddToCartDialog } from "@/components/add-to-cart-dialog"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { appToast } from "@/lib/app-toast"
import { storeStatusManager } from "@/lib/store-status-manager"
import { Skeleton } from "@/components/ui/skeleton"

export interface ProductCardItem {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number | null
  original_price?: number | null
  discountPercentage?: number | null
  discount_percentage?: number | null
  badgeText?: string | null
  badge_text?: string | null
  isFeatured?: boolean
  is_featured?: boolean
  image: string
  category?: "batata" | "bebida" | "macarrao"
  available?: boolean
  adicionais?: any[]
}

export interface ProductCardProps {
  product: ProductCardItem
  rank?: 1 | 2 | 3 | null
  isMostRequested?: boolean
  layout?: "vertical" | "horizontal"
  className?: string
}

export function ProductCard({
  product,
  rank = null,
  isMostRequested = false,
  layout = "vertical",
  className = "",
}: ProductCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [, setIsPromoActive] = useState(false)
  const [promoPrice, setPromoPrice] = useState<number | null>(null)
  const { addItem } = useCart()
  const { user, openAuthModal } = useAuth()

  useEffect(() => {
    const checkPromo = async () => {
      const status = await storeStatusManager.getStatus()
      setIsPromoActive(status.isPromoActive ?? false)

      let finalPromoPrice: number | null = null

      if (status.itemPromo?.isActive) {
        const itemPromo = status.promoProducts?.find((p) => p.productId === product.id)
        if (itemPromo) {
          finalPromoPrice = itemPromo.promoPrice
        }
      }

      if (finalPromoPrice === null && status.superPromo?.isActive && product.category === "batata") {
        finalPromoPrice = status.superPromo.price
      }

      if (finalPromoPrice === null && status.isPromoActive) {
        const specificPromo = status.promoProducts?.find((p) => p.productId === product.id)
        if (specificPromo) {
          finalPromoPrice = specificPromo.promoPrice
        } else if (product.category === "batata") {
          finalPromoPrice = status.promoPrice ?? 24.99
        }
      }

      setPromoPrice(finalPromoPrice)
    }
    checkPromo()
  }, [product.id, product.category])

  // Preço de venda final (cobrança estrita no checkout)
  const currentPrice = promoPrice !== null ? promoPrice : product.price

  // Preço original informado no banco (ancoragem visual)
  const rawOriginalPrice = product.originalPrice ?? product.original_price ?? null

  // Preço original efetivo: só válido se for estritamente MAIOR que o preço de venda
  const effectiveOriginalPrice =
    promoPrice !== null && product.price > promoPrice
      ? product.price
      : rawOriginalPrice !== null && rawOriginalPrice > currentPrice
      ? rawOriginalPrice
      : null

  const hasDiscount = effectiveOriginalPrice !== null && effectiveOriginalPrice > currentPrice

  // Porcentagem de desconto (usando o salvo ou recalculado)
  const discountPercentage = hasDiscount
    ? product.discountPercentage ??
      product.discount_percentage ??
      Math.round(((effectiveOriginalPrice - currentPrice) / effectiveOriginalPrice) * 100)
    : null

  // Texto da badge opcional do card
  const customBadgeText = product.badgeText ?? product.badge_text ?? null
  const badgeLabel =
    customBadgeText ||
    (isMostRequested ? "Mais pedido" : rank === 1 ? "Nº 1 da casa" : hasDiscount ? "Promoção" : null)

  const handleAddClick = () => {
    // Intercepta ação de adicionar: exige login obrigatório antes de prosseguir
    if (!user) {
      try {
        sessionStorage.setItem(
          "batata_pending_cart_item",
          JSON.stringify({
            product: {
              id: product.id,
              name: product.name,
              price: currentPrice,
              image: product.image,
              quantity: 1,
              category: product.category === "macarrao" ? "batata" : (product.category || "batata"),
              adicionais: [],
            },
          })
        )
      } catch {}
      openAuthModal()
      return
    }

    // Checkout e carrinho utilizam EXCLUSIVAMENTE o preço final de venda (currentPrice)
    if (product.category === "bebida") {
      addItem({
        id: product.id,
        name: product.name,
        price: currentPrice,
        image: product.image,
        quantity: 1,
        category: "bebida",
        adicionais: [],
      })
      appToast.success(
        "Adicionado ao carrinho!",
        `${product.name} foi adicionado ao seu carrinho.`
      )
    } else {
      setDialogOpen(true)
    }
  }

  const getImageUrl = () => {
    if (!product.image) return ""
    if (product.image.startsWith("http")) return product.image
    if (product.image.startsWith("/")) return product.image
    return `/${product.image}`
  }

  const imageUrl = imageError ? "" : getImageUrl()

  const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`

  // =========================================================================
  // LAYOUT HORIZONTAL (Item de Lista com foto à direita - Estilo Promoções iFood)
  // =========================================================================
  if (layout === "horizontal") {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={handleAddClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleAddClick()
            }
          }}
          aria-label={`Ver detalhes e adicionar ${product.name} ao pedido`}
          className={`bg-white rounded-2xl p-3.5 sm:p-4 border border-[#ECE7E0] hover:border-[#E3A008]/60 transition-all duration-200 cursor-pointer group flex items-stretch justify-between gap-3 sm:gap-4 shadow-2xs hover:shadow-md ${className}`}
        >
          {/* Lado Esquerdo: Textos, Badges e Preços */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              {/* Badges superiores (Tag de Destaque / Mais Pedido) */}
              {badgeLabel && (
                <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3] text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                    {badgeLabel === "Mais pedido" || rank === 1 ? (
                      <Flame className="w-2.5 h-2.5 text-[#E3A008] fill-[#E3A008]" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-[#E3A008]" />
                    )}
                    {badgeLabel}
                  </span>
                </div>
              )}

              <h3 className="font-bold text-sm sm:text-base text-[#1F1B16] leading-snug line-clamp-1 group-hover:text-[#C1440E] transition-colors">
                {product.name}
              </h3>

              <p className="text-[11px] sm:text-xs text-[#6B6157] line-clamp-2 leading-relaxed mt-1">
                {product.description}
              </p>
            </div>

            {/* Bloco de Preço com Ancoragem Psicológica e Badge Verde */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {hasDiscount && (
                <span className="text-xs sm:text-sm text-[#9C9188] line-through font-medium">
                  {formatBRL(effectiveOriginalPrice)}
                </span>
              )}

              <span className="text-sm sm:text-base font-extrabold text-[#1F1B16]">
                {formatBRL(currentPrice)}
              </span>

              {hasDiscount && discountPercentage && discountPercentage > 0 && (
                <span className="inline-flex items-center bg-[#008941] text-white text-[10px] sm:text-[11px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                  -{discountPercentage}%
                </span>
              )}
            </div>
          </div>

          {/* Lado Direito: Imagem Padronizada com Botão de Adição Rápida */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#F7F4EF] shrink-0 self-center">
            {imageUrl ? (
              <>
                {!imageLoaded && !imageError && (
                  <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
                )}
                <img
                  src={imageUrl}
                  alt={product.name}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                    !imageLoaded ? "opacity-0" : "opacity-100 transition-opacity duration-300"
                  }`}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
                Batata Top
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleAddClick()
              }}
              aria-label={`Adicionar ${product.name}`}
              className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full bg-[#E3A008] text-white flex items-center justify-center shadow-md hover:bg-[#C1440E] transition-transform active:scale-90"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        <AddToCartDialog
          product={{
            ...product,
            price: currentPrice,
            adicionais: product.adicionais || [],
            category: product.category || "batata",
          } as any}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </>
    )
  }

  // =========================================================================
  // LAYOUT VERTICAL (Card Padrão / Destaques em Carrossel e Grid)
  // =========================================================================
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleAddClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleAddClick()
          }
        }}
        aria-label={`Ver detalhes e adicionar ${product.name} ao pedido`}
        className={`bg-white rounded-2xl overflow-hidden border border-[#ECE7E0] hover:border-[#E3A008]/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-md ${className}`}
      >
        <div>
          {/* Imagem do Produto com Aspect Ratio 16/10 Padronizado */}
          <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F4EF]">
            {imageUrl ? (
              <>
                {!imageLoaded && !imageError && (
                  <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
                )}
                <img
                  src={imageUrl}
                  alt={product.name}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={`w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 ${
                    !imageLoaded ? "opacity-0" : "opacity-100 transition-opacity duration-300"
                  }`}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300 text-sm">
                Batata Top
              </div>
            )}

            {/* Tag Superior Esquerda: Destaque / Ranking / Mais Pedido */}
            {badgeLabel && (
              <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-[#FEF8EC]/95 backdrop-blur-xs text-[#8A6100] border border-[#FCE8C3] text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                  {badgeLabel === "Mais pedido" || rank === 1 ? (
                    <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#E3A008] fill-[#E3A008]" />
                  ) : (
                    <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#E3A008]" />
                  )}
                  {badgeLabel}
                </span>
              </div>
            )}

            {/* Badge de Desconto no Canto Superior Direito (se houver) */}
            {hasDiscount && discountPercentage && discountPercentage > 0 && (
              <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 pointer-events-none">
                <span className="inline-flex items-center gap-0.5 bg-[#008941] text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                  -{discountPercentage}%
                </span>
              </div>
            )}
          </div>

          {/* Conteúdo do Card */}
          <div className="p-3 sm:p-4">
            <h3 className="font-bold text-xs sm:text-base text-[#1F1B16] mb-1 line-clamp-1 leading-snug group-hover:text-[#C1440E] transition-colors">
              {product.name}
            </h3>

            <p className="text-[11px] sm:text-xs text-[#6B6157] line-clamp-2 leading-tight sm:leading-relaxed mb-2 sm:mb-3">
              {product.description}
            </p>
          </div>
        </div>

        {/* Rodapé: Preço com Ancoragem Psicológica e Botão Adicionar */}
        <div className="p-3 sm:p-4 pt-2.5 sm:pt-3 flex items-center justify-between gap-1 sm:gap-2 border-t border-[#ECE7E0]/70 mt-auto">
          <div className="min-w-0">
            {/* Preço Anterior Riscado em Cinza */}
            {hasDiscount && (
              <div className="text-[10px] sm:text-xs text-[#9C9188] line-through font-medium leading-none mb-1 truncate">
                {formatBRL(effectiveOriginalPrice)}
              </div>
            )}

            {/* Preço Atual em Destaque e Negrito */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-base font-extrabold text-[#1F1B16] truncate">
                {formatBRL(currentPrice)}
              </span>

              {hasDiscount && discountPercentage && discountPercentage > 0 && (
                <span className="inline-flex sm:hidden items-center bg-[#008941] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  -{discountPercentage}%
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleAddClick()
            }}
            aria-label={`Adicionar ${product.name} ao pedido`}
            className="shrink-0 h-7 w-7 sm:h-8 sm:w-auto sm:px-3 rounded-full sm:rounded-lg bg-[#E3A008] text-white sm:bg-[#FEF8EC] sm:border sm:border-[#E3A008] sm:text-[#A16207] hover:bg-[#E3A008] hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>

      <AddToCartDialog
        product={{
          ...product,
          price: currentPrice,
          adicionais: product.adicionais || [],
          category: product.category || "batata",
        } as any}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
