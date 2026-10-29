"use client"

import { useState, useEffect } from "react"
import { Plus, Tag, Flame } from "lucide-react"
import { AddToCartDialog } from "@/components/add-to-cart-dialog"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { storeStatusManager } from "@/lib/store-status-manager"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
}

interface ProductCardProps {
  product: Product
  rank?: 1 | 2 | 3 | null
  isMostRequested?: boolean
}

export function ProductCard({ product, rank = null, isMostRequested = false }: ProductCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isPromoActive, setIsPromoActive] = useState(false)
  const [promoPrice, setPromoPrice] = useState<number | null>(null)
  const { addItem } = useCart()
  const { toast } = useToast()

  useEffect(() => {
    const checkPromo = async () => {
      const status = await storeStatusManager.getStatus()
      setIsPromoActive(status.isPromoActive ?? false)
      
      let finalPromoPrice: number | null = null
      
      if (status.itemPromo?.isActive) {
        const itemPromo = status.promoProducts?.find(p => p.productId === product.id)
        if (itemPromo) {
          finalPromoPrice = itemPromo.promoPrice
        }
      }
      
      if (finalPromoPrice === null && status.superPromo?.isActive && product.category === "batata") {
        finalPromoPrice = status.superPromo.price
      }
      
      if (finalPromoPrice === null && status.isPromoActive) {
        const specificPromo = status.promoProducts?.find(p => p.productId === product.id)
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

  const currentPrice = promoPrice !== null ? promoPrice : product.price
  const hasDiscount = promoPrice !== null && product.price > promoPrice

  const handleAddClick = () => {
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
      toast({
        title: "Adicionado ao carrinho!",
        description: `${product.name} foi adicionado ao seu carrinho.`,
      })
      
      if (window.location.pathname === "/") {
        window.location.href = "/cardapio"
      }
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

  return (
    <>
      <div 
        onClick={handleAddClick}
        className="bg-white rounded-2xl overflow-hidden border border-[#ECE7E0] hover:border-[#E3A008]/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-sm"
      >
        <div>
          {/* Imagem do Produto com Aspect Ratio Limpo */}
          <div className="relative aspect-[16/10] overflow-hidden bg-[#F7F4EF]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300 text-sm">
                Batata Top
              </div>
            )}
            
            {/* Tag Discreta de Ranking / Mais Pedido (Estilo iFood) */}
            {rank === 1 && (
              <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5">
                <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3] text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                  <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#E3A008] fill-[#E3A008]" />
                  Nº 1
                </span>
              </div>
            )}

            {/* Tag de Oferta / Promoção */}
            {hasDiscount && (
              <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5">
                <span className="inline-flex items-center gap-0.5 sm:gap-1 bg-[#C1440E] text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs">
                  <Tag className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-current" />
                  PROMO
                </span>
              </div>
            )}
          </div>

          {/* Conteúdo do Card */}
          <div className="p-2.5 sm:p-4">
            <h3 className="font-bold text-xs sm:text-base text-[#1F1B16] mb-1 line-clamp-1 leading-snug group-hover:text-[#C1440E] transition-colors">
              {product.name}
            </h3>

            <p className="text-[11px] sm:text-xs text-[#6B6157] line-clamp-2 leading-tight sm:leading-relaxed mb-2 sm:mb-3">
              {product.description}
            </p>
          </div>
        </div>

        {/* Rodapé: Preço e Botão Adicionar */}
        <div className="p-2.5 sm:p-4 pt-0 flex items-center justify-between gap-1 sm:gap-2 border-t border-[#ECE7E0]/60 mt-1">
          <div className="min-w-0">
            {hasDiscount && (
              <div className="text-[9px] sm:text-[10px] text-[#9C9188] line-through font-semibold leading-none mb-0.5 truncate">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </div>
            )}
            <div className={`text-xs sm:text-base font-extrabold truncate ${hasDiscount ? 'text-[#C1440E]' : 'text-[#1F1B16]'}`}>
              R$ {currentPrice.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <button
            type="button"
            className="shrink-0 h-7 w-7 sm:h-8 sm:w-auto sm:px-3 rounded-full sm:rounded-lg bg-[#E3A008] text-white sm:bg-[#FEF8EC] sm:border sm:border-[#E3A008] sm:text-[#A16207] hover:bg-[#E3A008] hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        </div>
      </div>

      <AddToCartDialog
        product={product}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}
