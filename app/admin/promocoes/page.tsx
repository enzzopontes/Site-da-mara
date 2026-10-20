"use client"

import { useEffect, useState, useMemo } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, Megaphone, Zap, Tag, Image as ImageIcon, Save, AlertCircle, 
  Trash2, Plus, Sparkles, CheckCircle2, Sliders, ExternalLink, RefreshCw, 
  Search, Eye, Percent, Check, X, Flame, ShoppingBag
} from "lucide-react"
import { storeStatusManager } from "@/lib/store-status-manager"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { productsManager, Product } from "@/lib/products-db"
import { imageUploadManager, UploadedImage } from "@/lib/image-upload-manager"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

interface PromoProduct {
  productId: string
  productName: string
  promoPrice: number
}

interface SuperPromo {
  isActive: boolean
  price: number
  imageId?: string
  imageUrl?: string
  useUrl?: boolean
}

interface ItemPromo {
  isActive: boolean
  imageId?: string
  imageUrl?: string
  useUrl?: boolean
}

export default function AdminPromocoesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [promoProducts, setPromoProducts] = useState<PromoProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [isUpdatingPromo, setIsUpdatingPromo] = useState(false)
  
  // Super Promoção (todos os preços)
  const [superPromo, setSuperPromo] = useState<SuperPromo>({
    isActive: false,
    price: 26.00,
    imageId: undefined,
    imageUrl: undefined,
    useUrl: false
  })
  
  // Promoção de itens específicos
  const [itemPromo, setItemPromo] = useState<ItemPromo>({
    isActive: false,
    imageId: undefined,
    imageUrl: undefined,
    useUrl: false
  })
  
  // Imagens disponíveis
  const [promoImages, setPromoImages] = useState<UploadedImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modais de Configuração no padrão iFood Marketing
  const [isSuperPromoModalOpen, setIsSuperPromoModalOpen] = useState(false)
  const [isItemPromoModalOpen, setIsItemPromoModalOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"todos" | "batata" | "macarrao">("todos")

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadPromoStatus()
        loadProducts()
        loadImages()
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    }
  }, [user, loading, router])

  const loadProducts = async () => {
    try {
      setLoadingProducts(true)
      const products = await productsManager.getProducts()
      setAllProducts(products)
      
      const status = await storeStatusManager.getStatus()
      if (status.promoProducts) {
        setPromoProducts(status.promoProducts)
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadImages = async () => {
    try {
      setLoadingImages(true)
      const images = await imageUploadManager.getImagesByCategory("promo")
      setPromoImages(images)
    } catch (error) {
      console.error("Erro ao carregar imagens:", error)
    } finally {
      setLoadingImages(false)
    }
  }

  const loadPromoStatus = async () => {
    try {
      const status = await storeStatusManager.getStatus()
      if (status.superPromo) {
        setSuperPromo({
          ...status.superPromo,
          useUrl: status.superPromo.useUrl ?? false
        })
      }
      if (status.itemPromo) {
        setItemPromo({
          ...status.itemPromo,
          useUrl: status.itemPromo.useUrl ?? false
        })
      }
    } catch (error) {
      console.error("Erro ao carregar status de promoção:", error)
    }
  }

  const showNotification = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleToggleSuperPromo = async () => {
    const newSuperPromo = { ...superPromo, isActive: !superPromo.isActive }
    setSuperPromo(newSuperPromo)
    
    setIsUpdatingPromo(true)
    try {
      await storeStatusManager.updateSuperPromo(newSuperPromo)
      showNotification(newSuperPromo.isActive ? "Super Promoção ativada na loja!" : "Super Promoção desativada.")
    } catch (error) {
      console.error("Erro ao atualizar Super Promoção:", error)
      alert("Erro ao atualizar Super Promoção")
    } finally {
      setIsUpdatingPromo(false)
    }
  }

  const handleToggleItemPromo = async () => {
    if (!itemPromo.isActive && promoProducts.length === 0) {
      setIsItemPromoModalOpen(true)
      return
    }

    const newItemPromo = { ...itemPromo, isActive: !itemPromo.isActive }
    setItemPromo(newItemPromo)
    
    setIsUpdatingPromo(true)
    try {
      await storeStatusManager.updateItemPromo(newItemPromo)
      await storeStatusManager.updatePromoProducts(promoProducts)
      showNotification(newItemPromo.isActive ? "Promoção de Itens ativada!" : "Promoção de Itens pausada.")
    } catch (error) {
      console.error("Erro ao atualizar Promoção de Itens:", error)
      alert("Erro ao atualizar Promoção de Itens")
    } finally {
      setIsUpdatingPromo(false)
    }
  }

  const handleSuperPromoPrice = async (newPrice: number) => {
    const newSuperPromo = { ...superPromo, price: newPrice }
    setSuperPromo(newSuperPromo)
    try {
      await storeStatusManager.updateSuperPromo(newSuperPromo)
    } catch (error) {
      console.error("Erro ao atualizar preço:", error)
    }
  }

  const handleSuperPromoImageUpload = async (imageId: string) => {
    const newSuperPromo = { 
      ...superPromo, 
      imageId, 
      imageUrl: undefined,
      useUrl: false
    }
    setSuperPromo(newSuperPromo)
    try {
      await storeStatusManager.updateSuperPromo(newSuperPromo)
      showNotification("Banner da Super Promoção atualizado!")
    } catch (error) {
      console.error("Erro ao atualizar imagem:", error)
    }
  }

  const handleSuperPromoImageUrl = async (imageUrl: string) => {
    const newSuperPromo = { 
      ...superPromo, 
      imageUrl, 
      imageId: undefined,
      useUrl: true
    }
    setSuperPromo(newSuperPromo)
    try {
      await storeStatusManager.updateSuperPromo(newSuperPromo)
    } catch (error) {
      console.error("Erro ao atualizar URL:", error)
    }
  }

  const handleSuperPromoRemoveImage = async () => {
    const newSuperPromo = { 
      ...superPromo, 
      imageId: undefined, 
      imageUrl: undefined,
      useUrl: false
    }
    setSuperPromo(newSuperPromo)
    try {
      await storeStatusManager.updateSuperPromo(newSuperPromo)
      showNotification("Banner removido!")
    } catch (error) {
      console.error("Erro ao remover imagem:", error)
    }
  }

  const handleItemPromoImageUpload = async (imageId: string) => {
    const newItemPromo = { 
      ...itemPromo, 
      imageId, 
      imageUrl: undefined,
      useUrl: false
    }
    setItemPromo(newItemPromo)
    try {
      await storeStatusManager.updateItemPromo(newItemPromo)
      showNotification("Banner de Itens atualizado!")
    } catch (error) {
      console.error("Erro ao atualizar imagem:", error)
    }
  }

  const handleItemPromoImageUrl = async (imageUrl: string) => {
    const newItemPromo = { 
      ...itemPromo, 
      imageUrl, 
      imageId: undefined,
      useUrl: true
    }
    setItemPromo(newItemPromo)
    try {
      await storeStatusManager.updateItemPromo(newItemPromo)
    } catch (error) {
      console.error("Erro ao atualizar URL:", error)
    }
  }

  const handleItemPromoRemoveImage = async () => {
    const newItemPromo = { 
      ...itemPromo, 
      imageId: undefined, 
      imageUrl: undefined,
      useUrl: false
    }
    setItemPromo(newItemPromo)
    try {
      await storeStatusManager.updateItemPromo(newItemPromo)
      showNotification("Banner removido!")
    } catch (error) {
      console.error("Erro ao remover imagem:", error)
    }
  }

  const handleAddProduct = (product: Product) => {
    const exists = promoProducts.some(p => p.productId === product.id)
    if (!exists) {
      setPromoProducts([
        ...promoProducts,
        {
          productId: product.id,
          productName: product.name,
          promoPrice: Math.max(0, product.price - 1.00)
        }
      ])
    }
  }

  const handleRemoveProduct = (productId: string) => {
    setPromoProducts(promoProducts.filter(p => p.productId !== productId))
  }

  const handleUpdatePromoPrice = (productId: string, newPrice: number) => {
    setPromoProducts(
      promoProducts.map(p =>
        p.productId === productId ? { ...p, promoPrice: newPrice } : p
      )
    )
  }

  const handleSaveItemPromo = async () => {
    setIsUpdatingPromo(true)
    try {
      await storeStatusManager.updatePromoProducts(promoProducts)
      await storeStatusManager.updateItemPromo(itemPromo)
      showNotification("Configurações da Promoção salvas com sucesso!")
      setIsItemPromoModalOpen(false)
    } catch (error) {
      console.error("Erro ao salvar produtos:", error)
      alert("Erro ao salvar produtos da promoção")
    } finally {
      setIsUpdatingPromo(false)
    }
  }

  const handleSaveSuperPromoModal = async () => {
    setIsUpdatingPromo(true)
    try {
      await storeStatusManager.updateSuperPromo(superPromo)
      showNotification("Super Promoção configurada com sucesso!")
      setIsSuperPromoModalOpen(false)
    } catch (error) {
      console.error("Erro ao salvar Super Promoção:", error)
      alert("Erro ao salvar Super Promoção")
    } finally {
      setIsUpdatingPromo(false)
    }
  }

  const getImageUrl = (imageId?: string) => {
    if (!imageId) return undefined
    const image = promoImages.find(img => img.id === imageId)
    if (!image) return undefined
    return `data:${image.mimeType};base64,${image.data}`
  }

  const getImagePreview = (imageId?: string, imageUrl?: string, useUrl?: boolean) => {
    if (useUrl && imageUrl) return imageUrl
    if (!useUrl && imageId) return getImageUrl(imageId) || null
    return imageUrl || getImageUrl(imageId) || null
  }

  // Filtro de produtos para o modal
  const eligibleProducts = useMemo(() => {
    return allProducts
      .filter(p => p.category === "batata" || p.category === "macarrao")
      .filter(p => {
        if (categoryFilter === "todos") return true
        return p.category === categoryFilter
      })
      .filter(p => p.name.toLowerCase().includes(searchFilter.toLowerCase()))
  }, [allProducts, categoryFilter, searchFilter])

  // Contadores para o dashboard iFood
  const totalActivePromos = (superPromo.isActive ? 1 : 0) + (itemPromo.isActive ? 1 : 0)

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-500 mx-auto mb-4" />
          <p className="text-gray-900 font-bold text-base">Verificando credenciais...</p>
          <p className="text-gray-400 text-xs mt-1">Acessando portal de promoções</p>
        </div>
      </div>
    )
  }

  const superPromoPreview = getImagePreview(superPromo.imageId, superPromo.imageUrl, superPromo.useUrl)
  const itemPromoPreview = getImagePreview(itemPromo.imageId, itemPromo.imageUrl, itemPromo.useUrl)

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7] text-gray-900 antialiased">
      <HeaderWrapper />

      <main className="flex-1 py-8 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          
          {/* Top Bar Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <Link href="/admin">
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 px-4 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold gap-2 shadow-xs transition-all"
              >
                <ArrowLeft className="h-4 w-4 text-gray-500" />
                Painel do Administrador
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadPromoStatus()
                  loadProducts()
                  loadImages()
                  showNotification("Dados sincronizados com o servidor!")
                }}
                className="h-10 px-3.5 rounded-xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold gap-2 text-xs shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                Atualizar Dados
              </Button>
            </div>
          </div>

          {/* iFood Marketing Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1A1A1A] via-[#2A1D15] to-[#E3A008] p-6 md:p-8 text-white shadow-xl mb-8">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase mb-3">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                Portal de Campanhas & Banners
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
                Central de Promoções
              </h1>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                Atraia clientes e aumente o ticket médio da sua loja com campanhas visuais, banners destacados na página inicial e preços especiais.
              </p>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
                <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                  <p className="text-gray-400 text-xs font-semibold">Campanhas</p>
                  <p className="text-2xl font-black text-white mt-0.5">2</p>
                </div>
                <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                  <p className="text-gray-400 text-xs font-semibold">Status Geral</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${totalActivePromos > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
                    <p className="text-sm font-black text-white">
                      {totalActivePromos > 0 ? `${totalActivePromos} Ativa(s)` : "Pausadas"}
                    </p>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                  <p className="text-gray-400 text-xs font-semibold">Itens em Oferta</p>
                  <p className="text-2xl font-black text-amber-300 mt-0.5">
                    {superPromo.isActive ? "Todas Batatas" : promoProducts.length}
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                  <p className="text-gray-400 text-xs font-semibold">Conversão Estimada</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">+35%</p>
                </div>
              </div>
            </div>

            {/* Background Decorative Element */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:flex items-center justify-center">
              <Megaphone className="w-80 h-80 text-white transform rotate-12 translate-x-12" />
            </div>
          </div>

          {/* Toast Notification Alert */}
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  ✓
                </div>
                <p className="text-emerald-900 font-bold text-sm">{successMessage}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>
          )}

          {/* CAMPAIGN CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

            {/* CARD 1: SUPER PROMOÇÃO */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
              <div>
                {/* Banner Preview Area (Standard iFood High-Impact Banner) */}
                <div className="relative aspect-[16/7] w-full bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 overflow-hidden">
                  {superPromoPreview ? (
                    <img 
                      src={superPromoPreview} 
                      alt="Banner Super Promoção"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 p-6 text-center bg-gradient-to-br from-[#C1440E] to-[#E3A008]">
                      <Zap className="h-10 w-10 mb-2 text-amber-200" />
                      <p className="font-black text-lg">Banner da Super Promoção</p>
                      <p className="text-xs text-white/80 max-w-xs mt-0.5">Nenhuma imagem definida. Clique em "Configurar" para adicionar um banner chamativo.</p>
                    </div>
                  )}

                  {/* Gradient Overlay for badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-amber-400" />
                      Super Promoção
                    </span>

                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide backdrop-blur-md ${
                      superPromo.isActive 
                        ? "bg-emerald-500/90 text-white shadow-sm" 
                        : "bg-gray-800/80 text-gray-300"
                    }`}>
                      {superPromo.isActive ? "ATIVA NA LOJA" : "PAUSADA"}
                    </span>
                  </div>

                  {/* Bottom Preview Tag */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                    <div>
                      <p className="text-xs font-semibold text-amber-200 uppercase tracking-wider">Preço Promocional Único</p>
                      <p className="text-2xl font-black">R$ {superPromo.price.toFixed(2)}</p>
                    </div>
                    <span className="text-[11px] bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg font-bold border border-white/10">
                      Todas as Batatas
                    </span>
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 font-bold text-[10px]">
                          CAMPANHA EM MASSA
                        </Badge>
                        <Badge variant="outline" className="border-gray-200 text-gray-500 text-[10px] font-semibold">
                          PREÇO FIXO
                        </Badge>
                      </div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">
                        Super Promoção de Batatas
                      </h2>
                    </div>

                    {/* Switch On/Off */}
                    <div className="flex flex-col items-end">
                      <Switch 
                        checked={superPromo.isActive}
                        onCheckedChange={handleToggleSuperPromo}
                        disabled={isUpdatingPromo}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                        {superPromo.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-4">
                    Aplica o preço promocional de <strong>R$ {superPromo.price.toFixed(2)}</strong> a <strong>todas as batatas recheadas</strong> da loja simultaneamente, sem necessidade de selecionar produtos individuais.
                  </p>

                  {/* Validity Chips */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                      <ShoppingBag className="h-3.5 w-3.5 text-gray-500" />
                      Batatas Recheadas
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                      <Tag className="h-3.5 w-3.5 text-amber-600" />
                      R$ {superPromo.price.toFixed(2)} / unidade
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                      {superPromoPreview ? "Com Banner Ativo" : "Sem Imagem"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 border-t border-gray-100 mt-2 flex gap-3">
                <Button 
                  onClick={() => setIsSuperPromoModalOpen(true)}
                  className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl gap-2 shadow-xs"
                >
                  <Sliders className="h-4 w-4" />
                  Configurar Campanha & Banner
                </Button>
              </div>
            </div>

            {/* CARD 2: PROMOÇÃO DE ITENS ESPECÍFICOS */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between">
              <div>
                {/* Banner Preview Area */}
                <div className="relative aspect-[16/7] w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 overflow-hidden">
                  {itemPromoPreview ? (
                    <img 
                      src={itemPromoPreview} 
                      alt="Banner Promoção de Itens"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 p-6 text-center bg-gradient-to-br from-blue-700 to-indigo-800">
                      <Tag className="h-10 w-10 mb-2 text-blue-200" />
                      <p className="font-black text-lg">Banner de Ofertas Selecionadas</p>
                      <p className="text-xs text-white/80 max-w-xs mt-0.5">Nenhuma imagem definida. Personalize o banner de destaque dos pratos em oferta.</p>
                    </div>
                  )}

                  {/* Gradient Overlay for badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                      <Tag className="h-3 w-3 text-blue-400" />
                      Ofertas Selecionadas
                    </span>

                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide backdrop-blur-md ${
                      itemPromo.isActive 
                        ? "bg-emerald-500/90 text-white shadow-sm" 
                        : "bg-gray-800/80 text-gray-300"
                    }`}>
                      {itemPromo.isActive ? "ATIVA NA LOJA" : "PAUSADA"}
                    </span>
                  </div>

                  {/* Bottom Preview Tag */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                    <div>
                      <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Produtos Participantes</p>
                      <p className="text-2xl font-black">{promoProducts.length} itens com desconto</p>
                    </div>
                    <span className="text-[11px] bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg font-bold border border-white/10">
                      Descontos Individuais
                    </span>
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 font-bold text-[10px]">
                          DESCONTO INDIVIDUAL
                        </Badge>
                        <Badge variant="outline" className="border-gray-200 text-gray-500 text-[10px] font-semibold">
                          PRATOS SELECIONADOS
                        </Badge>
                      </div>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight">
                        Promoção de Itens Específicos
                      </h2>
                    </div>

                    {/* Switch On/Off */}
                    <div className="flex flex-col items-end">
                      <Switch 
                        checked={itemPromo.isActive}
                        onCheckedChange={handleToggleItemPromo}
                        disabled={isUpdatingPromo}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                        {itemPromo.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs md:text-sm leading-relaxed mb-4">
                    Escolha produtos do cardápio e atribua valores promocionais específicos para cada um. Ideal para ofertas de pratos favoritos e macarrões.
                  </p>

                  {/* Validity Chips */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                      <Percent className="h-3.5 w-3.5 text-blue-600" />
                      {promoProducts.length} Pratos Configurados
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                      {itemPromoPreview ? "Com Banner Ativo" : "Sem Imagem"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 pt-0 border-t border-gray-100 mt-2 flex gap-3">
                <Button 
                  onClick={() => setIsItemPromoModalOpen(true)}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl gap-2 shadow-xs"
                >
                  <Sliders className="h-4 w-4" />
                  Gerenciar Produtos & Banner
                </Button>
              </div>
            </div>

          </div>

          {/* Quick Info Box in iFood Partner Style */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-black text-amber-950 text-base">Como as promoções aparecem no site e app?</h3>
                <p className="text-amber-800/80 text-xs md:text-sm mt-0.5 leading-relaxed">
                  Quando ativadas, as campanhas exibem o banner correspondente na página inicial e atualizam as etiquetas de preço com o valor promocional e o preço original riscado.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/", "_blank")}
                className="h-10 px-4 rounded-xl border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs gap-2"
              >
                <Eye className="h-4 w-4" />
                Ver Cardápio Ao Vivo
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: CONFIGURAÇÃO DA SUPER PROMOÇÃO (iFood Portal Standard)
      ─────────────────────────────────────────────────────────────── */}
      <Dialog open={isSuperPromoModalOpen} onOpenChange={setIsSuperPromoModalOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-xs">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-gray-900">
                  Configurar Super Promoção
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Preço fixo aplicado automaticamente a todas as batatas do cardápio
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* Status Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-black text-sm text-gray-900">Status da Campanha</p>
                <p className="text-xs text-gray-500">Ativa ou pausa a promoção na loja</p>
              </div>
              <Switch 
                checked={superPromo.isActive}
                onCheckedChange={(val) => setSuperPromo(prev => ({ ...prev, isActive: val }))}
              />
            </div>

            {/* Preço Promocional */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-gray-700 tracking-wider">
                Preço Promocional Único (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">
                  R$
                </span>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={superPromo.price}
                  onChange={(e) => setSuperPromo(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="pl-12 h-14 rounded-2xl border-2 border-gray-100 focus:border-amber-500 font-black text-xl text-gray-900"
                />
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-gray-400 font-semibold">Sugestões:</span>
                {[23.90, 24.90, 26.00, 27.90].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSuperPromo(prev => ({ ...prev, price: p }))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 transition-colors"
                  >
                    R$ {p.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Banner Selection */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-500" />
                Banner de Destaque
              </Label>

              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSuperPromo(prev => ({ ...prev, useUrl: false }))}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    !superPromo.useUrl
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Galeria de Banners
                </button>
                <button
                  type="button"
                  onClick={() => setSuperPromo(prev => ({ ...prev, useUrl: true }))}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    superPromo.useUrl
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Link / URL Externa
                </button>
              </div>

              {/* Tab Contents */}
              {!superPromo.useUrl ? (
                <div>
                  {loadingImages ? (
                    <div className="py-8 text-center text-xs text-gray-400">Carregando galeria...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                      <button
                        type="button"
                        onClick={() => setSuperPromo(prev => ({ ...prev, imageId: undefined }))}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                          !superPromo.imageId 
                            ? "border-amber-500 bg-amber-50/50 text-amber-900" 
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <X className="h-5 w-5" />
                        <span className="text-[11px] font-bold">Sem Banner</span>
                      </button>

                      {promoImages.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSuperPromo(prev => ({ ...prev, imageId: img.id }))}
                          className={`relative aspect-[16/9] rounded-2xl border-2 overflow-hidden transition-all ${
                            superPromo.imageId === img.id
                              ? "border-amber-500 ring-2 ring-amber-300"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <img 
                            src={`data:${img.mimeType};base64,${img.data}`} 
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          {superPromo.imageId === img.id && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input 
                    type="text"
                    placeholder="https://exemplo.com/banner-promocao.jpg"
                    value={superPromo.imageUrl || ""}
                    onChange={(e) => setSuperPromo(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="h-12 rounded-xl border-2 border-gray-100 focus:border-amber-500 text-sm"
                  />
                  <p className="text-[11px] text-gray-400">Insira um link direto de imagem (JPG, PNG ou WebP).</p>
                </div>
              )}

              {/* Live Preview Inside Modal */}
              <div className="pt-2">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Pré-visualização do Banner:
                </Label>
                <div className="relative aspect-[16/7] w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                  {superPromoPreview ? (
                    <img 
                      src={superPromoPreview} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="h-8 w-8 mb-1" />
                      <span className="text-xs font-semibold">Nenhum banner selecionado</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSuperPromoModalOpen(false)}
              className="rounded-xl font-bold text-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSuperPromoModal}
              disabled={isUpdatingPromo}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 px-6"
            >
              <Save className="h-4 w-4" />
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: CONFIGURAÇÃO DA PROMOÇÃO DE ITENS (iFood Portal Standard)
      ─────────────────────────────────────────────────────────────── */}
      <Dialog open={isItemPromoModalOpen} onOpenChange={setIsItemPromoModalOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100/50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-gray-900">
                  Gerenciar Ofertas em Pratos Selecionados
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Selecione os produtos e defina os preços promocionais individuais
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* Status Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-black text-sm text-gray-900">Status da Promoção de Itens</p>
                <p className="text-xs text-gray-500">Ativa ou pausa o desconto dos itens selecionados</p>
              </div>
              <Switch 
                checked={itemPromo.isActive}
                onCheckedChange={(val) => setItemPromo(prev => ({ ...prev, isActive: val }))}
              />
            </div>

            {/* Banner Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-500" />
                Banner da Promoção de Itens
              </Label>

              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setItemPromo(prev => ({ ...prev, useUrl: false }))}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    !itemPromo.useUrl
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Galeria de Banners
                </button>
                <button
                  type="button"
                  onClick={() => setItemPromo(prev => ({ ...prev, useUrl: true }))}
                  className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                    itemPromo.useUrl
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Link / URL Externa
                </button>
              </div>

              {!itemPromo.useUrl ? (
                <div>
                  {loadingImages ? (
                    <div className="py-8 text-center text-xs text-gray-400">Carregando galeria...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 max-h-44 overflow-y-auto p-1">
                      <button
                        type="button"
                        onClick={() => setItemPromo(prev => ({ ...prev, imageId: undefined }))}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                          !itemPromo.imageId 
                            ? "border-blue-500 bg-blue-50/50 text-blue-900" 
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <X className="h-5 w-5" />
                        <span className="text-[11px] font-bold">Sem Banner</span>
                      </button>

                      {promoImages.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setItemPromo(prev => ({ ...prev, imageId: img.id }))}
                          className={`relative aspect-[16/9] rounded-2xl border-2 overflow-hidden transition-all ${
                            itemPromo.imageId === img.id
                              ? "border-blue-500 ring-2 ring-blue-300"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <img 
                            src={`data:${img.mimeType};base64,${img.data}`} 
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          {itemPromo.imageId === img.id && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input 
                    type="text"
                    placeholder="https://exemplo.com/banner-itens.jpg"
                    value={itemPromo.imageUrl || ""}
                    onChange={(e) => setItemPromo(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="h-12 rounded-xl border-2 border-gray-100 focus:border-blue-500 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Product Selector with Search & Filters */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-xs font-black uppercase text-gray-700 tracking-wider">
                  Selecione os Produtos & Preços ({promoProducts.length} selecionados)
                </Label>

                {/* Filter Category Tabs */}
                <div className="flex gap-1.5">
                  {(["todos", "batata", "macarrao"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                        categoryFilter === cat 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Buscar prato por nome..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-200 text-xs"
                />
              </div>

              {/* Product List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {eligibleProducts.map(product => {
                  const promoItem = promoProducts.find(p => p.productId === product.id)
                  const isSelected = !!promoItem

                  return (
                    <div 
                      key={product.id}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
                        isSelected 
                          ? "border-blue-500 bg-blue-50/30" 
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => {
                            if (isSelected) {
                              handleRemoveProduct(product.id)
                            } else {
                              handleAddProduct(product)
                            }
                          }}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-gray-900 truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 line-through">
                              R$ {Number(product.price).toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              {product.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Promo Price Input when selected */}
                      {isSelected && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-gray-500">R$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={promoItem.promoPrice}
                            onChange={(e) => handleUpdatePromoPrice(product.id, parseFloat(e.target.value) || 0)}
                            className="w-24 h-10 rounded-xl border-2 border-blue-200 focus:border-blue-500 font-black text-sm text-center"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(product.id)}
                            className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>

          </div>

          <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsItemPromoModalOpen(false)}
              className="rounded-xl font-bold text-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveItemPromo}
              disabled={isUpdatingPromo}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 px-6"
            >
              <Save className="h-4 w-4" />
              Salvar Produtos e Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}