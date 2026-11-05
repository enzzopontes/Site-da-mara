"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Minus, Plus, ShoppingCart, Tag } from "lucide-react"
import { storeStatusManager } from "@/lib/store-status-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { adicionaisManager } from "@/lib/adicionais-manager"
import { productsManager } from "@/lib/products-db"
import { createBrowserClient } from "@/lib/supabase/client"

export interface Adicional {
  id: string
  name: string
  price: number
  adicional_categoria?: string | null
  available?: boolean
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category?: "batata" | "bebida" | "macarrao"
  adicionais?: Adicional[]
}

interface DrinkProduct {
  id: string
  name: string
  price: number
  image: string
  category?: string
  description?: string
}

interface AddToCartDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORY_PHRASES: Record<string, string[]> = {
  molhos: ["Que tal um molho?", "Bora escolher um molho?", "Dá um toque com molho?"],
  queijos: ["Mais queijo, por favor?", "Bora caprichar no queijo?", "Queijo nunca é demais"],
  proteinas: ["Reforça a carne?", "Mais proteína, por favor?", "Dá um up na carne?"],
  bacon: ["Bacon nunca é demais", "Bora colocar bacon?", "Dá um crocante com bacon?"],
  geral: ["Que tal um extra?", "Bora dar um upgrade?", "Escolha seu adicional"],
}

function classifyAdicional(item: Adicional): string {
  const name = (item.name || "").toLowerCase()
  if (name.includes("bacon")) return "bacon"

  if (item.adicional_categoria) {
    const raw = item.adicional_categoria.toLowerCase()
    if (raw.includes("queijo") || raw.includes("recheio")) return "queijos"
    if (raw.includes("molho") || raw.includes("creme")) return "molhos"
    if (raw.includes("proteina") || raw.includes("carne")) return "proteinas"
    if (raw.includes("bacon")) return "bacon"
    return "geral"
  }

  if (
    name.includes("frango") ||
    name.includes("carne") ||
    name.includes("alcatra") ||
    name.includes("calabresa") ||
    name.includes("costela") ||
    name.includes("camarão")
  ) {
    return "proteinas"
  }
  if (
    name.includes("catupiry") ||
    name.includes("cheddar") ||
    name.includes("mussarela") ||
    name.includes("queijo") ||
    name.includes("parmesão") ||
    name.includes("provolone") ||
    name.includes("gorgonzola")
  ) {
    return "queijos"
  }
  if (
    name.includes("molho") ||
    name.includes("maionese") ||
    name.includes("barbecue") ||
    name.includes("creme") ||
    name.includes("alho") ||
    name.includes("rosé")
  ) {
    return "molhos"
  }
  return "geral"
}

export function AddToCartDialog({ product, open, onOpenChange }: AddToCartDialogProps) {
  const [selectedAdicionais, setSelectedAdicionais] = useState<Record<string, number>>({})
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([])
  const [selectedBebidas, setSelectedBebidas] = useState<Record<string, number>>({})
  const [bebidasDisponiveis, setBebidasDisponiveis] = useState<DrinkProduct[]>([])
  const [quantity, setQuantity] = useState(1)
  const [observacoes, setObservacoes] = useState("")
  const [pastaType, setPastaType] = useState<"penne" | "parafuso" | "espaguete">("penne")
  const [isPromoActive, setIsPromoActive] = useState(false)
  const [promoPrice, setPromoPrice] = useState(24.99)
  const [dialogImageLoaded, setDialogImageLoaded] = useState(false)
  const [phraseSeed, setPhraseSeed] = useState(0)

  const { addItem } = useCart()
  const { toast } = useToast()

  const isBebida = product.category === "bebida"
  const isMacarrao = product.category === "macarrao"
  const isBatata = product.category === "batata"

  useEffect(() => {
    const checkPromo = async () => {
      try {
        const status = await storeStatusManager.getStatus()
        setIsPromoActive(status.isPromoActive ?? false)
        setPromoPrice(status.promoPrice ?? 24.99)
      } catch (err) {
        console.error("Erro ao verificar promoção:", err)
      }
    }
    checkPromo()
  }, [])

  useEffect(() => {
    if (open) {
      setSelectedAdicionais({})
      setSelectedBebidas({})
      setQuantity(1)
      setObservacoes("")
      setPastaType("penne")
      setDialogImageLoaded(false)
      setPhraseSeed(Math.floor(Math.random() * 10))

      if (product.adicionais && product.adicionais.length > 0) {
        setAdicionaisDisponiveis(product.adicionais)
      } else if (!isBebida) {
        adicionaisManager
          .getAdicionais()
          .then((data) => {
            if (data && data.length > 0) {
              setAdicionaisDisponiveis(data as Adicional[])
            }
          })
          .catch((err) => console.error("Erro ao carregar adicionais:", err))
      }

      if (!isBebida) {
        const fetchDrinks = async () => {
          try {
            const supabase = createBrowserClient()
            const { data, error } = await supabase
              .from("products")
              .select("id, name, price, image_url, category, available")
              .ilike("category", "bebida%")
              .eq("available", true)
              .order("name")

            if (!error && data && data.length > 0) {
              setBebidasDisponiveis(
                data.map((b: any) => ({
                  id: b.id,
                  name: b.name,
                  price: Number(b.price),
                  image: b.image_url || "/products/coca-cola-lata.jpg",
                  category: "bebida",
                }))
              )
              return
            }
          } catch (err) {
            console.warn("Falha ao buscar bebidas via Supabase client, tentando fallback:", err)
          }

          try {
            const fallbackDrinks = await productsManager.getBebidas()
            if (fallbackDrinks && fallbackDrinks.length > 0) {
              setBebidasDisponiveis(
                fallbackDrinks.map((b) => ({
                  id: b.id,
                  name: b.name,
                  price: b.price,
                  image: b.image || "/products/coca-cola-lata.jpg",
                  category: "bebida",
                }))
              )
            }
          } catch (err) {
            console.error("Erro ao carregar bebidas no fallback:", err)
          }
        }

        fetchDrinks()
      }
    }
  }, [open, product.id, product.adicionais, isBebida])

  const basePrice = isPromoActive && isBatata ? promoPrice : product.price

  const updateAdicionalQuantity = (id: string, delta: number) => {
    setSelectedAdicionais((prev) => {
      const currentQty = prev[id] || 0
      const newQty = Math.max(0, Math.min(10, currentQty + delta))

      if (newQty === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }

      return { ...prev, [id]: newQty }
    })
  }

  const updateBebidaQuantity = (id: string, delta: number) => {
    setSelectedBebidas((prev) => {
      const currentQty = prev[id] || 0
      const newQty = Math.max(0, Math.min(10, currentQty + delta))

      if (newQty === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }

      return { ...prev, [id]: newQty }
    })
  }

  const groupedAdicionais = useMemo(() => {
    const groups: Record<string, Adicional[]> = {
      queijos: [],
      proteinas: [],
      bacon: [],
      molhos: [],
      geral: [],
    }

    adicionaisDisponiveis.forEach((item) => {
      const categoryKey = classifyAdicional(item)
      if (!groups[categoryKey]) {
        groups[categoryKey] = []
      }
      groups[categoryKey].push(item)
    })

    return groups
  }, [adicionaisDisponiveis])

  const activeCategories = useMemo(() => {
    const defaultOrder = ["queijos", "proteinas", "bacon", "molhos", "geral"]
    const present = defaultOrder.filter((cat) => groupedAdicionais[cat]?.length > 0)

    Object.keys(groupedAdicionais).forEach((cat) => {
      if (!present.includes(cat) && groupedAdicionais[cat]?.length > 0) {
        present.push(cat)
      }
    })

    return present
  }, [groupedAdicionais])

  const calculateTotal = useMemo(() => {
    const adicionaisTotal = Object.entries(selectedAdicionais).reduce((sum, [id, qty]) => {
      const adicional = adicionaisDisponiveis.find((a) => a.id === id)
      return sum + (adicional?.price || 0) * qty
    }, 0)

    const bebidasTotal = Object.entries(selectedBebidas).reduce((sum, [id, qty]) => {
      const bebida = bebidasDisponiveis.find((b) => b.id === id)
      return sum + (bebida?.price || 0) * qty
    }, 0)

    return (basePrice + adicionaisTotal) * quantity + bebidasTotal
  }, [selectedAdicionais, adicionaisDisponiveis, selectedBebidas, bebidasDisponiveis, basePrice, quantity])

  const handleAddToCart = () => {
    const adicionais = isBebida
      ? []
      : Object.entries(selectedAdicionais)
          .map(([id, qty]) => {
            const adicional = adicionaisDisponiveis.find((a) => a.id === id)
            if (!adicional || qty <= 0) return null
            return {
              id: adicional.id,
              name: adicional.name,
              price: adicional.price,
              quantity: qty,
            }
          })
          .filter(Boolean) as Array<{ id: string; name: string; price: number; quantity: number }>

    addItem({
      id: product.id,
      name: product.name,
      price: basePrice,
      image: product.image,
      quantity: quantity,
      category: product.category === "macarrao" ? "batata" : (product.category || "batata"),
      pastaType: isMacarrao ? pastaType : undefined,
      adicionais,
    })

    if (!isBebida) {
      Object.entries(selectedBebidas).forEach(([bebidaId, qty]) => {
        if (qty > 0) {
          const bebida = bebidasDisponiveis.find((b) => b.id === bebidaId)
          if (bebida) {
            addItem({
              id: bebida.id,
              name: bebida.name,
              price: bebida.price,
              image: bebida.image,
              quantity: qty,
              category: "bebida",
              adicionais: [],
            })
          }
        }
      })
    }

    const pastaTypeText = isMacarrao ? ` (${pastaType})` : ""
    const totalBebidasCount = Object.values(selectedBebidas).reduce((a, b) => a + b, 0)
    const bebidasExtraText =
      totalBebidasCount > 0 ? ` (+${totalBebidasCount} bebida${totalBebidasCount > 1 ? "s" : ""})` : ""

    toast({
      title: "Adicionado ao carrinho!",
      description: `${quantity}x ${product.name}${pastaTypeText}${bebidasExtraText} adicionado ao seu carrinho.`,
      duration: 2500,
    })

    onOpenChange(false)

    if (typeof window !== "undefined" && window.location.pathname === "/") {
      window.location.href = "/cardapio"
    }
  }

  const imageUrl = product.image || "/placeholder.jpg"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 right-0 bottom-0 h-full h-[100dvh] max-h-none w-full max-w-none p-0 border-none rounded-none bg-white flex flex-col overflow-hidden duration-200 translate-x-0 translate-y-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-xl sm:rounded-3xl sm:border sm:border-gray-100 sm:shadow-2xl"
      >
        {/* CORPO COM SCROLL FLUIDO */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white">
          {/* HERO IMAGE & BOTÃO VOLTAR */}
          <div className="relative h-[340px] sm:h-[380px] w-full overflow-hidden shrink-0 bg-[#F7F4EF]">
            {!dialogImageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
            )}
            <img
              src={imageUrl}
              alt={product.name}
              onLoad={() => setDialogImageLoaded(true)}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = "/placeholder.jpg"
              }}
              className={`w-full h-full object-cover ${
                !dialogImageLoaded ? "opacity-0" : "opacity-100 transition-opacity duration-300"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

            {/* BOTÃO VOLTAR FLUTUANTE */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Voltar"
              className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md shadow-md flex items-center justify-center hover:bg-white active:scale-95 transition-all text-[#1F1B16] hover:text-[#E3A008]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          {/* CONTEÚDO PRINCIPAL SOBREPONDO A FOTO */}
          <div className="relative -mt-6 rounded-t-[28px] bg-white px-4 sm:px-6 pt-5 pb-8 space-y-6 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
            {/* CABEÇALHO DO PRODUTO: NOME E PREÇO */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-[22px] font-black text-[#1F1B16] leading-tight tracking-tight">
                  {product.name}
                </DialogTitle>
                <DialogDescription className="text-[14px] text-gray-500 leading-relaxed mt-1.5 block">
                  {product.description}
                </DialogDescription>
              </div>

              <div className="text-right shrink-0 pt-0.5">
                <div
                  className={`text-[20px] font-black tracking-tight ${
                    isPromoActive && isBatata ? "text-red-600" : "text-[#E3A008]"
                  }`}
                >
                  R$ {basePrice.toFixed(2).replace(".", ",")}
                </div>
                {isPromoActive && isBatata && (
                  <div className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                    <Tag className="h-3 w-3" />
                    <span>PROMO</span>
                  </div>
                )}
              </div>
            </div>

            {/* CASO ESPECIAL: SELETOR DE MASSA (QUANDO CATEGORIA FOR MACARRÃO) */}
            {isMacarrao && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[16px] font-black text-[#1F1B16]">
                      Escolha o tipo de massa
                    </h4>
                    <p className="text-[12px] text-gray-500">Selecione uma opção</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#FEF8EC] text-[#8A6100] px-2.5 py-1 rounded-full uppercase tracking-wider">
                    OBRIGATÓRIO
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { value: "penne" as const, label: "Penne", emoji: "🍝" },
                    { value: "parafuso" as const, label: "Parafuso", emoji: "🌀" },
                    { value: "espaguete" as const, label: "Espaguete", emoji: "🍜" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPastaType(type.value)}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all ${
                        pastaType === type.value
                          ? "border-[#E3A008] bg-[#FEF8EC] shadow-xs scale-[1.02]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <span className="text-2xl mb-1.5">{type.emoji}</span>
                      <span
                        className={`text-[13px] font-bold ${
                          pastaType === type.value ? "text-[#8A6100]" : "text-gray-700"
                        }`}
                      >
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SEÇÃO DE ADICIONAIS AGRUPADOS ESTILO IFOOD */}
            {!isBebida && activeCategories.length > 0 && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[16px] font-black text-[#1F1B16]">Adicionais</h4>
                  <span className="text-[10px] font-bold bg-[#f0f0f0] text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    OPCIONAL
                  </span>
                </div>

                <div className="space-y-5">
                  {activeCategories.map((catKey, index) => {
                    const items = groupedAdicionais[catKey] || []
                    const phrases = CATEGORY_PHRASES[catKey] || CATEGORY_PHRASES.geral
                    const phrase = phrases[(phraseSeed + index) % phrases.length]

                    return (
                      <div key={catKey} className="space-y-1">
                        {/* BANNER DE CATEGORIA SANGRAMENTO HORIZONTAL */}
                        <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#F7F5F1] border-y border-gray-100 flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-[15px] text-[#1F1B16]">{phrase}</h5>
                            <p className="text-[12px] text-gray-500">Escolha até 10 opções</p>
                          </div>
                        </div>

                        {/* LISTA DE ITENS SOLTOS COM DIVISOR SUTIL */}
                        <div className="divide-y divide-gray-100">
                          {items.map((adicional) => {
                            const qty = selectedAdicionais[adicional.id] || 0
                            return (
                              <div
                                key={adicional.id}
                                className="flex items-center justify-between py-3"
                              >
                                <div className="flex-1 pr-3">
                                  <p className="text-[15px] font-semibold text-[#1F1B16]">
                                    {adicional.name}
                                  </p>
                                  <p className="text-sm font-bold text-[#E3A008] mt-0.5">
                                    + R$ {adicional.price.toFixed(2).replace(".", ",")}
                                  </p>
                                </div>

                                {/* PÍLULA DE QUANTIDADE INTERATIVA */}
                                <div>
                                  {qty === 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => updateAdicionalQuantity(adicional.id, 1)}
                                      className="w-8 h-8 rounded-full border border-[#E3A008] text-[#E3A008] hover:bg-[#FEF8EC] flex items-center justify-center transition-colors active:scale-95"
                                      aria-label={`Adicionar ${adicional.name}`}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm border border-gray-200">
                                      <button
                                        type="button"
                                        onClick={() => updateAdicionalQuantity(adicional.id, -1)}
                                        className="w-7 h-7 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                                        aria-label="Diminuir"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="font-bold text-sm text-[#1F1B16] min-w-[18px] text-center">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateAdicionalQuantity(adicional.id, 1)}
                                        className="w-7 h-7 rounded-full bg-[#E3A008] text-white hover:bg-[#C68A07] flex items-center justify-center transition-colors active:scale-95"
                                        aria-label="Aumentar"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SEÇÃO DE CROSS-SELL DE BEBIDAS */}
            {!isBebida && bebidasDisponiveis.length > 0 && (
              <div className="space-y-2 pt-1">
                {/* BANNER DE CABEÇALHO */}
                <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#F7F5F1] border-y border-gray-100">
                  <h5 className="font-bold text-[15px] text-[#1F1B16]">Bora escolher uma bebida?</h5>
                  <p className="text-[12px] text-gray-500">Escolha até 10 opções</p>
                </div>

                {/* LISTA DE BEBIDAS COM MINIATURA */}
                <div className="divide-y divide-gray-100">
                  {bebidasDisponiveis.map((bebida) => {
                    const qty = selectedBebidas[bebida.id] || 0
                    return (
                      <div
                        key={bebida.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                            <img
                              src={bebida.image}
                              alt={bebida.name}
                              className="w-12 h-12 object-contain"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = "/placeholder.jpg"
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-[#1F1B16] truncate">
                              {bebida.name}
                            </p>
                            <p className="text-sm font-bold text-[#E3A008] mt-0.5">
                              R$ {bebida.price.toFixed(2).replace(".", ",")}
                            </p>
                          </div>
                        </div>

                        {/* PÍLULA DE QUANTIDADE */}
                        <div className="shrink-0">
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => updateBebidaQuantity(bebida.id, 1)}
                              className="w-8 h-8 rounded-full border border-[#E3A008] text-[#E3A008] hover:bg-[#FEF8EC] flex items-center justify-center transition-colors active:scale-95"
                              aria-label={`Adicionar ${bebida.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm border border-gray-200">
                              <button
                                type="button"
                                onClick={() => updateBebidaQuantity(bebida.id, -1)}
                                className="w-7 h-7 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors active:scale-95"
                                aria-label="Diminuir bebida"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-sm text-[#1F1B16] min-w-[18px] text-center">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateBebidaQuantity(bebida.id, 1)}
                                className="w-7 h-7 rounded-full bg-[#E3A008] text-white hover:bg-[#C68A07] flex items-center justify-center transition-colors active:scale-95"
                                aria-label="Aumentar bebida"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CAMPO DE OBSERVAÇÕES */}
            <div className="space-y-2 pt-1">
              <h4 className="text-[16px] font-black text-[#1F1B16]">Observações</h4>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Ex: sem cebola, maionese à parte..."
                className="w-full p-4 bg-[#F7F5F1]/70 border border-gray-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E3A008] focus:border-transparent transition-all text-sm text-[#1F1B16] placeholder:text-gray-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* FOOTER FIXO PINNED COM ERGONOMIA */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 sm:px-6 pt-3.5 sm:pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-20">
          <div className="flex items-center gap-3">
            {/* SELETOR DE QUANTIDADE DO PRODUTO PRINCIPAL */}
            <div className="flex items-center gap-1.5 bg-[#F4F4F5] rounded-2xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-gray-700 hover:bg-white hover:shadow-sm active:scale-95 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:shadow-none flex items-center justify-center transition-all"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-base sm:text-lg font-black text-[#1F1B16] w-7 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-gray-700 hover:bg-white hover:shadow-sm active:scale-95 flex items-center justify-center transition-all"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* BOTÃO CTA PRINCIPAL */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-[#E3A008] hover:bg-[#C68A07] active:scale-[0.98] text-white font-black text-sm sm:text-base h-12 sm:h-13 rounded-2xl shadow-md transition-all flex items-center justify-between px-4 sm:px-5"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 shrink-0" />
                <span>Adicionar ao Pedido</span>
              </span>
              <span className="font-black text-sm sm:text-base">
                R$ {calculateTotal.toFixed(2).replace(".", ",")}
              </span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
