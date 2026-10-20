"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"

export default function AdminCuponsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Form states
  const [code, setCode] = useState("")
  const [type, setType] = useState<"percentage" | "fixed">("percentage")
  const [discount, setDiscount] = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [maxUsagePerUser, setMaxUsagePerUser] = useState("1")
  const [maxUsage, setMaxUsage] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [isPermanent, setIsPermanent] = useState(false)
  const [showOnHome, setShowOnHome] = useState(false)

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

  const handleOpenNew = () => {
    setEditingCoupon(null)
    setCode("")
    setType("percentage")
    setDiscount("")
    setMinOrder("")
    setMaxUsagePerUser("1")
    setMaxUsage("")
    
    const future = new Date()
    future.setDate(future.getDate() + 30)
    setExpiresAt(future.toISOString().split("T")[0])
    setIsPermanent(false)
    setShowOnHome(false)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setCode(coupon.code)
    setType(coupon.type)
    setDiscount(coupon.discount.toString())
    setMinOrder(coupon.minOrderValue != null ? coupon.minOrderValue.toString() : "")
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
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !discount.trim()) {
      alert("Preencha o código e o valor do desconto.")
      return
    }

    setIsSaving(true)
    try {
      const payload: Partial<Coupon> = {
        code: code.trim().toUpperCase().replace(/\s+/g, ""),
        title: type === "percentage" ? `${discount}% OFF` : `R$ ${discount} OFF`,
        description: minOrder ? `Válido em pedidos acima de R$ ${minOrder}` : "Válido para todo o cardápio",
        discount: Number(discount),
        type,
        minOrderValue: minOrder ? Number(minOrder) : null,
        maxUsagePerUser: maxUsagePerUser ? Number(maxUsagePerUser) : 1,
        maxUsage: maxUsage ? Number(maxUsage) : undefined,
        expiresAt: isPermanent ? null : expiresAt ? new Date(expiresAt) : null,
        showOnHome,
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
    } catch {
      alert("Erro ao salvar cupom. Verifique os dados.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    await couponsManager.updateCoupon(coupon.id, { isActive: !coupon.isActive })
    loadCoupons()
  }

  const handleToggleHome = async (coupon: Coupon) => {
    if (coupon.showOnHome) {
      await couponsManager.updateCoupon(coupon.id, { showOnHome: false })
      setNotice(`Destaque da Home removido do cupom ${coupon.code}.`)
    } else {
      await couponsManager.setSingleHomeCoupon(coupon.id)
      setNotice(`Cupom ${coupon.code} definido como destaque oficial da Home!`)
    }
    setTimeout(() => setNotice(null), 3000)
    loadCoupons()
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Deseja realmente excluir o cupom ${coupon.code}?`)) return
    await couponsManager.deleteCoupon(coupon.id)
    loadCoupons()
  }

  if (checkingAuth || loading || !isAdmin) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-200 border-t-[#E3A008] mx-auto mb-3" />
        <p className="text-stone-600 text-xs font-bold">Carregando painel de cupons...</p>
      </div>
    )
  }

  const homeCoupon = coupons.find((c) => c.showOnHome && c.isActive)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#ECE7E0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-[#1F1B16] tracking-tight">
              Cupons de Desconto
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3]">
              {coupons.length} cadastrados
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#6B6157] font-medium mt-0.5">
            Crie códigos promocionais, defina regras e selecione o cupom da vitrine
          </p>
        </div>

        <Button
          onClick={handleOpenNew}
          className="h-10 px-4 rounded-xl bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-xs shadow-xs flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cupom</span>
        </Button>
      </div>

      {/* Alerta de Sucesso */}
      {notice && (
        <div className="p-3 rounded-xl bg-[#27AE60]/10 border border-[#27AE60]/30 text-[#27AE60] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Destaque Oficial da Vitrine da Home */}
      {homeCoupon ? (
        <div className="p-4 rounded-2xl bg-[#FEF8EC] border border-[#FCE8C3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E3A008]/20 border border-[#E3A008]/40 flex items-center justify-center text-[#C1440E] shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#C1440E] text-white">
                  Exibindo na Home
                </span>
                <span className="font-mono font-black text-sm text-[#1F1B16]">
                  {homeCoupon.code}
                </span>
              </div>
              <p className="text-xs text-[#6B6157] mt-0.5">
                {homeCoupon.type === "percentage" ? `${homeCoupon.discount}% OFF` : `R$ ${homeCoupon.discount.toFixed(2)} OFF`}
                {homeCoupon.minOrderValue ? ` • Mínimo R$ ${homeCoupon.minOrderValue.toFixed(2)}` : ""}
              </p>
            </div>
          </div>

          <Button
            onClick={() => handleToggleHome(homeCoupon)}
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-[#FCE8C3] bg-white text-xs font-bold text-[#8A6100] hover:bg-red-50 hover:text-red-700 hover:border-red-200"
          >
            Remover da Home
          </Button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-500 text-xs flex items-center justify-between">
          <span>Nenhum cupom destacado na página inicial. Clique em <strong>"Destacar na Home"</strong> no cupom desejado.</span>
        </div>
      )}

      {/* Lista de Cupons no Estilo iFood Partner */}
      <div className="bg-white rounded-2xl border border-[#ECE7E0] overflow-hidden shadow-2xs">
        <div className="divide-y divide-[#ECE7E0]">
          {coupons.length === 0 ? (
            <div className="p-8 text-center text-[#6B6157] text-xs">
              Nenhum cupom cadastrado ainda. Clique em "Novo Cupom" acima.
            </div>
          ) : (
            coupons.map((c) => {
              const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date()
              const discountText =
                c.type === "percentage"
                  ? `${c.discount}% OFF`
                  : `R$ ${c.discount.toFixed(2).replace(".", ",")} OFF`

              return (
                <div
                  key={c.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    !c.isActive ? "bg-stone-50/70 opacity-60" : "hover:bg-stone-50/40"
                  }`}
                >
                  {/* Informações Principais */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-[#FEF8EC] border border-[#FCE8C3] flex items-center justify-center text-[#E3A008] shrink-0 mt-0.5">
                      <Ticket className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono font-black text-sm text-[#1F1B16] bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {c.code}
                        </span>
                        <span className="font-bold text-xs text-[#C1440E] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {discountText}
                        </span>
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
                        <span>
                          {c.minOrderValue ? `Mínimo: R$ ${c.minOrderValue.toFixed(2).replace(".", ",")}` : "Sem pedido mínimo"}
                        </span>
                        <span>•</span>
                        <span>Limite: {c.maxUsagePerUser || 1} por cliente</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-stone-400" />
                          {c.expiresAt
                            ? `Válido até ${new Date(c.expiresAt).toLocaleDateString("pt-BR")}`
                            : "Sem expiração"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Botão Destacar na Home */}
                    <Button
                      onClick={() => handleToggleHome(c)}
                      variant="outline"
                      size="sm"
                      className={`h-8 px-2.5 text-xs font-bold rounded-lg ${
                        c.showOnHome
                          ? "bg-[#FEF8EC] border-[#E3A008] text-[#8A6100]"
                          : "border-stone-200 text-stone-600 hover:bg-stone-100"
                      }`}
                      title={c.showOnHome ? "Remover da Home" : "Exibir na Home"}
                    >
                      <Home className="h-3.5 w-3.5 mr-1 text-[#E3A008]" />
                      <span>{c.showOnHome ? "Na Home" : "Destacar"}</span>
                    </Button>

                    {/* Toggle Ativar / Desativar */}
                    <Button
                      onClick={() => handleToggleActive(c)}
                      variant="outline"
                      size="sm"
                      className={`h-8 px-2 text-xs font-bold rounded-lg ${
                        c.isActive
                          ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          : "border-stone-200 text-stone-500 hover:bg-stone-100"
                      }`}
                      title={c.isActive ? "Desativar cupom" : "Ativar cupom"}
                    >
                      <Power className="h-3.5 w-3.5 mr-1" />
                      <span>{c.isActive ? "Ativo" : "Pausado"}</span>
                    </Button>

                    {/* Editar */}
                    <Button
                      onClick={() => handleOpenEdit(c)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-stone-600 hover:text-[#1F1B16] rounded-lg"
                      title="Editar cupom"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    {/* Excluir */}
                    <Button
                      onClick={() => handleDelete(c)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-stone-400 hover:text-red-600 rounded-lg"
                      title="Excluir cupom"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal Limpo de Criação / Edição de Cupom */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-white">
          <DialogHeader className="pb-3 border-b border-[#ECE7E0]">
            <DialogTitle className="text-lg font-bold text-[#1F1B16]">
              {editingCoupon ? `Editar Cupom (${editingCoupon.code})` : "Novo Cupom de Desconto"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-3">
            {/* Código do Cupom */}
            <div>
              <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                Código do Cupom *
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: BATATA10"
                className="h-10 font-mono font-bold uppercase rounded-xl border-[#ECE7E0]"
                required
              />
            </div>

            {/* Tipo e Valor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Tipo de Desconto
                </Label>
                <Select value={type} onValueChange={(val: any) => setType(val)}>
                  <SelectTrigger className="h-10 rounded-xl border-[#ECE7E0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  {type === "percentage" ? "Porcentagem (%) *" : "Valor (R$) *"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder={type === "percentage" ? "Ex: 15" : "Ex: 10.00"}
                  className="h-10 rounded-xl border-[#ECE7E0]"
                  required
                />
              </div>
            </div>

            {/* Pedido Mínimo e Limite por Usuário */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Pedido Mínimo (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="0.00 (Opcional)"
                  className="h-10 rounded-xl border-[#ECE7E0]"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#1F1B16] mb-1 block">
                  Usos por Cliente
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

            {/* Validade */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-bold text-[#1F1B16]">
                  Data de Validade
                </Label>
                <label className="flex items-center gap-1.5 text-xs text-[#6B6157] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPermanent}
                    onChange={(e) => setIsPermanent(e.target.checked)}
                    className="rounded text-[#E3A008] focus:ring-[#E3A008]"
                  />
                  <span>Sem expiração</span>
                </label>
              </div>

              {!isPermanent && (
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-10 rounded-xl border-[#ECE7E0]"
                  required={!isPermanent}
                />
              )}
            </div>

            {/* Toggle Vitrine da Home */}
            <div className="p-3 rounded-xl bg-[#FEF8EC] border border-[#FCE8C3] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#1F1B16]">
                  Exibir como destaque na página inicial (Home)
                </p>
                <p className="text-[11px] text-[#6B6157]">
                  Aparecerá no carrossel de ofertas da Home
                </p>
              </div>
              <input
                type="checkbox"
                checked={showOnHome}
                onChange={(e) => setShowOnHome(e.target.checked)}
                className="h-4 w-4 rounded text-[#E3A008] accent-[#E3A008] cursor-pointer"
              />
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="h-10 rounded-xl text-xs font-bold text-stone-600"
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#E3A008] hover:bg-[#B5860A] text-white font-bold text-xs shadow-xs"
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
