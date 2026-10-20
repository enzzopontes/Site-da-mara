"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Home,
  CheckCircle2,
  Power,
  Store,
  Clock,
  Sparkles,
  Heart,
  Bike,
  Moon,
  ChevronRight,
  Copy,
  Check,
  X,
  Lock,
} from "lucide-react"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"

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
  },
]

const AVAILABLE_CATEGORIES = ["Batatas", "Macarrão", "Bebidas"]

export default function AdminCuponsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Form states sincronizados com App
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
  const [restrictedCategories, setRestrictedCategories] = useState<string[]>([])
  const [templateOrigin, setTemplateOrigin] = useState("custom")

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
      } else {
        alert("Acesso restrito a administradores.")
        router.push("/")
      }
    })
  }, [user, loading, router])

  const loadCoupons = async () => {
    const list = await couponsManager.getCoupons()
    setCoupons(list)
  }

  // Abre seletor de template (Igual ao App)
  const handleStartCreation = () => {
    setEditingCoupon(null)
    setIsTemplateModalOpen(true)
  }

  // Criação a partir de template
  const handleSelectTemplate = (tmpl: typeof COUPON_TEMPLATES[0]) => {
    setIsTemplateModalOpen(false)
    setEditingCoupon(null)

    const expDate = new Date()
    expDate.setDate(expDate.getDate() + tmpl.suggestedDaysValid)

    setCode(tmpl.suggestedCode)
    setType(tmpl.suggestedType)
    setDiscount(tmpl.suggestedValue)
    setMinOrder(tmpl.suggestedMinOrder)
    setBadgeLabel(tmpl.badge)
    setShowCodeInTitle(false)
    setMaxUsagePerUser(tmpl.suggestedMaxUsesPerUser)
    setMaxUsage(tmpl.suggestedQuantity)
    setExpiresAt(expDate.toISOString().split("T")[0])
    setIsPermanent(false)
    setShowOnHome(tmpl.showOnHome)
    setHomePriority("1")
    setRestrictedCategories([])
    setTemplateOrigin(tmpl.tag)
    setIsModalOpen(true)
  }

  // Criação do zero (scratch)
  const handleSelectScratch = () => {
    setIsTemplateModalOpen(false)
    setEditingCoupon(null)

    const expDate = new Date()
    expDate.setDate(expDate.getDate() + 7)

    setCode("")
    setType("percentage")
    setDiscount("")
    setMinOrder("")
    setBadgeLabel("")
    setShowCodeInTitle(false)
    setMaxUsagePerUser("1")
    setMaxUsage("")
    setExpiresAt(expDate.toISOString().split("T")[0])
    setIsPermanent(false)
    setShowOnHome(false)
    setHomePriority("0")
    setRestrictedCategories([])
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
    setShowCodeInTitle(false)
    setMaxUsagePerUser(coupon.maxUsagePerUser != null ? coupon.maxUsagePerUser.toString() : "1")
    setMaxUsage(coupon.maxUsage != null ? coupon.maxUsage.toString() : "")

    if (coupon.expiresAt) {
      setExpiresAt(new Date(coupon.expiresAt).toISOString().split("T")[0])
      setIsPermanent(false)
    } else {
      setExpiresAt("")
      setIsPermanent(true)
    }
    setShowOnHome(!!coupon.showOnHome)
    setHomePriority(String(coupon.homePriority || 0))
    setTemplateOrigin(coupon.templateOrigin || "custom")
    setIsModalOpen(true)
  }

  const toggleCategory = (cat: string) => {
    setRestrictedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  // Preview em tempo real idêntico ao App
  const preview = useMemo(() => {
    const valNum = parseFloat(discount.replace(",", ".")) || 0
    const codeDisplay = code.trim().toUpperCase() || (valNum > 0 ? `DESCONTO${valNum}${type === "fixed" ? "RS" : "PCT"}` : "CUPOM")
    const discountLabel = showCodeInTitle
      ? codeDisplay
      : type === "percentage"
      ? `${valNum}% OFF`
      : `R$ ${valNum.toFixed(2).replace(".", ",")} OFF`

    const minOrderVal = parseFloat(minOrder.replace(",", ".")) || 0
    const minOrderText = minOrderVal > 0
      ? `Pedido mínimo de R$ ${minOrderVal.toFixed(2).replace(".", ",")}`
      : "Válido para todo o cardápio"

    return {
      code: codeDisplay,
      discountLabel,
      minOrderText,
      badge: badgeLabel.trim(),
    }
  }, [discount, type, code, showCodeInTitle, minOrder, badgeLabel])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const valNum = parseFloat(discount.replace(",", "."))
    if (isNaN(valNum) || valNum <= 0) {
      alert("Informe um valor de desconto válido.")
      return
    }

    if (type === "percentage" && (valNum <= 0 || valNum > 100)) {
      alert("O desconto percentual deve estar entre 1% e 100%.")
      return
    }

    const finalCode = code.trim().toUpperCase().replace(/\s+/g, "") || preview.code

    setIsSaving(true)
    try {
      const minOrderVal = minOrder.trim() ? parseFloat(minOrder.replace(",", ".")) : null
      const maxUsageVal = maxUsage.trim() ? parseInt(maxUsage, 10) : undefined
      const maxPerUserVal = maxUsagePerUser.trim() ? parseInt(maxUsagePerUser, 10) : 1

      const payload: Partial<Coupon> = {
        code: finalCode,
        title: preview.discountLabel,
        description: minOrderVal ? `Válido em pedidos acima de R$ ${minOrderVal}` : "Válido para todo o cardápio",
        discount: valNum,
        type,
        minOrderValue: minOrderVal,
        maxUsagePerUser: maxPerUserVal,
        maxUsage: maxUsageVal,
        expiresAt: isPermanent ? null : expiresAt ? new Date(expiresAt) : null,
        showOnHome,
        homePriority: parseInt(homePriority, 10) || 0,
        badgeLabel: badgeLabel.trim() || null,
        templateOrigin,
        isActive: true,
      }

      if (editingCoupon) {
        await couponsManager.updateCoupon(editingCoupon.id, payload)
        if (showOnHome) {
          await couponsManager.setSingleHomeCoupon(editingCoupon.id)
        }
        setNotice("Cupom atualizado com sucesso!")
      } else {
        const created = await couponsManager.addCoupon(payload as any)
        if (showOnHome && created?.id) {
          await couponsManager.setSingleHomeCoupon(created.id)
        }
        setNotice("Cupom criado com sucesso!")
      }

      setTimeout(() => setNotice(null), 3000)
      setIsModalOpen(false)
      loadCoupons()
    } catch (err: any) {
      alert(err.message || "Não foi possível salvar o cupom.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleHome = async (coupon: Coupon) => {
    try {
      const nextVal = !coupon.showOnHome
      if (nextVal) {
        await couponsManager.setSingleHomeCoupon(coupon.id)
      } else {
        await couponsManager.updateCoupon(coupon.id, { showOnHome: false })
      }
      setCoupons((prev) =>
        prev.map((c) => ({
          ...c,
          showOnHome: c.id === coupon.id ? nextVal : nextVal ? false : c.showOnHome,
        }))
      )
    } catch {
      alert("Não foi possível atualizar o destaque na Home.")
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
      alert("Não foi possível alterar o status do cupom.")
    }
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Deseja realmente excluir o cupom "${coupon.code}"?`)) return
    try {
      await couponsManager.deleteCoupon(coupon.id)
      loadCoupons()
    } catch {
      alert("Não foi possível excluir o cupom.")
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F7F4EF]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E3A008] border-t-transparent" />
          <p className="text-xs font-bold text-[#6B6157]">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  const activeCount = coupons.filter((c) => c.isActive).length
  const homeCount = coupons.filter((c) => c.showOnHome).length

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast de Notificação */}
      {notice && (
        <div className="fixed top-4 right-4 z-50 bg-[#1F1B16] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-[#27AE60]" />
          <span>{notice}</span>
        </div>
      )}

      {/* Header Gestão de Cupons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE7E0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1F1B16] tracking-tight">
              Gestão de Cupons
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3]">
              Portal do Parceiro
            </span>
          </div>
          <p className="text-xs text-[#6B6157] mt-1 font-medium">
            Crie campanhas de desconto de alta conversão sincronizadas com o aplicativo e o site.
          </p>
        </div>

        <Button
          onClick={handleStartCreation}
          className="bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold h-10 px-4 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cupom</span>
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#ECE7E0]">
          <p className="text-[11px] font-bold text-[#6B6157] uppercase tracking-wider">Total de Cupons</p>
          <p className="text-xl font-black text-[#1F1B16] mt-0.5">{coupons.length}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#ECE7E0]">
          <p className="text-[11px] font-bold text-[#6B6157] uppercase tracking-wider">Ativos</p>
          <p className="text-xl font-black text-[#27AE60] mt-0.5">{activeCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#ECE7E0]">
          <p className="text-[11px] font-bold text-[#6B6157] uppercase tracking-wider">Destaque na Home</p>
          <p className="text-xl font-black text-[#E3A008] mt-0.5">{homeCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#ECE7E0]">
          <p className="text-[11px] font-bold text-[#6B6157] uppercase tracking-wider">Inativos / Pausados</p>
          <p className="text-xl font-black text-stone-400 mt-0.5">{coupons.length - activeCount}</p>
        </div>
      </div>

      {/* Lista de Cupons no Formato Ticket */}
      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#ECE7E0] p-12 text-center">
            <Ticket className="h-10 w-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1F1B16]">Nenhum cupom cadastrado</p>
            <p className="text-xs text-[#6B6157] mt-1">Clique em "Novo Cupom" para criar sua primeira campanha.</p>
          </div>
        ) : (
          coupons.map((c) => {
            const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date()

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-[#ECE7E0] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-shadow hover:shadow-xs"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#FEF8EC] border border-[#FCE8C3] flex items-center justify-center shrink-0">
                    <img src="/assets/cuponverde.png" alt="Cupom" className="w-7 h-7 object-contain" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-[#1F1B16] px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                        {c.code}
                      </span>
                      <span className="text-xs font-black text-[#E3A008]">
                        {c.type === "percentage" ? `${c.discount}% OFF` : `R$ ${c.discount.toFixed(2).replace(".", ",")} OFF`}
                      </span>
                      {c.badgeLabel && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E3A008]/15 text-[#8A6100]">
                          {c.badgeLabel}
                        </span>
                      )}
                      {c.showOnHome && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#E3A008] text-[#1F1B16]">
                          Home
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                          Expirado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6157]">
                      <span>{c.minOrderValue ? `Mínimo: R$ ${c.minOrderValue.toFixed(2).replace(".", ",")}` : "Sem mínimo"}</span>
                      <span>•</span>
                      <span>Limite: {c.maxUsagePerUser || 1}x por cliente</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-stone-400" />
                        {c.expiresAt ? `Até ${new Date(c.expiresAt).toLocaleDateString("pt-BR")}` : "Permanente"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
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
                    <span>{c.showOnHome ? "Na Home" : "Destacar"}</span>
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
            )
          })
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
                  <p className="text-xs text-[#6B6157]">Configurar valores, regras e códigos manualmente</p>
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
                            style={{ backgroundColor: `${tmpl.iconColor}20`, color: tmpl.iconColor }}
                          >
                            {tmpl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6157] leading-snug">{tmpl.subtitle}</p>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {tmpl.suggestedType === "percentage" ? `${tmpl.suggestedValue}% OFF` : `R$ ${tmpl.suggestedValue} OFF`}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            Mínimo R$ {tmpl.suggestedMinOrder}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-[#E3A008]">
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

      {/* Modal 2: Formulário com Live Ticket Preview (Idêntico ao AdminCupons do App) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-[#ECE7E0]">
            <DialogTitle className="text-lg font-black text-[#1F1B16]">
              {editingCoupon ? `Editar Cupom (${editingCoupon.code})` : "Configurar Cupom"}
            </DialogTitle>
          </DialogHeader>

          {/* Live Preview do Ticket (Padrão Oficial do App) */}
          <div className="pt-2 pb-1">
            <p className="text-[11px] font-bold text-[#6B6157] uppercase tracking-wider mb-2">
              Pré-visualização do Ticket
            </p>

            <div className="w-full max-w-sm mx-auto flex flex-col shadow-xs bg-[#F7F4EF] p-2 rounded-2xl">
              {/* Parte Superior do Ticket */}
              <div className="bg-white rounded-t-2xl border-x-[1.5px] border-t-[1.5px] border-[#E5E7EB] px-3.5 pt-3 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <img src="/assets/cuponverde.png" alt="Cupom" className="w-10 h-10 object-contain" />
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

              {/* Divisória do Ticket com mordidas redondas */}
              <div className="relative h-3.5 bg-white flex items-center justify-between">
                <div className="w-2 h-3.5 overflow-hidden relative shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EF] border-[1.5px] border-[#E5E7EB] absolute -left-[7px] top-0" />
                </div>
                <div className="flex-1 border-t border-dashed border-[#D1D5DB] mx-2" />
                <div className="w-2 h-3.5 overflow-hidden relative shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#F7F4EF] border-[1.5px] border-[#E5E7EB] absolute -right-[7px] top-0" />
                </div>
              </div>

              {/* Parte Inferior com Caixa Tracejada */}
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

          <form onSubmit={handleSave} className="space-y-4 pt-3 border-t border-[#ECE7E0]">
            {/* Tipo e Valor de Desconto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Tipo de Desconto *
                </Label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType("percentage")}
                    className={`py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                      type === "percentage" ? "bg-white text-[#1F1B16] shadow-2xs" : "text-[#6B6157]"
                    }`}
                  >
                    Porcentagem (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("fixed")}
                    className={`py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                      type === "fixed" ? "bg-white text-[#1F1B16] shadow-2xs" : "text-[#6B6157]"
                    }`}
                  >
                    Fixo (R$)
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  {type === "percentage" ? "Valor (%) *" : "Valor (R$) *"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder={type === "percentage" ? "15" : "10,00"}
                  className="h-10 rounded-xl border-[#ECE7E0]"
                  required
                />
              </div>
            </div>

            {/* Código e Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Código do Cupom (opcional)
                </Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Vazio = automático (ex: DESCONTO15PCT)"
                  className="h-10 font-mono font-bold uppercase rounded-xl border-[#ECE7E0]"
                  maxLength={20}
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Badge Promocional (opcional)
                </Label>
                <Input
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value.toUpperCase())}
                  placeholder="Ex: NOVIDADE, 1º PEDIDO"
                  className="h-10 rounded-xl border-[#ECE7E0]"
                  maxLength={18}
                />
              </div>
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
                placeholder="Ex: 35,00 (deixe vazio se não houver)"
                className="h-10 rounded-xl border-[#ECE7E0]"
              />
            </div>

            {/* Switches: Código no Título & Exibir na Home */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#ECE7E0] bg-[#FAFAF9] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Mostrar código no título</p>
                  <p className="text-[10px] text-[#6B6157]">Exibe código em vez de % OFF</p>
                </div>
                <input
                  type="checkbox"
                  checked={showCodeInTitle}
                  onChange={(e) => setShowCodeInTitle(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E3A008] cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl border border-[#FCE8C3] bg-[#FEF8EC] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Destacar na Home</p>
                  <p className="text-[10px] text-[#8A6100]">Aparece no carrossel da vitrine</p>
                </div>
                <input
                  type="checkbox"
                  checked={showOnHome}
                  onChange={(e) => setShowOnHome(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#E3A008] cursor-pointer"
                />
              </div>
            </div>

            {/* Validade / Permanente */}
            <div className="p-3 rounded-xl border border-[#ECE7E0] bg-[#FAFAF9] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1F1B16]">Cupom Permanente</p>
                  <p className="text-[10px] text-[#6B6157]">Sem data de expiração</p>
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
                  Limite Global (Total)
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
                  Limite por Cliente
                </Label>
                <Input
                  type="number"
                  value={maxUsagePerUser}
                  onChange={(e) => setMaxUsagePerUser(e.target.value)}
                  placeholder="1"
                  className="h-10 rounded-xl border-[#ECE7E0]"
                />
              </div>
            </div>

            {/* Categorias Válidas */}
            <div>
              <Label className="text-xs font-bold text-[#1F1B16] mb-1.5 block">
                Categorias Válidas (Opcional)
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVAILABLE_CATEGORIES.map((cat) => {
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
                className="h-10 px-6 rounded-xl bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-xs shadow-xs cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
