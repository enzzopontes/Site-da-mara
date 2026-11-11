"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Mail,
  ChevronLeft,
  HelpCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"
import { OtpInput } from "@/components/otp-input"
import { useAuth } from "@/lib/auth-context"
import { validateEmail, checkOtpRateLimit } from "@/lib/security-auth"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

type AuthView = "welcome" | "saved_account" | "form" | "otp"

export function AuthModal({ isOpen, onClose, initialEmail = "" }: AuthModalProps) {
  const { signInWithOtp, verifyOtp, signInWithGoogle, user } = useAuth()

  const [view, setView] = useState<AuthView>("welcome")
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState(initialEmail)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Recupera último e-mail salvo para a tela "Que bom te ver novamente"
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("batata_last_login_email")
      if (stored && stored.includes("@")) {
        setSavedEmail(stored.trim())
      }
    }
  }, [isOpen])

  // Inicializa a view correta ao abrir
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      setOtpCode("")
      if (initialEmail) {
        setEmail(initialEmail)
        setView("form")
      } else {
        const stored = typeof window !== "undefined" ? localStorage.getItem("batata_last_login_email") : null
        if (stored && stored.includes("@")) {
          setSavedEmail(stored.trim())
          setEmail(stored.trim())
          setView("saved_account")
        } else {
          setView("welcome")
        }
      }
    } else {
      setTimeout(() => {
        setErrorMessage(null)
        setOtpCode("")
      }, 300)
    }
  }, [isOpen, initialEmail])

  // Ao logar com sucesso, salva o e-mail no cache e fecha
  useEffect(() => {
    if (user && isOpen) {
      if (user.email) {
        try {
          localStorage.setItem("batata_last_login_email", user.email)
        } catch {}
      }
      toast.success("Autenticado com sucesso!")
      onClose()
    }
  }, [user, isOpen, onClose])

  // Timer do cooldown de reenvio
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [cooldown])

  // Enviar código OTP
  const handleSendCode = async (targetEmail?: string) => {
    const rawEmail = (targetEmail || email).trim()
    setErrorMessage(null)

    const validation = validateEmail(rawEmail)
    if (!validation.isValid || !validation.cleanEmail) {
      setErrorMessage(validation.error || "Informe um endereço de e-mail válido.")
      return
    }

    setLoading(true)
    try {
      await signInWithOtp(validation.cleanEmail)
      setEmail(validation.cleanEmail)
      setView("otp")
      setCooldown(60)
      setOtpCode("")
      toast.info("Código de 6 dígitos enviado para seu e-mail!")
    } catch (err: any) {
      setErrorMessage(err?.message || "Não foi possível enviar o código. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Validar código OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || otpCode).trim()
    setErrorMessage(null)

    if (finalCode.length !== 6) {
      setErrorMessage("Digite o código de 6 dígitos completo.")
      return
    }

    const rateLimitCheck = checkOtpRateLimit()
    if (rateLimitCheck.isBlocked) {
      setErrorMessage(
        `Limite de tentativas excedido. Aguarde ${rateLimitCheck.remainingMinutes || 5} minutos por segurança.`
      )
      return
    }

    setLoading(true)
    try {
      const res = await verifyOtp(email, finalCode)
      if (!res.success) {
        setErrorMessage(res.error || "Código incorreto. Verifique os dígitos.")
      } else {
        if (email) {
          try {
            localStorage.setItem("batata_last_login_email", email.trim())
          } catch {}
        }
        toast.success("Login realizado com sucesso!")
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro na validação do código.")
    } finally {
      setLoading(false)
    }
  }

  // Google Sign-in
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setErrorMessage(null)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setErrorMessage(err?.message || "Falha ao conectar com o Google.")
      setGoogleLoading(false)
    }
  }

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveModalContent
        showCloseButton={false}
        showHandle={false}
        className="p-0 border-none sm:border sm:border-[#ECE7E0] bg-white flex flex-col sm:max-w-md sm:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl"
      >
        {/* CONTAINER DO MODAL / BOTTOM SHEET */}
        <div className="relative w-full flex flex-col bg-white">
          {/* TOPO COM BOTÕES DE NAVEGAÇÃO / AJUDA SE ESTIVER NO DESKTOP */}
          <div className="hidden sm:flex items-center justify-between px-6 pt-4">
            {view !== "welcome" ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null)
                  if (view === "otp") setView("form")
                  else setView("welcome")
                }}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#ECE7E0] flex items-center justify-center text-[#554D44] transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#9C9188] hover:text-[#1F1B16] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {/* HANDLE SUPERIOR CINZA IDÊNTICO AO APP */}
          <div className="w-12 h-1 bg-[#D6CEC4] rounded-full mx-auto mt-3 mb-2 shrink-0" />

          {/* CONTEÚDO PRINCIPAL DO BOTTOM SHEET */}
          <div className="px-6 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col">
            {/* MENSAGEM DE ERRO SANITIZADA */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TELA 1: "QUE BOM TE VER NOVAMENTE" (quando há e-mail salvo)   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {view === "saved_account" && (
              <div className="flex flex-col animate-in fade-in">
                <ResponsiveModalTitle className="text-base font-bold text-[#1F1B16] text-center mb-5">
                  Que bom te ver novamente
                </ResponsiveModalTitle>

                {/* Card com a conta salva */}
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-[#ECE7E0] shadow-2xs mb-5">
                  <div className="relative w-11 h-11 shrink-0 rounded-xl bg-[#F7F4EF] flex items-center justify-center overflow-hidden">
                    <Image
                      src="/assets/batatanacaixa.png"
                      alt="Avatar Batata Top"
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-[#9C9188] font-normal leading-tight">
                      Encontramos seu último login
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#1F1B16] truncate">
                      {savedEmail}
                    </span>
                  </div>
                </div>

                {/* Botão Amarelo "Continuar" */}
                <button
                  type="button"
                  onClick={() => handleSendCode(savedEmail || email)}
                  disabled={loading}
                  data-vaul-no-drag="true"
                  className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center transition-all cursor-pointer"
                >
                  {loading ? "Enviando código..." : "Continuar"}
                </button>

                {/* Divisor "ou" */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#ECE7E0]" />
                  </div>
                  <div className="relative flex justify-center text-[11px] text-[#9C9188]">
                    <span className="bg-white px-2">ou</span>
                  </div>
                </div>

                {/* Link "Acessar de outra forma" */}
                <button
                  type="button"
                  onClick={() => {
                    setView("welcome")
                    setErrorMessage(null)
                  }}
                  className="w-full text-center text-xs sm:text-sm font-semibold text-[#E3A008] hover:text-[#C1440E] transition-colors py-1 cursor-pointer"
                >
                  Acessar de outra forma
                </button>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TELA 2: WELCOME (IDÊNTICO À PRIMEIRA FOTO DO APP)            */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {view === "welcome" && (
              <div className="flex flex-col space-y-3 pt-2 animate-in fade-in">
                <ResponsiveModalTitle className="sr-only">
                  Autenticação Batata Top
                </ResponsiveModalTitle>

                {/* Botão Amarelo Sólido: "Já tenho uma conta" */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false)
                    setView("form")
                    setErrorMessage(null)
                  }}
                  data-vaul-no-drag="true"
                  className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center transition-all cursor-pointer"
                >
                  Já tenho uma conta
                </button>

                {/* Botão Branco com Borda Amarela: "Criar nova conta" */}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true)
                    setView("form")
                    setErrorMessage(null)
                  }}
                  data-vaul-no-drag="true"
                  className="w-full h-12 bg-white hover:bg-[#FFFDF7] border border-[#E3A008] active:scale-[0.99] text-[#E3A008] font-bold text-sm rounded-xl flex items-center justify-center transition-all cursor-pointer"
                >
                  Criar nova conta
                </button>

                {/* Texto Central: "Acessar com" */}
                <div className="pt-2 pb-1 text-center">
                  <span className="text-xs text-[#6B6157]">Acessar com</span>
                </div>

                {/* Botão Redondo com Ícone do Google */}
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    aria-label="Acessar com Google"
                    data-vaul-no-drag="true"
                    className="w-12 h-12 rounded-full border border-[#ECE7E0] hover:bg-[#F7F4EF] flex items-center justify-center active:scale-95 shadow-2xs transition-all cursor-pointer"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TELA 3: FORMULÁRIO DE DIGITAÇÃO DE E-MAIL                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {view === "form" && (
              <div className="flex flex-col animate-in fade-in">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setView("welcome")
                      setErrorMessage(null)
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Voltar</span>
                  </button>
                  <ResponsiveModalTitle className="text-sm font-bold text-[#1F1B16]">
                    {isRegisterMode ? "Criar conta" : "Acessar conta"}
                  </ResponsiveModalTitle>
                  <div className="w-12" />
                </div>

                <ResponsiveModalDescription className="text-xs text-[#6B6157] mb-4 text-center">
                  Informe seu e-mail para enviarmos o código de acesso sem senha.
                </ResponsiveModalDescription>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendCode()
                  }}
                  className="space-y-3.5"
                >
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 h-5 w-5 text-[#9C9188] pointer-events-none" />
                    <input
                      id="modal-auth-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      disabled={loading || googleLoading}
                      data-vaul-no-drag="true"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoFocus
                      className="w-full h-12 pl-12 pr-4 bg-[#F7F4EF] border border-[#ECE7E0] focus:border-[#E3A008] focus:bg-white rounded-xl text-sm font-semibold text-[#1F1B16] placeholder:text-[#9C9188] outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || googleLoading || !email.trim()}
                    data-vaul-no-drag="true"
                    className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    {loading ? "Enviando código..." : "Continuar"}
                  </button>
                </form>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TELA 4: CÓDIGO OTP (6 DÍGITOS)                                 */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {view === "otp" && (
              <div className="flex flex-col animate-in fade-in">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView("form")
                      setErrorMessage(null)
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Trocar e-mail</span>
                  </button>
                  <ResponsiveModalTitle className="text-sm font-bold text-[#1F1B16]">
                    Código de verificação
                  </ResponsiveModalTitle>
                  <div className="w-12" />
                </div>

                <ResponsiveModalDescription className="text-xs text-[#6B6157] text-center mb-4">
                  Digite os 6 dígitos enviados para <strong className="text-[#1F1B16] font-semibold">{email.trim()}</strong>
                </ResponsiveModalDescription>

                <div className="space-y-4">
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={loading}
                    error={Boolean(errorMessage)}
                    onComplete={(code) => handleVerifyOtp(code)}
                  />

                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={loading || otpCode.length !== 6}
                    data-vaul-no-drag="true"
                    className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    {loading ? "Verificando..." : "Confirmar código"}
                  </button>

                  <div className="text-center pt-1">
                    {cooldown > 0 ? (
                      <p className="text-xs text-[#6B6157]">
                        Reenviar novo código em <strong className="text-[#1F1B16] font-semibold">{cooldown}s</strong>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendCode(email)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reenviar código</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
