"use client"

import { appToast } from "@/lib/app-toast"

import type React from "react"
import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeleton"
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Home,
  CheckCircle2,
  Power,
  Sparkles,
  Heart,
  Bike,
  Moon,
  ChevronRight,
  Copy,
  Check,
  Image as ImageIcon,
  Upload,
  Users,
  ShoppingCart,
} from "lucide-react"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// Helpers idênticos ao App Mobile (c:\Dev\batata-top\app\admin\cupons.js)
function formatBR(value: string | number): string {
  const n = Number(String(value).replace(",", "."))
  if (isNaN(n)) return "0"
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(".", ",")
}

function generateCode(value: number, type: "percentage" | "fixed"): string {
  if (!value || isNaN(value)) return ""
  const clean = String(value).replace(",", "").replace(".", "")
  return `DESCONTO${clean}${type === "fixed" ? "RS" : "PCT"}`
}

function generateTitle(
  value: number,
  type: "percentage" | "fixed",
  code: string,
  showCodeInTitle: boolean
): string {
  if (showCodeInTitle && code) return code
  if (!value || isNaN(value)) return ""
  return type === "fixed" ? `R$ ${formatBR(value)} OFF` : `${formatBR(value)}% OFF`
}

function generateDescription(
  value: number,
  type: "percentage" | "fixed",
  categories: string[]
): string {
  if (!value || isNaN(value)) return ""
  const symbol = type === "fixed" ? `R$ ${formatBR(value)}` : `${formatBR(value)}%`
  const alvo = categories?.length ? categories.join(", ") : "batatas selecionadas"
  return `${symbol} pra ${alvo}.`
}

function formatExpiryPTBR(dateStr: string): string {
  if (!dateStr) return "Sem expiração"
  const d = new Date(dateStr + "T23:59:00")
  if (isNaN(d.getTime())) return "Sem expiração"
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano} às 23h59`
}

function generateRulesText({
  minOrderValue,
  expiresAt,
  isPermanent,
  quantityAvailable,
  maxUsesPerUser,
}: {
  minOrderValue: number
  expiresAt: string
  isPermanent: boolean
  quantityAvailable: string
  maxUsesPerUser: string
}): string {
  const linhas: string[] = []
  if (minOrderValue > 0) {
    linhas.push(
      `Válido para pedidos acima de R$ ${formatBR(minOrderValue)} (sem considerar a taxa de entrega).`
    )
  }
  const qtdeTexto = quantityAvailable ? ` ou até atingir ${quantityAvailable} cupons` : ""
  if (!isPermanent && expiresAt) {
    linhas.push(
      `Data de validade: Somente até ${formatExpiryPTBR(expiresAt)} (horário de Brasília)${qtdeTexto}.`
    )
  } else {
    linhas.push(`Cupom permanente (sem data de expiração)${qtdeTexto}.`)
  }
  linhas.push("Forma de pagamento: pague pelo app/site ou na entrega.")
  linhas.push(
    maxUsesPerUser
      ? `Limite de uso: ${maxUsesPerUser}x por usuário.`
      : "Limite de uso: ilimitado por usuário."
  )
  linhas.push("Cupom válido apenas para batatas selecionadas.")
  return linhas.join("\n")
}

// Templates Estratégicos de Cupons (Padrão Oficial do App)
const COUPON_TEMPLATES = [
  {
    id: "primeira_compra",
    tag: "first_order",
    badge: "PRIMEIRO PEDIDO",
    icon: Sparkles,
    iconColor: "#E3A008",
    title: "Atrair Novos Clientes",
    subtitle: "Cupom de boas-vindas com foco em conversão imediata de cadastros.",
    suggestedCode: "BEMVINDO15",
    suggestedType: "percentage" as const,
    suggestedValue: "15",
    suggestedMinOrder: "35",
    suggestedDaysValid: 14,
    suggestedMaxUsesPerUser: "1",
    suggestedQuantity: "100",
    showOnHome: true,
    isBannerHighlight: true,
  },
  {
    id: "clientes_sumidos",
    tag: "winback",
    badge: "QUE SAUDADE",
    icon: Heart,
    iconColor: "#C1440E",
    title: "Resgatar Clientes Sumidos",
    subtitle: "Desconto atrativo em reais para incentivar recompra de inativos.",
    suggestedCode: "VOLTAPRABATATA",
    suggestedType: "fixed" as const,
    suggestedValue: "10",
    suggestedMinOrder: "40",
    suggestedDaysValid: 7,
    suggestedMaxUsesPerUser: "1",
    suggestedQuantity: "50",
    showOnHome: true,
    isBannerHighlight: true,
  },
  {
    id: "frete_gratis",
    tag: "free_shipping",
    badge: "FRETE ZERO",
    icon: Bike,
    iconColor: "#27AE60",
    title: "Frete Grátis Batatop",
    subtitle: "Elimina a taxa de entrega para alavancar volume de vendas.",
    suggestedCode: "ENTREGATOP",
    suggestedType: "fixed" as const,
    suggestedValue: "8",
    suggestedMinOrder: "45",
    suggestedDaysValid: 5,
    suggestedMaxUsesPerUser: "2",
    suggestedQuantity: "80",
    showOnHome: true,
    isBannerHighlight: true,
  },
  {
    id: "combo_noite",
    tag: "peak_hours",
    badge: "NOITE DA BATATA",
    icon: Moon,
    iconColor: "#8E44AD",
    title: "Aumentar Ticket Noturno",
    subtitle: "Desconto maior condicionado a um pedido mínimo mais alto.",
    suggestedCode: "SEXTATOP",
    suggestedType: "fixed" as const,
    suggestedValue: "15",
    suggestedMinOrder: "70",
    suggestedDaysValid: 3,
    suggestedMaxUsesPerUser: "1",
    suggestedQuantity: "60",
    showOnHome: true,
    isBannerHighlight: true,
  },
]

interface LibraryImageItem {
  id: string
  name: string
  url: string
  previewUri: string
  category: "products" | "banners"
  categoryLabel: string
}

export default function AdminCuponsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "Batatas",
    "Macarrão",
    "Bebidas",
  ])
  const [filterTab, setFilterTab] = useState<"all" | "banners" | "active">("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Biblioteca de imagens (idêntico ao App)
  const [libraryModalVisible, setLibraryModalVisible] = useState(false)
  const [libraryImages, setLibraryImages] = useState<LibraryImageItem[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [libraryCategory, setLibraryCategory] = useState<"all" | "products" | "banners">("all")

  // Form states sincronizados 100% com App
  const [code, setCode] = useState("")
  const [type, setType] = useState<"percentage" | "fixed">("percentage")
  const [discount, setDiscount] = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [badgeLabel, setBadgeLabel] = useState("")
  const [showCodeInTitle, setShowCodeInTitle] = useState(false)
  const [maxUsagePerUser, setMaxUsagePerUser] = useState("1")
  const [maxUsage, setMaxUsage] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [isPermanent, setIsPermanent] = useState(false)
  const [showOnHome, setShowOnHome] = useState(false)
  const [homePriority, setHomePriority] = useState("0")
  const [bannerImageUrl, setBannerImageUrl] = useState("")
  const [isBannerHighlight, setIsBannerHighlight] = useState(false)
  const [restrictedCategories, setRestrictedCategories] = useState<string[]>([])
  const [rulesText, setRulesText] = useState("")
  const [rulesEdited, setRulesEdited] = useState(false)
  const [templateOrigin, setTemplateOrigin] = useState("custom")

  const showToast = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3200)
  }

  const loadCoupons = useCallback(async () => {
    const list = await couponsManager.getCoupons()
    setCoupons(list)
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.from("products").select("category")
      if (!error && data) {
        const unique = Array.from(
          new Set(data.map((p: any) => p.category).filter(Boolean))
        ).sort() as string[]
        if (unique.length > 0) {
          setAvailableCategories(unique)
        }
      }
    } catch {
      // mantém fallback padrão
    }
  }, [])

  const loadLibraryImages = useCallback(async () => {
    try {
      setLoadingLibrary(true)
      const supabase = getSupabaseBrowserClient()
      const list: LibraryImageItem[] = []

      // 1. Produtos do cardápio com imagem (bucket Products)
      const { data: dbProducts } = await supabase
        .from("products")
        .select("id, name, image_url, category")
        .not("image_url", "is", null)

      if (Array.isArray(dbProducts)) {
        dbProducts.forEach((p: any) => {
          if (!p.image_url) return
          const isFullUrl = /^https?:\/\//i.test(p.image_url) || p.image_url.startsWith("data:")
          const cleanName = String(p.image_url).replace(/^\/products\//, "")
          const pubUrl = isFullUrl
            ? p.image_url
            : `https://eucwoxjmjfqylyrqunwk.supabase.co/storage/v1/object/public/Products/${cleanName}`
          list.push({
            id: `prod-${p.id}`,
            name: p.name,
            url: pubUrl,
            previewUri: pubUrl,
            category: "products",
            categoryLabel: p.category ? String(p.category).toUpperCase() : "CARDÁPIO",
          })
        })
      }

      // 2. Imagens enviadas na galeria (uploaded_images)
      const { data: dbImages } = await supabase
        .from("uploaded_images")
        .select("id, name, mime_type, category, data, uploaded_at")
        .order("uploaded_at", { ascending: false })

      if (Array.isArray(dbImages)) {
        dbImages.forEach((img: any) => {
          const previewUri = img.data
            ? `data:${img.mime_type || "image/jpeg"};base64,${img.data}`
            : `/api/images/${img.id}`
          list.push({
            id: `upload-${img.id}`,
            name: img.name || "Galeria de Mídia",
            url: previewUri,
            previewUri,
            category: "banners",
            categoryLabel: "GALERIA",
          })
        })
      }

      // 3. Cupons com banner_image_url existente
      const { data: bannerCoupons } = await supabase
        .from("coupons")
        .select("id, code, title, banner_image_url")
        .not("banner_image_url", "is", null)

      if (Array.isArray(bannerCoupons)) {
        bannerCoupons.forEach((c: any) => {
          if (!c.banner_image_url) return
          if (!list.some((item) => item.url === c.banner_image_url)) {
            list.push({
              id: `coupon-${c.id}`,
              name: c.title || c.code || "Banner Cadastrado",
              url: c.banner_image_url,
              previewUri: c.banner_image_url,
              category: "banners",
              categoryLabel: "BANNERS",
            })
          }
        })
      }

      setLibraryImages(list)
    } catch (err) {
      console.warn("Erro ao carregar biblioteca de imagens:", err)
    } finally {
      setLoadingLibrary(false)
    }
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push("/login")
      return
    }

    checkIsAdmin(user.id).then((allowed) => {
      setCheckingAuth(false)
      if (allowed) {
        setIsAdmin(true)
        loadCoupons()
        loadCategories()
      } else {
        appToast.error("Acesso restrito", "Acesso restrito a administradores.")
        router.push("/")
      }
    })
  }, [user, loading, router, loadCoupons, loadCategories])

  // Atualiza regras automaticamente se o admin não tiver editado manualmente
  useEffect(() => {
    if (!rulesEdited) {
      const minOrderVal = parseFloat(minOrder.replace(",", ".")) || 0
      setRulesText(
        generateRulesText({
          minOrderValue: minOrderVal,
          expiresAt,
          isPermanent,
          quantityAvailable: maxUsage,
          maxUsesPerUser: maxUsagePerUser,
        })
      )
    }
  }, [minOrder, expiresAt, isPermanent, maxUsage, maxUsagePerUser, rulesEdited])

  // Abre seletor de template (Igual ao App)
  const handleStartCreation = () => {
    setEditingCoupon(null)
    setIsTemplateModalOpen(true)
  }

  // Criação a partir de template
  const handleSelectTemplate = (tmpl: (typeof COUPON_TEMPLATES)[0]) => {
    setIsTemplateModalOpen(false)
    setEditingCoupon(null)

    const expDate = new Date()
    expDate.setDate(expDate.getDate() + tmpl.suggestedDaysValid)
    const expStr = expDate.toISOString().split("T")[0]

    setCode(tmpl.suggestedCode)
    setType(tmpl.suggestedType)
    setDiscount(tmpl.suggestedValue)
    setMinOrder(tmpl.suggestedMinOrder)
    setBadgeLabel(tmpl.badge)
    setShowCodeInTitle(false)
    setMaxUsagePerUser(tmpl.suggestedMaxUsesPerUser)
    setMaxUsage(tmpl.suggestedQuantity)
    setExpiresAt(expStr)
    setIsPermanent(false)
    setShowOnHome(tmpl.showOnHome)
    setIsBannerHighlight(tmpl.isBannerHighlight ?? true)
    setBannerImageUrl("")
    setHomePriority("1")
    setRestrictedCategories([])
    setRulesEdited(false)
    setRulesText(
      generateRulesText({
        minOrderValue: parseFloat(tmpl.suggestedMinOrder) || 0,
        expiresAt: expStr,
        isPermanent: false,
        quantityAvailable: tmpl.suggestedQuantity,
        maxUsesPerUser: tmpl.suggestedMaxUsesPerUser,
      })
    )
    setTemplateOrigin(tmpl.tag)
    setIsModalOpen(true)
  }

  // Criação do zero (scratch)
  const handleSelectScratch = () => {
    setIsTemplateModalOpen(false)
    setEditingCoupon(null)

    const expDate = new Date()
    expDate.setDate(expDate.getDate() + 7)
    const expStr = expDate.toISOString().split("T")[0]

    setCode("")
    setType("fixed")
    setDiscount("")
    setMinOrder("")
    setBadgeLabel("")
    setShowCodeInTitle(false)
    setMaxUsagePerUser("")
    setMaxUsage("")
    setExpiresAt(expStr)
    setIsPermanent(false)
    setShowOnHome(false)
    setIsBannerHighlight(false)
    setBannerImageUrl("")
    setHomePriority("0")
    setRestrictedCategories([])
    setRulesEdited(false)
    setRulesText(
      generateRulesText({
        minOrderValue: 0,
        expiresAt: expStr,
        isPermanent: false,
        quantityAvailable: "",
        maxUsesPerUser: "",
      })
    )
    setTemplateOrigin("custom")
    setIsModalOpen(true)
  }

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setCode(coupon.code)
    setType(coupon.type)
    setDiscount(coupon.discount.toString())
    setMinOrder(coupon.minOrderValue != null ? coupon.minOrderValue.toString() : "")
    setBadgeLabel(coupon.badgeLabel || "")
    setShowCodeInTitle(!!coupon.showCodeInTitle)
    setMaxUsagePerUser(coupon.maxUsagePerUser != null ? coupon.maxUsagePerUser.toString() : "")
    setMaxUsage(coupon.maxUsage != null ? coupon.maxUsage.toString() : "")

    if (coupon.expiresAt) {
      setExpiresAt(new Date(coupon.expiresAt).toISOString().split("T")[0])
      setIsPermanent(false)
    } else {
      setExpiresAt("")
      setIsPermanent(true)
    }
    setShowOnHome(!!coupon.showOnHome)
    setHomePriority(String(coupon.homePriority ?? 0))
    setBannerImageUrl(coupon.bannerImageUrl || "")
    setIsBannerHighlight(!!coupon.isBannerHighlight)
    setRestrictedCategories(coupon.restrictedCategories || [])
    setRulesText(coupon.rulesText || "")
    setRulesEdited(Boolean(coupon.rulesText))
    setTemplateOrigin(coupon.templateOrigin || "custom")
    setIsModalOpen(true)
  }

  const toggleCategory = (cat: string) => {
    setRestrictedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleCopyCode = async (couponCode: string, id: string) => {
    try {
      await navigator.clipboard.writeText(couponCode)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // fallback silencioso
    }
  }

  // Upload de imagem do computador/celular direto para o banner (igual ao handlePickBannerImage do App)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`

      // 1. Tenta upload direto no bucket coupon-banners
      const { error: storageErr } = await supabase.storage
        .from("coupon-banners")
        .upload(fileName, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        })

      if (!storageErr) {
        const { data: publicData } = supabase.storage
          .from("coupon-banners")
          .getPublicUrl(fileName)

        if (publicData?.publicUrl) {
          setBannerImageUrl(publicData.publicUrl)
          showToast("Imagem do banner enviada com sucesso!")
          return
        }
      }

      // 2. Fallback para base64 + uploaded_images
      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const rawBase64 = base64DataUrl.split(",")[1]
      if (rawBase64) {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
        await supabase.from("uploaded_images").insert({
          id,
          name: file.name || fileName,
          data: rawBase64,
          mime_type: file.type || "image/jpeg",
          category: "promo",
          uploaded_at: new Date().toISOString(),
        })
      }

      setBannerImageUrl(base64DataUrl)
      showToast("Imagem vinculada ao banner com sucesso!")
    } catch (err) {
      console.warn("Erro ao enviar imagem do banner:", err)
      appToast.error("Imagem inválida", "Não foi possível carregar a imagem selecionada.")
    } finally {
      setUploadingBanner(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Preview em tempo real idêntico ao App
  const preview = useMemo(() => {
    const valNum = parseFloat(discount.replace(",", ".")) || 0
    const codeDisplay =
      code.trim().toUpperCase() ||
      (valNum > 0 ? generateCode(valNum, type) : "CUPOM")
    const discountLabel = showCodeInTitle
      ? codeDisplay
      : type === "percentage"
      ? `${formatBR(valNum)}% OFF`
      : `R$ ${formatBR(valNum)} OFF`

    const minOrderVal = parseFloat(minOrder.replace(",", ".")) || 0
    const minOrderText =
      minOrderVal > 0
        ? `Válido para pedidos acima de R$ ${formatBR(minOrderVal)}.`
        : generateDescription(valNum, type, restrictedCategories) ||
          "Válido para todo o cardápio"

    return {
      code: codeDisplay,
      title: generateTitle(valNum, type, codeDisplay, showCodeInTitle),
      description: generateDescription(valNum, type, restrictedCategories),
      discountLabel,
      minOrderText,
      badge: badgeLabel.trim(),
    }
  }, [discount, type, code, showCodeInTitle, minOrder, badgeLabel, restrictedCategories])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isBannerHighlight && !bannerImageUrl.trim()) {
      appToast.warning("Imagem necessária", "Informe a URL da imagem ou escolha da Galeria.")
      return
    }

    const valNum = parseFloat(discount.replace(",", "."))
    if (isNaN(valNum) || valNum <= 0) {
      appToast.warning("Valor inválido", "Informe um valor de desconto válido.")
      return
    }

    if (type === "percentage" && (valNum <= 0 || valNum > 100)) {
      appToast.warning("Desconto inválido", "O desconto percentual deve estar entre 1% e 100%.")
      return
    }

    let minOrderVal: number | null = null
    if (minOrder.trim() !== "") {
      minOrderVal = parseFloat(minOrder.replace(",", "."))
      if (isNaN(minOrderVal) || minOrderVal <= 0) {
        appToast.warning("Valor inválido", "Valor mínimo do pedido deve ser maior que zero.")
        return
      }
    }

    const finalCode =
      code.trim().toUpperCase().replace(/\s+/g, "") || generateCode(valNum, type)

    const duplicate = coupons.find(
      (c) => c.code?.toUpperCase() === finalCode.toUpperCase() && c.id !== editingCoupon?.id
    )
    if (duplicate) {
      appToast.error("Cupom duplicado", "Já existe um cupom com esse código.")
      return
    }

    setIsSaving(true)
    try {
      const maxUsageVal = maxUsage.trim() ? parseInt(maxUsage, 10) : undefined
      const maxPerUserVal = maxUsagePerUser.trim() ? parseInt(maxUsagePerUser, 10) : undefined

      const payload: Partial<Coupon> = {
        code: finalCode,
        title: preview.title || preview.discountLabel,
        description:
          preview.description ||
          (minOrderVal
            ? `Válido em pedidos acima de R$ ${minOrderVal}`
            : "Válido para todo o cardápio"),
        rulesText: rulesText.trim() || null,
        discount: valNum,
        type,
        minOrderValue: minOrderVal,
        restrictedCategories: restrictedCategories.length > 0 ? restrictedCategories : null,
        maxUsagePerUser: maxPerUserVal,
        maxUsage: maxUsageVal,
        expiresAt: isPermanent ? null : expiresAt ? new Date(expiresAt + "T23:59:00") : null,
        showCodeInTitle,
        showOnHome,
        homePriority: parseInt(homePriority, 10) || 0,
        bannerImageUrl: bannerImageUrl.trim() || null,
        badgeLabel: badgeLabel.trim() || null,
        isBannerHighlight,
        templateOrigin,
        isActive: editingCoupon ? editingCoupon.isActive : true,
      }

      if (editingCoupon) {
        await couponsManager.updateCoupon(editingCoupon.id, payload)
        showToast("Cupom atualizado com sucesso!")
      } else {
        await couponsManager.addCoupon(payload as any)
        showToast("Cupom criado com sucesso!")
      }

      setIsModalOpen(false)
      await loadCoupons()
    } catch (err: any) {
      appToast.error("Erro ao salvar", err.message || "Não foi possível salvar o cupom.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleHome = async (coupon: Coupon) => {
    try {
      const nextVal = !coupon.showOnHome
      await couponsManager.updateCoupon(coupon.id, { showOnHome: nextVal })
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, showOnHome: nextVal } : c))
      )
      showToast(nextVal ? "Cupom destacado na vitrine da Home!" : "Cupom removido da vitrine.")
    } catch {
      appToast.error("Erro", "Não foi possível atualizar o destaque na Home.")
    }
  }

  const handleToggleBannerHighlight = async (coupon: Coupon) => {
    if (!coupon.bannerImageUrl) {
      appToast.warning(
        "Sem imagem de banner",
        'Este cupom não possui imagem vinculada. Clique em "Editar" para adicionar a imagem do banner primeiro.'
      )
      return
    }
    try {
      const nextVal = !coupon.isBannerHighlight
      await couponsManager.updateCoupon(coupon.id, { isBannerHighlight: nextVal })
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isBannerHighlight: nextVal } : c))
      )
      showToast(
        nextVal
          ? "Banner ativado no carrossel da Home!"
          : "Banner removido do carrossel da Home."
      )
    } catch {
      appToast.error("Erro", "Não foi possível atualizar o status do banner.")
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const nextVal = !coupon.isActive
      await couponsManager.updateCoupon(coupon.id, { isActive: nextVal })
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: nextVal } : c))
      )
    } catch {
      appToast.error("Erro", "Não foi possível alterar o status do cupom.")
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Excluir o cupom "${coupon.code}"?`)) return
    try {
      await couponsManager.deleteCoupon(coupon.id)
      await loadCoupons()
      showToast("Cupom excluído.")
    } catch {
      appToast.error("Erro", "Não foi possível excluir o cupom.")
    }
  }

  if (checkingAuth) {
    return <AdminTableSkeleton rows={6} />
  }

  if (!isAdmin) return null

  const activeCoupons = coupons.filter((c) => c.isActive)
  const inactiveCoupons = coupons.filter((c) => !c.isActive)
  const bannerCoupons = coupons.filter((c) => Boolean(c.bannerImageUrl) || c.isBannerHighlight)
  const activeBannersCount = coupons.filter(
    (c) => c.isBannerHighlight && Boolean(c.bannerImageUrl)
  ).length

  const renderTicketCard = (c: Coupon) => {
    const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date()
    const isCopied = copiedId === c.id

    return (
      <div
        key={c.id}
        className={`bg-white rounded-2xl border border-[#ECE7E0] p-4 flex flex-col gap-3 transition-shadow hover:shadow-xs ${
          !c.isActive ? "opacity-75" : ""
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FEF8EC] border border-[#FCE8C3] flex items-center justify-center shrink-0">
              <img src="/assets/cuponverde.png" alt="Cupom" className="w-7 h-7 object-contain" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleCopyCode(c.code, c.id)}
                  className="font-black text-sm text-[#C1440E] px-2.5 py-0.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-1.5 cursor-pointer hover:bg-[#FEE2E2] transition-colors"
                  title="Clique para copiar o código"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#C1440E]" />
                  <span>{c.code}</span>
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-400" />
                  )}
                </button>

                <span className="text-sm font-black text-[#1F1B16]">
                  {c.type === "percentage"
                    ? `${formatBR(c.discount)}% OFF`
                    : `R$ ${formatBR(c.discount)} OFF`}
                </span>

                {c.badgeLabel && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                    {c.badgeLabel}
                  </span>
                )}
                {c.showOnHome && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center gap-1">
                    <Home className="w-2.5 h-2.5 text-[#D97706]" /> Vitrine
                  </span>
                )}
                {c.isBannerHighlight && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center gap-1">
                    <ImageIcon className="w-2.5 h-2.5 text-[#15803D]" /> Banner
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {c.isActive ? "Ativo" : "Pausado"}
                </span>
                {isExpired && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    Expirado
                  </span>
                )}
              </div>

              {c.title && c.title !== c.code && (
                <p className="text-xs font-bold text-[#374151]">{c.title}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6157]">
                <span className="flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3 text-stone-400" />
                  {c.minOrderValue
                    ? `Mínimo: R$ ${formatBR(c.minOrderValue)}`
                    : "Sem mínimo"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-stone-400" />
                  Usos: {c.usageCount || 0}
                  {c.maxUsage ? `/${c.maxUsage}` : " (ilimitado)"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-stone-400" />
                  Validade:{" "}
                  {c.expiresAt
                    ? new Date(c.expiresAt).toLocaleDateString("pt-BR")
                    : "Permanente"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 flex-wrap">
            <Button
              onClick={() => handleToggleBannerHighlight(c)}
              variant="outline"
              size="sm"
              className={`h-8 px-2.5 text-xs font-bold rounded-lg cursor-pointer ${
                c.isBannerHighlight
                  ? "bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]"
                  : "border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
              title="Destacar ou remover do Carrossel de Banners da Home"
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1" />
              <span>{c.isBannerHighlight ? "Banner ON" : "Banner"}</span>
            </Button>

            <Button
              onClick={() => handleToggleHome(c)}
              variant="outline"
              size="sm"
              className={`h-8 px-2.5 text-xs font-bold rounded-lg cursor-pointer ${
                c.showOnHome
                  ? "bg-[#FEF8EC] border-[#E3A008] text-[#8A6100]"
                  : "border-stone-200 text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Home className="h-3.5 w-3.5 mr-1 text-[#E3A008]" />
              <span>{c.showOnHome ? "Vitrine ON" : "Vitrine"}</span>
            </Button>

            <Button
              onClick={() => handleToggleActive(c)}
              variant="outline"
              size="sm"
              className={`h-8 px-2 text-xs font-bold rounded-lg cursor-pointer ${
                c.isActive
                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  : "border-stone-200 text-stone-500 hover:bg-stone-100"
              }`}
            >
              <Power className="h-3.5 w-3.5 mr-1" />
              <span>{c.isActive ? "Ativo" : "Pausado"}</span>
            </Button>

            <Button
              onClick={() => handleOpenEdit(c)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-stone-600 hover:text-[#1F1B16] rounded-lg cursor-pointer"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => handleDelete(c)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-stone-400 hover:text-red-600 rounded-lg cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Visualização do Banner anexado ao Cupom (Idêntico ao TicketCard do App) */}
        {c.bannerImageUrl && (
          <div className="mt-1 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-full sm:w-44 aspect-[16/9] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative">
              <img
                src={c.bannerImageUrl}
                alt={c.code}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    c.isBannerHighlight
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  {c.isBannerHighlight ? "No Carrossel da Home" : "Fora do Carrossel"}
                </span>
                {c.badgeLabel && (
                  <span className="text-[11px] font-bold text-[#92400E]">
                    Selo: {c.badgeLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                Prioridade na Home: {c.homePriority ?? 0}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast de Notificação */}
      {notice && (
        <div className="fixed top-4 right-4 z-50 bg-[#1F1B16] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-[#27AE60]" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header Gestão de Cupons (Idêntico ao App) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE7E0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1F1B16] tracking-tight">
              Gestão de Cupons
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3]">
              {activeCoupons.length} ativo(s) · {activeBannersCount} banner(s) no ar
            </span>
          </div>
          <p className="text-xs text-[#6B6157] mt-1 font-medium">
            Crie cupons promocionais, vincule banners 16:9 no carrossel da Home e sincronize com o App e Site.
          </p>
        </div>

        <Button
          onClick={handleStartCreation}
          className="bg-[#C1440E] hover:bg-[#A33608] text-white font-bold h-10 px-4 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cupom</span>
        </Button>
      </div>

      {/* Abas de Navegação / Filtro (Idêntico ao App: Todos / Banners Home / Ativos) */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterTab("all")}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer border ${
            filterTab === "all"
              ? "bg-[#C1440E] text-white border-[#C1440E] shadow-xs"
              : "bg-white text-[#6B6157] border-[#ECE7E0] hover:bg-stone-50"
          }`}
        >
          Todos ({coupons.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("banners")}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 ${
            filterTab === "banners"
              ? "bg-[#C1440E] text-white border-[#C1440E] shadow-xs"
              : "bg-white text-[#C1440E] border-[#ECE7E0] hover:bg-stone-50"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Banners Home ({activeBannersCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab("active")}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer border ${
            filterTab === "active"
              ? "bg-[#C1440E] text-white border-[#C1440E] shadow-xs"
              : "bg-white text-[#6B6157] border-[#ECE7E0] hover:bg-stone-50"
          }`}
        >
          Ativos ({activeCoupons.length})
        </button>
      </div>

      {/* Lista de Cupons Filtrada por Aba */}
      <div className="space-y-4">
        {filterTab === "banners" ? (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider">
                Banners Promocionais da Home
              </h2>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                {bannerCoupons.length}
              </span>
            </div>
            {bannerCoupons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#ECE7E0] p-12 text-center">
                <ImageIcon className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1F1B16]">Nenhum banner cadastrado</p>
                <p className="text-xs text-[#6B6157] mt-1">
                  Edite ou crie um cupom e ative a opção &quot;Destacar como Banner no Carrossel&quot;.
                </p>
              </div>
            ) : (
              bannerCoupons.map(renderTicketCard)
            )}
          </>
        ) : filterTab === "active" ? (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider">
                Cupons Ativos
              </h2>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {activeCoupons.length}
              </span>
            </div>
            {activeCoupons.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#ECE7E0] p-12 text-center">
                <Ticket className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1F1B16]">Nenhum cupom ativo no momento</p>
              </div>
            ) : (
              activeCoupons.map(renderTicketCard)
            )}
          </>
        ) : (
          <>
            {/* Seção: Ativos */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider">
                  Cupons Ativos
                </h2>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {activeCoupons.length}
                </span>
              </div>
              {activeCoupons.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-[#ECE7E0] p-10 text-center">
                  <Ticket className="h-9 w-9 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#1F1B16]">Nenhum cupom ativo no momento</p>
                </div>
              ) : (
                activeCoupons.map(renderTicketCard)
              )}
            </div>

            {/* Seção: Inativos / Pausados */}
            {inactiveCoupons.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-stone-500 uppercase tracking-wider">
                    Inativos / Pausados
                  </h2>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                    {inactiveCoupons.length}
                  </span>
                </div>
                {inactiveCoupons.map(renderTicketCard)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal 1: Seletor de Template de Cupons (Idêntico ao CouponTemplateSelectorModal do App) */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#ECE7E0]">
            <DialogTitle className="text-lg font-black text-[#1F1B16]">
              Como quer criar o cupom?
            </DialogTitle>
            <p className="text-xs text-[#6B6157] font-medium">
              Escolha uma ideia de sucesso ou configure o cupom do zero.
            </p>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            {/* Opção Criar do Zero */}
            <div
              onClick={handleSelectScratch}
              className="p-3.5 rounded-xl border-2 border-dashed border-[#ECE7E0] hover:border-[#E3A008] bg-[#FAFAF9] hover:bg-[#FEF8EC]/50 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#ECE7E0] group-hover:border-[#E3A008] flex items-center justify-center text-[#E3A008]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F1B16]">Criar do Zero</p>
                  <p className="text-xs text-[#6B6157]">
                    Configurar valores, regras, banners e códigos manualmente
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-[#E3A008]" />
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-[1px] bg-[#ECE7E0]" />
              <span className="text-[10px] font-bold text-[#6B6157] uppercase tracking-wider">
                Ou escolha um template guia
              </span>
              <div className="flex-1 h-[1px] bg-[#ECE7E0]" />
            </div>

            {/* Templates Cards */}
            <div className="space-y-2.5">
              {COUPON_TEMPLATES.map((tmpl) => {
                const IconComponent = tmpl.icon
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="p-3.5 rounded-xl border border-[#ECE7E0] hover:border-[#E3A008] bg-white hover:bg-[#FEF8EC]/30 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tmpl.iconColor}15`, color: tmpl.iconColor }}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#1F1B16]">{tmpl.title}</p>
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${tmpl.iconColor}20`,
                              color: tmpl.iconColor,
                            }}
                          >
                            {tmpl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6157] leading-snug">{tmpl.subtitle}</p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {tmpl.suggestedType === "percentage"
                              ? `${tmpl.suggestedValue}% OFF`
                              : `R$ ${tmpl.suggestedValue} OFF`}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            Mínimo R$ {tmpl.suggestedMinOrder}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-[#E3A008]">
                            {tmpl.suggestedCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-[#E3A008] shrink-0 ml-2" />
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Formulário Completo com Banner Carrossel e Live Ticket Preview (Idêntico ao AdminCupons do App) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#ECE7E0]">
            <DialogTitle className="text-lg font-black text-[#1F1B16]">
              {editingCoupon ? `Editar Cupom (${editingCoupon.code})` : "Novo Cupom"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Tipo e Valor de Desconto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Tipo de Desconto *
                </Label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType("fixed")}
                    className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      type === "fixed"
                        ? "bg-[#C1440E] text-white shadow-2xs"
                        : "text-[#6B6157]"
                    }`}
                  >
                    Valor Fixo (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("percentage")}
                    className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                      type === "percentage"
                        ? "bg-[#C1440E] text-white shadow-2xs"
                        : "text-[#6B6157]"
                    }`}
                  >
                    Porcentagem (%)
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  {type === "fixed" ? "Valor do Desconto (R$) *" : "Percentual de Desconto (%) *"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder={type === "fixed" ? "Ex: 10,00" : "Ex: 15"}
                  className="h-10 rounded-xl border-[#ECE7E0]"
                  required
                />
              </div>
            </div>

            {/* Código Customizado */}
            <div>
              <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                Código do Cupom (opcional)
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Vazio = gera automático (ex: DESCONTO10PCT)"
                className="h-10 font-bold uppercase rounded-xl border-[#ECE7E0]"
                maxLength={20}
              />
            </div>

            {/* Badge / Etiqueta Promocional */}
            <div>
              <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                Badge / Etiqueta Promocional (opcional)
              </Label>
              <Input
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value.toUpperCase())}
                placeholder="Ex: NOVIDADE, 1º PEDIDO, IMPERDÍVEL"
                className="h-10 rounded-xl border-[#ECE7E0]"
                maxLength={18}
              />
            </div>

            {/* Pedido Mínimo */}
            <div>
              <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                Pedido Mínimo (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="Ex: 30,00 (deixe vazio se não houver)"
                className="h-10 rounded-xl border-[#ECE7E0]"
              />
            </div>

            {/* Switches: Mostrar código no título & Exibir na Home */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl border border-[#ECE7E0] bg-[#FAFAF9] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Mostrar código no título</p>
                  <p className="text-[11px] text-[#6B6157]">
                    Exibe o código no card em vez de &quot;10% OFF&quot;
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showCodeInTitle}
                  onChange={(e) => setShowCodeInTitle(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E3A008] cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl border border-[#ECE7E0] bg-[#FAFAF9] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Exibir na Home</p>
                  <p className="text-[11px] text-[#6B6157]">
                    Destaca o cupom na vitrine da tela inicial
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={showOnHome}
                  onChange={(e) => setShowOnHome(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E3A008] cursor-pointer"
                />
              </div>

              {/* Destacar como Banner no Carrossel (Idêntico ao App) */}
              <div className="p-3 rounded-xl border border-[#FCE8C3] bg-[#FEF8EC] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">
                    Destacar como Banner no Carrossel
                  </p>
                  <p className="text-[11px] text-[#8A6100]">
                    Vincular imagem promocional de destaque na Home (App & Site)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isBannerHighlight}
                  onChange={(e) => setIsBannerHighlight(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E3A008] cursor-pointer"
                />
              </div>
            </div>

            {/* Caixa de Configuração do Banner (Idêntico ao s.bannerConfigBox do App) */}
            {isBannerHighlight && (
              <div className="p-4 rounded-2xl border-2 border-[#FCE8C3] bg-[#FFFDF9] space-y-3">
                <p className="text-[11px] text-[#92400E] bg-[#FEF3C7]/70 p-2.5 rounded-xl font-medium leading-relaxed">
                  💡 Proporção recomendada: 16:9 (ex: 1920×1080 ou 1080×608). O carrossel da Home no App e no Site se adapta automaticamente e aplica o cupom ao clicar.
                </p>

                <div>
                  <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                    URL da Imagem do Banner *
                  </Label>
                  <Input
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://... ou escolha do banco/galeria abaixo"
                    className="h-10 rounded-xl border-[#ECE7E0] bg-white text-xs"
                  />

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        loadLibraryImages()
                        setLibraryModalVisible(true)
                      }}
                      className="h-9 px-3 rounded-xl border border-[#FCD34D] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] text-[#C1440E] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Banco de Imagens</span>
                    </button>

                    <button
                      type="button"
                      disabled={uploadingBanner}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 px-3 rounded-xl border border-[#FCD34D] bg-[#FEF3C7]/60 hover:bg-[#FEF3C7] text-[#C1440E] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingBanner ? "Enviando..." : "Subir da Galeria"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                      Selo / Badge (opcional)
                    </Label>
                    <Input
                      value={badgeLabel}
                      onChange={(e) => setBadgeLabel(e.target.value.toUpperCase())}
                      placeholder="Ex: MAIS PEDIDA, 50% OFF"
                      className="h-10 rounded-xl border-[#ECE7E0] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                      Prioridade na Home (0 a 100)
                    </Label>
                    <Input
                      type="number"
                      value={homePriority}
                      onChange={(e) => setHomePriority(e.target.value)}
                      placeholder="0"
                      className="h-10 rounded-xl border-[#ECE7E0] bg-white text-xs"
                    />
                  </div>
                </div>

                {Boolean(bannerImageUrl) && (
                  <div className="pt-1">
                    <Label className="text-xs font-bold text-[#1F1B16] mb-1.5 block">
                      Pré-visualização do Banner
                    </Label>
                    <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-[#ECE7E0] bg-stone-100">
                      <img
                        src={bannerImageUrl}
                        alt="Preview do Banner"
                        className="w-full h-full object-cover"
                      />
                      {Boolean(badgeLabel) && (
                        <div className="absolute top-2.5 left-2.5 bg-black/75 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                          {badgeLabel}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validade / Permanente */}
            <div className="p-3 rounded-xl border border-[#ECE7E0] bg-[#FAFAF9] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Cupom Permanente</p>
                  <p className="text-[11px] text-[#6B6157]">Sem data de expiração</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E3A008] cursor-pointer"
                />
              </div>

              {!isPermanent && (
                <div>
                  <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                    Data de Expiração *
                  </Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-10 rounded-xl border-[#ECE7E0] bg-white"
                    required={!isPermanent}
                  />
                </div>
              )}
            </div>

            {/* Limites de Uso */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Limite Global
                </Label>
                <Input
                  type="number"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)}
                  placeholder="Ilimitado"
                  className="h-10 rounded-xl border-[#ECE7E0]"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Limite por Pessoa
                </Label>
                <Input
                  type="number"
                  value={maxUsagePerUser}
                  onChange={(e) => setMaxUsagePerUser(e.target.value)}
                  placeholder="Ilimitado"
                  className="h-10 rounded-xl border-[#ECE7E0]"
                />
              </div>
            </div>

            {/* Categorias Restritas */}
            {availableCategories.length > 0 && (
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1.5 block">
                  Categorias Válidas (opcional)
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableCategories.map((cat) => {
                    const selected = restrictedCategories.includes(cat)
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`h-8 px-3 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                          selected
                            ? "bg-[#FEF8EC] border-[#E3A008] text-[#8A6100]"
                            : "bg-white border-[#ECE7E0] text-[#6B6157] hover:bg-stone-50"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Regras do Cupom (editável - idêntico ao App) */}
            <div>
              <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                Regras do Cupom (editável)
              </Label>
              <textarea
                rows={4}
                value={rulesText}
                onChange={(e) => {
                  setRulesText(e.target.value)
                  setRulesEdited(true)
                }}
                className="w-full rounded-xl border border-[#ECE7E0] p-3 text-xs text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
              />
            </div>

            {/* Live Preview do Ticket (Design da Home) */}
            {discount.trim() !== "" && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-[#6B6157] uppercase tracking-wider mb-2">
                  Pré-visualização (Design da Home)
                </p>

                <div className="w-full max-w-sm mx-auto flex flex-col shadow-xs bg-[#F7F4EF] p-2 rounded-2xl">
                  <div className="bg-white rounded-t-2xl border-x-[1.5px] border-t-[1.5px] border-[#E5E7EB] px-3.5 pt-3 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <img
                          src="/assets/cuponverde.png"
                          alt="Cupom"
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-black text-[#1F1B16] tracking-tight leading-tight truncate">
                            {preview.discountLabel}
                          </h3>
                          {preview.badge && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#E3A008]/20 text-[#8A6100]">
                              {preview.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B7280] font-medium truncate mt-0.5">
                          {preview.minOrderText}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-3.5 bg-white flex items-center justify-between">
                    <div className="w-2 h-3.5 overflow-hidden relative shrink-0">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EF] border-[1.5px] border-[#E5E7EB] absolute -left-[7px] top-0" />
                    </div>
                    <div className="flex-1 border-t border-dashed border-[#D1D5DB] mx-2" />
                    <div className="w-2 h-3.5 overflow-hidden relative shrink-0">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EF] border-[1.5px] border-[#E5E7EB] absolute -right-[7px] top-0" />
                    </div>
                  </div>

                  <div className="bg-white rounded-b-2xl border-x-[1.5px] border-b-[1.5px] border-[#E5E7EB] px-3 pt-1.5 pb-2.5">
                    <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border-[1.2px] border-dashed border-[#D1D5DB] bg-[#F9FAFB]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Copy className="w-3.5 h-3.5 text-[#FFB800] shrink-0" />
                        <span className="text-xs font-black tracking-wide text-[#1F1B16] truncate">
                          {preview.code}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#FFB800] shrink-0 ml-1.5">
                        Copiar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ECE7E0]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="h-10 rounded-xl text-xs font-bold text-stone-600 cursor-pointer"
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 px-6 rounded-xl bg-[#C1440E] hover:bg-[#A33608] text-white font-bold text-xs shadow-xs cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Seletor do Banco de Imagens do App (Idêntico ao libraryModalVisible do App) */}
      <Dialog open={libraryModalVisible} onOpenChange={setLibraryModalVisible}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white max-h-[88vh] flex flex-col">
          <DialogHeader className="pb-3 border-b border-[#ECE7E0]">
            <DialogTitle className="text-base font-black text-[#1F1B16]">
              Banco de Imagens do App & Site
            </DialogTitle>
            <p className="text-xs text-[#6B6157]">
              Clique em uma imagem para vinculá-la ao banner promocional
            </p>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2 flex-wrap">
            <button
              type="button"
              onClick={() => setLibraryCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border ${
                libraryCategory === "all"
                  ? "bg-[#C1440E] text-white border-[#C1440E]"
                  : "bg-white text-stone-600 border-stone-200"
              }`}
            >
              Todas ({libraryImages.length})
            </button>
            <button
              type="button"
              onClick={() => setLibraryCategory("products")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border ${
                libraryCategory === "products"
                  ? "bg-[#C1440E] text-white border-[#C1440E]"
                  : "bg-white text-stone-600 border-stone-200"
              }`}
            >
              Cardápio ({libraryImages.filter((i) => i.category === "products").length})
            </button>
            <button
              type="button"
              onClick={() => setLibraryCategory("banners")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer border ${
                libraryCategory === "banners"
                  ? "bg-[#C1440E] text-white border-[#C1440E]"
                  : "bg-white text-stone-600 border-stone-200"
              }`}
            >
              Galeria & Banners ({libraryImages.filter((i) => i.category === "banners").length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loadingLibrary ? (
              <div className="py-12 text-center text-xs text-stone-500 animate-pulse">
                Carregando imagens do catálogo...
              </div>
            ) : libraryImages.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500">
                Nenhuma imagem encontrada no banco. Use o botão &quot;Subir da Galeria&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {libraryImages
                  .filter(
                    (img) => libraryCategory === "all" || img.category === libraryCategory
                  )
                  .map((img) => {
                    const isSelected = bannerImageUrl === img.url
                    return (
                      <div
                        key={img.id}
                        onClick={() => {
                          setBannerImageUrl(img.url)
                          setLibraryModalVisible(false)
                          showToast("Imagem vinculada ao banner!")
                        }}
                        className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? "border-2 border-emerald-600 ring-2 ring-emerald-500/20"
                            : "border-stone-200 hover:border-[#C1440E]"
                        }`}
                      >
                        <div className="aspect-[16/10] bg-stone-100 overflow-hidden">
                          <img
                            src={img.previewUri}
                            alt={img.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-2 bg-white">
                          <span className="inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 mb-0.5">
                            {img.categoryLabel}
                          </span>
                          <p className="text-[11px] font-bold text-stone-800 truncate">
                            {img.name}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
