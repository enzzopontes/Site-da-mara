"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { OrderSummary } from "@/components/order-summary"
import { useAuth } from "@/lib/auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  ArrowLeft,
  Lock,
  Smartphone,
  Laptop,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Check,
  Loader2,
  Eye,
  EyeOff,
  WifiOff,
  ShieldCheck,
  LogOut,
  KeyRound,
} from "lucide-react"

const REASON_OPTIONS = [
  { value: "privacy", label: "Preocupações com privacidade de dados" },
  { value: "not_using", label: "Não utilizo mais o serviço" },
  { value: "duplicate", label: "Possuo outra conta cadastrada" },
  { value: "experience", label: "Experiência insatisfatória com o serviço" },
  { value: "other", label: "Outro motivo" },
]

const PROVIDER_LABELS: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
  phone: "Telefone",
}

function formatRelativeTime(isoDate?: string | null): string {
  if (!isoDate) return "agora mesmo"
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "agora mesmo"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

function detectDeviceSummary(): { name: string; isMobile: boolean } {
  if (typeof window === "undefined") {
    return { name: "Navegador Web", isMobile: false }
  }
  const ua = navigator.userAgent || ""
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
  let os = "Dispositivo Web"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Mac OS X/i.test(ua)) os = "macOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  let browser = "Navegador"
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge"
  else if (/Chrome\//i.test(ua)) browser = "Google Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari"

  return { name: `${browser} • ${os}`, isMobile }
}

export default function SegurancaContaPage() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()

  // Online / Offline state
  const [isOffline, setIsOffline] = useState(false)

  // Device info
  const [deviceInfo, setDeviceInfo] = useState({ name: "Navegador Web", isMobile: false })

  // Password Update State
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Export Data State
  const [isExporting, setIsExporting] = useState(false)
  const [exportFeedback, setExportFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // LGPD Deletion State
  const [identifier, setIdentifier] = useState("")
  const [reason, setReason] = useState("")
  const [isOpenSelect, setIsOpenSelect] = useState(false)
  const [confirmWord, setConfirmWord] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [protocol, setProtocol] = useState("")
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDeviceInfo(detectDeviceSummary())
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine)
      const onOnline = () => setIsOffline(false)
      const onOffline = () => setIsOffline(true)
      window.addEventListener("online", onOnline)
      window.addEventListener("offline", onOffline)
      return () => {
        window.removeEventListener("online", onOnline)
        window.removeEventListener("offline", onOffline)
      }
    }
  }, [])

  useEffect(() => {
    if (user?.email) {
      setIdentifier(user.email)
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpenSelect(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedReasonObj = REASON_OPTIONS.find((opt) => opt.value === reason)
  const isConfirmWordValid = confirmWord.trim().toUpperCase() === "EXCLUIR"
  const effectiveIdentifier = (user?.email || identifier).trim()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordFeedback(null)

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
      setPasswordFeedback({
        type: "error",
        message: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
      })
      return
    }

    if (!user) {
      setPasswordFeedback({
        type: "error",
        message: "Faça login na sua conta para alterar sua senha.",
      })
      return
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({
        type: "error",
        message: "A nova senha deve ter pelo menos 6 caracteres.",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "A confirmação de senha não confere.",
      })
      return
    }

    setIsUpdatingPassword(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordFeedback({
          type: "error",
          message: error.message || "Não foi possível atualizar sua senha.",
        })
      } else {
        setNewPassword("")
        setConfirmPassword("")
        setPasswordFeedback({
          type: "success",
          message: "Senha atualizada com sucesso!",
        })
      }
    } catch (err: any) {
      setPasswordFeedback({
        type: "error",
        message: err?.message || "Erro inesperado ao atualizar a senha.",
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleExportData = async () => {
    setExportFeedback(null)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
      setExportFeedback({
        type: "error",
        message: "Você está offline. Conecte-se à internet para exportar seus dados.",
      })
      return
    }

    if (!user) {
      setExportFeedback({
        type: "error",
        message: "Faça login para baixar o arquivo de portabilidade dos seus dados.",
      })
      return
    }

    setIsExporting(true)
    try {
      const res = await fetch("/api/user/export-data")
      if (!res.ok) {
        throw new Error("Não foi possível gerar o pacote de dados no momento.")
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `batata-top-dados-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setExportFeedback({
        type: "success",
        message: "Arquivo JSON exportado com sucesso!",
      })
    } catch (err: any) {
      setExportFeedback({
        type: "error",
        message: err?.message || "Erro ao exportar seus dados. Tente novamente.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError(null)

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true)
      setDeleteError("Você está sem conexão com a internet. Tente novamente quando estiver online.")
      return
    }

    if (!effectiveIdentifier) {
      setDeleteError("Informe o e-mail ou WhatsApp vinculado à conta.")
      return
    }

    if (!isConfirmWordValid) {
      setDeleteError('Digite a palavra "EXCLUIR" para confirmar a solicitação.')
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch("/api/user/delete-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: effectiveIdentifier,
          reason: reason || "not_specified",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Não foi possível registrar a solicitação de exclusão.")
      }
      setProtocol(data.protocol || `BT-${Math.floor(100000 + Math.random() * 900000)}`)
      setSubmitted(true)
    } catch (err: any) {
      setDeleteError(err?.message || "Erro ao processar solicitação. Verifique sua conexão e tente novamente.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSignOutAfterDelete = async () => {
    await signOut()
    router.push("/")
  }

  // Skeleton Loading State (Zero CLS)
  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Carregando configurações de segurança"
        className="min-h-screen flex flex-col bg-[#F7F5F0] antialiased select-none"
      >
        <HeaderWrapper />
        <main className="flex-1 bg-[#F7F5F0] pb-24 lg:pb-12">
          <div className="max-w-2xl mx-auto md:py-8 px-4 space-y-5 pt-4">
            <div className="h-12 bg-white rounded-2xl border border-[#ECE7E0] px-4 flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-44 rounded" />
            </div>
            <div className="bg-white rounded-2xl border border-[#ECE7E0] p-6 space-y-4">
              <Skeleton className="h-5 w-48 rounded" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl border border-[#ECE7E0] p-6 space-y-3">
              <Skeleton className="h-5 w-56 rounded" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl border border-[#ECE7E0] p-6 space-y-4">
              <Skeleton className="h-5 w-52 rounded" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
        <OrderSummary />
      </div>
    )
  }

  const providerKey = user?.app_metadata?.provider || "email"
  const providerLabel = PROVIDER_LABELS[providerKey] || "E-mail"

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5F0] text-[#1A1A1A] antialiased">
      <HeaderWrapper />

      <main className="flex-1 bg-[#F7F5F0] pb-24 lg:pb-12">
        <div className="max-w-2xl mx-auto md:py-8 px-4 space-y-5 pt-4">
          {/* Top Navigation Bar */}
          <div className="bg-white rounded-2xl border border-[#ECE7E0] px-4 py-3.5 flex items-center justify-between shadow-xs">
            <button
              type="button"
              onClick={() => router.push("/perfil")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] hover:text-[#C1440E] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span className="h-8 w-8 rounded-full bg-[#F7F5F0] border border-[#ECE7E0] flex items-center justify-center text-[#E3A008]">
                <ArrowLeft className="h-4 w-4" />
              </span>
              <span>Voltar ao Perfil</span>
            </button>
            <h1 className="text-sm sm:text-base font-bold uppercase tracking-wide text-[#1A1A1A]">
              Segurança da Conta
            </h1>
            <div className="w-8" />
          </div>

          {/* Offline Banner (State 5: Offline) */}
          {isOffline && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 text-xs sm:text-sm font-medium">
              <WifiOff className="h-5 w-5 text-[#C1440E] shrink-0" />
              <div>
                <p className="font-bold text-[#1A1A1A]">Você está offline no momento</p>
                <p className="text-[#717171]">
                  Algumas ações de segurança como troca de senha e exclusão exigem conexão ativa.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Dispositivo Conectado & Alteração de Senha */}
          <section className="bg-white rounded-2xl border border-[#ECE7E0] p-5 sm:p-6 shadow-xs space-y-6">
            {/* Dispositivo Conectado / Sessão Atual */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 rounded-xl bg-[#FEF8EC] border border-[#E3A008]/30 flex items-center justify-center text-[#E3A008] shrink-0">
                  {deviceInfo.isMobile ? (
                    <Smartphone className="h-5 w-5" />
                  ) : (
                    <Laptop className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    Dispositivos Conectados
                  </h2>
                  <p className="text-xs text-[#717171]">
                    Sua conta foi conectada neste aparelho
                  </p>
                </div>
              </div>

              {user ? (
                <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] flex items-start gap-3.5">
                  <div className="mt-0.5 text-[#1A1A1A]">
                    {deviceInfo.isMobile ? (
                      <Smartphone className="h-5 w-5 text-[#717171]" />
                    ) : (
                      <Laptop className="h-5 w-5 text-[#717171]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {deviceInfo.name}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-[#22C55E] border border-green-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                        Dispositivo atual
                      </span>
                    </div>
                    <p className="text-xs text-[#717171] truncate">
                      Conta conectada: <strong className="text-[#1A1A1A] font-medium">{user.email}</strong>
                    </p>
                    <p className="text-xs text-[#717171]">
                      Login feito por <strong className="text-[#1A1A1A] font-medium">{providerLabel}</strong>
                    </p>
                    <p className="text-xs text-[#717171]">
                      Última ação na conta {formatRelativeTime(user.last_sign_in_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Você não está autenticado neste navegador
                    </p>
                    <p className="text-xs text-[#717171]">
                      Entre na sua conta para visualizar a sessão ativa ou alterar sua senha.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#E3A008] hover:bg-[#CA8A04] active:bg-[#A16207] text-white text-xs font-semibold active:scale-[0.98] transition-all shrink-0"
                  >
                    Entrar na conta
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-[#ECE7E0]" />

            {/* Alteração de Senha */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-9 w-9 rounded-xl bg-[#F3F0EB] flex items-center justify-center text-[#1A1A1A] shrink-0">
                  <KeyRound className="h-4 w-4 text-[#717171]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    Alteração de Senha
                  </h2>
                  <p className="text-xs text-[#717171]">
                    Atualize sua senha de acesso com segurança
                  </p>
                </div>
              </div>

              {user ? (
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                      >
                        Nova senha
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#717171]/60 focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717171] hover:text-[#1A1A1A] cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-password"
                        className="block text-xs font-semibold text-[#1A1A1A] mb-1"
                      >
                        Confirmar nova senha
                      </label>
                      <input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#717171]/60 focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                      />
                    </div>
                  </div>

                  {passwordFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                        passwordFeedback.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-[#E63535] border border-red-200"
                      }`}
                    >
                      {passwordFeedback.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-[#E63535] shrink-0" />
                      )}
                      <span>{passwordFeedback.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                    className="px-5 py-2.5 rounded-xl bg-[#E3A008] hover:bg-[#CA8A04] active:bg-[#A16207] text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Atualizando senha...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Salvar nova senha</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-[#717171]">
                  Para redefinir sua senha sem estar logado, acesse a opção{" "}
                  <Link href="/esqueci-senha" className="text-[#C1440E] font-semibold underline">
                    Esqueci minha senha
                  </Link>{" "}
                  na tela de login.
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Exportação de Dados (Portabilidade LGPD) */}
          <section className="bg-white rounded-2xl border border-[#ECE7E0] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#FEF8EC] border border-[#E3A008]/30 flex items-center justify-center text-[#E3A008] shrink-0 mt-0.5">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    Exportação de Dados (Portabilidade LGPD)
                  </h2>
                  <p className="text-xs text-[#717171] mt-0.5 leading-relaxed">
                    Baixe uma cópia estruturada em formato JSON com seus dados cadastrais, endereços salvos e histórico de pedidos (Art. 18, V da Lei 13.709/2018).
                  </p>
                </div>
              </div>
            </div>

            {exportFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  exportFeedback.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-[#E63535] border border-red-200"
                }`}
              >
                {exportFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-[#E63535] shrink-0" />
                )}
                <span>{exportFeedback.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting || !user}
                className="px-4 py-2.5 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] hover:bg-[#F3F0EB] text-[#1A1A1A] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#E3A008]" />
                    <span>Gerando arquivo JSON...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-[#E3A008]" />
                    <span>Exportar meus dados (.JSON)</span>
                  </>
                )}
              </button>
              {user && (
                <a
                  href="/api/user/export-data"
                  download
                  className="text-xs font-semibold text-[#717171] hover:text-[#1A1A1A] underline"
                >
                  Link direto para download
                </a>
              )}
            </div>
          </section>

          {/* Section 3: Exclusão de Conta (Conformidade LGPD) */}
          <section
            id="excluir-conta"
            className="bg-white rounded-2xl border border-[#ECE7E0] p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#E63535] shrink-0 mt-0.5">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-[#E63535] border border-red-200 mb-1">
                  Zona de Exclusão • LGPD
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">
                  Excluir minha conta permanentemente
                </h2>
                <p className="text-xs text-[#717171] mt-0.5">
                  Revise atentamente o que acontece com seus dados antes de confirmar a exclusão.
                </p>
              </div>
            </div>

            {/* Avisos Claros sobre Dados e Irreversibilidade */}
            <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] text-xs sm:text-sm leading-relaxed space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-50 text-[#E63535] rounded-lg shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-[#1A1A1A] block">
                    Dados vinculados que serão permanentemente excluídos:
                  </strong>
                  <p className="text-[#717171] mt-0.5">
                    Perfil completo (nome, CPF, e-mail, telefone), todos os endereços salvos, preferências de notificações, cupons individuais e credenciais de acesso.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[#ECE7E0]">
                <div className="p-1.5 bg-amber-50 text-[#C1440E] rounded-lg shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-[#1A1A1A] block">
                    Histórico de pedidos e retenção legal obrigatória:
                  </strong>
                  <p className="text-[#717171] mt-0.5">
                    Seus dados pessoais serão anonimizados, porém registros fiscais e notas de pedidos faturados são mantidos de forma desvinculada pelo prazo legal de 5 anos (Marco Civil da Internet Art. 15 e Código Tributário Nacional).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[#ECE7E0]">
                <div className="p-1.5 bg-red-100 text-[#E63535] rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-[#E63535] block">
                    Aviso de irreversibilidade da exclusão:
                  </strong>
                  <p className="text-[#1A1A1A] font-medium mt-0.5">
                    Esta ação é definitiva e irreversível. Uma vez processada, não será possível recuperar sua conta, histórico de fidelidade ou benefícios acumulados.
                  </p>
                </div>
              </div>
            </div>

            {!submitted ? (
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label
                    htmlFor="delete-identifier"
                    className="block text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1.5"
                  >
                    E-mail ou WhatsApp vinculado à conta
                  </label>
                  <input
                    id="delete-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="exemplo@email.com ou (14) 99999-9999"
                    className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-[#1A1A1A] bg-white placeholder:text-[#717171]/60 focus:outline-none focus:ring-2 focus:ring-[#E3A008] text-sm font-medium"
                  />
                </div>

                {/* Seletor de Motivo Opcional */}
                <div className="relative" ref={selectRef}>
                  <label className="block text-xs sm:text-sm font-semibold text-[#1A1A1A] mb-1.5">
                    Motivo da saída <span className="font-normal text-[#717171]">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsOpenSelect(!isOpenSelect)}
                    className={`w-full px-4 py-3 rounded-xl border bg-white text-left text-sm font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isOpenSelect
                        ? "border-[#E3A008] ring-2 ring-[#E3A008]/20"
                        : "border-[#E5E7EB] hover:border-[#ECE7E0]"
                    }`}
                  >
                    <span className={selectedReasonObj ? "text-[#1A1A1A] font-semibold" : "text-[#717171]"}>
                      {selectedReasonObj ? selectedReasonObj.label : "Selecione um motivo..."}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#717171] transition-transform duration-200 ${
                        isOpenSelect ? "rotate-180 text-[#E3A008]" : ""
                      }`}
                    />
                  </button>

                  {isOpenSelect && (
                    <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-[#ECE7E0] rounded-2xl shadow-xl overflow-hidden py-1.5">
                      {REASON_OPTIONS.map((opt) => {
                        const isSelected = reason === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setReason(opt.value)
                              setIsOpenSelect(false)
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-[#FEF8EC] text-[#C1440E] font-bold"
                                : "text-[#1A1A1A] hover:bg-[#F7F5F0]"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#C1440E] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Confirmação por digitação "EXCLUIR" */}
                <div className="p-4 rounded-xl bg-red-50/60 border border-red-200 space-y-2">
                  <label
                    htmlFor="confirm-word-input"
                    className="block text-xs sm:text-sm font-semibold text-[#1A1A1A]"
                  >
                    Para confirmar, digite <span className="font-mono font-bold text-[#E63535] bg-white px-1.5 py-0.5 rounded border border-red-200">EXCLUIR</span> no campo abaixo:
                  </label>
                  <input
                    id="confirm-word-input"
                    type="text"
                    value={confirmWord}
                    onChange={(e) => setConfirmWord(e.target.value)}
                    placeholder='Digite "EXCLUIR" para liberar o botão'
                    autoComplete="off"
                    className="w-full px-4 py-2.5 rounded-xl border border-red-200 bg-white text-sm font-bold tracking-wider uppercase text-[#1A1A1A] placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-[#717171]/70 focus:outline-none focus:ring-2 focus:ring-[#E63535]"
                  />
                </div>

                {deleteError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#E63535] text-xs sm:text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isConfirmWordValid || isDeleting || !effectiveIdentifier}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#E63535] hover:bg-[#C1440E] text-white font-bold text-sm sm:text-base shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processando exclusão...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar Exclusão Permanente da Conta</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-green-950 text-xs sm:text-sm space-y-3">
                <div className="flex items-center gap-2 font-bold text-green-800 text-sm sm:text-base">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                  <span>Solicitação de exclusão registrada com sucesso!</span>
                </div>
                <p className="text-green-900 leading-relaxed">
                  Protocolo de confirmação:{" "}
                  <strong className="font-mono bg-white px-2 py-0.5 rounded border border-green-300 text-green-950">
                    {protocol}
                  </strong>
                </p>
                <p className="text-green-800 leading-relaxed">
                  O processo de anonimização e remoção definitiva dos seus dados cadastrais ocorre em até{" "}
                  <strong>7 dias corridos</strong>, conforme previsto na LGPD.
                </p>
                {user && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSignOutAfterDelete}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Encerrar sessão neste aparelho agora</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Rodapé informativo LGPD */}
          <div className="text-center text-xs text-[#717171] py-2 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-semibold text-[#1A1A1A]">
              <ShieldCheck className="h-4 w-4 text-[#E3A008]" />
              <span>Central de Segurança e Privacidade • Batata Top Delivery</span>
            </div>
            <p>Dúvidas sobre seus dados? Entre em contato pelo suporte ou consulte nossa Política de Privacidade.</p>
          </div>
        </div>
      </main>

      <Footer />
      <OrderSummary />
    </div>
  )
}
