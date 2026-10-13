"use client"

import { useEffect, useState, useCallback } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { ShieldCheck, ArrowLeft, Plus, Trash2, Crown, Mail, AlertCircle, RefreshCw } from "lucide-react"
import { isAdmin as checkIsAdmin } from "@/lib/supabase/admin"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import Link from "next/link"

interface AdminItem {
  user_id: string
  email: string
  is_owner: boolean
}

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

export default function AdminAdministradoresPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  const [admins, setAdmins] = useState<AdminItem[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
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
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8">
            <Link href="/admin">
              <Button variant="ghost" className="mb-6 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 font-semibold gap-2">
                <ArrowLeft className="h-5 w-5" />
                Voltar ao Painel
              </Button>
            </Link>

            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900">Gerenciar Administradores</h1>
                <p className="text-gray-500 text-sm md:text-base">Cadastre e remova e-mails com acesso total ao painel administrativo</p>
              </div>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm font-semibold">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* Card: Adicionar Administrador */}
          <Card className="mb-8 border-none shadow-md bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100 p-6">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                Adicionar Novo Administrador
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="admin-email" className="sr-only">E-mail do administrador</Label>
                  <div className="relative">
                    <Mail className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input
                      id="admin-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="novo.administrador@email.com"
                      className="pl-12 h-12 text-base border-2 focus:border-indigo-400 rounded-xl"
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting || !newEmail.trim()}
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg gap-2"
                >
                  {submitting ? "Adicionando..." : "Adicionar Administrador"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card: Lista de Administradores */}
          <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-white border-b border-yellow-100 p-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Administradores Atuais
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {admins.length} usuário(s) com privilégios de administrador
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAdmins}
                disabled={loadingAdmins}
                className="rounded-xl border-gray-200 text-gray-600 hover:text-gray-900 gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAdmins ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              {loadingAdmins ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600 mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Carregando lista de administradores...</p>
                </div>
              ) : admins.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <ShieldCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-700">Nenhum administrador encontrado</p>
                  <p className="text-xs text-gray-400 mt-1">A lista de administradores está vazia ou a função no banco ainda não foi criada.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {admins.map((adm) => {
                    const isSelf = user?.email?.toLowerCase() === adm.email?.toLowerCase()
                    const isOwner = adm.is_owner === true

                    return (
                      <div
                        key={adm.user_id || adm.email}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${isOwner ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-700"}`}>
                            {isOwner ? <Crown className="h-5 w-5 text-amber-600" /> : <Mail className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{adm.email}</span>
                              {isOwner && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 gap-1 font-bold">
                                  <Crown className="h-3 w-3" />
                                  Dono
                                </Badge>
                              )}
                              {isSelf && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 font-semibold">
                                  Você
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">ID: {adm.user_id || "—"}</span>
                          </div>
                        </div>

                        <div>
                          {!isOwner && !isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdmin(adm.email)}
                              disabled={removingEmail === adm.email}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold rounded-xl gap-1.5"
                            >
                              <Trash2 className="h-4 w-4" />
                              {removingEmail === adm.email ? "Removendo..." : "Remover"}
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
