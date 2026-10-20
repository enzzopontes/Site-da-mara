"use client"

import type React from "react"
import { useEffect, useState, useMemo } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar as CalendarIcon,
  Copy,
  Check,
  Power,
  Tag,
  Clock,
  Users,
  ShoppingBag,
  Sparkles,
} from "lucide-react"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { format } from "date-fns"
import Link from "next/link"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

function formatBR(value: number | string) {
  const n = Number(value)
  if (isNaN(n)) return "0"
  return n % 1 === 0 ? String(n) : String(n).replace(".", ",")
}

function generateCode(value: number | string, type: "percentage" | "fixed") {
  if (!value) return ""
  const clean = String(value).replace(",", "").replace(".", "")
  return `DESCONTO${clean}${type === "fixed" ? "RS" : "PCT"}`
}

function generateTitle(value: number | string, type: "percentage" | "fixed", code: string, showCodeInTitle: boolean) {
  if (showCodeInTitle && code) return code
  if (!value) return ""
  return type === "fixed" ? `R$ ${formatBR(value)}` : `${formatBR(value)}%`
}

function generateDescription(value: number | string, type: "percentage" | "fixed", categories: string[]) {
  if (!value) return ""
  const symbol = type === "fixed" ? `R$ ${formatBR(value)}` : `${formatBR(value)}%`
  const target = categories?.length ? categories.join(", ") : "batatas selecionadas"
  return `${symbol} pra ${target}.`
}

function generateRulesText(params: {
  minOrderValue?: number
  expiresAt?: Date | null
  maxUsage?: number
  maxUsagePerUser?: number
}) {
  const lines: string[] = []
  if (params.minOrderValue) {
    lines.push(`Válido para pedidos acima de R$ ${formatBR(params.minOrderValue)} (sem considerar a taxa de entrega).`)
  }
  const qtdeTexto = params.maxUsage ? ` ou até atingir ${params.maxUsage} cupons` : ""
  if (params.expiresAt) {
    const formattedDate = format(params.expiresAt, "dd/MM/yyyy 'às' HH:mm")
    lines.push(`Data de validade: Somente até ${formattedDate} (horário de Brasília)${qtdeTexto}.`)
  } else {
    lines.push(`Cupom permanente (sem data de expiração)${qtdeTexto}.`)
  }
  lines.push("Forma de pagamento: pague pelo app/site ou na entrega.")
  lines.push(
    params.maxUsagePerUser
      ? `Limite de uso: ${params.maxUsagePerUser}x por usuário.`
      : "Limite de uso: ilimitado por usuário."
  )
  lines.push("Cupom válido apenas para itens selecionados.")
  return lines.join("\n")
}

export default function AdminCuponsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form states
  const [formCode, setFormCode] = useState("")
  const [formDiscount, setFormDiscount] = useState("")
  const [formType, setFormType] = useState<"percentage" | "fixed">("percentage")
  const [formMinOrderValue, setFormMinOrderValue] = useState("")
  const [formExpiryDate, setFormExpiryDate] = useState("")
  const [formPermanent, setFormPermanent] = useState(false)
  const [formMaxUsage, setFormMaxUsage] = useState("")
  const [formMaxUsagePerUser, setFormMaxUsagePerUser] = useState("")
  const [formRestrictedCategories, setFormRestrictedCategories] = useState<string[]>([])
  const [formRulesText, setFormRulesText] = useState("")
  const [rulesEdited, setRulesEdited] = useState(false)
  const [formShowCodeInTitle, setFormShowCodeInTitle] = useState(false)

  const availableCategories = ["Batatas Recheadas", "Bebidas", "Sobremesas", "Combos", "Porções"]

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

  // Recalcular regras automáticas se não editado manualmente
  useEffect(() => {
    if (!rulesEdited) {
      const minVal = Number.parseFloat(formMinOrderValue.replace(",", ".")) || undefined
      const maxUses = formMaxUsage ? Number.parseInt(formMaxUsage, 10) : undefined
      const maxPerUser = formMaxUsagePerUser ? Number.parseInt(formMaxUsagePerUser, 10) : undefined
      const expDate = formPermanent || !formExpiryDate ? null : new Date(formExpiryDate + "T23:59:59")
      const generated = generateRulesText({
        minOrderValue: minVal,
        expiresAt: expDate,
        maxUsage: maxUses,
        maxUsagePerUser: maxPerUser,
      })
      setFormRulesText(generated)
    }
  }, [formMinOrderValue, formMaxUsage, formMaxUsagePerUser, formPermanent, formExpiryDate, rulesEdited])

  const preview = useMemo(() => {
    const valNum = Number.parseFloat(formDiscount.replace(",", ".")) || 0
    const code = formCode.trim().toUpperCase() || generateCode(valNum, formType)
    const title = generateTitle(valNum, formType, code, formShowCodeInTitle)
    const description = generateDescription(valNum, formType, formRestrictedCategories)
    const minVal = Number.parseFloat(formMinOrderValue.replace(",", ".")) || 0
    const minOrderText = minVal > 0 ? `Válido para pedidos acima de R$ ${formatBR(minVal)}` : "Sem pedido mínimo"
    return { code, title, description, minOrderText }
  }, [formDiscount, formType, formCode, formShowCodeInTitle, formRestrictedCategories, formMinOrderValue])

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon)
      setFormCode(coupon.code)
      setFormDiscount(coupon.discount.toString())
      setFormType(coupon.type)
      setFormPermanent(!coupon.expiresAt)
      setFormMaxUsage(coupon.maxUsage?.toString() || "")
      setFormMaxUsagePerUser(coupon.maxUsagePerUser?.toString() || "")
      setFormMinOrderValue((coupon as any).min_order_value ? String((coupon as any).min_order_value) : "")
      setFormRestrictedCategories((coupon as any).restricted_categories || [])
      setFormRulesText((coupon as any).rules_text || "")
      setRulesEdited(Boolean((coupon as any).rules_text))
      setFormShowCodeInTitle(Boolean((coupon as any).show_code_in_title))

      if (coupon.expiresAt) {
        const date = new Date(coupon.expiresAt)
        setFormExpiryDate(date.toISOString().split("T")[0])
      } else {
        setFormExpiryDate("")
      }
    } else {
      setEditingCoupon(null)
      setFormCode("")
      setFormDiscount("")
      setFormType("percentage")
      setFormExpiryDate("")
      setFormPermanent(false)
      setFormMaxUsage("")
      setFormMaxUsagePerUser("")
      setFormMinOrderValue("")
      setFormRestrictedCategories([])
      setFormRulesText("")
      setRulesEdited(false)
      setFormShowCodeInTitle(false)
    }
    setIsDialogOpen(true)
  }

  const toggleCategory = (cat: string) => {
    setFormRestrictedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const discount = Number.parseFloat(formDiscount.replace(",", "."))
    if (Number.isNaN(discount) || discount <= 0) {
      alert("Desconto inválido")
      return
    }

    const expiresAt = formPermanent || !formExpiryDate ? null : new Date(formExpiryDate + "T23:59:59")
    const maxUsage = formMaxUsage ? Number.parseInt(formMaxUsage, 10) : undefined
    const maxUsagePerUser = formMaxUsagePerUser ? Number.parseInt(formMaxUsagePerUser, 10) : undefined
    const minOrderVal = formMinOrderValue ? Number.parseFloat(formMinOrderValue.replace(",", ".")) : undefined
    const finalCode = formCode.trim() ? formCode.trim().toUpperCase() : generateCode(discount, formType)
    const finalTitle = generateTitle(discount, formType, finalCode, formShowCodeInTitle)
    const finalDesc = generateDescription(discount, formType, formRestrictedCategories)

    const payloadUpdates: any = {
      code: finalCode,
      discount,
      type: formType,
      expiresAt,
      maxUsage,
      maxUsagePerUser,
      title: finalTitle,
      description: finalDesc,
      rules_text: formRulesText,
      min_order_value: minOrderVal || null,
      restricted_categories: formRestrictedCategories.length ? formRestrictedCategories : null,
      show_code_in_title: formShowCodeInTitle,
    }

    if (editingCoupon) {
      await couponsManager.updateCoupon(editingCoupon.id, payloadUpdates)
    } else {
      await couponsManager.addCoupon({
        ...payloadUpdates,
        isActive: true,
      })
    }

    loadCoupons()
    setIsDialogOpen(false)
  }

  const handleDeleteCoupon = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cupom?")) {
      await couponsManager.deleteCoupon(id)
      loadCoupons()
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    await couponsManager.updateCoupon(coupon.id, { isActive: !coupon.isActive })
    loadCoupons()
  }

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#E3A008]/20 border-t-[#E3A008] mx-auto mb-4"></div>
          <p className="text-gray-700 font-bold">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  const activeCoupons = coupons.filter((c) => c.isActive)
  const inactiveCoupons = coupons.filter((c) => !c.isActive)

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <HeaderWrapper />
      <main className="flex-1 py-8 px-4 md:px-8">
        <div className="container mx-auto max-w-7xl">
          {/* Top Bar / Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <Link href="/admin">
                <Button
                  variant="ghost"
                  className="p-0 h-auto mb-3 text-gray-500 hover:text-[#C1440E] hover:bg-transparent font-bold gap-1 text-sm inline-flex items-center"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Painel
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-[#FEF3C7] rounded-2xl flex items-center justify-center border border-[#FDE68A] text-[#C1440E]">
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                    Gestão de Cupons
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500 font-medium">
                    {activeCoupons.length} ativo(s) · {inactiveCoupons.length} inativo(s) · Padrão iFood Portal
                  </p>
                </div>
              </div>
            </div>

            {/* Create Coupon Button / Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog()}
                  className="bg-[#C1440E] hover:bg-[#A8380A] text-white font-extrabold h-11 px-5 rounded-xl shadow-md gap-2 transition-transform active:scale-95"
                >
                  <Plus className="h-5 w-5" />
                  Criar Novo Cupom
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 border border-gray-100 shadow-2xl">
                <DialogHeader className="pb-4 border-b border-gray-100">
                  <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <span className="p-2 bg-[#FEF3C7] rounded-xl text-[#C1440E]">
                      <Ticket className="h-5 w-5" />
                    </span>
                    {editingCoupon ? "Editar Cupom de Desconto" : "Criar Cupom de Desconto"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-3">
                  {/* Tipo e Valor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                        Tipo de Desconto *
                      </Label>
                      <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setFormType("percentage")}
                          className={`h-10 text-xs font-black rounded-lg transition-all ${
                            formType === "percentage"
                              ? "bg-white text-[#C1440E] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Porcentagem (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormType("fixed")}
                          className={`h-10 text-xs font-black rounded-lg transition-all ${
                            formType === "fixed"
                              ? "bg-white text-[#C1440E] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Fixo (R$)
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                        Valor do Desconto *
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">
                          {formType === "percentage" ? "%" : "R$"}
                        </span>
                        <Input
                          type="text"
                          required
                          value={formDiscount}
                          onChange={(e) => setFormDiscount(e.target.value)}
                          placeholder={formType === "percentage" ? "10" : "5,00"}
                          className="h-11 pl-10 text-base font-bold border-2 border-gray-200 focus:border-[#E3A008] rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Código e Flag Título */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                        Código do Cupom (opcional)
                      </Label>
                      <Input
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                        maxLength={20}
                        placeholder="Vazio = gera automático"
                        className="h-11 font-black tracking-wider text-base border-2 border-gray-200 focus:border-[#E3A008] rounded-xl uppercase"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                        Pedido Mínimo (R$)
                      </Label>
                      <Input
                        type="text"
                        value={formMinOrderValue}
                        onChange={(e) => setFormMinOrderValue(e.target.value)}
                        placeholder="Ex: 30,00"
                        className="h-11 text-base font-bold border-2 border-gray-200 focus:border-[#E3A008] rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                    <input
                      type="checkbox"
                      id="showCodeInTitle"
                      checked={formShowCodeInTitle}
                      onChange={(e) => setFormShowCodeInTitle(e.target.checked)}
                      className="w-4 h-4 accent-[#C1440E] rounded cursor-pointer"
                    />
                    <Label htmlFor="showCodeInTitle" className="cursor-pointer text-xs font-bold text-gray-800">
                      Mostrar código do cupom como título do card (ao invés da porcentagem)
                    </Label>
                  </div>

                  {/* Limites de Uso */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                        Limite Global de Usos
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={formMaxUsage}
                        onChange={(e) => setFormMaxUsage(e.target.value)}
                        placeholder="Ilimitado"
                        className="h-11 font-bold border-2 border-gray-200 focus:border-[#E3A008] rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                        Limite por Usuário
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={formMaxUsagePerUser}
                        onChange={(e) => setFormMaxUsagePerUser(e.target.value)}
                        placeholder="Ilimitado"
                        className="h-11 font-bold border-2 border-gray-200 focus:border-[#E3A008] rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Validade */}
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                      Validade do Cupom
                    </Label>
                    <div className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl bg-gray-50/50">
                      <input
                        type="checkbox"
                        id="permanent"
                        checked={formPermanent}
                        onChange={(e) => setFormPermanent(e.target.checked)}
                        className="w-4 h-4 accent-[#C1440E] rounded cursor-pointer"
                      />
                      <Label htmlFor="permanent" className="cursor-pointer text-xs font-black text-gray-800">
                        Cupom Permanente (sem data de expiração)
                      </Label>
                    </div>

                    {!formPermanent && (
                      <div className="relative">
                        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          type="date"
                          value={formExpiryDate}
                          onChange={(e) => setFormExpiryDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full h-11 pl-10 pr-4 font-bold text-sm border-2 border-gray-200 rounded-xl outline-none focus:border-[#E3A008] bg-white transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Categorias Restritas */}
                  <div>
                    <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 block">
                      Categorias Válidas (opcional)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {availableCategories.map((cat) => {
                        const selected = formRestrictedCategories.includes(cat)
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              selected
                                ? "bg-[#FEF3C7] border-[#E3A008] text-[#92400E]"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Regras (Texto) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                        Termos e Condições (Regras)
                      </Label>
                      {rulesEdited && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Modificado manualmente
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      value={formRulesText}
                      onChange={(e) => {
                        setFormRulesText(e.target.value)
                        setRulesEdited(true)
                      }}
                      className="w-full p-3 text-xs font-medium text-gray-700 border-2 border-gray-200 rounded-xl outline-none focus:border-[#E3A008] bg-white"
                      placeholder="Regras geradas automaticamente..."
                    />
                  </div>

                  {/* Preview do Ticket */}
                  <div className="pt-2">
                    <Label className="text-xs font-black uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#E3A008]" />
                      Pré-visualização do Ticket
                    </Label>
                    <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-dashed border-[#E3A008] relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-1 bg-[#E3A008] text-white text-xs font-black rounded-md tracking-wider">
                          {preview.code}
                        </span>
                        <span className="text-sm font-black text-[#C1440E]">{preview.title}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-800">{preview.description}</p>
                      <p className="text-[11px] text-gray-500 font-medium mt-1">{preview.minOrderText}</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 h-11 rounded-xl font-bold border-gray-200 text-gray-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#C1440E] hover:bg-[#A8380A] text-white h-11 rounded-xl font-extrabold shadow-sm"
                    >
                      {editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Grid Cupons Ativos */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                Cupons Ativos
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E]">
                  {activeCoupons.length}
                </span>
              </h2>
            </div>

            {activeCoupons.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
                <Ticket className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-bold text-sm">Nenhum cupom ativo no momento</p>
                <p className="text-gray-400 text-xs mt-1">Clique em "Criar Novo Cupom" para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeCoupons.map((coupon) => (
                  <CouponTicketCard
                    key={coupon.id}
                    coupon={coupon}
                    copiedId={copiedId}
                    onCopy={handleCopyCode}
                    onEdit={handleOpenDialog}
                    onDelete={handleDeleteCoupon}
                    onToggle={handleToggleActive}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Grid Cupons Inativos */}
          {inactiveCoupons.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-black text-gray-500 flex items-center gap-2">
                  Cupons Inativos / Pausados
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                    {inactiveCoupons.length}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-75">
                {inactiveCoupons.map((coupon) => (
                  <CouponTicketCard
                    key={coupon.id}
                    coupon={coupon}
                    copiedId={copiedId}
                    onCopy={handleCopyCode}
                    onEdit={handleOpenDialog}
                    onDelete={handleDeleteCoupon}
                    onToggle={handleToggleActive}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function CouponTicketCard({
  coupon,
  copiedId,
  onCopy,
  onEdit,
  onDelete,
  onToggle,
}: {
  coupon: Coupon
  copiedId: string | null
  onCopy: (code: string, id: string) => void
  onEdit: (coupon: Coupon) => void
  onDelete: (id: string) => void
  onToggle: (coupon: Coupon) => void
}) {
  const isActive = coupon.isActive
  const minOrder = (coupon as any).min_order_value
  const categories: string[] = (coupon as any).restricted_categories || []

  return (
    <div
      className={`relative bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
        isActive ? "border-amber-200/80" : "border-gray-200 bg-gray-50/50"
      }`}
    >
      {/* Top Header of Ticket */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-sm tracking-wider uppercase border ${
                isActive
                  ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              <Tag className="h-3.5 w-3.5 text-[#C1440E]" />
              {coupon.code}
            </span>
            <button
              onClick={() => onCopy(coupon.code, coupon.id)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Copiar código"
            >
              {copiedId === coupon.id ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
              }`}
            >
              {isActive ? "Ativo" : "Pausado"}
            </span>
          </div>
        </div>

        {/* Valor do desconto em destaque */}
        <div className="mb-2">
          <div className="text-2xl font-black text-gray-900 flex items-baseline gap-1">
            {coupon.type === "percentage" ? (
              <>
                <span>{coupon.discount}%</span>
                <span className="text-xs font-bold text-gray-500 uppercase">OFF</span>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-gray-500">R$</span>
                <span>{coupon.discount.toFixed(2)}</span>
                <span className="text-xs font-bold text-gray-500 uppercase">OFF</span>
              </>
            )}
          </div>
          {(coupon as any).title && (coupon as any).title !== coupon.code && (
            <p className="text-xs font-bold text-gray-700">{(coupon as any).title}</p>
          )}
        </div>

        {/* Metadados / Regras compactas */}
        <div className="space-y-1.5 text-xs text-gray-600 pt-1">
          {minOrder != null && (
            <div className="flex items-center gap-1.5 font-medium">
              <ShoppingBag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span>
                Pedido mín: <strong className="text-gray-900">R$ {Number(minOrder).toFixed(2)}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 font-medium">
            <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>
              Usos: <strong className="text-gray-900">{coupon.usageCount}</strong>
              {coupon.maxUsage ? `/${coupon.maxUsage}` : " (ilimitado)"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>
              Validade:{" "}
              <strong className="text-gray-900">
                {coupon.expiresAt ? format(new Date(coupon.expiresAt), "dd/MM/yyyy") : "Permanente"}
              </strong>
            </span>
          </div>

          {categories.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1">
              {categories.map((c) => (
                <span
                  key={c}
                  className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Cutout Line (Estilo Cupom iFood) */}
      <div className="relative flex items-center justify-between px-2 py-1">
        <div className="w-4 h-4 bg-[#F8F9FA] rounded-full -ml-4 border-r border-amber-200/80"></div>
        <div className="flex-1 border-b-2 border-dashed border-gray-200 mx-2"></div>
        <div className="w-4 h-4 bg-[#F8F9FA] rounded-full -mr-4 border-l border-amber-200/80"></div>
      </div>

      {/* Footer / Actions */}
      <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onToggle(coupon)}
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 rounded-lg text-xs font-bold gap-1 ${
              isActive
                ? "text-amber-700 hover:bg-amber-100/60"
                : "text-emerald-700 hover:bg-emerald-100/60"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {isActive ? "Pausar" : "Ativar"}
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            onClick={() => onEdit(coupon)}
            variant="ghost"
            size="sm"
            className="h-8 px-2 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-200"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
          <Button
            onClick={() => onDelete(coupon.id)}
            variant="ghost"
            size="sm"
            className="h-8 px-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  )
}
