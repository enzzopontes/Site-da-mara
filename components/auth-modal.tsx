"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Mail,
  ArrowRight,
  Sparkles,
  Lock,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
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

export function AuthModal({ isOpen, onClose, initialEmail = "" }: AuthModalProps) {
  const { signInWithOtp, verifyOtp, signInWithGoogle, user } = useAuth()

  // Etapa 1 = Coleta de e-mail | Etapa 2 = Digitação dos 6 dígitos OTP
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState(initialEmail)
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Sincroniza se o modal abrir ou se o usuário logar
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      if (initialEmail && !email) {
        setEmail(initialEmail)
      }
    } else {
      // Reset suave ao fechar
      setTimeout(() => {
        setStep("email")
        setOtpCode("")
        setErrorMessage(null)
      }, 300)
    }
  }, [isOpen, initialEmail])

  // Se o usuário logou (via OAuth ou OTP), fecha o modal instantaneamente
  useEffect(() => {
    if (user && isOpen) {
      toast.success("Autenticado com sucesso!")
      onClose()
    }
  }, [user, isOpen, onClose])

  // Controle do timer de cooldown (60 segundos)
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

  // ─── Envio do Código (Etapa 1) ───────────────────────────────────────────
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)

    const validation = validateEmail(email)
    if (!validation.isValid || !validation.cleanEmail) {
      setErrorMessage(validation.error || "Informe um endereço de e-mail válido.")
      return
    }

    setLoading(true)
    try {
      await signInWithOtp(validation.cleanEmail)
      setStep("otp")
      setCooldown(60)
      setOtpCode("")
      toast.info("Código de 6 dígitos enviado para seu e-mail!")
    } catch (err: any) {
      setErrorMessage(err?.message || "Não foi possível enviar o código. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // ─── Verificação do OTP de 6 Dígitos (Etapa 2) ───────────────────────────
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
        toast.success("Login realizado com sucesso!")
        onClose()
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro na validação do código.")
    } finally {
      setLoading(false)
    }
  }

  // Reenviar código OTP
  const handleResend = async () => {
    if (cooldown > 0 || loading) return
    await handleSendCode()
  }

  // Login com Google
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
        showCloseButton={true}
        showHandle={true}
        className="p-0 border-none sm:border sm:border-[#ECE7E0] bg-white flex flex-col sm:max-w-md sm:rounded-[32px] rounded-t-[32px] overflow-hidden"
      >
        <div className="p-6 sm:p-8 pt-2 sm:pt-6">
          {/* Header do Modal com Logo e Badges */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 mb-3 rounded-2xl bg-[#F7F5F0] border border-[#ECE7E0] flex items-center justify-center shadow-xs">
              <Image
                src="/logo.png"
                alt="Batata Top"
                width={48}
                height={48}
                className="w-11 h-11 object-contain"
              />
            </div>

            <ResponsiveModalTitle className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight leading-snug">
              {step === "email" ? "Acesse sua conta sem senha" : "Digite o código de acesso"}
            </ResponsiveModalTitle>

            <ResponsiveModalDescription className="text-xs sm:text-sm text-[#717171] font-medium mt-1.5 max-w-xs">
              {step === "email"
                ? "Informe seu e-mail para receber um código de 6 dígitos. Sem senhas complicadas."
                : `Enviamos um código de 6 dígitos para ${email.trim()}.`}
            </ResponsiveModalDescription>
          </div>

          {/* Alerta de Erro Sanitizado */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 p-3 sm:p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-[13px] font-semibold rounded-2xl animate-in fade-in zoom-in-95"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* ─── ETAPA 1: E-MAIL ────────────────────────────────────────── */}
          {step === "email" && (
            <div className="space-y-4">
              <form onSubmit={handleSendCode} className="space-y-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="modal-auth-email"
                    className="text-[11px] font-black uppercase tracking-wider text-[#717171] ml-1"
                  >
                    E-mail
                  </label>
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
                      className="w-full h-14 pl-12 pr-4 bg-[#F7F5F0] border border-[#ECE7E0] focus:border-[#E3A008] focus:bg-white rounded-2xl text-sm sm:text-base font-semibold text-[#1A1A1A] placeholder:text-[#9C9188] outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading || !email.trim()}
                  data-vaul-no-drag="true"
                  className="w-full h-14 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando código...</span>
                    </div>
                  ) : (
                    <>
                      <span>Continuar com e-mail</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Separador Visual */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#ECE7E0]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-[#9C9188]">
                  <span className="bg-white px-3">ou</span>
                </div>
              </div>

              {/* Botão Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                data-vaul-no-drag="true"
                className="w-full h-13 bg-white hover:bg-[#F7F5F0] border border-[#ECE7E0] active:scale-[0.98] disabled:opacity-50 text-[#1A1A1A] font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer"
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
                <span>{googleLoading ? "Conectando..." : "Entrar com o Google"}</span>
              </button>
            </div>
          )}

          {/* ─── ETAPA 2: DIGITAÇÃO DO CÓDIGO OTP ─────────────────────── */}
          {step === "otp" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email")
                    setErrorMessage(null)
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trocar e-mail</span>
                </button>

                <span className="text-[11px] font-medium text-[#717171]">
                  6 dígitos
                </span>
              </div>

              {/* Componente OTP Especializado com auto-focus, paste e navegação por teclado */}
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
                className="w-full h-14 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirmar e Entrar</span>
                  </>
                )}
              </button>

              {/* Reenvio e Cooldown de 60s */}
              <div className="text-center pt-1">
                {cooldown > 0 ? (
                  <p className="text-xs text-[#717171] font-medium">
                    Reenviar novo código em <strong className="text-[#1A1A1A] font-bold">{cooldown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Não recebeu o código? Reenviar agora</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Rodapé com Micro-Garantia de Segurança */}
          <div className="mt-6 pt-4 border-t border-[#ECE7E0] flex items-center justify-center gap-1.5 text-[11px] text-[#9C9188] font-medium text-center">
            <Lock className="h-3.5 w-3.5 text-[#22C55E]" />
            <span>Autenticação direta criptografada via Supabase PKCE</span>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
