"use client"

import { useEffect, useState, useMemo } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Phone,
  Package,
  TrendingUp,
  Loader2,
  RefreshCw,
  Award,
  ThumbsUp,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase-fix"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

interface Feedback {
  id: string
  order_id: string
  customer_name: string
  customer_phone: string | null
  rating: number
  comment: string | null
  created_at: string
}

type FilterType = "all" | "5" | "4" | "critical" | "with_comment"

export default function AdminFeedbacksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadFeedbacks()
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    }
  }, [user, loading, router])

  const loadFeedbacks = async () => {
    setIsLoadingFeedbacks(true)
    try {
      if (!supabase) {
        console.error("Supabase não inicializado")
        setIsLoadingFeedbacks(false)
        return
      }

      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setFeedbacks(data || [])
      calculateStats(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar feedbacks:", error.message || error)
    } finally {
      setIsLoadingFeedbacks(false)
    }
  }

  const calculateStats = (feedbacksData: Feedback[]) => {
    const total = feedbacksData.length
    const sum = feedbacksData.reduce((acc, fb) => acc + (fb.rating || 0), 0)
    const average = total > 0 ? sum / total : 0

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    feedbacksData.forEach((fb) => {
      const r = Math.round(fb.rating)
      if (r in distribution) {
        distribution[r as keyof typeof distribution]++
      }
    })

    setStats({ total, average, distribution })
  }

  const csatPercentage = useMemo(() => {
    if (stats.total === 0) return 100
    const satisfied = (stats.distribution[4] || 0) + (stats.distribution[5] || 0)
    return Math.round((satisfied / stats.total) * 100)
  }, [stats])

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (filter === "5") return fb.rating === 5
      if (filter === "4") return fb.rating === 4
      if (filter === "critical") return fb.rating <= 3
      if (filter === "with_comment") return Boolean(fb.comment && fb.comment.trim().length > 0)
      return true
    })
  }, [feedbacks, filter])

  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      if (diffInSeconds < 60) return "Agora mesmo"
      if (diffInSeconds < 3600) return `Há ${Math.floor(diffInSeconds / 60)} min`
      if (diffInSeconds < 86400) return `Há ${Math.floor(diffInSeconds / 3600)} h`
      if (diffInSeconds < 172800) return "Ontem"
      if (diffInSeconds < 604800) return `Há ${Math.floor(diffInSeconds / 86400)} dias`
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    } catch {
      return dateString
    }
  }

  const handleWhatsAppReply = (feedback: Feedback) => {
    const cleanPhone = (feedback.customer_phone || "").replace(/\D/g, "")
    if (!cleanPhone) {
      alert("Este cliente não cadastrou telefone de contato.")
      return
    }
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
    const orderCode = String(feedback.order_id || "").slice(0, 6).toUpperCase()
    const name = feedback.customer_name?.trim() || "Cliente"

    const message =
      feedback.rating >= 4
        ? `Olá, ${name}! Tudo bem? Agradecemos imensamente pela sua avaliação de ${feedback.rating} estrelas no pedido #${orderCode} da Batata Top! Ficamos muito felizes que curtiu. Conte sempre com a gente! 🥔✨`
        : `Olá, ${name}! Vimos sua avaliação sobre o pedido #${orderCode} na Batata Top. Sua experiência é muito importante para nós! Gostaríamos de entender o ocorrido para melhorar nosso serviço.`

    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  const handleCopyReplyTemplate = (feedback: Feedback) => {
    const orderCode = String(feedback.order_id || "").slice(0, 6).toUpperCase()
    const name = feedback.customer_name?.trim() || "Cliente"
    const message =
      feedback.rating >= 4
        ? `Olá, ${name}! Muito obrigado pela avaliação de ${feedback.rating} estrelas no pedido #${orderCode}! Batata Top agradece pela preferência! 🍟💛`
        : `Olá, ${name}! Sentimos muito que sua experiência no pedido #${orderCode} não tenha sido perfeita. Estamos à disposição para resolver!`

    navigator.clipboard.writeText(message)
    setCopiedId(feedback.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-amber-200 border-t-amber-500 mx-auto mb-4" />
          <p className="text-stone-600 font-bold">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F8]">
      <HeaderWrapper />

      <main className="flex-1 py-6 md:py-10 px-4 md:px-8">
        <div className="container mx-auto max-w-5xl">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin")}
                className="p-2.5 hover:bg-white bg-white/80 border border-stone-200/60 rounded-2xl transition-all shadow-sm"
              >
                <ArrowLeft className="h-5 w-5 text-stone-700" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">Avaliações & Reputação</h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    <Sparkles className="h-3 w-3 text-amber-600" /> iFood Standard
                  </span>
                </div>
                <p className="text-stone-500 text-xs md:text-sm font-medium">Monitore a reputação da loja e o índice de satisfação dos clientes</p>
              </div>
            </div>

            <Button
              onClick={loadFeedbacks}
              variant="outline"
              size="sm"
              className="rounded-2xl border-stone-200 bg-white hover:bg-stone-50 text-stone-800 font-bold px-4 h-10 shadow-sm transition-all"
              disabled={isLoadingFeedbacks}
            >
              <RefreshCw className={`h-4 w-4 mr-2 text-stone-600 ${isLoadingFeedbacks ? "animate-spin" : ""}`} />
              Atualizar dados
            </Button>
          </div>

          {/* iFood Score & CSAT Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
            {/* Main Score Card */}
            <Card className="md:col-span-4 border-none shadow-sm bg-white rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">Nota da Loja</span>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-5xl font-black text-stone-900 tracking-tight">
                    {stats.average > 0 ? stats.average.toFixed(1) : "—"}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className="h-4 w-4"
                          style={{
                            fill: s <= Math.round(stats.average) ? "#FCBB00" : "#E5E7EB",
                            color: s <= Math.round(stats.average) ? "#FCBB00" : "#E5E7EB",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-stone-500 font-medium mt-1">de 5.0 estrelas</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Total avaliações</span>
                  <span className="text-lg font-black text-stone-900">{stats.total}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Reputação</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
                    stats.average >= 4.5
                      ? "bg-emerald-50 text-emerald-700"
                      : stats.average >= 4.0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-stone-100 text-stone-700"
                  }`}>
                    {stats.average >= 4.5 ? "Super Restaurante" : stats.average >= 4.0 ? "Muito Bom" : "Regular"}
                  </span>
                </div>
              </div>
            </Card>

            {/* CSAT / Satisfaction Bar */}
            <Card className="md:col-span-4 border-none shadow-sm bg-white rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">Índice CSAT</span>
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-600">{csatPercentage}%</span>
                  <span className="text-xs font-bold text-stone-500">satisfeitos</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">Clientes que avaliaram com 4 ou 5 estrelas.</p>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100">
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${csatPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-stone-400 mt-2 uppercase tracking-wide">
                  <span>Meta: &ge; 90%</span>
                  <span className={csatPercentage >= 90 ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}>
                    {csatPercentage >= 90 ? "Meta atingida" : "Abaixo da meta"}
                  </span>
                </div>
              </div>
            </Card>

            {/* 5-Star Distribution Bar */}
            <Card className="md:col-span-4 border-none shadow-sm bg-white rounded-3xl p-6">
              <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 block mb-3">
                Distribuição das Notas
              </span>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.distribution[rating as keyof typeof stats.distribution] || 0
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-10">
                        <span className="text-xs font-bold text-stone-700">{rating}</span>
                        <Star className="h-3 w-3 fill-[#FCBB00] text-[#FCBB00]" />
                      </div>
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FCBB00] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-stone-400 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Sentiment Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                filter === "all"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilter("5")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === "5"
                  ? "bg-[#FCBB00] text-stone-900 shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-[#FCBB00] text-[#FCBB00]" />
              5 Estrelas ({stats.distribution[5] || 0})
            </button>
            <button
              onClick={() => setFilter("4")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === "4"
                  ? "bg-amber-100 text-amber-900 shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-[#FCBB00] text-[#FCBB00]" />
              4 Estrelas ({stats.distribution[4] || 0})
            </button>
            <button
              onClick={() => setFilter("critical")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                filter === "critical"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
              }`}
            >
              Críticas 1-3★ ({((stats.distribution[1] || 0) + (stats.distribution[2] || 0) + (stats.distribution[3] || 0))})
            </button>
            <button
              onClick={() => setFilter("with_comment")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filter === "with_comment"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/60"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Com comentários ({feedbacks.filter((f) => f.comment && f.comment.trim().length > 0).length})
            </button>
          </div>

          {/* Feedback List */}
          <div className="space-y-4">
            {isLoadingFeedbacks ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-stone-100">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
                <p className="text-stone-500 font-bold text-sm">Carregando avaliações...</p>
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-stone-400" />
                </div>
                <h3 className="text-lg font-black text-stone-800 mb-1">Nenhuma avaliação encontrada</h3>
                <p className="text-stone-500 text-xs md:text-sm">Não há avaliações correspondentes a este filtro no momento.</p>
              </div>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <Card
                  key={feedback.id}
                  className="border-none shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all border border-stone-100"
                >
                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Customer Info & Rating */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Avatar Initials */}
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center flex-shrink-0 text-amber-800 font-black text-sm">
                          {(feedback.customer_name || "C").charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-stone-900 text-base leading-snug truncate">
                              {feedback.customer_name || "Cliente"}
                            </h3>
                            <span className="text-[11px] font-semibold text-stone-400">
                              • {getRelativeTime(feedback.created_at)}
                            </span>
                          </div>

                          {/* Star Rating Badge */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className="h-4 w-4"
                                  style={{
                                    fill: s <= feedback.rating ? "#FCBB00" : "#E5E7EB",
                                    color: s <= feedback.rating ? "#FCBB00" : "#E5E7EB",
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-black text-stone-800">
                              {feedback.rating}.0
                            </span>
                          </div>

                          {/* Comment Bubble */}
                          {feedback.comment ? (
                            <div className="bg-[#FAF9F6] border border-stone-200/60 rounded-2xl p-3.5 mb-3 text-stone-800 text-sm leading-relaxed">
                              &ldquo;{feedback.comment}&rdquo;
                            </div>
                          ) : (
                            <p className="text-stone-400 text-xs mb-3 italic">Cliente avaliou sem comentário por escrito.</p>
                          )}

                          {/* Order Badge & Phone */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-stone-400">
                            <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2.5 py-1 rounded-xl">
                              <Package className="h-3 w-3 text-stone-500" />
                              Pedido #{String(feedback.order_id || "").slice(0, 6).toUpperCase()}
                            </span>

                            {feedback.customer_phone && (
                              <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2.5 py-1 rounded-xl">
                                <Phone className="h-3 w-3 text-stone-500" />
                                {feedback.customer_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Reply Actions */}
                      <div className="flex md:flex-col gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                        {feedback.customer_phone && (
                          <Button
                            size="sm"
                            onClick={() => handleWhatsAppReply(feedback)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-9 px-3.5 shadow-sm"
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                            WhatsApp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyReplyTemplate(feedback)}
                          className="border-stone-200 text-stone-700 hover:bg-stone-100 rounded-xl font-bold text-xs h-9 px-3"
                        >
                          {copiedId === feedback.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1.5 text-stone-400" />
                              Copiar Resposta
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
