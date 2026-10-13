"use client"

import { useEffect, useState } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Package, ShoppingBag, Ticket, DollarSign, TrendingUp, Clock, ChefHat, Star, Megaphone, Image, ShieldCheck } from "lucide-react"
import { ordersManager } from "@/lib/orders-manager"
import { BusinessHours } from "@/components/business-hours"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import Link from "next/link"

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
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

    // FIX: antes essa checagem usava uma lista ADMIN_EMAILS hardcoded
    // aqui na própria página, duplicando (e brigando com) a lógica central
    // de lib/supabase/admin.ts. Agora usa o mesmo isAdmin() que já
    // considera e-mail, metadata, profiles.role e NEXT_PUBLIC_ADMIN_EMAILS.
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
    const todayStats = await ordersManager.getTodayStats()
    setStats(todayStats)
  }

  if (loading || checking || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-200 border-t-yellow-500 mx-auto mb-6"></div>
          <p className="text-gray-600 font-semibold">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 via-white to-yellow-50">
      <HeaderWrapper />
      <main className="flex-1 py-8 px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Cabeçalho */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-14 w-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900">Painel Administrativo</h1>
                <p className="text-gray-500 text-sm md:text-base">Gerencie seus pedidos e operações</p>
              </div>
            </div>
          </div>

          {/* Status da Loja */}
          <Card className="mb-8 border-none shadow-md bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-white border-b border-yellow-100 pb-4">
              <CardTitle className="text-lg font-bold text-gray-900">Status da Loja</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BusinessHours showToggle={true} />
            </CardContent>
          </Card>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total de Pedidos */}
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-yellow-600" />
                  </div>
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">Hoje</span>
                </div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Pedidos Totais</p>
                <p className="text-4xl font-black text-gray-900 mb-2">{stats.totalOrders}</p>
                <p className="text-xs text-gray-500">
                  {stats.pendingOrders} pendentes, {stats.preparingOrders} preparando
                </p>
              </CardContent>
            </Card>

            {/* Pendentes */}
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">Ação</span>
                </div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Pendentes</p>
                <p className="text-4xl font-black text-orange-600 mb-2">{stats.pendingOrders}</p>
                <p className="text-xs text-gray-500">Aguardando confirmação</p>
              </CardContent>
            </Card>

            {/* Preparando */}
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ChefHat className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Progresso</span>
                </div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Preparando</p>
                <p className="text-4xl font-black text-blue-600 mb-2">{stats.preparingOrders}</p>
                <p className="text-xs text-gray-500">Em produção agora</p>
              </CardContent>
            </Card>

            {/* Faturamento */}
            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Receita</span>
                </div>
                <p className="text-gray-600 text-sm font-semibold mb-1">Faturamento</p>
                <p className="text-4xl font-black text-green-600 mb-2">
                  R$ {stats.totalSales.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-xs text-gray-500">Vendas de hoje</p>
              </CardContent>
            </Card>
          </div>

          {/* Menu de Ações */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Gerenciar Pedidos */}
            <Link href="/admin/pedidos" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-yellow-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <ShoppingBag className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Gerenciar Pedidos</h3>
                      <p className="text-gray-600 text-sm">Visualize, atualize status e acompanhe entregas</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Pedidos
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Gerenciar Produtos */}
            <Link href="/admin/produtos" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Gerenciar Produtos</h3>
                      <p className="text-gray-600 text-sm">Adicione, edite ou remova itens do cardápio</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Produtos
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Gerenciar Cupons */}
            <Link href="/admin/cupons" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Ticket className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Gerenciar Cupons</h3>
                      <p className="text-gray-600 text-sm">Crie e controle cupons de desconto</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Cupons
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Gerenciar Imagens */}
            <Link href="/admin/imagens" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Image className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Gerenciar Imagens</h3>
                      <p className="text-gray-600 text-sm">Upload de fotos sem precisar de Git</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-indigo-400 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Imagens
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Gestão Financeira */}
            <Link href="/admin/caixa" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Gestão Financeira</h3>
                      <p className="text-gray-600 text-sm">Resumo de vendas, faturamento e histórico</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Financeiro
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Feedbacks */}
            <Link href="/admin/feedbacks" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Star className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Feedbacks</h3>
                      <p className="text-gray-600 text-sm">Visualize avaliações e comentários dos clientes</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Ver Feedbacks
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Gerenciar Promoção */}
            <Link href="/admin/promocoes" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Megaphone className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Gerenciar Promoção</h3>
                      <p className="text-gray-600 text-sm">Configure a promoção ativa no site</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Promoção
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Gerenciar Administradores */}
            <Link href="/admin/administradores" className="group">
              <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white rounded-3xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <ShieldCheck className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black text-gray-900 mb-1">Administradores</h3>
                      <p className="text-gray-600 text-sm">Cadastre e remova e-mails de administradores</p>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold h-12 rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Acessar Administradores
                  </Button>
                </CardContent>
              </Card>
            </Link>


          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
