"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar as CalendarIcon,
  Home,
  CheckCircle2,
  Sparkles,
  Heart,
  Bike,
  Moon,
  Image as ImageIcon,
  ShieldCheck,
  Eye,
  Store,
  UploadCloud,
  Check,
} from "lucide-react"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { COUPON_TEMPLATES, type CouponTemplate } from "@/lib/coupon-templates"
import { format } from "date-fns"
import Link from "next/link"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

export default function AdminCuponsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Form states
  const [formCode, setFormCode] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDiscount, setFormDiscount] = useState("")
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage")
  const [formMinOrder, setFormMinOrder] = useState("")
  const [formExpiryDate, setFormExpiryDate] = useState("")
  const [formPermanent, setFormPermanent] = useState(false)
  const [formMaxUsage, setFormMaxUsage] = useState("")
  const [formMaxUsagePerUser, setFormMaxUsagePerUser] = useState("")
  const [formShowOnHome, setFormShowOnHome] = useState(false)
  const [formIsBannerHighlight, setFormIsBannerHighlight] = useState(false)
  const [formBannerImageUrl, setFormBannerImageUrl] = useState("")
  const [formBadgeLabel, setFormBadgeLabel] = useState("")
  const [formTemplateOrigin, setFormTemplateOrigin] = useState("custom")

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadCoupons()
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    }
  }, [user, loading, router])

  const loadCoupons = async () => {
    const allCoupons = await couponsManager.getCoupons()
    setCoupons(allCoupons)
  }

  const handleStartCreation = () => {
    setIsTemplateModalOpen(true)
  }

  const handleSelectTemplate = (tmpl: CouponTemplate) => {
    setIsTemplateModalOpen(false)
    setEditingCoupon(null)

    // Data de expiração sugerida
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + tmpl.suggestedDaysValid)
    const formattedDate = futureDate.toISOString().split("T")[0]

    setFormCode(tmpl.suggestedCode)
    setFormTitle(tmpl.title)
    setFormDescription(tmpl.bannerHeadline)
    setFormDiscount(tmpl.suggestedValue)
    setFormType(tmpl.suggestedType)
    setFormMinOrder(tmpl.suggestedMinOrder)
    setFormExpiryDate(formattedDate)
    setFormPermanent(false)
    setFormMaxUsage(tmpl.suggestedQuantity)
    setFormMaxUsagePerUser(tmpl.suggestedMaxUsesPerUser)
    setFormShowOnHome(tmpl.showOnHome)
    setFormIsBannerHighlight(tmpl.isBannerHighlight)
    setFormBannerImageUrl("")
    setFormBadgeLabel(tmpl.badge)
    setFormTemplateOrigin(tmpl.tag)

    setIsFormModalOpen(true)
  }

  const handleSelectScratch = () => {
    setIsTemplateModalOpen(false)
    setEditingCoupon(null)

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const formattedDate = futureDate.toISOString().split("T")[0]

    setFormCode("")
    setFormTitle("")
    setFormDescription("")
    setFormDiscount("")
    setFormType("percentage")
    setFormMinOrder("")
    setFormExpiryDate(formattedDate)
    setFormPermanent(false)
    setFormMaxUsage("")
    setFormMaxUsagePerUser("1")
    setFormShowOnHome(false)
    setFormIsBannerHighlight(false)
    setFormBannerImageUrl("")
    setFormBadgeLabel("")
    setFormTemplateOrigin("custom")

    setIsFormModalOpen(true)
  }

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormCode(coupon.code)
    setFormTitle(coupon.title || "")
    setFormDescription(coupon.description || "")
    setFormDiscount(coupon.discount.toString())
    setFormType(coupon.type)
    setFormMinOrder(coupon.minOrderValue != null ? coupon.minOrderValue.toString() : "")
    setFormPermanent(!coupon.expiresAt)
    setFormMaxUsage(coupon.maxUsage?.toString() || "")
    setFormMaxUsagePerUser(coupon.maxUsagePerUser?.toString() || "")
    setFormShowOnHome(!!coupon.showOnHome)
    setFormIsBannerHighlight(!!coupon.isBannerHighlight)
    setFormBannerImageUrl(coupon.bannerImageUrl || "")
    setFormBadgeLabel(coupon.badgeLabel || "")
    setFormTemplateOrigin(coupon.templateOrigin || "custom")

    if (coupon.expiresAt) {
      const date = new Date(coupon.expiresAt)
      setFormExpiryDate(date.toISOString().split("T")[0])
    } else {
      setFormExpiryDate("")
    }

    setIsFormModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const discount = Number.parseFloat(formDiscount)
    if (Number.isNaN(discount) || discount <= 0) {
      alert("Informe um valor de desconto válido e maior que zero.")
      return
    }

    if (formType === "percentage" && (discount <= 0 || discount > 100)) {
      alert("O desconto percentual deve estar entre 1% e 100%.")
      return
    }

    const minOrderValue = formMinOrder.trim() ? Number.parseFloat(formMinOrder) : null
    if (minOrderValue !== null && (Number.isNaN(minOrderValue) || minOrderValue < 0)) {
      alert("Pedido mínimo inválido.")
      return
    }

    const expiresAt = formPermanent || !formExpiryDate ? null : new Date(formExpiryDate + "T23:59:59")
    if (expiresAt && expiresAt < new Date()) {
      alert("A data de validade não pode estar no passado.")
      return
    }

    const maxUsage = formMaxUsage.trim() ? Number.parseInt(formMaxUsage, 10) : undefined
    const maxUsagePerUser = formMaxUsagePerUser.trim() ? Number.parseInt(formMaxUsagePerUser, 10) : undefined

    setIsSaving(true)
    try {
      if (editingCoupon) {
        await couponsManager.updateCoupon(editingCoupon.id, {
          code: formCode.toUpperCase().trim(),
          title: formTitle.trim() || undefined,
          description: formDescription.trim() || undefined,
          discount,
          type: formType,
          minOrderValue,
          expiresAt,
          maxUsage,
          maxUsagePerUser,
          showOnHome: formShowOnHome,
          bannerImageUrl: formBannerImageUrl.trim() || null,
          badgeLabel: formBadgeLabel.trim() || null,
          isBannerHighlight: formIsBannerHighlight,
          templateOrigin: formTemplateOrigin,
        })
      } else {
        await couponsManager.addCoupon({
          code: formCode.toUpperCase().trim(),
          title: formTitle.trim() || undefined,
          description: formDescription.trim() || undefined,
          discount,
          type: formType,
          minOrderValue,
          expiresAt,
          isActive: true,
          maxUsage,
          maxUsagePerUser,
          showOnHome: formShowOnHome,
          bannerImageUrl: formBannerImageUrl.trim() || null,
          badgeLabel: formBadgeLabel.trim() || null,
          isBannerHighlight: formIsBannerHighlight,
          templateOrigin: formTemplateOrigin,
        })
      }

      await loadCoupons()
      setIsFormModalOpen(false)
      setSuccessNotice(editingCoupon ? "Cupom atualizado com sucesso!" : "Novo cupom criado e ativo!")
      setTimeout(() => setSuccessNotice(null), 3500)
    } catch (err: any) {
      alert(err?.message || "Erro ao salvar cupom.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectAsHomeCoupon = async (coupon: Coupon) => {
    const ok = await couponsManager.setSingleHomeCoupon(coupon.id)
    if (ok) {
      await loadCoupons()
      setSuccessNotice(`O cupom "${coupon.code}" agora é o destaque oficial da Home!`)
      setTimeout(() => setSuccessNotice(null), 4000)
    } else {
      alert("Não foi possível destacar o cupom na Home.")
    }
  }

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (confirm(`Tem certeza que deseja excluir o cupom "${code}"?`)) {
      await couponsManager.deleteCoupon(id)
      loadCoupons()
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    await couponsManager.updateCoupon(coupon.id, { isActive: !coupon.isActive })
    loadCoupons()
  }

  // Live preview helpers
  const previewDiscount =
    formType === "percentage" ? `${formDiscount || "15"}% OFF` : `R$ ${formDiscount || "10"},00 OFF`

  const activeCoupons = coupons.filter((c) => c.isActive)
  const inactiveCoupons = coupons.filter((c) => !c.isActive)
  const homeHighlightedCoupon = coupons.find((c) => c.showOnHome && c.isActive)

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFA]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-amber-200 border-t-[#E3A008] mx-auto mb-4"></div>
          <p className="text-gray-700 font-bold">Acessando Central de Cupons...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFA]">
      <HeaderWrapper />

      <main className="flex-1 py-8 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Top Bar */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Link href="/admin">
                <Button
                  variant="ghost"
                  className="mb-2 text-gray-600 hover:text-[#C1440E] hover:bg-amber-50 font-semibold gap-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Painel Geral
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-[#E3A008] to-[#C1440E] rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white">
                  <Ticket className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                    Central de Cupons & Vitrine
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500 font-medium">
                    Templates guiados (estilo iFood), foto de destaque e controle da tela inicial
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartCreation}
              className="bg-gradient-to-r from-[#E3A008] to-[#C1440E] hover:opacity-95 text-white font-black h-12 px-6 rounded-2xl shadow-lg shadow-amber-500/20 gap-2 shrink-0 active:scale-95 transition-all"
            >
              <Sparkles className="h-5 w-5 text-amber-200" />
              <span>Novo Cupom Guiado</span>
            </Button>
          </div>

          {/* Toast / Alerta de Sucesso */}
          {successNotice && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">{successNotice}</span>
            </div>
          )}

          {/* Banner Indicador do Cupom Destaque na Home */}
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-300/60 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#E3A008] flex items-center justify-center text-white shrink-0 shadow-md">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#E3A008]/20 text-[#A16207] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1">
                  <span>Destaque Atual da Home</span>
                </div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  {homeHighlightedCoupon ? (
                    <>
                      Cupom <span className="text-[#C1440E]">{homeHighlightedCoupon.code}</span> está ativo no banner
                      principal da tela inicial
                    </>
                  ) : (
                    "Nenhum cupom fixado manualmente (o site usa o de maior desconto por padrão)"
                  )}
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Clique no botão &quot;Destacar na Home&quot; em qualquer cupom abaixo para alternar o banner instantaneamente.
                </p>
              </div>
            </div>

            {homeHighlightedCoupon && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-amber-200 shadow-sm shrink-0">
                <span className="text-xs font-bold text-gray-500">Cód:</span>
                <span className="font-mono font-black text-sm text-[#E3A008]">{homeHighlightedCoupon.code}</span>
                <span className="text-xs font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">
                  {homeHighlightedCoupon.type === "percentage"
                    ? `${homeHighlightedCoupon.discount}%`
                    : `R$ ${homeHighlightedCoupon.discount.toFixed(2)}`}
                </span>
              </div>
            )}
          </div>

          {/* Lista de Cupons Ativos */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>Cupons Ativos</span>
                <span className="text-xs font-bold bg-amber-100 text-[#C1440E] px-2.5 py-0.5 rounded-full">
                  {activeCoupons.length}
                </span>
              </h2>
            </div>

            {activeCoupons.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-gray-200">
                <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="text-base font-black text-gray-800">Nenhum cupom ativo no momento</h4>
                <p className="text-xs text-gray-500 mb-4">Crie um cupom usando templates prontos para atrair clientes.</p>
                <Button onClick={handleStartCreation} className="bg-[#E3A008] text-white font-bold rounded-xl">
                  Criar Primeiro Cupom
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCoupons.map((coupon) => {
                  const isCurrentHome = coupon.showOnHome
                  return (
                    <Card
                      key={coupon.id}
                      className={`relative overflow-hidden rounded-3xl border-2 transition-all ${
                        isCurrentHome
                          ? "border-[#E3A008] bg-amber-50/20 shadow-md shadow-amber-500/10"
                          : "border-gray-200/80 bg-white hover:border-gray-300 shadow-sm"
                      }`}
                    >
                      <CardContent className="p-5">
                        {/* Header do Card */}
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-black text-gray-900 tracking-wider font-mono">
                                {coupon.code}
                              </h3>
                              {coupon.badgeLabel && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-[#C1440E]">
                                  {coupon.badgeLabel}
                                </span>
                              )}
                            </div>
                            {coupon.title && (
                              <p className="text-xs font-bold text-gray-600 mt-0.5">{coupon.title}</p>
                            )}
                          </div>

                          <span className="text-sm font-black text-[#E3A008] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl shrink-0">
                            {coupon.type === "percentage" ? `${coupon.discount}% OFF` : `R$ ${coupon.discount.toFixed(2)} OFF`}
                          </span>
                        </div>

                        {/* Foto / Banner Thumbnail */}
                        {coupon.bannerImageUrl && (
                          <div className="mb-3 rounded-xl overflow-hidden h-24 border border-gray-100 relative bg-gray-50">
                            <img
                              src={coupon.bannerImageUrl}
                              alt="Destaque cupom"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 text-[9px] font-black bg-black/70 text-white px-2 py-0.5 rounded-md">
                              FOTO DESTAQUE
                            </span>
                          </div>
                        )}

                        {/* Metadados e regras */}
                        <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
                          {coupon.minOrderValue ? (
                            <p className="flex justify-between">
                              <span className="text-gray-500">Pedido Mínimo:</span>
                              <span className="font-bold text-gray-800">R$ {coupon.minOrderValue.toFixed(2)}</span>
                            </p>
                          ) : null}
                          <p className="flex justify-between">
                            <span className="text-gray-500">Usos Registrados:</span>
                            <span className="font-bold text-gray-800">
                              {coupon.usageCount}
                              {coupon.maxUsage ? ` / ${coupon.maxUsage}` : " (Ilimitado)"}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-500">Limite p/ Pessoa:</span>
                            <span className="font-bold text-gray-800">{coupon.maxUsagePerUser || "Ilimitado"}</span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-gray-500">Validade:</span>
                            <span className="font-bold text-gray-800">
                              {coupon.expiresAt ? format(new Date(coupon.expiresAt), "dd/MM/yyyy") : "Permanente"}
                            </span>
                          </p>
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => handleSelectAsHomeCoupon(coupon)}
                            variant={isCurrentHome ? "default" : "outline"}
                            size="sm"
                            className={`w-full rounded-xl font-bold text-xs h-9 transition-all ${
                              isCurrentHome
                                ? "bg-[#E3A008] hover:bg-[#D97706] text-white"
                                : "text-gray-700 hover:text-[#E3A008] hover:border-[#E3A008] border-gray-200"
                            }`}
                          >
                            <Home className="h-3.5 w-3.5 mr-1.5" />
                            {isCurrentHome ? "Exibindo na Home (Destaque)" : "Mostrar este cupom na Home"}
                          </Button>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditCoupon(coupon)}
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-xs h-9"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                            </Button>
                            <Button
                              onClick={() => handleToggleActive(coupon)}
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-gray-600 hover:bg-gray-50 text-xs h-9"
                            >
                              Pausar
                            </Button>
                            <Button
                              onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-red-600 border-red-100 hover:bg-red-50 text-xs h-9 px-3"
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

          {/* Cupons Inativos / Pausados */}
          {inactiveCoupons.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-gray-600 mb-3">Cupons Inativos ({inactiveCoupons.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
                {inactiveCoupons.map((coupon) => (
                  <Card key={coupon.id} className="rounded-2xl border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-gray-800">{coupon.code}</p>
                        <p className="text-xs text-gray-500">Pausado</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleToggleActive(coupon)}
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-bold"
                        >
                          Reativar
                        </Button>
                        <Button
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-red-600"
                        >
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: ESCOLHA DE TEMPLATE / IDEIAS GUIADAS (Estilo iFood)
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#E3A008]" />
              Como quer criar seu cupom?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 font-medium">
              Escolha uma estratégia de sucesso testada no delivery ou crie personalizado do zero.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Opção Criar do Zero */}
            <div
              onClick={handleSelectScratch}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 hover:border-[#E3A008] p-4 flex items-center justify-between transition-all bg-gray-50/50 hover:bg-amber-50/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 group-hover:bg-[#E3A008]/20 flex items-center justify-center text-gray-600 group-hover:text-[#E3A008] transition-colors">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-gray-900 group-hover:text-[#C1440E] transition-colors">
                    Criar do Zero (Modo Manual)
                  </h4>
                  <p className="text-xs text-gray-500">Defina código, regras e validade sem usar pré-configurações.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-400 group-hover:text-[#E3A008]">Avançar &rarr;</span>
            </div>

            <div className="relative py-2 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <span className="relative bg-white px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                OU ESCOLHA UMA IDEIA PRONTA DE SUCESSO
              </span>
            </div>

            {/* Grid de Templates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {COUPON_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="cursor-pointer rounded-2xl border-2 border-gray-200 hover:border-[#E3A008] p-4 bg-white hover:bg-amber-50/15 shadow-sm transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${tmpl.iconColor}15`, color: tmpl.iconColor }}
                      >
                        {tmpl.icon === "sparkles" && <Sparkles className="w-4 h-4" />}
                        {tmpl.icon === "heart" && <Heart className="w-4 h-4" />}
                        {tmpl.icon === "bicycle" && <Bike className="w-4 h-4" />}
                        {tmpl.icon === "moon" && <Moon className="w-4 h-4" />}
                      </div>
                      <span
                        className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${tmpl.iconColor}15`, color: tmpl.iconColor }}
                      >
                        {tmpl.badge}
                      </span>
                    </div>

                    <h4 className="font-black text-sm text-gray-900 group-hover:text-[#C1440E] transition-colors">
                      {tmpl.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tmpl.subtitle}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      {tmpl.suggestedCode}
                    </span>
                    <span className="font-bold text-[#E3A008] group-hover:translate-x-0.5 transition-transform">
                      Usar Template &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: FORMULÁRIO EM BLOCOS AVANÇADOS (Padrão iFood)
          ───────────────────────────────────────────────────────────── */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-[#FDFCFA]">
          <DialogHeader className="pb-3 border-b border-gray-200">
            <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-[#E3A008]" />
              {editingCoupon ? "Editar Cupom de Desconto" : "Configurar Novo Cupom"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Formulário segmentado em blocos: identidade, vitrine, regras de uso e validade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* BLOCO 1: REGRAS BÁSICAS */}
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Ticket className="w-4 h-4 text-[#E3A008]" />
                <h4 className="font-black text-sm text-gray-900">1. Identidade & Desconto</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Tipo de Desconto *</Label>
                  <Select value={formType} onValueChange={(v: "percentage" | "fixed") => setFormType(v)}>
                    <SelectTrigger className="h-11 border-2 rounded-xl bg-white font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed">Fixo em Reais (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Valor do Desconto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    placeholder={formType === "percentage" ? "Ex: 15" : "Ex: 10.00"}
                    className="h-11 border-2 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Código do Cupom *</Label>
                  <Input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="Ex: BEMVINDO15"
                    className="h-11 border-2 rounded-xl font-mono font-black uppercase tracking-wider"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Etiqueta Promocional (Badge)</Label>
                  <Input
                    value={formBadgeLabel}
                    onChange={(e) => setFormBadgeLabel(e.target.value.toUpperCase())}
                    maxLength={18}
                    placeholder="Ex: 1º PEDIDO, SAUDADE"
                    className="h-11 border-2 rounded-xl font-bold uppercase text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Frase de Chamada (Home/Banner)</Label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: 15% OFF no seu primeiro pedido de Batata Recheada!"
                  className="h-11 border-2 rounded-xl font-medium text-xs"
                />
              </div>
            </div>

            {/* BLOCO 2: VITRINE DA HOME & IMAGEM */}
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <ImageIcon className="w-4 h-4 text-[#C1440E]" />
                <h4 className="font-black text-sm text-gray-900">2. Vitrine da Tela Inicial & Imagem</h4>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60">
                <div>
                  <p className="text-sm font-black text-gray-900">Exibir este cupom na Home do site?</p>
                  <p className="text-xs text-gray-500">Ele aparecerá na faixa promocional principal para os clientes.</p>
                </div>
                <input
                  type="checkbox"
                  id="showHome"
                  checked={formShowOnHome}
                  onChange={(e) => setFormShowOnHome(e.target.checked)}
                  className="w-5 h-5 accent-[#E3A008] cursor-pointer"
                />
              </div>

              <div>
                <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">
                  Foto de Destaque / URL da Imagem (Opcional)
                </Label>
                <Input
                  value={formBannerImageUrl}
                  onChange={(e) => setFormBannerImageUrl(e.target.value)}
                  placeholder="https://... ou cole a URL da imagem promocional"
                  className="h-11 border-2 rounded-xl text-xs font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Se informada, a imagem será renderizada com elegância de fundo no banner do cupom.
                </p>
              </div>

              {formBannerImageUrl && (
                <div className="rounded-xl overflow-hidden h-28 border border-gray-200 relative bg-gray-50">
                  <img
                    src={formBannerImageUrl}
                    alt="Prévia"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <span className="absolute bottom-1 right-2 text-[10px] bg-black/70 text-white font-bold px-2 py-0.5 rounded">
                    Prévia da Imagem
                  </span>
                </div>
              )}
            </div>

            {/* BLOCO 3: REGRAS DE USO & PROTEÇÃO */}
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-black text-sm text-gray-900">3. Regras de Uso & Proteção de Fraude</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Pedido Mínimo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    placeholder="Ex: 35.00"
                    className="h-11 border-2 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Limite por Cliente</Label>
                  <Input
                    type="number"
                    value={formMaxUsagePerUser}
                    onChange={(e) => setFormMaxUsagePerUser(e.target.value)}
                    placeholder="Ex: 1"
                    className="h-11 border-2 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Estoque Global</Label>
                  <Input
                    type="number"
                    value={formMaxUsage}
                    onChange={(e) => setFormMaxUsage(e.target.value)}
                    placeholder="Ilimitado"
                    className="h-11 border-2 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            {/* BLOCO 4: VALIDADE */}
            <div className="bg-white p-5 rounded-2xl border-2 border-gray-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <CalendarIcon className="w-4 h-4 text-[#8E44AD]" />
                <h4 className="font-black text-sm text-gray-900">4. Validade</h4>
              </div>

              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={formPermanent}
                  onChange={(e) => setFormPermanent(e.target.checked)}
                  className="w-5 h-5 accent-[#E3A008] cursor-pointer"
                />
                <Label htmlFor="permanent" className="cursor-pointer font-bold text-xs text-gray-800">
                  Cupom Permanente (Sem data limite de expiração)
                </Label>
              </div>

              {!formPermanent && (
                <div>
                  <Label className="text-xs font-black uppercase text-gray-700 mb-1.5 block">Data Limite de Vencimento *</Label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full h-11 px-4 border-2 rounded-xl outline-none focus:border-[#E3A008] font-bold text-sm bg-white"
                    required={!formPermanent}
                  />
                </div>
              )}
            </div>

            {/* LIVE PREVIEW */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#E3A008] shrink-0" />
                <div>
                  <p className="text-xs font-black text-gray-900">
                    Prévia: Cupom <span className="font-mono">{formCode || "CODIGO"}</span> ({previewDiscount})
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formMinOrder ? `Pedido mín. R$ ${Number(formMinOrder).toFixed(2)}` : "Sem pedido mínimo"} ·{" "}
                    {formPermanent ? "Sem expiração" : `Vence em ${formExpiryDate || "..."}`}
                  </p>
                </div>
              </div>
            </div>

            {/* BOTÕES */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold"
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#E3A008] to-[#C1440E] hover:opacity-95 text-white h-12 rounded-2xl font-black shadow-lg shadow-amber-500/20"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : editingCoupon ? "Salvar Alterações" : "Criar e Publicar Cupom"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
