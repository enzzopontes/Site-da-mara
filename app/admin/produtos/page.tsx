"use client"

import { appToast } from "@/lib/app-toast"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Package,
  Coffee,
  UtensilsCrossed,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Flame,
  Droplets,
  Layers,
  Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { productsManager, type Product, type Adicional } from "@/lib/products-db"
import { adicionaisManager } from "@/lib/adicionais-manager"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

const CATEGORIES = [
  { key: "batata", label: "Batatas Recheadas", icon: Flame, color: "text-amber-500 bg-amber-50" },
  { key: "macarrao", label: "Macarrão", icon: UtensilsCrossed, color: "text-orange-500 bg-orange-50" },
  { key: "bebida", label: "Bebidas", icon: Coffee, color: "text-blue-500 bg-blue-50" },
  { key: "adicionais", label: "Adicionais", icon: Layers, color: "text-purple-500 bg-purple-50" },
] as const

const ADICIONAL_CATEGORIAS = [
  { key: "proteinas", label: "Proteínas Extra", icon: Flame, color: "bg-red-50 text-red-700 border-red-200" },
  { key: "queijos", label: "Queijos e Recheios", icon: Sparkles, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "molhos", label: "Molhos e Cremes", icon: Droplets, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "complementos", label: "Complementos", icon: Layers, color: "bg-purple-50 text-purple-700 border-purple-200" },
]

import { getAdicionalCategory } from "./adicionalUtils"

export default function AdminProdutosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [adicionais, setAdicionais] = useState<Adicional[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingAdicional, setEditingAdicional] = useState<Adicional | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAdicionalDialogOpen, setIsAdicionalDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"batata" | "macarrao" | "bebida" | "adicionais">("batata")
  const [searchQuery, setSearchQuery] = useState("")

  // Form states for products
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formOriginalPrice, setFormOriginalPrice] = useState("")
  const [formDiscountPercentage, setFormDiscountPercentage] = useState("")
  const [formBadgeText, setFormBadgeText] = useState("")
  const [formIsFeatured, setFormIsFeatured] = useState(false)
  const [pricingWarning, setPricingWarning] = useState<string | null>(null)
  const [formImage, setFormImage] = useState("")
  const [formCategory, setFormCategory] = useState<"batata" | "bebida" | "macarrao">("batata")
  const [selectedAdicionais, setSelectedAdicionais] = useState<string[]>([])

  // Form states for adicionais
  const [formAdicionalName, setFormAdicionalName] = useState("")
  const [formAdicionalPrice, setFormAdicionalPrice] = useState("")
  const [formAdicionalCategoria, setFormAdicionalCategoria] = useState("proteinas")

  // Sincronização reativa bidirecional sem loop infinito
  const handleFinalPriceChange = (val: string) => {
    setFormPrice(val)
    const p = parseFloat(val.replace(",", "."))
    const o = parseFloat(formOriginalPrice.replace(",", "."))

    if (!isNaN(p) && p > 0 && !isNaN(o) && o > 0) {
      if (o > p) {
        setPricingWarning(null)
        const pct = Math.round(((o - p) / o) * 100)
        setFormDiscountPercentage(pct.toString())
      } else {
        setPricingWarning("O preço riscado (De) deve ser maior que o preço final.")
        setFormDiscountPercentage("")
      }
    } else if (isNaN(o) && formDiscountPercentage.trim()) {
      const pct = parseFloat(formDiscountPercentage.replace(",", "."))
      if (!isNaN(pct) && pct > 0 && pct < 100 && !isNaN(p) && p > 0) {
        const calculatedOriginal = p / (1 - pct / 100)
        setFormOriginalPrice(calculatedOriginal.toFixed(2))
        setPricingWarning(null)
      }
    }
  }

  const handleOriginalPriceChange = (val: string) => {
    setFormOriginalPrice(val)
    if (!val.trim()) {
      setFormDiscountPercentage("")
      setPricingWarning(null)
      return
    }

    const o = parseFloat(val.replace(",", "."))
    const p = parseFloat(formPrice.replace(",", "."))

    if (isNaN(o)) return

    if (!isNaN(p) && p > 0) {
      if (o > p) {
        setPricingWarning(null)
        const pct = Math.round(((o - p) / o) * 100)
        setFormDiscountPercentage(pct.toString())
      } else {
        setPricingWarning(
          `O preço riscado (De: R$ ${o.toFixed(2).replace(".", ",")}) deve ser maior que o preço final (Por: R$ ${p.toFixed(2).replace(".", ",")}).`,
        )
        setFormDiscountPercentage("")
      }
    } else {
      setPricingWarning(null)
    }
  }

  const handleDiscountPercentageChange = (val: string) => {
    setFormDiscountPercentage(val)
    if (!val.trim()) {
      setFormOriginalPrice("")
      setPricingWarning(null)
      return
    }

    const pct = parseFloat(val.replace(",", "."))
    const p = parseFloat(formPrice.replace(",", "."))

    if (isNaN(pct) || pct <= 0) {
      setFormOriginalPrice("")
      setPricingWarning(null)
      return
    }

    if (pct >= 100) {
      setPricingWarning("O desconto percentual deve ser menor que 100%.")
      return
    }

    if (!isNaN(p) && p > 0) {
      const calculatedOriginal = p / (1 - pct / 100)
      setFormOriginalPrice(calculatedOriginal.toFixed(2))
      setPricingWarning(null)
    }
  }

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadProducts()
        loadAdicionais()
      } else {
        router.push("/")
      }
    }
  }, [user, loading, router])

  const loadProducts = async () => {
    const allProducts = await productsManager.getProducts()
    setProducts(allProducts)
  }

  const loadAdicionais = async () => {
    try {
      const allAdicionais = await adicionaisManager.getAllAdicionais()
      setAdicionais(allAdicionais)
    } catch (error) {
      console.error("Erro ao carregar adicionais:", error)
    }
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormName(product.name)
      setFormDescription(product.description)
      setFormPrice(product.price.toString())
      setFormOriginalPrice((product.originalPrice ?? product.original_price)?.toString() || "")
      setFormDiscountPercentage((product.discountPercentage ?? product.discount_percentage)?.toString() || "")
      setFormBadgeText(product.badgeText ?? product.badge_text ?? "")
      setFormIsFeatured(Boolean(product.isFeatured ?? product.is_featured))
      setPricingWarning(null)
      setFormImage(product.image)
      setFormCategory(product.category)
      setSelectedAdicionais(product.adicionais?.map((a) => a.id) || [])
    } else {
      setEditingProduct(null)
      setFormName("")
      setFormDescription("")
      setFormPrice("")
      setFormOriginalPrice("")
      setFormDiscountPercentage("")
      setFormBadgeText("")
      setFormIsFeatured(false)
      setPricingWarning(null)
      setFormImage("")
      setFormCategory(activeTab === "adicionais" ? "batata" : activeTab)
      setSelectedAdicionais([])
    }
    setIsDialogOpen(true)
  }

  const handleOpenAdicionalDialog = (adicional?: Adicional) => {
    if (adicional) {
      setEditingAdicional(adicional)
      setFormAdicionalName(adicional.name)
      setFormAdicionalPrice(adicional.price.toString())
      setFormAdicionalCategoria((adicional as any).adicional_categoria || getAdicionalCategory(adicional))
    } else {
      setEditingAdicional(null)
      setFormAdicionalName("")
      setFormAdicionalPrice("")
      setFormAdicionalCategoria("proteinas")
    }
    setIsAdicionalDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const price = Number.parseFloat(formPrice.replace(",", "."))
    if (Number.isNaN(price) || price <= 0) {
      appToast.warning("Preço inválido", "Informe um preço válido.")
      return
    }

    let originalPrice: number | null = null
    let discountPercentage: number | null = null

    if (formOriginalPrice.trim()) {
      const parsedOriginal = Number.parseFloat(formOriginalPrice.replace(",", "."))
      if (!isNaN(parsedOriginal) && parsedOriginal > 0) {
        if (parsedOriginal <= price) {
          appToast.warning(
            "Preço Riscado Inválido",
            "O preço riscado ('De') deve ser estritamente maior que o preço final ('Por').",
          )
          return
        }
        originalPrice = parsedOriginal
        discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100)
      }
    }

    const badgeText = formBadgeText.trim() || null
    const isFeatured = formIsFeatured

    const productPayload = {
      name: formName.trim(),
      description: formDescription.trim(),
      price,
      originalPrice,
      original_price: originalPrice,
      discountPercentage,
      discount_percentage: discountPercentage,
      badgeText,
      badge_text: badgeText,
      isFeatured,
      is_featured: isFeatured,
      image: formImage.trim() || "/placeholder.svg?height=300&width=300&query=" + encodeURIComponent(formName),
      category: formCategory,
    }

    if (editingProduct) {
      const updated = await productsManager.updateProduct(editingProduct.id, productPayload)

      if (updated) {
        await productsManager.setProductAdicionais(editingProduct.id, selectedAdicionais)
      }
    } else {
      const created = await productsManager.createProduct({
        ...productPayload,
        available: true,
      })

      if (created) {
        await productsManager.setProductAdicionais(created.id, selectedAdicionais)
      }
    }
    loadProducts()
    setIsDialogOpen(false)
    return
  }

  const handleSaveAdicional = async () => {
    if (!formAdicionalName.trim() || !formAdicionalPrice) {
      appToast.warning("Campos obrigatórios", "Preencha todos os campos obrigatórios.")
      return
    }

    const price = Number.parseFloat(formAdicionalPrice.replace(",", "."))
    if (isNaN(price) || price <= 0) {
      appToast.warning("Preço inválido", "Informe um preço válido.")
      return
    }

    if (editingAdicional) {
      await adicionaisManager.updateAdicional(editingAdicional.id, {
        name: formAdicionalName.trim(),
        price,
        ...((formAdicionalCategoria ? { adicional_categoria: formAdicionalCategoria } : {}) as any),
      })
    } else {
      const created = await adicionaisManager.addAdicional({
        name: formAdicionalName.trim(),
        price,
      })
      if (created && formAdicionalCategoria) {
        await adicionaisManager.updateAdicional(created.id, {
          adicional_categoria: formAdicionalCategoria,
        } as any)
      }
    }

    await loadAdicionais()
    setIsAdicionalDialogOpen(false)
  }

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto do cardápio?")) {
      await productsManager.deleteProduct(id)
      loadProducts()
    }
  }

  const handleDeleteAdicional = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este adicional?")) {
      await adicionaisManager.deleteAdicional(id)
      await loadAdicionais()
    }
  }

  // Fast stock pause toggle (iFood Standard)
  const handleToggleAvailability = async (product: Product) => {
    const newStatus = !product.available
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: newStatus } : p)))
    await productsManager.updateProduct(product.id, {
      available: newStatus,
    })
    loadProducts()
  }

  const toggleAdicional = (adicionalId: string) => {
    setSelectedAdicionais((prev) =>
      prev.includes(adicionalId) ? prev.filter((id) => id !== adicionalId) : [...prev, adicionalId],
    )
  }

  const toggleAllCategoryAdicionais = (catKey: string) => {
    const catAdics = adicionais.filter((a) => getAdicionalCategory(a) === catKey)
    const catIds = catAdics.map((a) => a.id)
    const allSelected = catIds.every((id) => selectedAdicionais.includes(id))

    if (allSelected) {
      setSelectedAdicionais((prev) => prev.filter((id) => !catIds.includes(id)))
    } else {
      setSelectedAdicionais((prev) => Array.from(new Set([...prev, ...catIds])))
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = p.category === activeTab
      if (!matchCategory) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    })
  }, [products, activeTab, searchQuery])

  const filteredAdicionais = useMemo(() => {
    if (!searchQuery.trim()) return adicionais
    const q = searchQuery.toLowerCase()
    return adicionais.filter((a) => a.name.toLowerCase().includes(q))
  }, [adicionais, searchQuery])

  const counts = useMemo(() => {
    return {
      batata: products.filter((p) => p.category === "batata").length,
      macarrao: products.filter((p) => p.category === "macarrao").length,
      bebida: products.filter((p) => p.category === "bebida").length,
      adicionais: adicionais.length,
    }
  }, [products, adicionais])

  if (loading || !isAdmin) {
    return <AdminTableSkeleton rows={8} />
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col">
      <HeaderWrapper />

      <main className="container mx-auto px-4 py-6 max-w-6xl flex-1">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-amber-600 transition-colors mb-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Painel Geral
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestor de Cardápio</h1>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                {products.length} itens ativos
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Altere preços, pause itens esgotados e gerencie adicionais em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleOpenAdicionalDialog()}
              variant="outline"
              className="bg-white border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs h-10 px-4 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5 text-purple-600" />
              Novo Adicional
            </Button>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[#EA1D2C] hover:bg-[#d01826] text-white font-bold rounded-xl text-xs h-10 px-5 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* Sticky iFood Category Pills Bar */}
        <div className="sticky top-0 z-20 bg-[#F7F7F8]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 border-b border-gray-200/80 mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isActive = activeTab === cat.key
                const count = counts[cat.key as keyof typeof counts] || 0
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTab(cat.key as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border ${
                      isActive
                        ? "bg-gray-900 text-white border-gray-900 shadow-gray-200"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-gray-400"}`} />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isActive ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Live Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 h-9 text-xs bg-white border-gray-200 rounded-xl focus:border-amber-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "adicionais" ? (
          /* Adicionais Manager Standard View */
          <div className="space-y-6">
            {filteredAdicionais.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
                <Layers className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700">Nenhum adicional encontrado</p>
                <p className="text-xs text-gray-400 mt-1">Clique em "Novo Adicional" para cadastrar complementos.</p>
              </div>
            ) : (
              ADICIONAL_CATEGORIAS.map((cat) => {
                const groupItems = filteredAdicionais.filter((a) => getAdicionalCategory(a) === cat.key)
                if (groupItems.length === 0) return null

                const CatIcon = cat.icon
                return (
                  <div key={cat.key} className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg border text-xs ${cat.color}`}>
                          <CatIcon className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">{cat.label}</h3>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400">{groupItems.length} itens</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {groupItems.map((adicional) => (
                        <div
                          key={adicional.id}
                          className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-gray-900 truncate">{adicional.name}</p>
                            <span className="text-xs font-black text-amber-600">
                              + R$ {Number(adicional.price).toFixed(2).replace(".", ",")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 text-xs font-semibold"
                              onClick={() => handleOpenAdicionalDialog(adicional)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                              onClick={() => handleDeleteAdicional(adicional.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          /* Products List Standard View */
          <div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-700">Nenhum produto nesta categoria</p>
                <p className="text-xs text-gray-400 mt-1">Clique em "Novo Produto" para adicionar itens ao cardápio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const isAvailable = product.available !== false
                  return (
                    <Card
                      key={product.id}
                      className={`border rounded-2xl shadow-sm transition-all overflow-hidden ${
                        isAvailable
                          ? "bg-white border-gray-200/90 hover:border-gray-300 hover:shadow-md"
                          : "bg-gray-50/70 border-gray-200 opacity-80"
                      }`}
                    >
                      <CardContent className="p-4 flex flex-col justify-between h-full">
                        <div className="flex gap-3.5 items-start">
                          {/* Photo Thumbnail */}
                          <div className="relative w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className={`w-full h-full object-cover transition-all ${
                                  !isAvailable ? "grayscale contrast-75" : ""
                                }`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="text-[9px] font-black uppercase text-white bg-red-600/90 px-1 py-0.5 rounded">
                                  Pausado
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-1">
                                {product.name}
                              </h3>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {product.description || "Sem descrição informada."}
                            </p>

                            <div className="mt-2 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                              {(product.originalPrice ?? product.original_price) &&
                                (product.originalPrice ?? product.original_price)! > product.price && (
                                  <span className="text-xs text-gray-400 line-through font-medium">
                                    R$ {(product.originalPrice ?? product.original_price)!.toFixed(2).replace(".", ",")}
                                  </span>
                                )}
                              <span className="text-base font-black text-gray-900">
                                R$ {product.price.toFixed(2).replace(".", ",")}
                              </span>
                              {(product.originalPrice ?? product.original_price) &&
                                (product.originalPrice ?? product.original_price)! > product.price && (
                                  <span className="text-[10px] font-black bg-[#008941] text-white px-1.5 py-0.5 rounded-full">
                                    -{Math.round(
                                      (((product.originalPrice ?? product.original_price)! - product.price) /
                                        (product.originalPrice ?? product.original_price)!) *
                                        100,
                                    )}%
                                  </span>
                                )}
                              {(product.isFeatured || product.is_featured) && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-[#E3A008]" /> Destaque
                                </span>
                              )}
                              {(product.badgeText || product.badge_text) && (
                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded-md">
                                  {product.badgeText || product.badge_text}
                                </span>
                              )}
                              <span className="text-base font-black text-gray-900">
                                R$ {product.price.toFixed(2).replace(".", ",")}
                              </span>
                              {product.adicionais && product.adicionais.length > 0 && (
                                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded-md">
                                  {product.adicionais.length} adicionais
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Controls: Quick Stock Pause & Actions */}
                        <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                          {/* Quick Pause Switch */}
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`switch-${product.id}`}
                              checked={isAvailable}
                              onCheckedChange={() => handleToggleAvailability(product)}
                              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300"
                            />
                            <label
                              htmlFor={`switch-${product.id}`}
                              className={`text-xs font-bold cursor-pointer select-none ${
                                isAvailable ? "text-emerald-700" : "text-gray-400"
                              }`}
                            >
                              {isAvailable ? "Disponível" : "Pausado"}
                            </label>
                          </div>

                          {/* Edit / Delete Buttons */}
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-xl border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-none"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1 text-gray-500" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Dialog para Produtos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">
              {editingProduct ? "Editar Produto" : "Novo Produto no Cardápio"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Preencha os dados e vincule os adicionais permitidos para este item.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Nome do Produto *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Strogonoff de Alcatra"
                    className="rounded-xl text-xs h-10 border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Categoria *</Label>
                  <Select value={formCategory} onValueChange={(val: any) => setFormCategory(val)}>
                    <SelectTrigger className="rounded-xl text-xs h-10 border-gray-200">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batata">Batata Recheada</SelectItem>
                      <SelectItem value="macarrao">Macarrão</SelectItem>
                      <SelectItem value="bebida">Bebida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Preço Base (R$) *</Label>
                </div>

                {/* Bloco de Precificação Psicológica & Promoção Reativa */}
                <div className="p-3.5 bg-gradient-to-br from-amber-50/60 to-orange-50/40 rounded-2xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#8A6100] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E3A008]" />
                      Precificação & Promoção (iFood)
                    </span>
                    {formDiscountPercentage && Number(formDiscountPercentage) > 0 && (
                      <span className="bg-[#008941] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                        -{formDiscountPercentage}%
                      </span>
                    )}
                  </div>

                  {/* Preço de Venda Final */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-gray-800">
                      Preço Final de Venda ("Por") *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={formPrice}
                        onChange={(e) => handleFinalPriceChange(e.target.value)}
                        placeholder="28.99"
                        className="rounded-xl text-xs h-10 pl-9 font-extrabold text-gray-900 border-gray-200 bg-white"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Preço real cobrado no carrinho e no pedido
                    </p>
                  </div>

                  {/* Sincronização Bidirecional: Preço Riscado "De" e Desconto "%" */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-700">
                        Preço Riscado ("De")
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formOriginalPrice}
                          onChange={(e) => handleOriginalPriceChange(e.target.value)}
                          placeholder="32.99"
                          className="rounded-xl text-xs h-9 pl-8 border-gray-200 bg-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-700">
                        Desconto (%)
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          max="99"
                          value={formDiscountPercentage}
                          onChange={(e) => handleDiscountPercentageChange(e.target.value)}
                          placeholder="12"
                          className="rounded-xl text-xs h-9 pr-7 border-gray-200 bg-white font-medium"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mensagem de Erro/Alerta se original_price <= price */}
                  {pricingWarning && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 text-red-700 text-[11px] border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{pricingWarning}</span>
                    </div>
                  )}

                  {/* Tag de Destaque e Flag de Home */}
                  <div className="space-y-2 pt-2 border-t border-amber-200/50">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-gray-700">
                        Tag no Topo do Card (Opcional)
                      </Label>
                      <Input
                        value={formBadgeText}
                        onChange={(e) => setFormBadgeText(e.target.value)}
                        placeholder="Ex: Mais pedido, Promoção, Especial"
                        className="rounded-xl text-xs h-9 border-gray-200 bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-gray-800 cursor-pointer">
                          Destaque na Home
                        </Label>
                        <p className="text-[10px] text-gray-500">
                          Exibir no carrossel de destaques da página inicial
                        </p>
                      </div>
                      <Switch
                        checked={formIsFeatured}
                        onCheckedChange={setFormIsFeatured}
                        className="data-[state=checked]:bg-[#E3A008]"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">URL da Imagem</Label>
                  <Input
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="/products/nome.jpg ou https://..."
                    className="rounded-xl text-xs h-10 border-gray-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700">Descrição / Ingredientes</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descreva os ingredientes detalhadamente..."
                    className="rounded-xl text-xs h-[100px] border-gray-200 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Grouped Adicionais Manager */}
            {formCategory !== "bebida" && (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                    Adicionais Permitidos ({selectedAdicionais.length} selecionados)
                  </Label>
                  <span className="text-[11px] text-gray-400">Marque os grupos que o cliente pode adicionar</span>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {ADICIONAL_CATEGORIAS.map((cat) => {
                    const catAdics = adicionais.filter((a) => getAdicionalCategory(a) === cat.key)
                    if (catAdics.length === 0) return null

                    const allSelected = catAdics.every((a) => selectedAdicionais.includes(a.id))

                    return (
                      <div key={cat.key} className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-800">{cat.label}</span>
                          <button
                            type="button"
                            onClick={() => toggleAllCategoryAdicionais(cat.key)}
                            className="text-[10px] font-bold text-amber-700 hover:underline"
                          >
                            {allSelected ? "Desmarcar todos" : "Marcar todos"}
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {catAdics.map((adicional) => {
                            const isChecked = selectedAdicionais.includes(adicional.id)
                            return (
                              <label
                                key={adicional.id}
                                className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked
                                    ? "bg-amber-50/70 border-amber-300 text-amber-950 font-bold"
                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100/50"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleAdicional(adicional.id)}
                                  className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                />
                                <span className="truncate leading-none">{adicional.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl font-bold text-xs h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#EA1D2C] hover:bg-[#d01826] text-white font-bold rounded-xl text-xs h-10 px-6 shadow-sm"
              >
                {editingProduct ? "Salvar Alterações" : "Criar Produto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Adicionais */}
      <Dialog open={isAdicionalDialogOpen} onOpenChange={setIsAdicionalDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">
              {editingAdicional ? "Editar Adicional" : "Novo Adicional"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Defina o nome, preço e categoria para organizar seu cardápio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Nome do Adicional *</Label>
              <Input
                value={formAdicionalName}
                onChange={(e) => setFormAdicionalName(e.target.value)}
                placeholder="Ex: Bacon Extra Crocante"
                className="rounded-xl text-xs h-10 border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Preço (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formAdicionalPrice}
                onChange={(e) => setFormAdicionalPrice(e.target.value)}
                placeholder="0.00"
                className="rounded-xl text-xs h-10 border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Categoria do Adicional *</Label>
              <Select value={formAdicionalCategoria} onValueChange={setFormAdicionalCategoria}>
                <SelectTrigger className="rounded-xl text-xs h-10 border-gray-200">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {ADICIONAL_CATEGORIAS.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdicionalDialogOpen(false)}
                className="rounded-xl font-bold text-xs h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveAdicional}
                className="bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs h-10 px-6 shadow-sm"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}