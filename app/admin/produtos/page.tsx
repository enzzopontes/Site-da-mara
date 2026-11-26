"use client"

import { appToast } from "@/lib/app-toast"
import { toast } from "sonner"

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
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Package,
  AlertCircle,
  Sparkles,
  Flame,
  Droplets,
  Layers,
  Image as ImageIcon,
  LayoutGrid,
  ExternalLink,
  FolderPlus,
  WifiOff,
} from "lucide-react"
import { useAdminHeaderSearch } from "@/components/admin/admin-header-search-context"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { productsManager, type Product, type Adicional } from "@/lib/products-db"
import { adicionaisManager } from "@/lib/adicionais-manager"
import { fetchCategoriesFromDb, DEFAULT_CATEGORIES, type Category } from "@/lib/categories-db"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"
import { CategoryIcon } from "@/components/category-icon"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { PhotoBankPicker } from "@/components/photo-bank-picker"
import { CategoryFormModal } from "@/components/admin/categories/category-form-modal"
import { isAdmin as checkIsAdminRole } from "@/lib/supabase/admin"

const DEFAULT_PRODUCT_CATEGORIES: Category[] = DEFAULT_CATEGORIES.filter(
  (c) => c.kind === "product_category",
).sort((a, b) => a.menu_order - b.menu_order)

type ProductWithCategoryId = Product & { category_id?: string | null; categoryId?: string | null }

const getProductCategoryId = (product: Product): string | null => {
  const extended = product as ProductWithCategoryId
  return extended.categoryId ?? extended.category_id ?? null
}

const getPersistedCategoryId = (category?: Category | null): string | null => {
  if (!category?.id || category.id.startsWith("default-")) return null
  return category.id
}

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
  const [categories, setCategories] = useState<Category[]>(DEFAULT_PRODUCT_CATEGORIES)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingAdicional, setEditingAdicional] = useState<Adicional | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAdicionalDialogOpen, setIsAdicionalDialogOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<
    | { type: "product"; id: string }
    | { type: "adicional"; id: string }
    | null
  >(null)
  const [activeTab, setActiveTab] = useState<string>("todos")
  const { query: searchQuery } = useAdminHeaderSearch({
    placeholder: "Buscar item...",
    ariaLabel: "Buscar produtos ou adicionais",
  })

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
  const [formCategory, setFormCategory] = useState<string>(DEFAULT_PRODUCT_CATEGORIES[0]?.slug ?? "batata")
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null)
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
    const syncOnlineStatus = () => {
      setIsOffline(typeof navigator !== "undefined" && !navigator.onLine)
    }
    syncOnlineStatus()
    window.addEventListener("online", syncOnlineStatus)
    window.addEventListener("offline", syncOnlineStatus)
    return () => {
      window.removeEventListener("online", syncOnlineStatus)
      window.removeEventListener("offline", syncOnlineStatus)
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else {
        checkIsAdminRole(user.id)
          .then((allowed) => {
            if (!active) return
            if (allowed) {
              setIsAdmin(true)
              loadCategories()
              loadProducts()
              loadAdicionais()
            } else {
              router.push("/")
            }
          })
          .catch(() => {
            if (active) router.push("/")
          })
      }
    }
    return () => {
      active = false
    }
  }, [user, loading, router])

  const loadCategories = async () => {
    try {
      const loaded = await fetchCategoriesFromDb({ kind: "product_category" })
      const source = loaded.length > 0 ? loaded : DEFAULT_PRODUCT_CATEGORIES
      setCategories([...source].sort((a, b) => a.menu_order - b.menu_order))
    } catch {
      setCategories(DEFAULT_PRODUCT_CATEGORIES)
    }
  }

  const nextCategoryOrders = useMemo(
    () => ({
      homeBar: categories.length ? Math.max(...categories.map((c) => c.home_bar_order ?? 0)) + 1 : 0,
      homeFeatured: categories.length ? Math.max(...categories.map((c) => c.home_featured_order ?? 0)) + 1 : 0,
      menu: categories.length ? Math.max(...categories.map((c) => c.menu_order ?? 0)) + 1 : 0,
    }),
    [categories]
  )

  const handleCategoryCreated = async (saved: Category) => {
    setCategories((prev) => {
      const filtered = prev.filter((c) => c.id !== saved.id && c.slug !== saved.slug)
      return [...filtered, saved].sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0))
    })
    toast.success(`Categoria "${saved.name}" criada!`, {
      description: saved.show_on_home_bar
        ? saved.icon_url
          ? "Ícone 3D salvo! Já está ativada na Grade 3D da Home."
          : "Já está ativada na Grade 3D da Home. Adicione um ícone 3D em Categorias & Vitrine."
        : "Criada no Cardápio (fora da Home). Ative o botão do ícone em Categorias & Vitrine quando quiser destacar na Home.",
      action: {
        label: "Ir para Vitrine 3D",
        onClick: () => router.push("/admin/categorias"),
      },
    })
    await loadCategories()
  }

  const loadProducts = async () => {
    try {
      const allProducts = await productsManager.getProducts({ strict: true })
      setProducts(allProducts)
    } catch (err) {
      appToast.error(
        "Erro ao carregar produtos",
        err instanceof Error ? err.message : "Não foi possível consultar o cardápio."
      )
    }
  }

  const loadAdicionais = async () => {
    try {
      const allAdicionais = await adicionaisManager.getAllAdicionais()
      setAdicionais(allAdicionais)
    } catch (error) {
      console.error("Erro ao carregar adicionais:", error)
    }
  }

  const findProductCategory = (product: Product): Category | undefined => {
    const prodCatId = getProductCategoryId(product)
    if (prodCatId) {
      const byId = categories.find((c) => c.id === prodCatId)
      if (byId) return byId
    }
    const normSlug = normalizeLegacyCategorySlug(product.category)
    return categories.find((c) => normalizeLegacyCategorySlug(c.slug) === normSlug)
  }

  const productMatchesCategory = (product: Product, category: Category): boolean => {
    const prodCatId = getProductCategoryId(product)
    if (prodCatId) {
      const byId = categories.find((c) => c.id === prodCatId)
      if (byId) return byId.id === category.id
    }
    return normalizeLegacyCategorySlug(product.category) === normalizeLegacyCategorySlug(category.slug)
  }

  const selectedCategoryObj = useMemo(() => {
    if (formCategoryId) {
      const byId = categories.find((c) => c.id === formCategoryId)
      if (byId) return byId
    }
    const normSlug = normalizeLegacyCategorySlug(formCategory)
    return categories.find((c) => normalizeLegacyCategorySlug(c.slug) === normSlug)
  }, [categories, formCategoryId, formCategory])

  const allowsAddons = selectedCategoryObj
    ? selectedCategoryObj.allows_addons
    : normalizeLegacyCategorySlug(formCategory) !== "bebida"

  const allowsNotes = selectedCategoryObj
    ? selectedCategoryObj.allows_notes
    : normalizeLegacyCategorySlug(formCategory) !== "bebida"

  const handleFormCategoryChange = (slug: string) => {
    const matched = categories.find(
      (c) => c.slug === slug || normalizeLegacyCategorySlug(c.slug) === normalizeLegacyCategorySlug(slug),
    )
    const nextSlug = matched?.slug ?? slug
    setFormCategory(nextSlug)
    setFormCategoryId(getPersistedCategoryId(matched))
    const nextAllowsAddons = matched
      ? matched.allows_addons
      : normalizeLegacyCategorySlug(nextSlug) !== "bebida"
    if (!nextAllowsAddons) {
      setSelectedAdicionais([])
    }
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      const matchedCat = findProductCategory(product)
      const resolvedSlug =
        matchedCat?.slug ||
        normalizeLegacyCategorySlug(product.category) ||
        categories[0]?.slug ||
        "batata"
      const resolvedId = getPersistedCategoryId(matchedCat) ?? getProductCategoryId(product)
      const resolvedAllowsAddons = matchedCat
        ? matchedCat.allows_addons
        : normalizeLegacyCategorySlug(resolvedSlug) !== "bebida"

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
      setFormCategory(resolvedSlug)
      setFormCategoryId(resolvedId)
      setSelectedAdicionais(resolvedAllowsAddons ? product.adicionais?.map((a) => a.id) || [] : [])
    } else {
      const activeCat =
        activeTab !== "todos" && activeTab !== "adicionais"
          ? categories.find((c) => c.slug === activeTab)
          : undefined
      const defaultCat = activeCat ?? categories[0]

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
      setFormCategory(defaultCat?.slug ?? "batata")
      setFormCategoryId(getPersistedCategoryId(defaultCat))
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
    const trimmedImage = formImage.trim()

    if (trimmedImage) {
      const isValidImageUrl =
        !trimmedImage.includes("..") &&
        !/[\u0000-\u001F\u007F]/.test(trimmedImage) &&
        (/^https?:\/\//i.test(trimmedImage) ||
          (trimmedImage.startsWith("/") && !trimmedImage.startsWith("//")))
      if (!isValidImageUrl) {
        appToast.error(
          "URL de imagem inválida",
          "A URL da imagem deve começar com https://, http:// ou / (sem // ou ..).",
        )
        return
      }
    }

    const effectiveAdicionais = allowsAddons ? selectedAdicionais : []

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
      image: trimmedImage || "/placeholder.svg?height=300&width=300&query=" + encodeURIComponent(formName),
      category: formCategory as Product["category"],
      category_id: formCategoryId,
    }

    if (isSaving) return
    setIsSaving(true)
    try {
      if (editingProduct) {
        await productsManager.updateProduct(editingProduct.id, productPayload, effectiveAdicionais)
        appToast.success("Produto atualizado", `"${productPayload.name}" foi salvo com sucesso.`)
      } else {
        const createPayload = { ...productPayload, available: true }
        await productsManager.createProduct(createPayload, effectiveAdicionais)
        appToast.success("Produto criado", `"${productPayload.name}" foi cadastrado com sucesso.`)
      }
      await loadProducts()
      setIsDialogOpen(false)
    } catch (err) {
      // Modal permanece aberto para o admin corrigir e tentar de novo
      appToast.error("Não foi possível salvar o produto", err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
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

    if (isSaving) return
    setIsSaving(true)
    try {
      let saved: Adicional | null = null
      if (editingAdicional) {
        saved = await adicionaisManager.updateAdicional(editingAdicional.id, {
          name: formAdicionalName.trim(),
          price,
          ...(formAdicionalCategoria ? { adicional_categoria: formAdicionalCategoria } : {}),
        })
      } else {
        saved = await adicionaisManager.addAdicional({
          name: formAdicionalName.trim(),
          price,
          ...(formAdicionalCategoria ? { adicional_categoria: formAdicionalCategoria } : {}),
        })
      }

      if (!saved) return

      appToast.success(
        editingAdicional ? "Adicional atualizado" : "Adicional criado",
        `"${formAdicionalName.trim()}" foi salvo com sucesso.`
      )
      await loadAdicionais()
      setIsAdicionalDialogOpen(false)
    } catch (err) {
      appToast.error("Erro ao salvar adicional", err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteProduct = (id: string) => {
    setPendingDelete({ type: "product", id })
  }

  const handleDeleteAdicional = (id: string) => {
    setPendingDelete({ type: "adicional", id })
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)

    if (target.type === "product") {
      try {
        await productsManager.deleteProduct(target.id)
        await loadProducts()
        appToast.success("Produto excluído", "O produto foi removido do cardápio.")
      } catch (err) {
        appToast.error("Não foi possível excluir o produto", err instanceof Error ? err.message : String(err))
      }
    } else {
      try {
        const deleted = await adicionaisManager.deleteAdicional(target.id)
        if (deleted) {
          await loadAdicionais()
          appToast.success("Adicional excluído", "O adicional foi removido com sucesso.")
        }
      } catch (err) {
        appToast.error("Não foi possível excluir o adicional", err instanceof Error ? err.message : String(err))
      }
    }
  }

  // Fast stock pause toggle (iFood Standard)
  const handleToggleAvailability = async (product: Product) => {
    const previousStatus = product.available
    const newStatus = !previousStatus
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: newStatus } : p)))
    try {
      await productsManager.updateProduct(product.id, {
        available: newStatus,
      })
      await loadProducts()
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, available: previousStatus } : p)))
      appToast.error("Erro ao alterar disponibilidade", err instanceof Error ? err.message : String(err))
    }
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
    const activeCategory =
      activeTab !== "todos" && activeTab !== "adicionais"
        ? categories.find((c) => c.slug === activeTab)
        : undefined

    return products.filter((p) => {
      if (activeTab !== "todos") {
        const matchCategory = activeCategory
          ? productMatchesCategory(p, activeCategory)
          : normalizeLegacyCategorySlug(p.category) === normalizeLegacyCategorySlug(activeTab)
        if (!matchCategory) return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    })
  }, [products, categories, activeTab, searchQuery])

  const filteredAdicionais = useMemo(() => {
    if (!searchQuery.trim()) return adicionais
    const q = searchQuery.toLowerCase()
    return adicionais.filter((a) => a.name.toLowerCase().includes(q))
  }, [adicionais, searchQuery])

  const categoryCounts = useMemo(() => {
    const countsBySlug: Record<string, number> = {}
    for (const cat of categories) {
      countsBySlug[cat.slug] = products.filter((p) => productMatchesCategory(p, cat)).length
    }
    return countsBySlug
  }, [products, categories])

  const usedImageUrls = useMemo(() => {
    return products
      .filter((p) => Boolean(p.image?.trim()) && p.id !== editingProduct?.id)
      .map((p) => p.image.trim())
  }, [products, editingProduct?.id])

  if (loading || !isAdmin) {
    return <AdminTableSkeleton rows={8} />
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] flex flex-col">
      <main className="container mx-auto px-4 py-6 max-w-6xl flex-1">
        {isOffline && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-[#C1440E]/35 bg-[#FFF4EE] px-3.5 py-2.5 text-xs text-[#8F2E07]"
          >
            <WifiOff className="h-4 w-4 shrink-0 text-[#C1440E]" />
            <span>
              <strong className="font-bold">Sem conexão com a internet.</strong>{" "}
              Algumas ações estão indisponíveis até a conexão retornar.
            </span>
          </div>
        )}

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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsCategoryModalOpen(true)}
              disabled={isOffline}
              title={isOffline ? "Sem conexão com a internet" : undefined}
              variant="outline"
              className="bg-[#FEF8EC] border-[#E3A008]/50 hover:bg-[#FCEFC7] text-[#8A6100] font-bold rounded-xl text-xs h-10 px-4 shadow-sm"
            >
              <FolderPlus className="h-4 w-4 mr-1.5 text-[#C1440E]" />
              + Nova Categoria
            </Button>
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
        <div className="sticky top-0 z-20 bg-[#F7F7F8]/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-gray-200/80 mb-6">
          {/* Category Pills */}
          <div className="min-w-0 w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none md:flex-wrap md:overflow-visible md:pb-0">
            <button
              type="button"
              aria-pressed={activeTab === "todos"}
              onClick={() => setActiveTab("todos")}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 ${
                activeTab === "todos"
                  ? "bg-gray-900 text-white border-gray-900 shadow-gray-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className={`h-3.5 w-3.5 shrink-0 ${activeTab === "todos" ? "text-amber-400" : "text-gray-400"}`} />
              <span>Todos</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === "todos" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {products.length}
              </span>
            </button>

            {categories.map((cat) => {
              const isActive = activeTab === cat.slug
              const count = categoryCounts[cat.slug] || 0
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(cat.slug)}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 ${
                    isActive
                      ? "bg-gray-900 text-white border-gray-900 shadow-gray-200"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? "inline-flex items-center justify-center rounded-md bg-white/95 p-0.5 shrink-0"
                        : "inline-flex items-center justify-center shrink-0"
                    }
                  >
                    <CategoryIcon
                      iconUrl={cat.icon_url}
                      iconType={cat.icon_type}
                      fallbackIcon={cat.fallback_icon}
                      accentColor={cat.accent_color}
                      sizeClassName="w-4 h-4 shrink-0"
                      iconClassName="w-3 h-3"
                    />
                  </span>
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isActive ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}

            <button
              type="button"
              aria-pressed={activeTab === "adicionais"}
              onClick={() => setActiveTab("adicionais")}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 ${
                activeTab === "adicionais"
                  ? "bg-gray-900 text-white border-gray-900 shadow-gray-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Layers className={`h-3.5 w-3.5 shrink-0 ${activeTab === "adicionais" ? "text-amber-400" : "text-gray-400"}`} />
              <span>Adicionais</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === "adicionais" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {adicionais.length}
              </span>
            </button>
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
                  const productCategory = findProductCategory(product)
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
                              {activeTab === "todos" && (
                                <span className="text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200/80 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                  {productCategory && (
                                    <CategoryIcon
                                      iconUrl={productCategory.icon_url}
                                      iconType={productCategory.icon_type}
                                      fallbackIcon={productCategory.fallback_icon}
                                      accentColor={productCategory.accent_color}
                                      sizeClassName="w-3.5 h-3.5"
                                      iconClassName="w-2.5 h-2.5"
                                    />
                                  )}
                                  {productCategory?.name || product.category}
                                </span>
                              )}
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

      {/* Dialog para Produtos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-3 min-w-0">
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-700">Categoria *</Label>
                    <Link
                      href="/admin/categorias"
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1"
                    >
                      Gerenciar categorias
                    </Link>
                  </div>
                  <Select value={selectedCategoryObj?.slug ?? formCategory} onValueChange={handleFormCategoryChange}>
                    <SelectTrigger className="rounded-xl text-xs h-10 border-gray-200">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          <span className="flex items-center gap-2">
                            <CategoryIcon
                              iconUrl={cat.icon_url}
                              iconType={cat.icon_type}
                              fallbackIcon={cat.fallback_icon}
                              accentColor={cat.accent_color}
                              sizeClassName="w-4 h-4"
                              iconClassName="w-3 h-3"
                            />
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                      {!selectedCategoryObj && formCategory && (
                        <SelectItem value={formCategory}>{formCategory}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Regras ativas da categoria selecionada */}
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-bold text-amber-900">Regras da categoria:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                        allowsAddons
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200/80 text-gray-600"
                      }`}
                    >
                      Adicionais: {allowsAddons ? "Ativado" : "Desativado"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                        allowsNotes
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200/80 text-gray-600"
                      }`}
                    >
                      Observações: {allowsNotes ? "Ativado" : "Desativado"}
                    </span>
                  </div>
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

              <div className="space-y-3 min-w-0">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Imagem do Produto</Label>
                  <PhotoBankPicker
                    value={formImage}
                    onSelect={setFormImage}
                    enabled={isDialogOpen}
                    usedUrls={usedImageUrls}
                    preferredName={formName}
                  />
                  <div className="space-y-1 pt-0.5">
                    <Label htmlFor="product-image-url" className="text-[11px] font-medium text-gray-500">
                      Ou cole uma URL manualmente
                    </Label>
                    <Input
                      id="product-image-url"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="/products/nome.jpg ou https://..."
                      className="rounded-lg text-xs h-8 border-gray-200 bg-gray-50/50 text-gray-600 focus:bg-white"
                    />
                  </div>
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
            {allowsAddons ? (
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
            ) : (
              <div className="pt-2 border-t border-gray-100">
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-amber-950">
                        Adicionais desativados para esta categoria
                      </p>
                      <p className="text-[11px] text-amber-800/80 leading-relaxed">
                        A categoria &ldquo;{selectedCategoryObj?.name || formCategory}&rdquo; está configurada para não permitir adicionais.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/categorias"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 bg-white border border-amber-200 hover:bg-amber-50 px-3 py-1.5 rounded-xl shrink-0 transition-colors"
                  >
                    Configurar categoria
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
                className="rounded-xl font-bold text-xs h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#EA1D2C] hover:bg-[#d01826] text-white font-bold rounded-xl text-xs h-10 px-6 shadow-sm"
              >
                {isSaving ? "Salvando..." : editingProduct ? "Salvar Alterações" : "Criar Produto"}
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

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.type === "product" ? "Excluir produto?" : "Excluir adicional?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === "product"
                ? "Tem certeza que deseja excluir este produto do cardápio?"
                : "Tem certeza que deseja excluir este adicional?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryFormModal
        open={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        initialCategory={null}
        nextOrders={nextCategoryOrders}
        quickMenuCreate
        onSaved={handleCategoryCreated}
      />
    </div>
  )
}