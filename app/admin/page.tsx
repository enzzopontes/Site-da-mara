"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ordersManager } from "@/lib/orders-manager"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { BusinessHours } from "@/components/business-hours"
import {
  ShoppingBag,
  Clock,
  ChefHat,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Receipt,
  Package,
  Ticket,
  ImageIcon,
  Star,
  Megaphone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    totalSales: 0,
  })

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    checkIsAdmin(user.id).then((allowed) => {
      setChecking(false)
      if (allowed) {
        setIsAdmin(true)
        loadStats()
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    })
  }, [user, loading, router])

  const loadStats = async () => {
    try {
      const todayStats = await ordersManager.getTodayStats()
      setStats(todayStats)
    } catch (err) {
      console.error("Erro ao carregar estatísticas do dia:", err)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  if (loading || checking || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-[#E3A008] mx-auto mb-4" />
          <p className="text-stone-600 text-sm font-semibold">
            Carregando painel operacional...
          </p>
        </div>
      </div>
    )
  }

  const averageTicket =
    stats.completedOrders > 0
      ? stats.totalSales / stats.completedOrders
      : stats.totalOrders > 0
      ? stats.totalSales / stats.totalOrders
      : 0

  const operationalModules = [
    {
      title: "Gestor de Pedidos",
      description: "Monitore a fila em tempo real, despache entregas e imprima comandas.",
      href: "/admin/pedidos",
      icon: ShoppingBag,
      badgeText:
        stats.pendingOrders > 0
          ? `${stats.pendingOrders} pendente(s)`
          : "Fila em dia",
      badgeVariant: stats.pendingOrders > 0 ? "warning" : "success",
      colorClass: "from-amber-500 to-amber-600 text-amber-600",
      btnText: "Acessar Pedidos",
    },
    {
      title: "Cardápio & Produtos",
      description: "Gerencie itens, categorias, adicionais, fotos e disponibilidade.",
      href: "/admin/produtos",
      icon: Package,
      badgeText: "Catálogo Online",
      badgeVariant: "neutral",
      colorClass: "from-stone-700 to-stone-800 text-stone-700",
      btnText: "Editar Cardápio",
    },
    {
      title: "Cupons de Desconto",
      description: "Crie campanhas promocionais, cupons de frete grátis ou porcentagem.",
      href: "/admin/cupons",
      icon: Ticket,
      badgeText: "Campanhas",
      badgeVariant: "neutral",
      colorClass: "from-purple-600 to-indigo-600 text-purple-600",
      btnText: "Gerenciar Cupons",
    },
    {
      title: "Fluxo de Caixa",
      description: "Relatório de faturamento detalhado, formas de pagamento e fechamento.",
      href: "/admin/caixa",
      icon: DollarSign,
      badgeText: `R$ ${stats.totalSales.toFixed(2).replace(".", ",")}`,
      badgeVariant: "success",
      colorClass: "from-emerald-600 to-teal-700 text-emerald-600",
      btnText: "Acessar Financeiro",
    },
    {
      title: "Banco de Imagens",
      description: "Armazene e faça upload de fotos em alta qualidade diretamente para a CDN.",
      href: "/admin/imagens",
      icon: ImageIcon,
      badgeText: "Cloud Storage",
      badgeVariant: "neutral",
      colorClass: "from-blue-600 to-cyan-600 text-blue-600",
      btnText: "Gerenciar Fotos",
    },
    {
      title: "Banner & Promoções",
      description: "Configure o banner principal, combos relâmpago e promoções sazonais.",
      href: "/admin/promocoes",
      icon: Megaphone,
      badgeText: "Destaques",
      badgeVariant: "neutral",
      colorClass: "from-orange-500 to-rose-600 text-orange-600",
      btnText: "Ajustar Promoções",
    },
    {
      title: "Avaliações & Feedbacks",
      description: "Acompanhe notas, elogios e comentários enviados pelos seus clientes.",
      href: "/admin/feedbacks",
      icon: Star,
      badgeText: "Satisfação",
      badgeVariant: "neutral",
      colorClass: "from-amber-400 to-yellow-500 text-amber-500",
      btnText: "Ver Avaliações",
    },
    {
      title: "Administradores",
      description: "Controle de permissões, convite de novos operadores e segurança da conta.",
      href: "/admin/administradores",
      icon: ShieldCheck,
      badgeText: "Segurança",
      badgeVariant: "neutral",
      colorClass: "from-zinc-700 to-stone-900 text-zinc-700",
      btnText: "Gerenciar Acessos",
    },
  ]

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C1440E] bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-200">
              Operação de Hoje
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
            Painel do Parceiro Batata Top
          </h1>
          <p className="text-sm text-stone-500">
            Resumo consolidado de vendas, pedidos e atalhos operacionais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-10 rounded-xl border-stone-300 font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 text-[#E3A008] ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            <span>{refreshing ? "Atualizando..." : "Atualizar Dados"}</span>
          </Button>

          <Link href="/admin/pedidos">
            <Button className="h-10 rounded-xl bg-[#E3A008] hover:bg-[#C98B07] text-[#1F1B16] font-bold flex items-center gap-2 shadow-sm shadow-amber-900/10">
              <ShoppingBag className="h-4 w-4" />
              <span>Gestor de Pedidos</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. CARDS DE MÉTRICAS MODERNOS (iFood Partner Style) */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Vendas Hoje */}
          <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Faturamento
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Total Hoje
              </p>
              <p className="text-2xl font-black text-stone-900 mt-1">
                R$ {stats.totalSales.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span>{stats.completedOrders} pedido(s) concluído(s)</span>
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Pedidos Pendentes */}
          <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Ação Imediata
                </span>
                <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Pendentes
              </p>
              <p className="text-2xl font-black text-[#C1440E] mt-1">
                {stats.pendingOrders}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Aguardando confirmação
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Em Preparo */}
          <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Na Cozinha
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <ChefHat className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Em Produção
              </p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {stats.preparingOrders}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Sendo preparados agora
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Pedidos Concluídos */}
          <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Finalizados
                </span>
                <div className="h-9 w-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Concluídos
              </p>
              <p className="text-2xl font-black text-teal-800 mt-1">
                {stats.completedOrders}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                De {stats.totalOrders} pedido(s) hoje
              </p>
            </CardContent>
          </Card>

          {/* Card 5: Ticket Médio */}
          <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Eficiência
                </span>
                <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Ticket Médio
              </p>
              <p className="text-2xl font-black text-stone-900 mt-1">
                R$ {averageTicket.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Média por pedido finalizado
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. STATUS DA LOJA & HORÁRIO (PRESERVADO) */}
      <section>
        <Card className="border border-stone-200 bg-white rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="bg-stone-50/80 border-b border-stone-200 py-4 px-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[#E3A008]" />
              <CardTitle className="text-base font-bold text-stone-900">
                Horário de Atendimento & Status do Delivery
              </CardTitle>
            </div>
            <span className="text-xs text-stone-500">Configuração em tempo real</span>
          </CardHeader>
          <CardContent className="p-6">
            <BusinessHours showToggle={true} />
          </CardContent>
        </Card>
      </section>

      {/* 3. GRID OPERACIONAL RÁPIDO COM STATUS BADGES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Acessos Rápidos da Operação
            </h2>
            <p className="text-xs text-stone-500">
              Gerencie todas as áreas e ferramentas do seu restaurante
            </p>
          </div>
          <span className="text-xs text-stone-400 font-medium">
            8 módulos integrados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {operationalModules.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="group block">
                <Card className="h-full border border-stone-200 bg-white rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 flex flex-col justify-between group-hover:-translate-y-0.5">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 flex items-center justify-center text-[#C1440E] group-hover:scale-105 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.badgeVariant === "warning"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : item.badgeVariant === "success"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {item.badgeText}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 group-hover:text-[#C1440E] transition-colors mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#C1440E] group-hover:text-amber-600 transition-colors">
                    <span>{item.btnText}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
