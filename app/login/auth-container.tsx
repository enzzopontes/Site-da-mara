"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useKeyboardViewport } from "@/hooks/use-keyboard-viewport"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  OTP_CODE_REGEX,
  validateEmail,
  checkOtpRateLimit,
  getOtpCooldownRemaining,
  writeSavedUserProfile,
  consumePendingCartItem,
  sanitizeReturnUrl,
} from "@/lib/security-auth"
import { appToast } from "@/lib/app-toast"
import { ChevronLeft, X, Loader2 } from "lucide-react"

const RESEND_SECONDS = 59
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ThreeDotsLoader({ color = "#1F1B16" }: { color?: string }) {
  const dotSize = 7
  const gap = 6

  return (
    <span
      role="progressbar"
      aria-busy={true}
      aria-label="Carregando"
      className="inline-flex items-center justify-center"
      style={{ gap: `${gap}px` }}
    >
      <style>{`
        @keyframes batata-three-dots {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          40% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
      `}</style>
      {[0, 140, 280].map((delayMs) => (
        <span
          key={delayMs}
          aria-hidden="true"
          className="block rounded-full"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            backgroundColor: color,
            opacity: 0.35,
            animation: "batata-three-dots 800ms ease-in-out infinite",
            animationDelay: `${delayMs}ms`,
          }}
        />
      ))}
    </span>
  )
}

// Máscara 000.000.000-00
const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

// Validação do dígito verificador do CPF (mod-11)
const isValidCpf = (digits: string) => {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const calcCheckDigit = (base: string) => {
    let sum = 0
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i], 10) * (base.length + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  const digit1 = calcCheckDigit(digits.slice(0, 9))
  const digit2 = calcCheckDigit(digits.slice(0, 9) + digit1)
  return digit1 === parseInt(digits[9], 10) && digit2 === parseInt(digits[10], 10)
}

export function AuthContainer({
  initialMode: _initialMode = "login",
}: {
  initialMode?: "login" | "register"
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithOtp, verifyOtp, signInWithGoogle, user, signOut } = useAuth()
  const { addItem } = useCart()
  const { keyboardOffset, isKeyboardOpen } = useKeyboardViewport()

  const initialEmailParam = searchParams.get("email")?.trim() || ""
  const initialStepParam = searchParams.get("step")
  const hasValidInitialEmail = EMAIL_REGEX.test(initialEmailParam)

  // 'email' -> tela 1 | 'code' -> tela 2 | 'name' -> tela 3 (usuário novo)
  const [step, setStep] = useState<"email" | "code" | "name">(
    initialStepParam === "code" && hasValidInitialEmail ? "code" : "email"
  )
  const [email, setEmail] = useState(hasValidInitialEmail ? initialEmailParam : "")
  const [emailFocused, setEmailFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // 6 dígitos do código
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""])
  const [focusedBox, setFocusedBox] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const [helpVisible, setHelpVisible] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const firstNameInputRef = useRef<HTMLInputElement | null>(null)
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVerifyingRef = useRef(false)
  const isSendingOtpRef = useRef(false)
  const isBackingOutRef = useRef(false)

  const scheduleFocus = useCallback((fn: () => void, delayMs: number) => {
    if (focusTimerRef.current !== null) {
      clearTimeout(focusTimerRef.current)
      focusTimerRef.current = null
    }
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null
      fn()
    }, delayMs)
  }, [])

  // Nome e CPF (step === 'name')
  const [firstName, setFirstName] = useState("")
  const [firstNameFocused, setFirstNameFocused] = useState(false)
  const [lastName, setLastName] = useState("")
  const [lastNameFocused, setLastNameFocused] = useState(false)
  const [cpf, setCpf] = useState("")
  const [cpfFocused, setCpfFocused] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)

  const isEmailValid = EMAIL_REGEX.test(email.trim())
  const isNameValid = firstName.trim().length >= 2 && lastName.trim().length >= 2
  const cpfDigits = cpf.replace(/\D/g, "")
  const isCpfValid = cpfDigits.length === 0 || isValidCpf(cpfDigits)

  // Sincroniza query params (?email=...&step=code) ao entrar direto na etapa de OTP
  useEffect(() => {
    const qEmail = searchParams.get("email")?.trim() || ""
    const qStep = searchParams.get("step")
    if (qEmail && EMAIL_REGEX.test(qEmail)) {
      setEmail(qEmail)
      if (qStep === "code") {
        setStep("code")
        const rem = getOtpCooldownRemaining(qEmail)
        setSecondsLeft(Math.min(RESEND_SECONDS, rem))
      }
    }
  }, [searchParams])

  // Limpa timer de foco ao desmontar o componente
  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
    }
  }, [])

  // Foco automático ao alternar entre as etapas do fluxo
  useEffect(() => {
    if (step === "email") {
      scheduleFocus(() => emailInputRef.current?.focus(), 250)
    } else if (step === "code") {
      scheduleFocus(() => codeRefs.current[0]?.focus(), 150)
    } else if (step === "name") {
      scheduleFocus(() => firstNameInputRef.current?.focus(), 250)
    }
  }, [step, scheduleFocus])

  // Despacha item pendente na sacola
  const processPendingCartItem = () => {
    const added = consumePendingCartItem(addItem)
    if (added) {
      appToast.success("Item adicionado à sua sacola!")
    }
  }

  // Redireciona se já estiver autenticado na etapa inicial
  useEffect(() => {
    if (user && step === "email") {
      processPendingCartItem()
      const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"))
      router.replace(returnUrl)
    }
  }, [user, step, router, searchParams])

  // Contador regressivo sincronizado com timestamp persistido (60s)
  useEffect(() => {
    if (step !== "code") return

    const syncRemaining = () => {
      const rem = getOtpCooldownRemaining(email.trim())
      setSecondsLeft(rem > 0 ? Math.min(RESEND_SECONDS, rem) : 0)
    }

    syncRemaining()
    const interval = setInterval(syncRemaining, 500)
    return () => clearInterval(interval)
  }, [step, email])

  const formatTime = (s: number) => `0:${String(s).padStart(2, "0")}`

  // Enviar código OTP respeitando a trava de 60s no banco
  const sendCode = async () => {
    if (isSendingOtpRef.current) return { ok: false, skipped: true, cooldownRemaining: getOtpCooldownRemaining(email.trim()) }
    isSendingOtpRef.current = true
    setLoading(true)
    appToast.dismiss()

    const validation = validateEmail(email.trim())
    if (!validation.isValid || !validation.cleanEmail) {
      appToast.error(validation.error || "Informe um e-mail válido.")
      isSendingOtpRef.current = false
      setLoading(false)
      return { ok: false, skipped: false, cooldownRemaining: 0 }
    }

    try {
      const res = await signInWithOtp(validation.cleanEmail)
      return {
        ok: true,
        skipped: Boolean(res.skipped),
        cooldownRemaining: res.cooldownRemaining || 0,
      }
    } catch (err: any) {
      appToast.error(
        err?.message || "Não foi possível enviar o código. Tente novamente."
      )
      return { ok: false, skipped: false, cooldownRemaining: 0 }
    } finally {
      isSendingOtpRef.current = false
      setLoading(false)
    }
  }

  const handleEmailContinue = async () => {
    if (!isEmailValid || loading) return

    const cleanEmail = email.trim().toLowerCase()
    const remaining = getOtpCooldownRemaining(cleanEmail)
    if (remaining > 0) {
      // Trava anti-sobrecarga: não dispara nova requisição ao Supabase antes de 60s
      setCode(["", "", "", "", "", ""])
      setSecondsLeft(Math.min(RESEND_SECONDS, remaining))
      setStep("code")
      return
    }

    const res = await sendCode()
    if (res.ok) {
      setCode(["", "", "", "", "", ""])
      const updatedRemaining = getOtpCooldownRemaining(cleanEmail)
      setSecondsLeft(
        updatedRemaining > 0 ? Math.min(RESEND_SECONDS, updatedRemaining) : RESEND_SECONDS
      )
      setStep("code")
      if (!res.skipped) {
        appToast.success("Código enviado")
      }
    }
  }

  const handleResend = async () => {
    setHelpVisible(false)
    const cleanEmail = email.trim().toLowerCase()
    const remaining = getOtpCooldownRemaining(cleanEmail)
    if (remaining > 0) {
      setSecondsLeft(Math.min(RESEND_SECONDS, remaining))
      appToast.warning(`Aguarde ${remaining}s para reenviar o código.`)
      return
    }

    const res = await sendCode()
    if (res.ok) {
      setCode(["", "", "", "", "", ""])
      const updatedRemaining = getOtpCooldownRemaining(cleanEmail)
      setSecondsLeft(
        updatedRemaining > 0 ? Math.min(RESEND_SECONDS, updatedRemaining) : RESEND_SECONDS
      )
      if (!res.skipped) {
        appToast.success("Código reenviado")
      }
      scheduleFocus(() => codeRefs.current[0]?.focus(), 150)
    }
  }

  // Finalização do login e redirecionamento
  const finishSuccessLogin = (fullName?: string) => {
    const cleanEmail = email.trim()
    if (cleanEmail) {
      writeSavedUserProfile({
        name: fullName?.trim() || cleanEmail.split("@")[0],
        email: cleanEmail,
        provider: "email",
      })
    }
    processPendingCartItem()
    appToast.success("Login realizado com sucesso!")
    const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"))
    router.replace(returnUrl)
  }

  // Verificação de código OTP com trava contra chamadas duplicadas e Alert Global
  const verifyCode = async (token: string) => {
    if (isVerifyingRef.current || loading) return
    isVerifyingRef.current = true
    setIsVerifying(true)
    setLoading(true)

    const rateLimitCheck = checkOtpRateLimit()
    if (rateLimitCheck.isBlocked) {
      appToast.error(
        `Limite de tentativas excedido. Aguarde ${rateLimitCheck.remainingMinutes || 5} minutos por segurança.`
      )
      isVerifyingRef.current = false
      setIsVerifying(false)
      setLoading(false)
      return
    }

    try {
      const res = await verifyOtp(email.trim(), token)
      if (!res.success) {
        appToast.error(
          res.error || "Código inválido ou expirado. Tente novamente."
        )
        setCode(["", "", "", "", "", ""])
        scheduleFocus(() => codeRefs.current[0]?.focus(), 100)
        return
      }

      // Verifica se o usuário já possui nome completo cadastrado
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      const fullName = currentUser?.user_metadata?.full_name
      if (fullName && fullName.trim().length > 0) {
        finishSuccessLogin(fullName.trim())
      } else {
        // Usuário novo: pedir nome completo
        appToast.dismiss()
        setStep("name")
      }
    } catch (err: any) {
      appToast.error(err?.message || "Erro ao validar o código.")
      setCode(["", "", "", "", "", ""])
      scheduleFocus(() => codeRefs.current[0]?.focus(), 100)
    } finally {
      isVerifyingRef.current = false
      setIsVerifying(false)
      setLoading(false)
    }
  }

  // Colagem completa de 6 dígitos (Ctrl+V / colar do e-mail)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (loading || isVerifyingRef.current) return
    e.preventDefault()

    const pasted = e.clipboardData.getData("text").trim()
    if (!OTP_CODE_REGEX.test(pasted)) {
      appToast.error("Cole um código válido de 6 dígitos numéricos.")
      return
    }
    setCode(pasted.split(""))
    appToast.dismiss()
    codeRefs.current[5]?.focus()
    verifyCode(pasted)
  }

  // Digitação nos 6 campos de PIN
  const handleDigitChange = (value: string, index: number) => {
    if (loading || isVerifyingRef.current) return

    const raw = value.replace(/\D/g, "")
    appToast.dismiss()

    if (!raw) {
      const next = [...code]
      next[index] = ""
      setCode(next)
      return
    }

    // Caso o navegador envie múltiplos dígitos via autocomplete SMS/e-mail ou teclado móvel
    if (raw.length > 1) {
      if (code[index] && raw.length === 2) {
        const typedDigit = raw[0] === code[index] ? raw[1] : raw[0]
        const next = [...code]
        next[index] = typedDigit
        setCode(next)

        if (index < 5) {
          codeRefs.current[index + 1]?.focus()
        }

        const token = next.join("")
        if (token.length === 6) {
          verifyCode(token)
        }
        return
      }

      const clipped = raw.slice(0, 6)
      const next = Array.from({ length: 6 }, (_, i) => clipped[i] || "")
      setCode(next)

      const lastFilledIndex = Math.min(clipped.length, 6) - 1
      codeRefs.current[lastFilledIndex]?.focus()

      const token = next.join("")
      if (token.length === 6) {
        verifyCode(token)
      }
      return
    }

    const next = [...code]
    next[index] = raw
    setCode(next)

    if (index < 5) {
      codeRefs.current[index + 1]?.focus()
    }

    const token = next.join("")
    if (token.length === 6) {
      verifyCode(token)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (loading || isVerifyingRef.current) return

    if (e.key === "Backspace" && !code[index] && index > 0) {
      const next = [...code]
      next[index - 1] = ""
      setCode(next)
      codeRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      codeRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault()
      codeRefs.current[index + 1]?.focus()
    }
  }

  // Finalização do cadastro (Nome, Sobrenome, CPF)
  const handleNameContinue = async () => {
    if (!isNameValid || !isCpfValid || nameSaving) return
    setNameSaving(true)
    appToast.dismiss()

    const trimmedName = `${firstName.trim()} ${lastName.trim()}`.trim()
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          ...(cpfDigits && { cpf: cpfDigits }),
        },
      })

      if (error) {
        appToast.error("Não foi possível salvar os dados. Tente novamente.")
        return
      }

      finishSuccessLogin(trimmedName)
    } catch {
      appToast.error("Erro ao salvar cadastro.")
    } finally {
      setNameSaving(false)
    }
  }

  // Voltar tela
  const handleBack = async () => {
    if (step === "name") {
      if (isBackingOutRef.current) return
      isBackingOutRef.current = true
      try {
        await signOut({ forgetAccount: true })
        router.replace("/")
      } finally {
        isBackingOutRef.current = false
      }
    } else if (step === "code") {
      setStep("email")
      appToast.dismiss()
    } else {
      router.back()
    }
  }

  const handleGoogleLogin = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    appToast.dismiss()
    try {
      await signInWithGoogle()
    } catch {
      appToast.error("Não foi possível conectar com o Google.")
      setGoogleLoading(false)
    }
  }

  const codeToken = code.join("")
  const isCodeValid = codeToken.length === 6
  const isFooterValid =
    step === "email"
      ? isEmailValid
      : step === "code"
      ? isCodeValid
      : isNameValid && isCpfValid
  const footerLoading = step === "name" ? nameSaving : loading || isVerifying
  const handleFooterContinue = () => {
    if (!isFooterValid || footerLoading) return
    if (step === "email") handleEmailContinue()
    else if (step === "code") verifyCode(codeToken)
    else handleNameContinue()
  }

  return (
    <div className="min-h-dvh w-full bg-white text-[#1F1B16] flex flex-col justify-between selection:bg-[#E3A008]/20">
      {/* HEADER SUPERIOR COM BOTÃO VOLTAR IDÊNTICO AO APP */}
      <header className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Voltar"
          className="w-9 h-9 -ml-1.5 rounded-full bg-transparent hover:bg-[#F7F4EF] active:scale-95 text-[#1F1B16] flex items-center justify-center transition-all cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.25]" />
        </button>
      </header>

      {/* CONTEÚDO CENTRAL */}
      <main
        className="w-full max-w-xl mx-auto px-6 sm:px-8 flex-1 flex flex-col pt-4 overflow-y-auto"
        style={{ paddingBottom: `${Math.max(168, keyboardOffset + 168)}px` }}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPA 1: QUAL O SEU E-MAIL?                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === "email" && (
          <div className="flex flex-col animate-in fade-in duration-200">
            <h1 className="text-[22px] font-bold text-[#1F1B16] leading-[30px] mb-6">
              Qual o seu e-mail?
            </h1>

            {/* Input E-mail com Floating Label e botão Limpar */}
            <div
              className={`relative h-[52px] border rounded-[10px] px-4 flex items-center scroll-mb-44 transition-all ${
                emailFocused
                  ? "border-2 border-[#1F1B16]"
                  : "border-[#ECE7E0]"
              }`}
            >
              <label
                htmlFor="login-email-input"
                className="absolute -top-2 left-3 bg-white px-1 text-xs text-[#6B6157] font-medium"
              >
                E-mail
              </label>
              <input
                ref={emailInputRef}
                id="login-email-input"
                type="email"
                autoComplete="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isEmailValid && !loading) {
                    handleEmailContinue()
                  }
                }}
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999] scroll-mb-44"
              />
              {email.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEmail("")}
                  aria-label="Limpar e-mail"
                  className="ml-2 text-[#999] hover:text-[#1F1B16] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Divisor "ou" */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#ECE7E0]" />
              </div>
              <div className="relative flex justify-center text-sm text-[#9C9188]">
                <span className="bg-white px-3 font-normal">ou</span>
              </div>
            </div>

            {/* Botão Google com borda */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-[52px] rounded-[10px] border border-[#ECE7E0] bg-white hover:bg-[#F7F4EF] active:scale-[0.99] flex items-center justify-center gap-3 transition-all cursor-pointer font-bold text-sm text-[#1F1B16]"
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
              <span>Continuar com o Google</span>
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPA 2: DIGITE O CÓDIGO DE 6 DÍGITOS                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === "code" && (
          <div className="flex flex-col animate-in fade-in duration-200">
            <h1 className="text-[22px] font-bold text-[#1F1B16] leading-[30px] mb-6">
              Digite o código de 6 dígitos
              <br />
              que enviamos para
              <br />
              <span className="font-bold text-[#1F1B16] break-all">{email}</span>
            </h1>

            {/* 6 Caixas de PIN */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    codeRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`Dígito ${index + 1} de 6`}
                  readOnly={loading || isVerifying}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, index)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={(e) => {
                    setFocusedBox(index)
                    e.currentTarget.select()
                  }}
                  onBlur={() => setFocusedBox(null)}
                  className={`w-11 h-14 sm:w-12 sm:h-14 border rounded-lg text-center text-[22px] font-bold text-[#1F1B16] bg-white scroll-mb-44 transition-all outline-none ${
                    focusedBox === index
                      ? "border-2 border-[#1F1B16]"
                      : "border-[#ECE7E0]"
                  } ${loading || isVerifying ? "opacity-60 cursor-not-allowed" : ""}`}
                />
              ))}
            </div>

            {isVerifying && (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6157] mb-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1F1B16]" />
                <span>Validando código...</span>
              </div>
            )}

            {/* Contador ou link "Não recebi meu código" */}
            <div className="mt-2">
              {secondsLeft <= 0 ? (
                <button
                  type="button"
                  onClick={() => setHelpVisible(true)}
                  className="text-[13px] font-bold text-[#1F1B16] underline hover:text-[#C1440E] transition-colors cursor-pointer"
                >
                  Não recebi meu código
                </button>
              ) : (
                <p className="text-[13px] text-[#9C9188]">
                  Para reenviar o código, espere {formatTime(secondsLeft)} (aguarde{" "}
                  {secondsLeft}s para reenviar)
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPA 3: COMPLETE AS INFORMAÇÕES DA SUA CONTA (NOVO USUÁRIO)   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {step === "name" && (
          <div className="flex flex-col animate-in fade-in duration-200">
            <h1 className="text-[22px] font-bold text-[#1F1B16] leading-[28px] mb-1">
              Complete as informações da sua conta
            </h1>
            <p className="text-xs text-[#6B6157] mb-6">
              Cadastre seus dados para identificação na loja e maior segurança da conta
            </p>

            <h2 className="text-[15px] font-bold text-[#1F1B16] mb-3">
              Qual o seu nome e sobrenome?
            </h2>

            {/* Input Nome */}
            <div
              className={`h-[52px] border rounded-[10px] px-4 flex items-center mb-3 scroll-mb-44 transition-all ${
                firstNameFocused
                  ? "border-2 border-[#1F1B16]"
                  : "border-[#ECE7E0]"
              }`}
            >
              <input
                ref={firstNameInputRef}
                type="text"
                placeholder="Nome"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999] scroll-mb-44"
              />
            </div>

            {/* Input Sobrenome */}
            <div
              className={`h-[52px] border rounded-[10px] px-4 flex items-center mb-6 scroll-mb-44 transition-all ${
                lastNameFocused
                  ? "border-2 border-[#1F1B16]"
                  : "border-[#ECE7E0]"
              }`}
            >
              <input
                type="text"
                placeholder="Sobrenome"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onFocus={() => setLastNameFocused(true)}
                onBlur={() => setLastNameFocused(false)}
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999] scroll-mb-44"
              />
            </div>

            <h2 className="text-[15px] font-bold text-[#1F1B16] mb-3">
              CPF (opcional)
            </h2>

            {/* Input CPF com máscara */}
            <div
              className={`h-[52px] border rounded-[10px] px-4 flex items-center mb-2 scroll-mb-44 transition-all ${
                cpfFocused
                  ? "border-2 border-[#1F1B16]"
                  : !isCpfValid
                  ? "border-red-500"
                  : "border-[#ECE7E0]"
              }`}
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                onFocus={() => setCpfFocused(true)}
                onBlur={() => setCpfFocused(false)}
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999] scroll-mb-44"
              />
            </div>
            {!isCpfValid && (
              <p className="text-xs text-[#EA1D2C] mb-2">
                CPF inválido — confira os números
              </p>
            )}
            <p className="text-xs text-[#9C9188] mb-6">
              Usado para identificação segura na entrega.
            </p>
          </div>
        )}
      </main>

      {/* FOOTER FIXO / FLUTUANTE INFERIOR COM BOTÃO CONTINUAR */}
      <footer
        className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[#ECE7E0]/60 px-6 pt-3 will-change-transform transition-[transform,padding] duration-200 ease-out"
        style={{
          transform: `translate3d(0, -${keyboardOffset}px, 0)`,
          paddingBottom: isKeyboardOpen
            ? "16px"
            : "max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))",
        }}
      >
        <div className="w-full max-w-xl mx-auto flex flex-col">
          {step === "email" && (
            <p className="text-xs text-[#9C9188] leading-[17px] mb-4 text-center sm:text-left">
              Enviaremos comunicações sobre sua conta neste e-mail. Pra cancelar a inscrição acesse &apos;Configurações&apos;.
            </p>
          )}
          {step === "code" && (
            <p className="text-xs text-[#9C9188] leading-[17px] mb-4 text-center sm:text-left">
              Digite os 6 dígitos enviados para o seu e-mail. Não compartilhe este código com ninguém.
            </p>
          )}
          {step === "name" && (
            <p className="text-xs text-[#9C9188] leading-[17px] mb-4 text-center sm:text-left">
              Ao continuar, você concorda com os <span className="font-bold text-[#1F1B16]">Termos de Uso</span> e confirma que leu nossa <span className="font-bold text-[#1F1B16]">Política de Privacidade do Batata Top</span>.
            </p>
          )}

          <button
            type="button"
            disabled={!isFooterValid || footerLoading}
            onClick={handleFooterContinue}
            className={`w-full h-[52px] rounded-[10px] font-bold text-base flex items-center justify-center transition-all ${
              isFooterValid
                ? "bg-[#E3A008] text-[#1F1B16] hover:bg-[#d09106] active:scale-[0.99] cursor-pointer"
                : "bg-[#F7F4EF] text-[#9C9188] cursor-not-allowed opacity-80"
            }`}
          >
            {footerLoading ? (
              <ThreeDotsLoader color={isFooterValid ? "#1F1B16" : "#9C9188"} />
            ) : (
              "Continuar"
            )}
          </button>
        </div>
      </footer>

      {/* BOTTOM SHEET MODAL: "NÃO RECEBEU O CÓDIGO?" */}
      {helpVisible && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="fixed inset-0"
            onClick={() => setHelpVisible(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-[#E3A008] rounded-t-[28px] p-6 text-center text-[#1F1B16] animate-in slide-in-from-bottom duration-300">
            <h3 className="text-[17px] font-bold mb-2">
              Não recebeu o código?
            </h3>
            <p className="text-xs text-[#1F1B16]/90 leading-[19px] mb-1">
              Verifique se digitou o e-mail corretamente. Talvez o código esteja na sua caixa de spam.
            </p>
            <p className="text-sm font-bold mb-6 break-all">
              {email}
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleResend}
                className="w-full h-[52px] rounded-xl bg-[#C1440E] hover:bg-[#a6390a] text-white font-bold text-base flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-[0.99]"
              >
                Reenviar código
              </button>

              <button
                type="button"
                onClick={() => {
                  setHelpVisible(false)
                  setStep("email")
                  appToast.dismiss()
                }}
                className="w-full h-[52px] rounded-xl border-[1.5px] border-[#1F1B16] bg-white hover:bg-[#F7F4EF] text-[#1F1B16] font-bold text-sm flex items-center justify-center transition-all cursor-pointer active:scale-[0.99]"
              >
                Alterar e-mail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
