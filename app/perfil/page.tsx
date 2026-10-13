"use client"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import {
  User,
  Mail,
  ShoppingBag,
  MapPin,
  Plus,
  Trash2,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Settings,
  HelpCircle,
  Lock,
  Package,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { OrderSummary } from "@/components/order-summary"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

export default function PerfilPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [newAddress, setNewAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "Iacanga",
    state: "SP",
    cep: "",
  })
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      setIsAdmin(true)
      return
    }
    const supabase = getSupabaseBrowserClient()
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }: any) => {
        if (data?.role === "admin") {
          setIsAdmin(true)
        }
      })
  }, [user])

  useEffect(() => {
    if (user) {
      loadAddresses()
    }
  }, [user])

  const loadAddresses = async () => {
    if (!user) return
    setIsLoadingAddresses(true)
    const userAddresses = await addressesManager.getUserAddresses(user.id)
    setAddresses(userAddresses)
    setIsLoadingAddresses(false)
  }

  const handleAddAddress = async () => {
    if (!newAddress.street || !newAddress.number || !newAddress.neighborhood || !newAddress.cep) {
      alert("Preencha todos os campos obrigatórios")
      return
    }
    if (!user) return
    const address = {
      user_id: user.id,
      ...newAddress,
      is_default: addresses.length === 0,
    }
    const result = await addressesManager.addAddress(address)
    if (result) {
      await loadAddresses()
      setNewAddress({ street: "", number: "", complement: "", neighborhood: "", city: "Iacanga", state: "SP", cep: "" })
      setShowAddressForm(false)
    } else {
      alert("Erro ao adicionar endereço. Tente novamente.")
    }
  }

  const handleDeleteAddress = async (id: string) => {
    const success = await addressesManager.deleteAddress(id)
    if (success) {
      await loadAddresses()
    } else {
      alert("Erro ao deletar endereço. Tente novamente.")
    }
  }

  const handleSetDefault = async (id: string) => {
    if (!user) return
    const success = await addressesManager.setDefaultAddress(user.id, id)
    if (success) {
      await loadAddresses()
    } else {
      alert("Erro ao definir endereço padrão. Tente novamente.")
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleCepChange = async (value: string) => {
    const formatted = value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 9)
    setNewAddress({ ...newAddress, cep: formatted })
    if (formatted.replace(/\D/g, "").length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formatted.replace(/\D/g, "")}/json/`)
        const data = await response.json()
        if (!data.erro) {
          setNewAddress({
            ...newAddress,
            cep: formatted,
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "Iacanga",
            state: data.uf || "SP",
          })
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-400 font-bold text-sm">Carregando...</p>
          </div>
        </main>
        <Footer />
        <OrderSummary />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderWrapper />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl space-y-4">

          {/* ── Card de perfil ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Banner + avatar */}
            <div className="relative">
              {/* Banner */}
              <div
                className="h-24 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #f5c518 0%, #e6ac00 50%, #c98f00 100%)",
                }}
              >
                {/* Círculos decorativos */}
                <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 right-12 h-16 w-16 rounded-full bg-white/10" />
                <div className="absolute top-2 left-1/3 h-10 w-10 rounded-full bg-white/10" />
              </div>

              {/* Avatar — absolute na borda do banner, metade pra baixo */}
              <div className="absolute bottom-0 left-6 translate-y-1/2 h-20 w-20 rounded-full border-4 border-white shadow-lg bg-yellow-100 flex items-center justify-center text-yellow-600 overflow-hidden z-10">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.full_name || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-9 w-9" />
                )}
              </div>
            </div>

            {/* Nome e email — padding top pra dar espaço ao avatar */}
            <div className="px-6 pt-14 pb-5">
              <h1 className="text-xl font-black text-gray-900 truncate">
                {user.user_metadata?.full_name || "Usuário"}
              </h1>
              <p className="text-sm text-gray-400 flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 flex-shrink-0" />
                {user.email}
              </p>
            </div>
          </div>

          {/* ── Menu principal — Conta & Dados ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">

            {/* Meus Dados */}
            <button
              onClick={() => router.push("/meus-dados")}
              className="cursor-pointer w-full flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Meus Dados</p>
                  <p className="text-xs text-gray-400">Nome, telefone e mais</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </button>

            {/* Segurança */}
            <button
              onClick={() => router.push("/seguranca")}
              className="cursor-pointer w-full flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Segurança</p>
                  <p className="text-xs text-gray-400">Senha e privacidade</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </button>
          </div>

          {/* ── Meus Endereços ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500 flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Meus Endereços</p>
                  <p className="text-xs text-gray-400">Onde entregamos suas batatas</p>
                </div>
              </div>
              {!showAddressForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddressForm(true)}
                  className="cursor-pointer text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 font-bold flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              )}
            </div>

            <div className="px-5 pb-5 space-y-3">
              {isLoadingAddresses ? (
                <div className="py-4 text-center text-sm text-gray-400">Carregando...</div>
              ) : addresses.length === 0 && !showAddressForm ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhum endereço cadastrado.</p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border-2 relative ${
                      addr.is_default ? "border-yellow-400 bg-yellow-50" : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="pr-16">
                      <p className="font-bold text-gray-800 text-sm">
                        {addr.street}, {addr.number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {addr.neighborhood} - {addr.city}
                      </p>
                      {addr.is_default && (
                        <span className="inline-block mt-1 text-[10px] font-black text-yellow-600 uppercase tracking-wider">
                          Padrão
                        </span>
                      )}
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1">
                      {!addr.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(addr.id)}
                          className="cursor-pointer h-8 w-8 text-gray-300 hover:text-blue-500"
                          title="Definir como padrão"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="cursor-pointer h-8 w-8 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {/* Formulário novo endereço */}
              {showAddressForm && (
                <div className="mt-2 p-4 border-2 border-dashed border-yellow-200 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs font-bold text-gray-500">CEP</Label>
                      <Input
                        placeholder="00000-000"
                        value={newAddress.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        className="h-10 rounded-xl border-gray-100"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-bold text-gray-500">Rua</Label>
                      <Input
                        placeholder="Nome da rua"
                        value={newAddress.street}
                        onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                        className="h-10 rounded-xl border-gray-100"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-gray-500">Número</Label>
                      <Input
                        placeholder="123"
                        value={newAddress.number}
                        onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })}
                        className="h-10 rounded-xl border-gray-100"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-gray-500">Bairro</Label>
                      <Input
                        placeholder="Bairro"
                        value={newAddress.neighborhood}
                        onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                        className="h-10 rounded-xl border-gray-100"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={handleAddAddress}
                      className="cursor-pointer flex-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold"
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowAddressForm(false)}
                      className="cursor-pointer rounded-xl text-gray-400"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Meus Pedidos ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => router.push("/pedidos")}
              className="cursor-pointer w-full flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Meus Pedidos</p>
                  <p className="text-xs text-gray-400">Histórico de compras</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </button>
          </div>

          {/* ── Ajuda ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => router.push("/ajuda")}
              className="cursor-pointer w-full flex items-center justify-between p-5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Ajuda</p>
                  <p className="text-xs text-gray-400">Dúvidas e suporte</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </button>
          </div>

          {/* ── Botão Sair ── sempre no mesmo lugar ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={handleSignOut}
              className="cursor-pointer w-full flex items-center gap-4 p-5 hover:bg-red-50 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                <LogOut className="h-5 w-5" />
              </div>
              <p className="font-bold text-red-500">Sair da conta</p>
            </button>
          </div>

          {/* ── Painel Admin (só pra admins) ── */}
          {isAdmin && (
            <div
              className="rounded-2xl shadow-sm overflow-hidden"
              style={{
                background: "linear-gradient(100deg, #fffbeb 0%, #fef3c7 100%)",
                border: "1.5px solid #fcd34d",
              }}
            >
              <button
                onClick={() => router.push("/admin")}
                className="cursor-pointer w-full flex items-center justify-between p-5 hover:bg-yellow-50/60 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800">Painel Admin</p>
                    <p className="text-xs text-amber-600/70">Gerenciar loja e pedidos</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-400 flex-shrink-0" />
              </button>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-400 uppercase font-black tracking-widest pt-2 pb-4">
            batata top Iacanga • Versão 1.1
          </p>
        </div>
      </main>

      <Footer />
      <OrderSummary />
    </div>
  )
}