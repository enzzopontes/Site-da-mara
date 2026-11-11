"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Mail,
  ArrowRight,
  RotateCcw,
  AlertCircle,
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
      setTimeout(() => {
        setStep("email")
        setOtpCode("")
        setErrorMessage(null)
      }, 300)
    }
  }, [isOpen, initialEmail])

  // Fecha instantaneamente após autenticação
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

  const handleResend = async () => {
    if (cooldown > 0 || loading) return
    await handleSendCode()
  }

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
        className="p-0 border-none sm:border sm:border-[#ECE7E0] bg-white flex flex-col sm:max-w-md sm:rounded-[28px] rounded-t-[28px] overflow-hidden"
      >
        <div className="p-5 sm:p-7 pt-1 sm:pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-7">
          {/* Topo Limpo estilo App: Logo + Título + Subtítulo */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="relative w-12 h-12 mb-3 rounded-2xl bg-[#F7F4EF] border border-[#ECE7E0] flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Batata Top"
                width={40}
                height={40}
                className="w-9 h-9 object-contain"
              />
            </div>

            <ResponsiveModalTitle className="text-xl font-extrabold text-[#1F1B16] tracking-tight leading-snug">
              {step === "email" ? "Entre ou crie sua conta" : "Código de verificação"}
            </ResponsiveModalTitle>

            <ResponsiveModalDescription className="text-xs text-[#6B6157] font-medium leading-relaxed mt-1 max-w-xs">
              {step === "email"
                ? "Acesse seus pedidos, endereços e cupons exclusivos com praticidade."
                : `Enviamos um código de 6 dígitos para ${email.trim()}`}
            </ResponsiveModalDescription>
          </div>

          {/* Alerta de Erro Ergonômico */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* ─── ETAPA 1: E-MAIL ────────────────────────────────────────── */}
          {step === "email" && (
            <div className="space-y-4">
              <form onSubmit={handleSendCode} className="space-y-3">
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
                    placeholder="exemplo@email.com"
                    className="w-full h-13 pl-12 pr-4 bg-[#F7F4EF] border border-[#ECE7E0] focus:border-[#E3A008] focus:bg-white rounded-2xl text-sm font-semibold text-[#1F1B16] placeholder:text-[#9C9188] outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading || !email.trim()}
                  data-vaul-no-drag="true"
                  className="w-full h-13 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando código...</span>
                    </div>
                  ) : (
                    <>
                      <span>Continuar com e-mail</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divisor "ou" sutil */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#ECE7E0]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-[#9C9188]">
                  <span className="bg-white px-2.5">ou</span>
                </div>
              </div>

              {/* Botão Google Outline Discreto */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                data-vaul-no-drag="true"
                className="w-full h-13 bg-white hover:bg-[#F7F4EF] border border-[#ECE7E0] active:scale-[0.98] disabled:opacity-50 text-[#1F1B16] font-bold text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
                <span>{googleLoading ? "Conectando..." : "Continuar com o Google"}</span>
              </button>
            </div>
          )}

          {/* ─── ETAPA 2: DIGITAÇÃO DO CÓDIGO OTP ─────────────────────── */}
          {step === "otp" && (
            <div className="space-y-4">
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

                <span className="text-[11px] font-medium text-[#9C9188]">
                  6 dígitos
                </span>
              </div>

              {/* Input OTP de 6 dígitos minimalista */}
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
                className="w-full h-13 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wide rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </div>
                ) : (
                  <span>Confirmar código</span>
                )}
              </button>

              {/* Reenvio e Cooldown */}
              <div className="text-center pt-1">
                {cooldown > 0 ? (
                  <p className="text-xs text-[#6B6157] font-medium">
                    Reenviar novo código em <strong className="text-[#1F1B16] font-bold">{cooldown}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reenviar código</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
