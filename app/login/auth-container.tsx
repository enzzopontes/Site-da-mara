"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { validateEmail, checkOtpRateLimit } from "@/lib/security-auth"
import { OtpInput } from "@/components/otp-input"
import {
  ArrowRight,
  Sparkles,
  MapPin,
  Star,
  ChevronLeft,
  Mail,
  Lock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"

export function AuthContainer({
  initialMode = "login",
}: {
  initialMode?: "login" | "register"
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithOtp, verifyOtp, signInWithGoogle, user } = useAuth()

  // Fluxo em 2 etapas: 'email' -> 'otp'
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [activeSlide, setActiveSlide] = useState(0)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const slides = [
    {
      title: "As melhores batatas de Iacanga",
      description: "Sabor inigualável e ingredientes selecionados com muito carinho.",
      icon: <Sparkles className="w-10 h-10 text-[#E3A008]" />,
      color: "bg-[#FFFDF9] border border-[#ECE7E0]",
    },
    {
      title: "Entrega rápida na sua porta",
      description: "Sua batata chega quentinha e crocante em poucos minutos.",
      icon: <MapPin className="w-10 h-10 text-[#C1440E]" />,
      color: "bg-[#FFFDF9] border border-[#ECE7E0]",
    },
    {
      title: "Peça e ganhe pontos",
      description: "Cada pedido acumula vantagens e cupons exclusivos no app.",
      icon: <Star className="w-10 h-10 text-[#E3A008]" />,
      color: "bg-[#FFFDF9] border border-[#ECE7E0]",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [slides.length])

  // Redirecionamento se já estiver logado
  useEffect(() => {
    if (user) {
      const returnUrl = searchParams.get("returnUrl") || "/cardapio"
      router.push(returnUrl)
    }
  }, [user, router, searchParams])

  // Cooldown de 60s para reenvio de OTP
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

  // Envio do código de 6 dígitos
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    const validation = validateEmail(email)
    if (!validation.isValid || !validation.cleanEmail) {
      setError(validation.error || "Informe um e-mail válido.")
      return
    }

    setLoading(true)
    try {
      await signInWithOtp(validation.cleanEmail)
      setStep("otp")
      setCooldown(60)
      setOtpCode("")
      toast.info("Código de acesso de 6 dígitos enviado para seu e-mail!")
    } catch (err: any) {
      setError(err?.message || "Não foi possível enviar o código. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Confirmação do código OTP de 6 dígitos
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify || otpCode).trim()
    setError(null)

    if (finalCode.length !== 6) {
      setError("Digite o código de 6 dígitos completo.")
      return
    }

    const rateLimitCheck = checkOtpRateLimit()
    if (rateLimitCheck.isBlocked) {
      setError(
        `Limite de tentativas excedido. Por segurança, aguarde ${
          rateLimitCheck.remainingMinutes || 5
        } minutos.`
      )
      return
    }

    setLoading(true)
    try {
      const res = await verifyOtp(email, finalCode)
      if (!res.success) {
        setError(res.error || "Código incorreto. Verifique os dígitos.")
      } else {
        toast.success("Autenticado com sucesso!")
        const returnUrl = searchParams.get("returnUrl") || "/cardapio"
        router.push(returnUrl)
      }
    } catch (err: any) {
      setError(err?.message || "Erro na validação do código.")
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
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err?.message || "Falha ao autenticar com o Google.")
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F5F0] p-3 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-[32px] border border-[#ECE7E0] shadow-xl overflow-hidden flex flex-col lg:flex-row relative min-h-[620px]">
        {/* Botão Voltar para tela inicial */}
        <Link
          href="/"
          className="absolute top-4 left-4 z-30 p-2.5 bg-white/90 backdrop-blur-xs border border-[#ECE7E0] hover:bg-[#F7F5F0] rounded-full text-[#1A1A1A] transition-transform active:scale-95 shadow-xs"
          title="Voltar ao início"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        {/* LADO VISUAL / BANNER DESTAQUE (Desktop e Tablet) */}
        <div className="w-full lg:w-1/2 bg-[#FFFDF9] border-b lg:border-b-0 lg:border-r border-[#ECE7E0] p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden min-h-[260px] lg:min-h-full">
          <div className="relative z-10 flex items-center justify-center lg:justify-start gap-3">
            <Image
              src="/logo.png"
              alt="Batata Top"
              width={44}
              height={44}
              className="rounded-full object-contain"
            />
            <span className="text-xl font-black text-[#1A1A1A] tracking-tight">
              batata<span className="text-[#E3A008]">top</span>
            </span>
          </div>

          <div className="relative z-10 my-auto py-6">
            <div className="relative h-44 sm:h-52">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`transition-all duration-700 absolute inset-0 flex flex-col items-center lg:items-start text-center lg:text-left justify-center ${
                    activeSlide === index
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6 pointer-events-none"
                  }`}
                >
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 ${slide.color} shadow-xs`}
                  >
                    {slide.icon}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight leading-snug">
                    {slide.title}
                  </h2>
                  <p className="text-sm sm:text-base text-[#717171] font-medium mt-2 max-w-sm">
                    {slide.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center lg:justify-start gap-2 mt-4">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    activeSlide === index ? "w-8 bg-[#E3A008]" : "w-1.5 bg-[#ECE7E0]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative z-10 hidden lg:flex items-center gap-2 text-xs font-semibold text-[#9C9188]">
            <Lock className="w-4 h-4 text-[#22C55E]" />
            <span>Conexão criptografada de ponta a ponta</span>
          </div>
        </div>

        {/* LADO DO FORMULÁRIO OTP PASSWORDLESS */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-14 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#E3A008]/15 text-[#C1440E] mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Acesso Passwordless Seguro
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {step === "email" ? "Entrar ou Criar Conta" : "Confirme o código"}
              </h1>
              <p className="text-sm text-[#717171] font-medium mt-1">
                {step === "email"
                  ? "Informe seu e-mail para receber um código de 6 dígitos. Sem senhas para memorizar."
                  : `Digite o código de 6 dígitos enviado para ${email.trim()}.`}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold rounded-2xl animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {step === "email" ? (
              <div className="space-y-4">
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-page-email"
                      className="text-xs font-black uppercase tracking-wider text-[#717171] ml-1"
                    >
                      Seu E-mail
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 h-5 w-5 text-[#9C9188] pointer-events-none" />
                      <input
                        id="auth-page-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        disabled={loading || googleLoading}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nome@exemplo.com"
                        className="w-full h-14 pl-12 pr-4 bg-[#F7F5F0] border border-[#ECE7E0] focus:border-[#E3A008] focus:bg-white rounded-2xl text-base font-semibold text-[#1A1A1A] placeholder:text-[#9C9188] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || googleLoading || !email.trim()}
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

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#ECE7E0]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-[#9C9188]">
                    <span className="bg-white px-3">ou</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full h-14 bg-white hover:bg-[#F7F5F0] border border-[#ECE7E0] active:scale-[0.98] disabled:opacity-50 text-[#1A1A1A] font-bold text-base rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer"
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
                  <span>{googleLoading ? "Conectando..." : "Entrar com Google"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setError(null)
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-[#E3A008] hover:text-[#C1440E] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Trocar e-mail</span>
                  </button>
                  <span className="text-xs text-[#717171] font-medium">6 dígitos</span>
                </div>

                <OtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={loading}
                  error={Boolean(error)}
                  onComplete={(code) => handleVerifyOtp(code)}
                />

                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpCode.length !== 6}
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
                      <span>Não recebeu? Reenviar código agora</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
