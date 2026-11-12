"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { appToast } from "@/lib/app-toast"
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

// Frases fixas idênticas ao aplicativo mobile (5 variações cada com sorteio/rodízio a cada abertura)
const FRASES_CATEGORIA: Record<string, string[]> = {
  molho: ["Que tal um molho?", "Bora escolher um molho?", "Um molhinho especial?", "Qual molho vai ser?", "Dá um toque com molho?"],
  molhos: ["Que tal um molho?", "Bora escolher um molho?", "Um molhinho especial?", "Qual molho vai ser?", "Dá um toque com molho?"],
  bebida: ["Bora escolher uma bebida?", "Vai querer algo pra beber?", "Que tal matar a sede?", "Escolha sua bebida", "Falta a bebida, hein?"],
  bebidas: ["Bora escolher uma bebida?", "Vai querer algo pra beber?", "Que tal matar a sede?", "Escolha sua bebida", "Falta a bebida, hein?"],
  borda: ["Vamos turbinar a borda?", "Que tal recheiar a borda?", "Borda recheada, bora?", "Dá um up na borda?", "Escolha sua borda"],
  bordas: ["Vamos turbinar a borda?", "Que tal recheiar a borda?", "Borda recheada, bora?", "Dá um up na borda?", "Escolha sua borda"],
  sabor: ["Qual vai ser o sabor?", "Escolha o seu sabor", "Bora escolher o sabor?", "Qual sabor você quer?", "Hora de escolher o sabor"],
  sabores: ["Qual vai ser o sabor?", "Escolha o seu sabor", "Bora escolher o sabor?", "Qual sabor você quer?", "Hora de escolher o sabor"],
  extra: ["Vai querer um extra?", "Bora caprichar com um extra?", "Que tal um extra?", "Dá um upgrade extra?", "Adiciona um extra?"],
  extras: ["Vai querer um extra?", "Bora caprichar com um extra?", "Que tal um extra?", "Dá um upgrade extra?", "Adiciona um extra?"],
  adicional: ["Bora dar um upgrade?", "Que tal turbinar o pedido?", "Vai querer adicionar algo?", "Capricha no pedido?", "Adiciona um extra especial?"],
  adicionais: ["Bora dar um upgrade?", "Que tal turbinar o pedido?", "Vai querer adicionar algo?", "Capricha no pedido?", "Adiciona um extra especial?"],
  queijo: ["Mais queijo, por favor?", "Bora caprichar no queijo?", "Um queijo a mais?", "Reforça o queijo?", "Queijo nunca é demais"],
  queijos: ["Mais queijo, por favor?", "Bora caprichar no queijo?", "Um queijo a mais?", "Reforça o queijo?", "Queijo nunca é demais"],
  carne: ["Reforça a carne?", "Bora turbinar a carne?", "Mais carne, por favor?", "Dá um up na carne?", "Capricha na carne?"],
  carnes: ["Reforça a carne?", "Bora turbinar a carne?", "Mais carne, por favor?", "Dá um up na carne?", "Capricha na carne?"],
  bacon: ["Bacon nunca é demais", "Bora colocar bacon?", "Um bacon a mais?", "Que tal reforçar com bacon?", "Dá um crocante com bacon?"],
  acompanhamento: ["Que tal um acompanhamento?", "Falta um acompanhamento", "Vai querer acompanhar com algo?", "Escolha seu acompanhamento", "Bora completar o pedido?"],
  acompanhamentos: ["Que tal um acompanhamento?", "Falta um acompanhamento", "Vai querer acompanhar com algo?", "Escolha seu acompanhamento", "Bora completar o pedido?"],
  cobertura: ["Escolha sua cobertura", "Que tal uma cobertura?", "Bora escolher a cobertura?", "Vai de qual cobertura?", "Capricha na cobertura?"],
  coberturas: ["Escolha sua cobertura", "Que tal uma cobertura?", "Bora escolher a cobertura?", "Vai de qual cobertura?", "Capricha na cobertura?"],
  recheio: ["Qual recheio hoje?", "Escolha o recheio", "Bora escolher o recheio?", "Vai de qual recheio?", "Que tal um recheio especial?"],
  recheios: ["Qual recheio hoje?", "Escolha o recheio", "Bora escolher o recheio?", "Vai de qual recheio?", "Que tal um recheio especial?"],
  proteina: ["Quer reforçar a proteína?", "Bora turbinar a proteína?", "Mais proteína, por favor?", "Dá um up na proteína?", "Capricha na proteína?"],
  proteinas: ["Quer reforçar a proteína?", "Bora turbinar a proteína?", "Mais proteína, por favor?", "Dá um up na proteína?", "Capricha na proteína?"],
  doce: ["Um docinho pra fechar?", "Que tal uma sobremesa?", "Bora fechar com um doce?", "Falta um docinho", "Vai de sobremesa?"],
  doces: ["Um docinho pra fechar?", "Que tal uma sobremesa?", "Bora fechar com um doce?", "Falta um docinho", "Vai de sobremesa?"],
  sobremesa: ["Um docinho pra fechar?", "Que tal uma sobremesa?", "Bora fechar com um doce?", "Falta um docinho", "Vai de sobremesa?"],
  sobremesas: ["Um docinho pra fechar?", "Que tal uma sobremesa?", "Bora fechar com um doce?", "Falta um docinho", "Vai de sobremesa?"],
}

// Frases genéricas de fallback (5 templates)
const FRASES_GENERICAS = [
  (cat: string) => `Que tal um ${cat.toLowerCase()}?`,
  (cat: string) => `Bora incrementar com ${cat.toLowerCase()}?`,
  (cat: string) => `Dá um up com ${cat.toLowerCase()}`,
  (cat: string) => `Escolha seu ${cat.toLowerCase()}`,
  (cat: string) => `Vai de ${cat.toLowerCase()}?`,
]

const FALLBACK_BEBIDAS: DrinkProduct[] = [
  {
    id: "beb-1",
    name: "Coca-Cola 200ml",
    price: 3.5,
    image: "/products/coca-cola-200ml.png",
    category: "bebida",
    description: "Refrigerante Coca-Cola 200ml gelado",
  },
  {
    id: "beb-2",
    name: "Coca-Cola Lata 350ml",
    price: 5.0,
    image: "/products/coca-cola-lata.png",
    category: "bebida",
    description: "Refrigerante Coca-Cola lata gelada",
  },
  {
    id: "beb-3",
    name: "Coca-Cola Lata Zero 350ml",
    price: 5.0,
    image: "/products/coca-cola-lata-zero.png",
    category: "bebida",
    description: "Refrigerante Coca-Cola Zero lata gelada",
  },
  {
    id: "beb-4",
    name: "Fanta 2L",
    price: 12.0,
    image: "/products/fanta-2l.png",
    category: "bebida",
    description: "Refrigerante Fanta 2 litros gelado",
  },
  {
    id: "beb-5",
    name: "Coca-Cola 2L",
    price: 12.0,
    image: "/products/coca-cola-2l.png",
    category: "bebida",
    description: "Refrigerante Coca-Cola 2 litros gelado",
  },
]

function getDrinkImage(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("zero")) return "/products/coca-cola-lata-zero.png"
  if (lower.includes("lata")) return "/products/coca-cola-lata.png"
  if (lower.includes("200ml")) return "/products/coca-cola-200ml.png"
  if (lower.includes("fanta")) return "/products/fanta-2l.png"
  if (lower.includes("2l")) return "/products/coca-cola-2l.png"
  return "/products/coca-cola-lata.png"
}

function classifyAdicional(item: Adicional): string {
  const name = (item.name || "").toLowerCase()
  if (name.includes("bacon")) return "bacon"

  if (item.adicional_categoria) {
    const raw = item.adicional_categoria.toLowerCase().trim()
    if (raw.includes("queijo") || raw.includes("recheio")) return "queijos"
    if (raw.includes("molho") || raw.includes("creme")) return "molhos"
    if (raw.includes("proteina") || raw.includes("carne")) return "proteinas"
    if (raw.includes("bacon")) return "bacon"
    return raw
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
  const [bebidasDisponiveis, setBebidasDisponiveis] = useState<DrinkProduct[]>(FALLBACK_BEBIDAS)
  const [quantity, setQuantity] = useState(1)
  const [observacoes, setObservacoes] = useState("")
  const [pastaType, setPastaType] = useState<"penne" | "parafuso" | "espaguete">("penne")
  const [isPromoActive, setIsPromoActive] = useState(false)
  const [promoPrice, setPromoPrice] = useState(24.99)
  const [dialogImageLoaded, setDialogImageLoaded] = useState(false)

  // Mapas de frases sorteadas a cada abertura da tela
  const [fraseIndices, setFraseIndices] = useState<Record<string, number>>({})
  const [fraseBebidaIndex, setFraseBebidaIndex] = useState(0)

  const { addItem } = useCart()
  const { user, openAuthModal } = useAuth()


  const isBebida =
    product.category === "bebida" ||
    (product.category as string) === "bebidas" ||
    product.name.toLowerCase().includes("coca-cola") ||
    product.name.toLowerCase().includes("fanta")

  const isMacarrao = product.category === "macarrao"
  const isBatata = product.category === "batata" || !product.category

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

      // Sorteia 1 das 5 frases para a seção de bebidas
      setFraseBebidaIndex(Math.floor(Math.random() * 5))

      // Sorteia aleatoriamente novas frases para cada categoria de adicionais
      const randomMap: Record<string, number> = {
        molho: Math.floor(Math.random() * 5),
        molhos: Math.floor(Math.random() * 5),
        queijo: Math.floor(Math.random() * 5),
        queijos: Math.floor(Math.random() * 5),
        carne: Math.floor(Math.random() * 5),
        carnes: Math.floor(Math.random() * 5),
        proteina: Math.floor(Math.random() * 5),
        proteinas: Math.floor(Math.random() * 5),
        bacon: Math.floor(Math.random() * 5),
        geral: Math.floor(Math.random() * 5),
        adicionais: Math.floor(Math.random() * 5),
        extra: Math.floor(Math.random() * 5),
      }
      setFraseIndices(randomMap)

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
              .or("category.eq.bebida,category.eq.bebidas,category.ilike.bebida%")
              .order("name")

            if (!error && data && data.length > 0) {
              const activeDrinks = data.filter((b: any) => b.available !== false)
              if (activeDrinks.length > 0) {
                setBebidasDisponiveis(
                  activeDrinks.map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    price: Number(b.price),
                    image: b.image_url ? b.image_url.replace(".jpg", ".png") : getDrinkImage(b.name),
                    category: "bebida",
                  }))
                )
                return
              }
            }
          } catch (err) {
            console.warn("Falha ao buscar bebidas via Supabase client:", err)
          }

          try {
            const fallbackDrinks = await productsManager.getBebidas()
            if (fallbackDrinks && fallbackDrinks.length > 0) {
              setBebidasDisponiveis(
                fallbackDrinks.map((b) => ({
                  id: b.id,
                  name: b.name,
                  price: b.price,
                  image: b.image ? b.image.replace(".jpg", ".png") : getDrinkImage(b.name),
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

  // Gerador de frase humanizada no padrão exato do aplicativo
  const getFraseCategoria = (categoriaKey: string) => {
    const chave = categoriaKey.trim().toLowerCase()
    const idx = fraseIndices[chave] ?? Math.floor(Math.random() * 5)
    if (FRASES_CATEGORIA[chave]) {
      const lista = FRASES_CATEGORIA[chave]
      return lista[idx % lista.length]
    }
    return FRASES_GENERICAS[idx % FRASES_GENERICAS.length](categoriaKey)
  }

  const fraseBebida = FRASES_CATEGORIA.bebidas[fraseBebidaIndex % FRASES_CATEGORIA.bebidas.length]

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
    // Intercepta ação de adicionar: exige login obrigatório antes de prosseguir
    if (!user) {
      const adicionaisPayload = isBebida
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

      const bebidasPayload = !isBebida
        ? Object.entries(selectedBebidas)
            .map(([bebidaId, qty]) => {
              if (qty <= 0) return null
              const bebida = bebidasDisponiveis.find((b) => b.id === bebidaId)
              if (!bebida) return null
              return {
                id: bebida.id,
                name: bebida.name,
                price: bebida.price,
                image: bebida.image,
                quantity: qty,
                category: "bebida",
                adicionais: [],
              }
            })
            .filter(Boolean)
        : []

      try {
        sessionStorage.setItem(
          "batata_pending_cart_item",
          JSON.stringify({
            product: {
              id: product.id,
              name: product.name,
              price: basePrice,
              image: product.image,
              quantity: quantity,
              category: product.category === "macarrao" ? "batata" : (product.category || "batata"),
              pastaType: isMacarrao ? pastaType : undefined,
              adicionais: adicionaisPayload,
            },
            bebidas: bebidasPayload,
          })
        )
      } catch {}

      onOpenChange(false)
      openAuthModal()
      return
    }

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

    appToast.success(
      "Adicionado ao carrinho!",
      `${quantity}x ${product.name}${pastaTypeText}${bebidasExtraText} adicionado ao seu carrinho.`
    )

    onOpenChange(false)
  }

  const imageUrl = product.image || "/placeholder.jpg"

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        showCloseButton={false}
        showHandle={true}
        className="p-0 border-none sm:border sm:border-gray-100 bg-white flex flex-col overflow-hidden sm:max-w-xl sm:rounded-3xl rounded-t-[28px] max-h-[92vh]"
      >
        {/* CORPO COM SCROLL FLUIDO (SEM BARRA DE ROLAGEM VISÍVEL) */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-white no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                <ResponsiveModalTitle className="text-[22px] font-black text-[#1F1B16] leading-tight tracking-tight">
                  {product.name}
                </ResponsiveModalTitle>
                <ResponsiveModalDescription className="text-[14px] text-gray-500 leading-relaxed mt-1.5 block">
                  {product.description}
                </ResponsiveModalDescription>
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

            {/* SEÇÃO DE ADICIONAIS AGRUPADOS ESTILO IFOOD (COM FRASES EM RODÍZIO IDÊNTICAS AO APP) */}
            {!isBebida && activeCategories.length > 0 && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[16px] font-black text-[#1F1B16]">Adicionais</h4>
                  <span className="text-[10px] font-bold bg-[#f0f0f0] text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    OPCIONAL
                  </span>
                </div>

                <div className="space-y-5">
                  {activeCategories.map((catKey) => {
                    const items = groupedAdicionais[catKey] || []
                    const phrase = getFraseCategoria(catKey)

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

            {/* SEÇÃO DE CROSS-SELL DE BEBIDAS (EMBAIXO DOS ADICIONAIS COM RODÍZIO DE FRASES) */}
            {!isBebida && (
              <div className="space-y-2 pt-1">
                {/* BANNER DE CABEÇALHO */}
                <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#F7F5F1] border-y border-gray-100">
                  <h5 className="font-bold text-[15px] text-[#1F1B16]">{fraseBebida}</h5>
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
                data-vaul-no-drag
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
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
