"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { validateEmail, checkOtpRateLimit } from "@/lib/security-auth"
import { ChevronLeft, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const RESEND_SECONDS = 59

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
  initialMode = "login",
}: {
  initialMode?: "login" | "register"
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithOtp, verifyOtp, signInWithGoogle, user, signOut } = useAuth()
  const { addItem } = useCart()

  // 'email' -> tela 1 | 'code' -> tela 2 | 'name' -> tela 3 (usuário novo)
  const [step, setStep] = useState<"email" | "code" | "name">("email")
  const [email, setEmail] = useState("")
  const [emailFocused, setEmailFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 6 dígitos do código
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""])
  const [focusedBox, setFocusedBox] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [helpVisible, setHelpVisible] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  // Nome e CPF (step === 'name')
  const [firstName, setFirstName] = useState("")
  const [firstNameFocused, setFirstNameFocused] = useState(false)
  const [lastName, setLastName] = useState("")
  const [lastNameFocused, setLastNameFocused] = useState(false)
  const [cpf, setCpf] = useState("")
  const [cpfFocused, setCpfFocused] = useState(false)
  const [nameSaving, setNameSaving] = useState(false)

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const isNameValid = firstName.trim().length >= 2 && lastName.trim().length >= 2
  const cpfDigits = cpf.replace(/\D/g, "")
  const isCpfValid = cpfDigits.length === 0 || isValidCpf(cpfDigits)

  // Inicializa e-mail via query param se existir
  useEffect(() => {
    const qEmail = searchParams.get("email")
    if (qEmail && qEmail.includes("@")) {
      setEmail(qEmail.trim())
    }
  }, [searchParams])

  // Despacha item pendente na sacola
  const processPendingCartItem = () => {
    try {
      const stored = sessionStorage.getItem("batata_pending_cart_item")
      if (stored) {
        sessionStorage.removeItem("batata_pending_cart_item")
        const parsed = JSON.parse(stored)
        if (parsed.product) addItem(parsed.product)
        if (Array.isArray(parsed.bebidas)) {
          parsed.bebidas.forEach((b: any) => addItem(b))
        }
        toast.success("Item adicionado à sua sacola!")
      }
    } catch {}
  }

  // Redireciona se já estiver autenticado
  useEffect(() => {
    if (user && step === "email") {
      processPendingCartItem()
      const returnUrl = searchParams.get("returnUrl") || "/cardapio"
      router.replace(returnUrl)
    }
  }, [user, step, router, searchParams])

  // Contador de reenvio de código
  useEffect(() => {
    if (step !== "code" || secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [step, secondsLeft])

  const formatTime = (s: number) => `0:${String(s).padStart(2, "0")}`

  // Enviar código OTP
  const sendCode = async () => {
    setLoading(true)
    setErrorMessage(null)

    const validation = validateEmail(email.trim())
    if (!validation.isValid || !validation.cleanEmail) {
      setErrorMessage(validation.error || "Informe um e-mail válido.")
      setLoading(false)
      return false
    }

    try {
      await signInWithOtp(validation.cleanEmail)
      return true
    } catch (err: any) {
      setErrorMessage(err?.message || "Não foi possível enviar o código. Tente novamente.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleEmailContinue = async () => {
    if (!isEmailValid || loading) return
    const ok = await sendCode()
    if (ok) {
      setCode(["", "", "", "", "", ""])
      setSecondsLeft(RESEND_SECONDS)
      setStep("code")
      toast.success("Código enviado!")
      setTimeout(() => codeRefs.current[0]?.focus(), 150)
    }
  }

  const handleResend = async () => {
    setHelpVisible(false)
    const ok = await sendCode()
    if (ok) {
      setCode(["", "", "", "", "", ""])
      setSecondsLeft(RESEND_SECONDS)
      toast.success("Código reenviado com sucesso!")
      setTimeout(() => codeRefs.current[0]?.focus(), 150)
    }
  }

  // Finalização do login e redirecionamento
  const finishSuccessLogin = () => {
    try {
      if (email) {
        localStorage.setItem("batata_last_login_email", email.trim())
      }
    } catch {}
    processPendingCartItem()
    toast.success("Login realizado com sucesso!")
    const returnUrl = searchParams.get("returnUrl") || "/cardapio"
    router.replace(returnUrl)
  }

  // Verificação de código OTP
  const verifyCode = async (token: string) => {
    setLoading(true)
    setErrorMessage(null)

    const rateLimitCheck = checkOtpRateLimit()
    if (rateLimitCheck.isBlocked) {
      setErrorMessage(
        `Limite de tentativas excedido. Aguarde ${rateLimitCheck.remainingMinutes || 5} minutos por segurança.`
      )
      setLoading(false)
      return
    }

    try {
      const res = await verifyOtp(email.trim(), token)
      if (!res.success) {
        setErrorMessage(res.error || "Código inválido ou expirado. Tente novamente.")
        setCode(["", "", "", "", "", ""])
        setTimeout(() => codeRefs.current[0]?.focus(), 100)
        return
      }

      // Verifica se o usuário já possui nome completo cadastrado
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      const fullName = currentUser?.user_metadata?.full_name
      if (fullName && fullName.trim().length > 0) {
        finishSuccessLogin()
      } else {
        // Usuário novo: pedir nome completo
        setStep("name")
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao validar o código.")
      setCode(["", "", "", "", "", ""])
      setTimeout(() => codeRefs.current[0]?.focus(), 100)
    } finally {
      setLoading(false)
    }
  }

  // Digitação nos 6 campos de PIN
  const handleDigitChange = (value: string, index: number) => {
    const raw = value.replace(/\D/g, "")
    setErrorMessage(null)

    // Se colar múltiplos dígitos
    if (raw.length > 1) {
      const chars = raw.slice(0, 6).split("")
      const next = [...code]
      chars.forEach((c, i) => {
        if (i < 6) next[i] = c
      })
      setCode(next)
      const token = next.join("")
      if (token.length === 6) {
        verifyCode(token)
      } else {
        const nextIndex = Math.min(chars.length, 5)
        codeRefs.current[nextIndex]?.focus()
      }
      return
    }

    const digit = raw.slice(-1)
    const next = [...code]
    next[index] = digit
    setCode(next)

    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }

    if (digit && index === 5) {
      const token = next.join("")
      if (token.length === 6) verifyCode(token)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  // Finalização do cadastro (Nome, Sobrenome, CPF)
  const handleNameContinue = async () => {
    if (!isNameValid || !isCpfValid || nameSaving) return
    setNameSaving(true)
    setErrorMessage(null)

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
        setErrorMessage("Não foi possível salvar os dados. Tente novamente.")
        return
      }

      finishSuccessLogin()
    } catch {
      setErrorMessage("Erro ao salvar cadastro.")
    } finally {
      setNameSaving(false)
    }
  }

  // Voltar tela
  const handleBack = async () => {
    if (step === "name") {
      await signOut()
      router.replace("/")
    } else if (step === "code") {
      setStep("email")
      setErrorMessage(null)
    } else {
      router.back()
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setErrorMessage(null)
    try {
      await signInWithGoogle()
    } catch {
      setErrorMessage("Não foi possível conectar com o Google.")
      setGoogleLoading(false)
    }
  }

  const isFooterValid =
    step === "email" ? isEmailValid : isNameValid && isCpfValid
  const footerLoading = step === "email" ? loading : nameSaving

  return (
    <div className="min-h-dvh w-full bg-white text-[#1F1B16] flex flex-col justify-between selection:bg-[#E3A008]/20">
      {/* HEADER SUPERIOR COM BOTÃO VOLTAR IDÊNTICO AO APP */}
      <header className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Voltar"
          className="w-10 h-10 -ml-2 rounded-full hover:bg-[#F7F4EF] active:scale-95 text-[#E3A008] flex items-center justify-center transition-all cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </button>
      </header>

      {/* CONTEÚDO CENTRAL */}
      <main className="w-full max-w-xl mx-auto px-6 sm:px-8 flex-1 flex flex-col pt-4 pb-32">
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

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
              className={`relative h-[52px] border rounded-[10px] px-4 flex items-center transition-all ${
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
                id="login-email-input"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999]"
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
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={() => setFocusedBox(index)}
                  onBlur={() => setFocusedBox(null)}
                  className={`w-11 h-14 sm:w-12 sm:h-14 border rounded-lg text-center text-[22px] font-bold text-[#1F1B16] bg-white transition-all outline-none ${
                    focusedBox === index
                      ? "border-2 border-[#1F1B16]"
                      : "border-[#ECE7E0]"
                  }`}
                />
              ))}
            </div>

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
                  Para reenviar o código, espere {formatTime(secondsLeft)}
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
              className={`h-[52px] border rounded-[10px] px-4 flex items-center mb-3 transition-all ${
                firstNameFocused
                  ? "border-2 border-[#1F1B16]"
                  : "border-[#ECE7E0]"
              }`}
            >
              <input
                type="text"
                placeholder="Nome"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999]"
              />
            </div>

            {/* Input Sobrenome */}
            <div
              className={`h-[52px] border rounded-[10px] px-4 flex items-center mb-6 transition-all ${
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
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999]"
              />
            </div>

            <h2 className="text-[15px] font-bold text-[#1F1B16] mb-3">
              CPF (opcional)
            </h2>

            {/* Input CPF com máscara */}
            <div
              className={`h-[52px] border rounded-[10px] px-4 flex items-center mb-2 transition-all ${
                cpfFocused ? "border-2 border-[#1F1B16]" : "border-[#ECE7E0]"
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
                className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999]"
              />
            </div>
            <p className="text-xs text-[#9C9188] mb-6">
              Usado para identificação segura na entrega.
            </p>
          </div>
        )}
      </main>

      {/* FOOTER FIXO / FLUTUANTE INFERIOR COM BOTÃO CONTINUAR/CRIAR CONTA */}
      {(step === "email" || step === "name") && (
        <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-[#ECE7E0]/60 p-4 sm:py-5 z-20">
          <div className="w-full max-w-xl mx-auto flex flex-col">
            {step === "email" ? (
              <p className="text-xs text-[#9C9188] leading-[17px] mb-3 text-center sm:text-left">
                Enviaremos comunicações sobre sua conta neste e-mail. Pra cancelar a inscrição acesse &apos;Configurações&apos;.
              </p>
            ) : (
              <p className="text-xs text-[#9C9188] leading-[17px] mb-3 text-center sm:text-left">
                Ao continuar, você concorda com os{" "}
                <span className="font-bold text-[#1F1B16]">Termos de Uso</span> e confirma que leu nossa{" "}
                <span className="font-bold text-[#1F1B16]">Política de Privacidade do Batata Top</span>.
              </p>
            )}

            <button
              type="button"
              disabled={!isFooterValid || footerLoading}
              onClick={step === "email" ? handleEmailContinue : handleNameContinue}
              className={`w-full h-[52px] rounded-[10px] font-bold text-base flex items-center justify-center transition-all cursor-pointer ${
                isFooterValid && !footerLoading
                  ? "bg-[#E3A008] text-[#1F1B16] hover:bg-[#d09106] active:scale-[0.99]"
                  : "bg-[#F7F4EF] text-[#9C9188] cursor-not-allowed opacity-80"
              }`}
            >
              {footerLoading
                ? "Carregando..."
                : step === "email"
                ? "Continuar"
                : "Criar conta"}
            </button>
          </div>
        </footer>
      )}

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
