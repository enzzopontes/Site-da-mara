"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { X, Minus, Plus, ShoppingCart, Tag } from "lucide-react"
import type { Adicional } from "@/lib/products-db-client"
import { storeStatusManager } from "@/lib/store-status-manager"

interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
  adicionais?: Adicional[]
}

interface AddToCartDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddToCartDialog({ product, open, onOpenChange }: AddToCartDialogProps) {
  // Estado para armazenar a quantidade de cada adicional: { [adicionalId]: quantidade }
  const [selectedAdicionais, setSelectedAdicionais] = useState<Record<string, number>>({})
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([])
  const [quantity, setQuantity] = useState(1)
  const [observacoes, setObservacoes] = useState("")
  const [pastaType, setPastaType] = useState<"penne" | "parafuso" | "espaguete">("penne")
  const [isPromoActive, setIsPromoActive] = useState(false)
  const [promoPrice, setPromoPrice] = useState(24.99)

  const { addItem } = useCart()
  const { toast } = useToast()

  useEffect(() => {
    const checkPromo = async () => {
      const status = await storeStatusManager.getStatus()
      setIsPromoActive(status.isPromoActive ?? false)
      setPromoPrice(status.promoPrice ?? 24.99)
    }
    checkPromo()
  }, [])

  useEffect(() => {
    if (open) {
      setAdicionaisDisponiveis(product.adicionais || [])
      setSelectedAdicionais({})
      setQuantity(1)
      setObservacoes("")
      setPastaType("penne") // Resetar para penne ao abrir
    }
  }, [open, product.id, product.adicionais])

  const isBebida = product.category === "bebida"
  const isMacarrao = product.category === "macarrao"
  const isBatata = product.category === "batata"
  
  // O preço base já vem ajustado do ProductCard, mas garantimos aqui também
  const basePrice = (isPromoActive && isBatata) ? promoPrice : product.price

  const updateAdicionalQuantity = (id: string, delta: number) => {
    setSelectedAdicionais((prev) => {
      const currentQty = prev[id] || 0
      const newQty = Math.max(0, currentQty + delta)
      
      if (newQty === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      
      return { ...prev, [id]: newQty }
    })
  }

  const calculateTotal = useMemo(() => {
    const adicionaisTotal = Object.entries(selectedAdicionais).reduce((sum, [id, qty]) => {
      const adicional = adicionaisDisponiveis.find((a) => a.id === id)
      return sum + (adicional?.price || 0) * qty
    }, 0)
    return (basePrice + adicionaisTotal) * quantity
  }, [selectedAdicionais, adicionaisDisponiveis, basePrice, quantity])

  const handleAddToCart = () => {
    const adicionais = isBebida
      ? []
      : Object.entries(selectedAdicionais).map(([id, qty]) => {
          const adicional = adicionaisDisponiveis.find((a) => a.id === id)!
          return { 
            id: adicional.id, 
            name: adicional.name, 
            price: adicional.price,
            quantity: qty
          }
        })

    addItem({
      id: product.id,
      name: product.name,
      price: basePrice,
      image: product.image,
      quantity: quantity,
      category: product.category === "macarrao" ? "batata" : (product.category || "batata"),
      pastaType: isMacarrao ? pastaType : undefined, // Adicionar o tipo de macarrão apenas se for macarrão
      adicionais,
    })

    const pastaTypeText = isMacarrao ? ` (${pastaType})` : ""
    toast({
      title: "Adicionado ao carrinho!",
      description: `${quantity}x ${product.name}${pastaTypeText} foi adicionado ao seu carrinho.`,
      duration: 2000,
    })

    onOpenChange(false)
    
    if (window.location.pathname === "/") {
      window.location.href = "/cardapio"
    }
  }

  const imageUrl = product.image || "/placeholder.jpg"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 w-full max-w-full rounded-t-[24px] rounded-b-none border-none p-0 flex flex-col max-h-[88vh] overflow-hidden shadow-2xl duration-300 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:inset-x-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-lg sm:rounded-2xl sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95"
      >
        {/* Visual drag handle / notch bar */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        
        {/* HEADER COM IMAGEM */}
        <div className="relative h-40 sm:h-56 w-full overflow-hidden shrink-0">
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button 
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-all z-10"
          >
            <X className="h-5 w-5 text-gray-800" />
          </button>
          <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6">
            <DialogTitle className="text-xl sm:text-2xl font-black text-white drop-shadow-md">{product.name}</DialogTitle>
          </div>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5 sm:space-y-6 bg-white overscroll-contain">
          
          {/* DESCRIÇÃO E PREÇO */}
          <div className="space-y-2">
            <p className="text-gray-500 text-sm leading-relaxed">{product.description}</p>
            <div className="flex items-center gap-3">
              <div className={`text-xl font-black ${isPromoActive && isBatata ? 'text-red-600' : 'text-[#E3A008]'}`}>
                R$ {basePrice.toFixed(2).replace('.', ',')}
              </div>
              {isPromoActive && isBatata && (
                <div className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  PREÇO PROMOCIONAL
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO DE ESCOLHA DO TIPO DE MACARRÃO */}
          {isMacarrao && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-gray-800">Escolha o tipo de massa</h4>
                <span className="text-[10px] font-bold bg-[#FEF8EC] text-[#8A6100] px-2 py-1 rounded-md uppercase tracking-wider">Obrigatório</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "penne" as const, label: "Penne", emoji: "🍝" },
                  { value: "parafuso" as const, label: "Parafuso", emoji: "🌀" },
                  { value: "espaguete" as const, label: "Espaguete", emoji: "🍜" }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setPastaType(type.value)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      pastaType === type.value
                        ? "border-[#E3A008] bg-[#FEF8EC] shadow-md scale-105"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-3xl mb-2">{type.emoji}</span>
                    <span className={`text-sm font-bold ${
                      pastaType === type.value ? "text-[#8A6100]" : "text-gray-700"
                    }`}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO DE ADICIONAIS ESTILO IFOOD */}
          {!isBebida && adicionaisDisponiveis.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black text-gray-800">Adicionais</h4>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase tracking-wider">Opcional</span>
              </div>
              
              <div className="space-y-3">
                {adicionaisDisponiveis.map((adicional) => {
                  const qty = selectedAdicionais[adicional.id] || 0
                  return (
                    <div
                      key={adicional.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                        qty > 0 ? "border-[#E3A008] bg-[#FEF8EC]/50" : "border-gray-100"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{adicional.name}</p>
                        <p className="text-sm text-[#8A6100] font-bold">+ R$ {adicional.price.toFixed(2).replace('.', ',')}</p>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                        {qty > 0 ? (
                          <>
                            <button 
                              onClick={() => updateAdicionalQuantity(adicional.id, -1)}
                              aria-label="Diminuir adicional"
                              className="p-1.5 rounded-full text-[#8A6100] hover:bg-[#FEF8EC] transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="font-black text-gray-800 min-w-[20px] text-center">{qty}</span>
                          </>
                        ) : null}
                        <button 
                          onClick={() => updateAdicionalQuantity(adicional.id, 1)}
                          aria-label="Adicionar adicional"
                          className="p-1.5 rounded-full bg-[#E3A008] text-white hover:bg-[#B5860A] transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* OBSERVAÇÕES */}
          <div className="space-y-2">
            <h4 className="text-lg font-black text-gray-800">Observações</h4>
            <textarea 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Ex: Sem cebola, tirar o milho, etc."
              className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#E3A008] transition-all text-sm text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* FOOTER FIXO PINNED COM ERGONOMIA DE POLEGAR */}
        <div className="p-3.5 sm:p-5 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.06)] shrink-0 pb-6 sm:pb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl p-1 shrink-0">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="p-2 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm active:scale-95 transition-all"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="text-base sm:text-lg font-black text-gray-800 w-6 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="p-2 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm active:scale-95 transition-all"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <Button
              className="flex-1 bg-[#E3A008] hover:bg-[#B5860A] text-white font-black text-sm sm:text-base h-12 sm:h-13 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-between px-4 sm:px-5"
              onClick={handleAddToCart}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Adicionar ao Pedido</span>
              </span>
              <span>• R$ {calculateTotal.toFixed(2).replace('.', ',')}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
