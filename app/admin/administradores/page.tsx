"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  ArrowLeft,
  Plus,
  Trash2,
  Crown,
  Mail,
  AlertCircle,
  RefreshCw,
  Search,
  KeyRound,
  Users,
  CheckCircle2,
} from "lucide-react"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import Link from "next/link"

interface AdminItem {
  user_id: string
  email: string
  is_owner: boolean
}

const OWNER_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

const ERROR_MESSAGES_ADD: Record<string, string> = {
  forbidden: "Você não tem permissão para adicionar administradores.",
  invalid_email: "E-mail inválido. Verifique o formato digitado.",
  not_found: "Usuário não encontrado. O usuário precisa criar uma conta antes de ser promovido.",
  already_admin: "Este usuário já é um administrador.",
}

const ERROR_MESSAGES_REMOVE: Record<string, string> = {
  forbidden: "Você não tem permissão para remover administradores.",
  invalid_email: "E-mail inválido.",
  not_admin: "Este usuário não é um administrador.",
  owner_protected: "Este administrador é o proprietário principal e não pode ser removido.",
  self: "Você não pode remover o seu próprio acesso de administrador.",
}

function getInitials(email: string): string {
  if (!email) return "AD"
  const prefix = email.split("@")[0].replace(/[._-]/g, " ")
  const parts = prefix.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function AdminAdministradoresPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [newEmail, setNewEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

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
        loadAdmins()
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    })
  }, [user, loading, router])

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true)
    setErrorMessage(null)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc("admin_list_admins")

      if (error) {
        console.error("Erro ao listar administradores:", error)
        setErrorMessage("Não foi possível carregar a lista de administradores. O recurso pode estar indisponível no momento.")
        setAdmins([])
      } else if (Array.isArray(data)) {
        setAdmins(data)
      } else {
        setAdmins([])
      }
    } catch (err: any) {
      console.error("Erro inesperado ao listar administradores:", err)
      setErrorMessage("Erro ao conectar ao servidor. Tente novamente mais tarde.")
    } finally {
      setLoadingAdmins(false)
    }
  }, [])

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const emailTrimmed = newEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage("Por favor, digite um e-mail válido.")
      return
    }

    setSubmitting(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc("admin_add_admin", {
        p_email: emailTrimmed,
      })

      if (error) {
        const msg = ERROR_MESSAGES_ADD[error.message] || error.message || "Erro ao adicionar administrador."
        setErrorMessage(msg)
      } else if (data && !data.ok) {
        const code = data.error || "unknown"
        const msg = ERROR_MESSAGES_ADD[code] || "Não foi possível adicionar o administrador."
        setErrorMessage(msg)
      } else {
        setSuccessMessage(`Administrador ${emailTrimmed} adicionado com sucesso!`)
        setNewEmail("")
        await loadAdmins()
      }
    } catch (err: any) {
      console.error("Erro ao adicionar admin:", err)
      setErrorMessage("Erro de conexão ao adicionar administrador.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveAdmin = async (targetEmail: string) => {
    setErrorMessage(null)
    setSuccessMessage(null)

    const confirmed = window.confirm(`Tem certeza que deseja remover o acesso administrativo de ${targetEmail}?`)
    if (!confirmed) return

    setRemovingEmail(targetEmail)
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc("admin_remove_admin", {
        p_email: targetEmail,
      })

      if (error) {
        const msg = ERROR_MESSAGES_REMOVE[error.message] || error.message || "Erro ao remover administrador."
        setErrorMessage(msg)
      } else if (data && !data.ok) {
        const code = data.error || "unknown"
        const msg = ERROR_MESSAGES_REMOVE[code] || "Não foi possível remover o administrador."
        setErrorMessage(msg)
      } else {
        setSuccessMessage(`Administrador ${targetEmail} removido com sucesso.`)
        await loadAdmins()
      }
    } catch (err: any) {
      console.error("Erro ao remover admin:", err)
      setErrorMessage("Erro de conexão ao remover administrador.")
    } finally {
      setRemovingEmail(null)
    }
  }

  const isCurrentUserOwner = Boolean(
    user?.email &&
    (OWNER_EMAILS.includes(user.email.toLowerCase()) ||
     admins.some((adm) => adm.is_owner === true && adm.email?.toLowerCase() === user.email?.toLowerCase()))
  )

  const filteredAdmins = useMemo(() => {
    if (!searchTerm.trim()) return admins
    const term = searchTerm.toLowerCase().trim()
    return admins.filter(
      (adm) =>
        adm.email?.toLowerCase().includes(term) ||
        adm.user_id?.toLowerCase().includes(term)
    )
  }, [admins, searchTerm])

  const ownersCount = useMemo(() => admins.filter((a) => a.is_owner).length, [admins])
  const teamCount = admins.length - ownersCount

  if (loading || checking || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-amber-200 border-t-[#C1440E] mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-sm">Verificando permissões de acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <HeaderWrapper />
      <main className="flex-1 py-8 px-4 md:px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Top Bar Navigation */}
          <div className="mb-6">
            <Link href="/admin">
              <Button
                variant="ghost"
                className="mb-4 text-gray-600 hover:text-[#C1440E] hover:bg-amber-50 font-semibold gap-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Painel
              </Button>
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-[#C1440E] rounded-2xl flex items-center justify-center shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                      Gestão de Acessos
                    </h1>
                    <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-xs font-bold px-2 py-0.5">
                      Portal Parceiro
                    </Badge>
                  </div>
                  <p className="text-gray-500 text-xs md:text-sm mt-0.5">
                    Controle de usuários, perfis de acesso e privilégios da equipe
                  </p>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2">
                <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
                  <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Total</span>
                  <span className="text-base font-extrabold text-gray-900">{admins.length}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
                  <span className="text-xs font-semibold text-amber-700 block uppercase tracking-wider">Donos</span>
                  <span className="text-base font-extrabold text-amber-900">{ownersCount}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-center shadow-xs">
                  <span className="text-xs font-semibold text-gray-400 block uppercase tracking-wider">Admins</span>
                  <span className="text-base font-extrabold text-gray-900">{teamCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm font-semibold shadow-xs">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* Card: Adicionar Administrador (Apenas Donos) */}
          {isCurrentUserOwner ? (
            <Card className="mb-8 border border-amber-100 shadow-sm bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white border-b border-amber-100/60 p-5">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[#C1440E]" />
                  Convidar Novo Administrador
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Insira o e-mail cadastrado na plataforma para conceder acesso às ferramentas de gestão.
                </p>
              </CardHeader>
              <CardContent className="p-5">
                <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="admin-email" className="sr-only">E-mail do administrador</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        id="admin-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="exemplo@gestor.com"
                        className="pl-10 h-11 text-sm border-gray-200 focus:border-amber-400 rounded-xl"
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting || !newEmail.trim()}
                    className="bg-[#C1440E] hover:bg-[#a93a0a] text-white font-bold h-11 px-6 rounded-xl shadow-xs transition-colors gap-2"
                  >
                    {submitting ? "Concedendo..." : "Conceder Acesso"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="mb-8 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs md:text-sm font-medium">
              <Crown className="h-5 w-5 text-amber-600 shrink-0" />
              <span>
                Visualização protegida: apenas proprietários principais podem delegar ou revogar permissões administrativas.
              </span>
            </div>
          )}

          {/* Card: Lista de Administradores */}
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-white border-b border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  Membros com Acesso
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {filteredAdmins.length} usuário(s) encontrado(s)
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por e-mail..."
                    className="pl-9 h-9 text-xs border-gray-200 rounded-lg"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAdmins}
                  disabled={loadingAdmins}
                  className="rounded-lg border-gray-200 text-gray-700 hover:text-gray-900 h-9 px-3 gap-1.5 shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAdmins ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline text-xs">Atualizar</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingAdmins ? (
                <div className="py-14 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-200 border-t-[#C1440E] mx-auto mb-3" />
                  <p className="text-gray-500 text-xs">Sincronizando lista de administradores...</p>
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="py-14 text-center px-4">
                  <KeyRound className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700 text-sm">
                    {searchTerm ? "Nenhum resultado para a busca" : "Nenhum administrador cadastrado"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    {searchTerm
                      ? "Verifique se digitou o endereço corretamente."
                      : "A lista está vazia ou a tabela no banco de dados ainda não foi inicializada."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAdmins.map((adm) => {
                    const isSelf = user?.email?.toLowerCase() === adm.email?.toLowerCase()
                    const isOwner = adm.is_owner === true || OWNER_EMAILS.includes(adm.email?.toLowerCase())
                    const initials = getInitials(adm.email)

                    return (
                      <div
                        key={adm.user_id || adm.email}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Avatar Initials Badge */}
                          <div
                            className={`h-11 w-11 rounded-xl flex items-center justify-center text-sm font-black shadow-xs shrink-0 ${
                              isOwner
                                ? "bg-gradient-to-br from-amber-400 to-[#C1440E] text-white"
                                : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {initials}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm md:text-base">
                                {adm.email}
                              </span>

                              {isOwner ? (
                                <Badge className="bg-amber-100/90 text-amber-900 border-amber-300 hover:bg-amber-100 gap-1 font-bold text-[11px] px-2 py-0.5">
                                  <Crown className="h-3 w-3 text-amber-600" />
                                  Proprietário
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-gray-300 text-gray-700 font-semibold text-[11px] px-2 py-0.5">
                                  Administrador
                                </Badge>
                              )}

                              {isSelf && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-semibold text-[11px] px-2 py-0.5">
                                  Você
                                </Badge>
                              )}

                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Ativo
                              </span>
                            </div>

                            {/* Permissions Pills (iFood Partner Access style) */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[11px] text-gray-500">
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                                {isOwner ? "Acesso Irrestrito (Total)" : "Operação & Cardápio"}
                              </span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                                {isOwner ? "Gestão de Usuários" : "Relatórios & Pedidos"}
                              </span>
                              {adm.user_id && (
                                <span className="text-gray-400 font-mono text-[10px]">
                                  ID: {adm.user_id.slice(0, 8)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="self-end sm:self-center">
                          {isCurrentUserOwner && !isOwner && !isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdmin(adm.email)}
                              disabled={removingEmail === adm.email}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-lg text-xs gap-1.5 h-8 px-3 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {removingEmail === adm.email ? "Revogando..." : "Revogar Acesso"}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
