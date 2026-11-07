"use client"

import { appToast } from "@/lib/app-toast"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeleton"
import {
  Bell,
  Plus,
  Send,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Gift,
  X,
  Eye,
  Megaphone,
  Heart,
  Beer,
  Smile,
  Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Templates Oficiais de Campanhas (Paridade com App Mobile)
const CAMPAIGN_TEMPLATES = [
  {
    id: "dia_das_maes",
    name: "Dia das Mães",
    badge: "ESPECIAL DIA DAS MÃES",
    icon: Heart,
    title: "❤️ Mãe merece o melhor hoje!",
    body: "Surpreenda sua mãe com uma Batata Recheada quentinha e irresistível. Presenteie com desconto exclusivo!",
    suggestedCouponCode: "MAETOP15",
    suggestedDiscountType: "percentage" as const,
    suggestedDiscountValue: "15",
    suggestedMinOrder: "40",
    suggestedBanner: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80",
    description: "Foco no almoço ou jantar de Dia das Mães.",
  },
  {
    id: "dia_dos_pais",
    name: "Dia dos Pais",
    badge: "ESPECIAL DIA DOS PAIS",
    icon: Beer,
    title: "🥔 O paizão merece Batata Top!",
    body: "Hoje a conta do paizão tem desconto especial. Peça aquela batata recheada caprichada com frete grátis!",
    suggestedCouponCode: "PAITOP10",
    suggestedDiscountType: "fixed" as const,
    suggestedDiscountValue: "10",
    suggestedMinOrder: "45",
    suggestedBanner: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80",
    description: "Incentivo a pedidos em família no fim de semana.",
  },
  {
    id: "dia_das_criancas",
    name: "Dia das Crianças",
    badge: "FESTA DAS CRIANÇAS",
    icon: Smile,
    title: "🎉 Alegria em dobro pra criançada!",
    body: "Batata quentinha + muito queijo e bacon! A diversão dos pequenos tá garantida com desconto especial.",
    suggestedCouponCode: "CRIANCATOP",
    suggestedDiscountType: "percentage" as const,
    suggestedDiscountValue: "20",
    suggestedMinOrder: "50",
    suggestedBanner: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80",
    description: "Foco no público infantil e combos família.",
  },
  {
    id: "sexta_batata",
    name: "Sexta da Batata",
    badge: "SEXTATOP",
    icon: Flame,
    title: "🔥 Sextou com a Batata mais recheada da cidade!",
    body: "Sexta pede descanso na cozinha! Peça agora e receba quentinho no conforto de casa com desconto.",
    suggestedCouponCode: "SEXTATOP",
    suggestedDiscountType: "fixed" as const,
    suggestedDiscountValue: "8",
    suggestedMinOrder: "40",
    suggestedBanner: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80",
    description: "Disparo no pico da noite de sexta-feira.",
  },
]

interface Campaign {
  id: string
  title: string
  body: string
  image_url?: string | null
  badge_label?: string | null
  coupon_id?: string | null
  scheduled_for: string
  status: "draft" | "scheduled" | "processing" | "completed" | "failed" | "cancelled"
  target_audience: "all" | "with_orders" | "without_orders"
  total_recipients: number
  success_count: number
  failure_count: number
  sent_at?: string | null
  created_at: string
  coupons?: {
    code: string
    discount_value: number
    discount_type: string
    active: boolean
  } | null
}

export default function AdminCampanhasPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tokenCount, setTokenCount] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<"scheduled" | "history">("scheduled")

  // Modal de Criação
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [badgeLabel, setBadgeLabel] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [sendImmediately, setSendImmediately] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1)
    d.setMinutes(0)
    return d.toISOString().slice(0, 16)
  })

  // Cupom Vinculado
  const [hasCoupon, setHasCoupon] = useState(true)
  const [selectedCouponCode, setSelectedCouponCode] = useState("")
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])

  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  // 1. Guard de Autenticação
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    checkIsAdmin(user.id).then((allowed) => {
      setChecking(false)
      if (allowed) {
        setIsAdmin(true)
      } else {
        appToast.error("Acesso Negado", "Permissão administrativa obrigatória.")
        router.push("/")
      }
    })
  }, [user, authLoading, router])

  // 2. Carga de Dados
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // A. Contagem de tokens push
      const { count: tokens } = await supabase
        .from("user_push_tokens")
        .select("*", { count: "exact", head: true })
      setTokenCount(tokens || 0)

      // B. Campanhas
      const { data: camps, error: campErr } = await supabase
        .from("campaigns")
        .select("*, coupons (code, discount_value, discount_type, active)")
        .order("scheduled_for", { ascending: false })

      if (!campErr) {
        setCampaigns(camps || [])
      }

      // C. Cupons Ativos para Seleção
      const { data: cups } = await supabase
        .from("coupons")
        .select("id, code, discount_value, discount_type, active")
        .eq("active", true)
        .order("discount_value", { ascending: false })

      if (cups) {
        setAvailableCoupons(cups)
      }
    } catch (err) {
      console.error("Erro ao carregar campanhas:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, loadData])

  const handleApplyTemplate = (tpl: typeof CAMPAIGN_TEMPLATES[0]) => {
    setTitle(tpl.title)
    setBody(tpl.body)
    setBadgeLabel(tpl.badge)
    setImageUrl(tpl.suggestedBanner)
    if (tpl.suggestedCouponCode) {
      setHasCoupon(true)
      setSelectedCouponCode(tpl.suggestedCouponCode)
    }
    appToast.info("Template Aplicado", `Campos preenchidos com o preset "${tpl.name}".`)
  }

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      appToast.error("Campos Obrigatórios", "Informe título e mensagem da notificação.")
      return
    }

    setSubmitting(true)
    try {
      let couponId = null
      if (hasCoupon && selectedCouponCode) {
        const found = availableCoupons.find(
          (c) => c.code.toUpperCase() === selectedCouponCode.trim().toUpperCase()
        )
        if (found) {
          couponId = found.id
        }
      }

      const scheduledFor = sendImmediately
        ? new Date().toISOString()
        : new Date(scheduledDateTime).toISOString()

      const newCampaign = {
        title: title.trim(),
        body: body.trim(),
        badge_label: badgeLabel.trim() || null,
        image_url: imageUrl.trim() || null,
        coupon_id: couponId,
        scheduled_for: scheduledFor,
        status: sendImmediately ? "processing" : "scheduled",
        target_audience: "all",
      }

      const { data: inserted, error } = await supabase
        .from("campaigns")
        .insert(newCampaign)
        .select()
        .single()

      if (error) throw error

      if (sendImmediately && inserted?.id) {
        // Dispara Edge Function
        await supabase.functions.invoke("dispatch-campaign-push", {
          body: { campaignId: inserted.id },
        })
        appToast.success("Disparo Iniciado!", "Notificações push enviadas para a fila de transmissão.")
      } else {
        appToast.success("Campanha Agendada!", `Envio programado para ${new Date(scheduledFor).toLocaleString("pt-BR")}.`)
      }

      setModalOpen(false)
      resetForm()
      loadData()
    } catch (err: any) {
      console.error("Erro ao salvar campanha:", err)
      appToast.error("Erro ao Salvar", err.message || "Não foi possível criar a campanha.")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setBody("")
    setBadgeLabel("")
    setImageUrl("")
    setSendImmediately(false)
    setSelectedCouponCode("")
    setHasCoupon(true)
  }

  const handleTriggerNow = async (campaignId: string) => {
    if (!confirm(`Deseja disparar esta notificação agora para os ${tokenCount} dispositivos cadastrados?`)) {
      return
    }

    setActionLoadingId(campaignId)
    try {
      await supabase
        .from("campaigns")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", campaignId)

      const { error } = await supabase.functions.invoke("dispatch-campaign-push", {
        body: { campaignId },
      })

      if (error) throw error

      appToast.success("Disparo Iniciado", "Notificações transmitidas em background!")
      loadData()
    } catch (err: any) {
      appToast.error("Erro no Disparo", err.message || "Falha ao acionar Edge Function.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancelCampaign = async (campaignId: string) => {
    if (!confirm("Deseja cancelar o envio desta campanha agendada?")) return

    setActionLoadingId(campaignId)
    try {
      await supabase
        .from("campaigns")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", campaignId)

      appToast.info("Campanha Cancelada", "O agendamento foi desativado.")
      loadData()
    } catch {
      appToast.error("Erro", "Não foi possível cancelar a campanha.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Excluir definitivamente o histórico desta campanha?")) return

    setActionLoadingId(campaignId)
    try {
      await supabase.from("campaigns").delete().eq("id", campaignId)
      appToast.success("Removida", "Campanha excluída com sucesso.")
      loadData()
    } catch {
      appToast.error("Erro", "Não foi possível excluir o registro.")
    } finally {
      setActionLoadingId(null)
    }
  }

  if (authLoading || checking || !isAdmin) {
    return <AdminTableSkeleton />
  }

  const scheduledCampaigns = campaigns.filter((c) =>
    ["scheduled", "processing", "draft"].includes(c.status)
  )
  const historyCampaigns = campaigns.filter((c) =>
    ["completed", "failed", "cancelled"].includes(c.status)
  )

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C1440E] bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1.5">
              <Megaphone className="h-3 w-3 text-[#C1440E]" />
              Marketing & Engajamento
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            Campanhas Push em Massa
          </h1>
          <p className="text-sm text-stone-500">
            Envie notificações imediatas ou agendadas para todos os celulares dos seus clientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true)
              loadData()
            }}
            disabled={refreshing}
            className="h-10 rounded-xl border-stone-300 font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 text-[#E3A008] ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            onClick={() => setModalOpen(true)}
            className="h-10 rounded-xl bg-[#E3A008] hover:bg-[#C98B07] text-[#1F1B16] font-bold flex items-center gap-2 shadow-sm shadow-amber-900/10"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Campanha</span>
          </Button>
        </div>
      </div>

      {/* 2. STATS RÁPIDAS (ESTILO IFOOD PARTNER) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Dispositivos Ativos
              </p>
              <p className="text-2xl font-black text-stone-900 mt-0.5">{tokenCount}</p>
              <p className="text-[11px] text-stone-500 mt-1">Celulares prontos para receber</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center text-[#E3A008]">
              <Smartphone className="h-6 w-6 text-[#C1440E]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Agendadas
              </p>
              <p className="text-2xl font-black text-[#C1440E] mt-0.5">
                {scheduledCampaigns.length}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">Aguardando disparo automático</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-orange-100 flex items-center justify-center text-[#C1440E]">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Histórico
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">
                {historyCampaigns.length}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">Campanhas enviadas com sucesso</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABS DE NAVEGAÇÃO & LISTA */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="w-full space-y-4"
      >
        <TabsList className="bg-stone-100 p-1 rounded-xl border border-stone-200">
          <TabsTrigger
            value="scheduled"
            className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-[#C1440E] data-[state=active]:shadow-sm"
          >
            Agendadas & Fila ({scheduledCampaigns.length})
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-[#C1440E] data-[state=active]:shadow-sm"
          >
            Histórico de Disparos ({historyCampaigns.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB: AGENDADAS */}
        <TabsContent value="scheduled" className="space-y-3">
          {scheduledCampaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6">
              <Megaphone className="h-12 w-12 mx-auto text-stone-300 mb-3" />
              <h3 className="text-base font-bold text-stone-800">Nenhuma campanha agendada</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                Crie um disparo para o fim de semana, feriado ou lance uma promoção relâmpago com cupom.
              </p>
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-[#E3A008] hover:bg-[#C98B07] text-[#1F1B16] font-bold rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Criar Primeira Campanha
              </Button>
            </div>
          ) : (
            scheduledCampaigns.map((camp) => (
              <Card
                key={camp.id}
                className="border border-stone-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 flex-shrink-0 flex items-center justify-center text-[#C1440E]">
                      <Bell className="h-6 w-6" />
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {camp.badge_label && (
                          <Badge className="bg-amber-100 text-[#C1440E] border-amber-200 font-bold text-[10px]">
                            {camp.badge_label}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            camp.status === "processing"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {camp.status === "processing" ? "Disparando..." : "Agendada"}
                        </Badge>
                        {camp.coupons && (
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-[10px] flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            Cupom {camp.coupons.code}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-stone-900">{camp.title}</h4>
                      <p className="text-xs text-stone-600 line-clamp-2">{camp.body}</p>

                      <p className="text-[11px] text-stone-400 flex items-center gap-1 pt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Programada para:{" "}
                          <strong>{new Date(camp.scheduled_for).toLocaleString("pt-BR")}</strong>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                    <Button
                      size="sm"
                      onClick={() => handleTriggerNow(camp.id)}
                      disabled={actionLoadingId === camp.id}
                      className="bg-[#C1440E] hover:bg-[#A0360A] text-white font-bold rounded-xl text-xs h-9 flex items-center gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{actionLoadingId === camp.id ? "Enviando..." : "Disparar Agora"}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelCampaign(camp.id)}
                      disabled={actionLoadingId === camp.id}
                      className="border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-xs h-9"
                    >
                      Cancelar
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCampaign(camp.id)}
                      disabled={actionLoadingId === camp.id}
                      className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB: HISTÓRICO */}
        <TabsContent value="history" className="space-y-3">
          {historyCampaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6">
              <CheckCircle2 className="h-12 w-12 mx-auto text-stone-300 mb-3" />
              <h3 className="text-base font-bold text-stone-800">Nenhum envio registrado ainda</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                Assim que uma campanha for concluída, ela aparecerá aqui com métricas de entrega.
              </p>
            </div>
          ) : (
            historyCampaigns.map((camp) => (
              <Card
                key={camp.id}
                className="border border-stone-200 bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          camp.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : camp.status === "cancelled"
                            ? "bg-stone-100 text-stone-600 border-stone-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }
                      >
                        {camp.status === "completed"
                          ? "Enviada com Sucesso"
                          : camp.status === "cancelled"
                          ? "Cancelada"
                          : "Falha"}
                      </Badge>

                      {camp.coupons && (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                          Cupom: {camp.coupons.code}
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-stone-900">{camp.title}</h4>
                    <p className="text-xs text-stone-600 line-clamp-1">{camp.body}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-400 pt-1">
                      <span>
                        Enviada em:{" "}
                        {camp.sent_at
                          ? new Date(camp.sent_at).toLocaleString("pt-BR")
                          : new Date(camp.scheduled_for).toLocaleString("pt-BR")}
                      </span>
                      {camp.total_recipients > 0 && (
                        <span>
                          Destinatários: <strong>{camp.total_recipients}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-9 w-9 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* 4. DIALOG: CRIAR NOVA CAMPANHA PUSH COM PREVIEW DE CELULAR */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-3xl border border-stone-200">
          <div className="bg-gradient-to-r from-[#1F1B16] to-[#2D241E] p-6 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E3A008] text-[#1F1B16] px-2 py-0.5 rounded-md">
                  Notificação Push
                </span>
              </div>
              <DialogTitle className="text-xl font-black tracking-tight mt-1">
                Nova Campanha de Marketing
              </DialogTitle>
              <p className="text-xs text-stone-300 mt-0.5">
                Alcance {tokenCount} celulares com cupons e gatilhos de compra
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              <Megaphone className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
            {/* LADO ESQUERDO: FORMULÁRIO & TEMPLATES (7 colunas) */}
            <form onSubmit={handleSaveCampaign} className="lg:col-span-7 p-6 space-y-5 border-r border-stone-200">
              {/* Presets Temáticos */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#E3A008]" />
                  Templates Rápidos de Alto Impacto
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPAIGN_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="text-left p-2.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-stone-800 group-hover:text-[#C1440E]">
                        <tpl.icon className="h-3.5 w-3.5 text-[#E3A008]" />
                        <span>{tpl.name}</span>
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título & Badge */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="camp-title" className="text-xs font-bold text-stone-700">
                    Título da Notificação *
                  </Label>
                  <Input
                    id="camp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: 🔥 Sextou com Batata Recheada quentinha!"
                    className="mt-1 rounded-xl h-10 border-stone-300 text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="camp-body" className="text-xs font-bold text-stone-700">
                    Mensagem de Texto *
                  </Label>
                  <textarea
                    id="camp-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    placeholder="Ex: Peça agora sua batata favorita com queijo derretido e ganhe R$ 10 de desconto com o cupom SEXTATOP!"
                    className="mt-1 w-full rounded-xl border border-stone-300 p-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="camp-badge" className="text-xs font-bold text-stone-700">
                      Tag / Badge (Opcional)
                    </Label>
                    <Input
                      id="camp-badge"
                      value={badgeLabel}
                      onChange={(e) => setBadgeLabel(e.target.value)}
                      placeholder="Ex: SEXTATOP"
                      className="mt-1 rounded-xl h-10 border-stone-300 text-xs"
                    />
                  </div>

                  <div>
                    <Label htmlFor="camp-banner" className="text-xs font-bold text-stone-700">
                      URL da Foto / Banner
                    </Label>
                    <Input
                      id="camp-banner"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 rounded-xl h-10 border-stone-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Cupom Integrado */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-[#C1440E]" />
                    <span className="text-xs font-bold text-stone-900">
                      Vincular Cupom de Desconto
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasCoupon}
                    onChange={(e) => setHasCoupon(e.target.checked)}
                    className="h-4 w-4 rounded text-[#E3A008] focus:ring-amber-400"
                  />
                </div>

                {hasCoupon && (
                  <div>
                    <Label className="text-[11px] font-semibold text-stone-600">
                      Selecione um cupom ativo ou digite o código
                    </Label>
                    <div className="mt-1 flex gap-2">
                      <select
                        value={selectedCouponCode}
                        onChange={(e) => setSelectedCouponCode(e.target.value)}
                        className="flex-1 h-10 rounded-xl border border-stone-300 text-xs font-bold bg-white px-3 text-stone-800"
                      >
                        <option value="">Nenhum / Código Personalizado</option>
                        {availableCoupons.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.code} — {c.discount_type === "fixed" ? `R$ ${c.discount_value}` : `${c.discount_value}%`} OFF
                          </option>
                        ))}
                      </select>

                      <Input
                        value={selectedCouponCode}
                        onChange={(e) => setSelectedCouponCode(e.target.value.toUpperCase())}
                        placeholder="CÓDIGO"
                        className="w-32 h-10 rounded-xl border-stone-300 text-xs font-black uppercase text-[#C1440E]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Agendamento vs Envio Imediato */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
                  <div>
                    <p className="text-xs font-bold text-stone-800">Enviar Imediatamente</p>
                    <p className="text-[10px] text-stone-500">Dispara assim que clicar em confirmar</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.target.checked)}
                    className="h-4 w-4 rounded text-[#E3A008] focus:ring-amber-400"
                  />
                </div>

                {!sendImmediately && (
                  <div>
                    <Label htmlFor="camp-sched" className="text-xs font-bold text-stone-700">
                      Data e Hora do Agendamento
                    </Label>
                    <Input
                      id="camp-sched"
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="mt-1 rounded-xl h-10 border-stone-300 text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border-stone-300 text-stone-700 text-xs font-bold h-10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#E3A008] hover:bg-[#C98B07] text-[#1F1B16] text-xs font-black h-10 px-6 shadow-sm"
                >
                  {submitting ? "Processando..." : sendImmediately ? "Disparar Notificações Agora" : "Agendar Campanha"}
                </Button>
              </div>
            </form>

            {/* LADO DIREITO: PREVIEW MOCKUP SMARTPHONE (5 colunas) */}
            <div className="lg:col-span-5 bg-stone-100 p-6 flex flex-col items-center justify-center border-t lg:border-t-0">
              <div className="w-full max-w-[280px]">
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider text-center mb-3 flex items-center justify-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[#E3A008]" />
                  Preview na Tela de Bloqueio
                </p>

                {/* Smartphone Mockup */}
                <div className="rounded-[36px] p-3.5 bg-stone-900 shadow-2xl border-4 border-stone-800 text-white relative">
                  {/* Dynamic Island / Notch */}
                  <div className="h-4 w-24 bg-black rounded-full mx-auto mb-4" />

                  {/* Relógio do Celular */}
                  <div className="text-center mb-4">
                    <p className="text-3xl font-light tracking-tight">
                      {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[10px] text-stone-400 capitalize">
                      {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
                    </p>
                  </div>

                  {/* Push Notification Card */}
                  <div className="bg-white/95 backdrop-blur-md text-stone-900 rounded-2xl p-3 shadow-lg border border-white/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-md bg-[#E3A008] flex items-center justify-center text-[10px] font-black text-[#1F1B16]">
                          🥔
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                          Batata Top
                        </span>
                      </div>
                      <span className="text-[9px] text-stone-400">agora</span>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-stone-900 leading-snug">
                        {title || "🔥 Sextou com Batata Top!"}
                      </p>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed line-clamp-3">
                        {body || "Sua batata recheada favorita quentinha saindo do forno. Peça com desconto exclusivo!"}
                      </p>
                    </div>

                    {imageUrl && (
                      <div className="h-24 w-full rounded-xl overflow-hidden mt-1 border border-stone-200">
                        <img
                          src={imageUrl}
                          alt="Banner Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}

                    {hasCoupon && selectedCouponCode && (
                      <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200 flex items-center justify-between mt-1">
                        <span className="text-[10px] font-bold text-[#C1440E]">
                          Cupom: {selectedCouponCode}
                        </span>
                        <span className="text-[9px] bg-[#E3A008] text-[#1F1B16] font-bold px-1.5 py-0.5 rounded">
                          COPIAR
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] text-stone-500 text-center mt-6">
                    Toque para abrir no aplicativo Batata Top
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
