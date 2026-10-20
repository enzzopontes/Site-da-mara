"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { 
  Calendar, 
  TrendingUp, 
  ArrowLeft, 
  Package, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  MapPin, 
  Phone, 
  Wallet,
  Receipt,
  Trash2,
  AlertTriangle,
  QrCode,
  Banknote,
  CreditCard,
  Percent,
  Download,
  Filter,
  ArrowUpRight,
  Sparkles
} from "lucide-react"
import { ordersManager, type DailySales, type Order } from "@/lib/orders-manager"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

type DateFilterType = "all" | "7d" | "30d" | "today"

export default function AdminCaixaPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    totalSales: 0,
  })
  const [salesHistory, setSalesHistory] = useState<DailySales[]>([])
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [dateOrders, setDateOrders] = useState<Record<string, Order[]>>({})
  const [loadingOrders, setLoadingOrders] = useState<string | null>(null)
  const [showRevenue, setShowRevenue] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all")

  const loadData = useCallback(async () => {
    try {
      const todayStats = await ordersManager.getTodayStats()
      const history = await ordersManager.getSalesHistory()
      
      const todayStr = new Date().toISOString().split('T')[0]
      const hasToday = history.some(h => h.date === todayStr)
      
      let finalHistory = [...history]
      if (!hasToday && todayStats.completedOrders > 0) {
        finalHistory.unshift({
          date: todayStr,
          total: todayStats.totalSales,
          count: todayStats.completedOrders
        })
      } else if (hasToday) {
        finalHistory = finalHistory.map(h => 
          h.date === todayStr 
            ? { ...h, total: todayStats.totalSales, count: todayStats.completedOrders }
            : h
        )
      }

      setStats(todayStats)
      setSalesHistory(finalHistory)
      
      if (expandedDate) {
        const orders = await ordersManager.getOrdersByDate(expandedDate)
        setDateOrders(prev => ({ ...prev, [expandedDate]: orders }))
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    }
  }, [expandedDate])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadData()
        const interval = setInterval(loadData, 30000)
        return () => clearInterval(interval)
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    }
  }, [user, loading, router, loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const toggleDate = async (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null)
      return
    }

    setExpandedDate(date)
    if (!dateOrders[date]) {
      setLoadingOrders(date)
      try {
        const orders = await ordersManager.getOrdersByDate(date)
        setDateOrders(prev => ({ ...prev, [date]: orders }))
      } catch (error) {
        console.error("Erro ao carregar pedidos da data:", error)
      } finally {
        setLoadingOrders(null)
      }
    }
  }

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
    setIsOrderDialogOpen(true)
  }

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation()
    setOrderToDelete(order)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return
    
    setIsDeleting(true)
    try {
      await ordersManager.deleteOrder(orderToDelete.id)
      setIsDeleteDialogOpen(false)
      setOrderToDelete(null)
      if (isOrderDialogOpen) setIsOrderDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error("Erro ao deletar pedido:", error)
      alert("Erro ao deletar pedido. Tente novamente.")
    } finally {
      setIsDeleting(false)
    }
  }

  const trocoInfo = useMemo(() => {
    if (!selectedOrder?.notes) return null
    const match = selectedOrder.notes.match(/Troco para:\s*R?\$\s*([\d,.]+)/i)
    return match ? match[1] : null
  }, [selectedOrder])

  // Filtro de datas
  const filteredSalesHistory = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    if (dateFilter === "today") {
      return salesHistory.filter(h => h.date === todayStr)
    }
    if (dateFilter === "7d") {
      const d7 = new Date()
      d7.setDate(d7.getDate() - 7)
      const d7Str = d7.toISOString().split('T')[0]
      return salesHistory.filter(h => h.date >= d7Str)
    }
    if (dateFilter === "30d") {
      const d30 = new Date()
      d30.setDate(d30.getDate() - 30)
      const d30Str = d30.toISOString().split('T')[0]
      return salesHistory.filter(h => h.date >= d30Str)
    }
    return salesHistory
  }, [salesHistory, dateFilter])

  // Métricas consolidadas dos dias filtrados
  const financialMetrics = useMemo(() => {
    const totalRevenue = filteredSalesHistory.reduce((acc, curr) => acc + curr.total, 0)
    const totalCompleted = filteredSalesHistory.reduce((acc, curr) => acc + curr.count, 0)
    const avgTicket = totalCompleted > 0 ? totalRevenue / totalCompleted : 0
    return {
      totalRevenue,
      totalCompleted,
      avgTicket,
    }
  }, [filteredSalesHistory])

  // Análise detalhada do dia expandido ou dos pedidos já carregados
  const expandedBreakdown = useMemo(() => {
    if (!expandedDate || !dateOrders[expandedDate]) return null
    const orders = dateOrders[expandedDate]
    let pix = 0, dinheiro = 0, cartao = 0, outros = 0, discounts = 0

    orders.forEach(o => {
      const method = (o.paymentMethod || '').toLowerCase()
      const val = Number(o.total || 0)
      discounts += Number(o.discountAmount || 0)

      if (method.includes('pix')) pix += val
      else if (method.includes('dinheiro') || method.includes('cash')) dinheiro += val
      else if (method.includes('cart') || method.includes('cred') || method.includes('deb')) cartao += val
      else outros += val
    })

    const total = pix + dinheiro + cartao + outros
    const ticket = orders.length > 0 ? total / orders.length : 0

    return {
      pix,
      dinheiro,
      cartao,
      outros,
      total,
      ticket,
      discounts,
      count: orders.length,
      pixPercent: total > 0 ? (pix / total) * 100 : 0,
      dinheiroPercent: total > 0 ? (dinheiro / total) * 100 : 0,
    }
  }, [expandedDate, dateOrders])

  // Exportar relatório em CSV
  const handleExportCSV = () => {
    if (filteredSalesHistory.length === 0) {
      alert("Nenhum dado para exportar.")
      return
    }
    const headers = "Data,Pedidos Entregues,Faturamento (R$)\n"
    const rows = filteredSalesHistory.map(h => `${h.date},${h.count},${h.total.toFixed(2)}`).join("\n")
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `fechamento-caixa-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Carregando painel de caixa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <HeaderWrapper />
      
      <main className="flex-1 py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Superior Estilo iFood Financeiro */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div 
                className="inline-flex items-center gap-2 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer mb-2 font-medium" 
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-semibold">Voltar ao painel</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Caixa & Financeiro</h1>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" /> iFood Standard
                </Badge>
              </div>
              <p className="text-slate-500 text-sm">Controle de faturamento, conciliação e fechamento diário</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl px-4 h-11 border-slate-200 shadow-sm"
              >
                <Download className="h-4 w-4 mr-2 text-slate-500" />
                Exportar CSV
              </Button>
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl px-6 h-11 shadow-lg shadow-amber-200/50 transition-all active:scale-95"
              >
                {refreshing ? <Clock className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                {refreshing ? "Sincronizando..." : "Atualizar Dados"}
              </Button>
            </div>
          </div>

          {/* Cards Principais de Faturamento Diário (Hoje) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                label: "Pedidos Hoje", 
                value: stats.totalOrders, 
                sub: `${stats.pendingOrders} pendentes`,
                icon: Package, 
                color: "text-blue-600", 
                bg: "bg-blue-50" 
              },
              { 
                label: "Entregues Hoje", 
                value: stats.completedOrders, 
                sub: stats.totalOrders > 0 ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}% de sucesso` : "Aguardando",
                icon: CheckCircle, 
                color: "text-emerald-600", 
                bg: "bg-emerald-50" 
              },
              { 
                label: "Ticket Médio Hoje", 
                value: showRevenue ? `R$ ${(stats.completedOrders > 0 ? stats.totalSales / stats.completedOrders : 0).toFixed(2).replace('.', ',')}` : "••••", 
                sub: "Por pedido entregue",
                icon: Receipt, 
                color: "text-purple-600", 
                bg: "bg-purple-50",
                isRevenue: true 
              },
              { 
                label: "Faturamento Bruto", 
                value: showRevenue ? `R$ ${stats.totalSales.toFixed(2).replace('.', ',')}` : "••••", 
                sub: "Vendas concluídas",
                icon: Wallet, 
                color: "text-amber-600", 
                bg: "bg-amber-50",
                isRevenue: true 
              },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm rounded-3xl bg-white overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 ${stat.bg} rounded-2xl`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    {stat.isRevenue && (
                      <button 
                        onClick={() => setShowRevenue(!showRevenue)} 
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                        title={showRevenue ? "Ocultar valores" : "Mostrar valores"}
                      >
                        {showRevenue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Seletor de Período & Resumo Consolidado */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Período de Análise</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setDateFilter("today")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dateFilter === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setDateFilter("7d")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dateFilter === "7d" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Últimos 7 dias
                </button>
                <button
                  onClick={() => setDateFilter("30d")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dateFilter === "30d" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => setDateFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dateFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Todo o período
                </button>
              </div>
            </div>

            {/* Banner com Fechamento do Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-amber-100/40 border border-amber-200/60">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80">Receita Acumulada</span>
                <p className="text-2xl font-black text-amber-900">
                  {showRevenue ? `R$ ${financialMetrics.totalRevenue.toFixed(2).replace('.', ',')}` : "••••"}
                </p>
                <p className="text-xs text-amber-700/80">Total apurado no intervalo selecionado</p>
              </div>
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-amber-200/60 pt-3 md:pt-0 md:pl-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80">Volume Entregue</span>
                <p className="text-2xl font-black text-slate-900">
                  {financialMetrics.totalCompleted} <span className="text-sm font-semibold text-slate-500">pedidos</span>
                </p>
                <p className="text-xs text-slate-500">Concluídos com sucesso</p>
              </div>
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-amber-200/60 pt-3 md:pt-0 md:pl-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80">Ticket Médio Consolidado</span>
                <p className="text-2xl font-black text-slate-900">
                  {showRevenue ? `R$ ${financialMetrics.avgTicket.toFixed(2).replace('.', ',')}` : "••••"}
                </p>
                <p className="text-xs text-slate-500">Média geral por pedido</p>
              </div>
            </div>
          </div>

          {/* Histórico e Fechamentos Diários */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-900">Fechamentos Diários de Caixa</h2>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {filteredSalesHistory.length} {filteredSalesHistory.length === 1 ? 'dia listado' : 'dias listados'}
              </span>
            </div>

            {filteredSalesHistory.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">Nenhum fechamento no período</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-1 text-sm">
                  Altere os filtros acima ou aguarde novos pedidos serem marcados como entregues.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredSalesHistory.map((day) => {
                  const isExpanded = expandedDate === day.date
                  const isToday = day.date === new Date().toISOString().split('T')[0]
                  const dayTicket = day.count > 0 ? day.total / day.count : 0

                  return (
                    <Card 
                      key={day.date} 
                      className={`border border-slate-100 shadow-sm rounded-3xl transition-all duration-200 overflow-hidden ${
                        isExpanded ? 'ring-2 ring-amber-400 bg-white shadow-md' : 'bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div 
                        className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                        onClick={() => toggleDate(day.date)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                            isExpanded ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'
                          }`}>
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 capitalize text-base">
                                {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              {isToday && (
                                <Badge className="bg-amber-100 text-amber-700 border-none font-bold text-[10px] px-2">
                                  Hoje
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                              <span>{day.count} {day.count === 1 ? 'pedido finalizado' : 'pedidos finalizados'}</span>
                              <span>•</span>
                              <span>Ticket Médio: {showRevenue ? `R$ ${dayTicket.toFixed(2).replace('.', ',')}` : '••••'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fechamento do Dia</p>
                            <p className="text-xl font-black text-slate-900">
                              {showRevenue ? `R$ ${day.total.toFixed(2).replace('.', ',')}` : "••••"}
                            </p>
                          </div>
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Visão Detalhada com Statement / Conciliação */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/40 animate-in slide-in-from-top-2 duration-200 space-y-4">
                          
                          {/* Card de Resumo de Caixa e Meios de Pagamento */}
                          {expandedBreakdown && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mt-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                  <QrCode className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400">Total PIX</p>
                                  <p className="text-base font-extrabold text-slate-900">
                                    {showRevenue ? `R$ ${expandedBreakdown.pix.toFixed(2).replace('.', ',')}` : '••••'}
                                  </p>
                                  <p className="text-[10px] font-bold text-teal-600">{expandedBreakdown.pixPercent.toFixed(0)}% das vendas</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                  <Banknote className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Dinheiro</p>
                                  <p className="text-base font-extrabold text-slate-900">
                                    {showRevenue ? `R$ ${expandedBreakdown.dinheiro.toFixed(2).replace('.', ',')}` : '••••'}
                                  </p>
                                  <p className="text-[10px] font-bold text-emerald-600">{expandedBreakdown.dinheiroPercent.toFixed(0)}% das vendas</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase text-slate-400">Cartão & Outros</p>
                                  <p className="text-base font-extrabold text-slate-900">
                                    {showRevenue ? `R$ ${(expandedBreakdown.cartao + expandedBreakdown.outros).toFixed(2).replace('.', ',')}` : '••••'}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-500">Conciliação direta</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {loadingOrders === day.date ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-2">
                              <Clock className="h-6 w-6 text-amber-500 animate-spin" />
                              <span className="text-xs font-semibold text-slate-400">Carregando pedidos do dia...</span>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                                Pedidos Detalhados ({dateOrders[day.date]?.length || 0})
                              </p>
                              {dateOrders[day.date]?.map((order) => (
                                <div 
                                  key={order.id} 
                                  onClick={() => handleOrderClick(order)}
                                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:shadow-md border border-slate-100 hover:border-amber-200 transition-all cursor-pointer group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-500 border border-slate-100 group-hover:text-amber-600 group-hover:border-amber-200 transition-colors">
                                      #{order.orderNumber}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                                        {order.customerName}
                                      </p>
                                      <p className="text-[11px] text-slate-500 font-medium">
                                        {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {(order.paymentMethod || 'Dinheiro').toUpperCase()} • {order.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="font-black text-slate-900 text-sm">
                                        R$ {order.total.toFixed(2).replace('.', ',')}
                                      </p>
                                      {order.discountAmount ? (
                                        <p className="text-[10px] font-bold text-emerald-600">
                                          Desc. -R$ {order.discountAmount.toFixed(2).replace('.', ',')}
                                        </p>
                                      ) : null}
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                      onClick={(e) => handleDeleteClick(e, order)}
                                      title="Excluir pedido"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Detalhes do Pedido iFood Style */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black">Pedido #{selectedOrder?.orderNumber}</DialogTitle>
                <p className="text-xs font-semibold text-amber-100 mt-1">
                  {selectedOrder?.deliveryType === 'delivery' ? 'Entrega em domicílio' : 'Retirada no balcão'}
                </p>
              </div>
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-bold uppercase tracking-wider text-xs px-2.5 py-1">
                {selectedOrder?.status === 'delivered' ? 'Entregue' : selectedOrder?.status}
              </Badge>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp / Telefone</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedOrder?.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endereço de Entrega</p>
                    <p className="font-bold text-slate-900 text-xs leading-relaxed">{selectedOrder?.address}</p>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Pedido</p>
                {selectedOrder?.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-4 py-1.5 border-b border-slate-50 last:border-none">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">
                        <span className="text-amber-600 font-extrabold">{item.quantity}x</span> {item.name}
                      </p>
                      {item.pastaType && (
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Tipo: {item.pastaType}</p>
                      )}
                      {item.adicionais?.map((a: any, j: number) => (
                        <p key={j} className="text-[10px] text-slate-500 font-medium">+ {a.quantity}x {a.name}</p>
                      ))}
                    </div>
                    <p className="text-xs font-black text-slate-900">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                  </div>
                ))}
              </div>

              {selectedOrder?.notes && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Observações do Cliente</p>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="pt-2 space-y-2 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Subtotal</span>
                  <span>R$ {((selectedOrder?.total || 0) + (selectedOrder?.discountAmount || 0)).toFixed(2).replace('.', ',')}</span>
                </div>
                {selectedOrder?.discountAmount ? (
                  <div className="flex justify-between text-xs font-bold text-emerald-600">
                    <span>Desconto aplicado</span>
                    <span>- R$ {selectedOrder.discountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-slate-900">Total Liquidado</span>
                  <span className="text-2xl font-black text-amber-600">
                    R$ {selectedOrder?.total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Receipt className="h-3.5 w-3.5 text-amber-500" />
                  <span>Pagamento: {(selectedOrder?.paymentMethod || 'Dinheiro').toUpperCase()}</span>
                  {trocoInfo && <span className="ml-auto text-amber-700">Troco para R$ {trocoInfo}</span>}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)} className="w-full rounded-2xl font-bold">
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-none p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-14 w-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-black text-slate-900">Excluir Pedido?</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">
                Esta ação é permanente e removerá o pedido #{orderToDelete?.orderNumber} dos registros financeiros.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting} className="rounded-2xl font-bold text-xs">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDeleteOrder} disabled={isDeleting} className="rounded-2xl font-bold text-xs bg-red-500 hover:bg-red-600">
                {isDeleting ? <Clock className="h-4 w-4 animate-spin" /> : "Sim, Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
