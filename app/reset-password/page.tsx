"use client"

import type React from "react"
import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { validatePassword, sanitizeAuthErrorMessage } from "@/lib/security-auth"
import { appToast } from "@/lib/app-toast"
import { useKeyboardViewport } from "@/hooks/use-keyboard-viewport"
import { Eye, EyeOff, Lock, CheckCircle2, ChevronLeft, AlertCircle } from "lucide-react"
import { AuthSkeleton } from "@/components/skeletons/auth-skeleton"

function ResetPasswordHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        aria-label="Voltar"
        className="w-9 h-9 -ml-1.5 rounded-full bg-transparent hover:bg-[#F7F4EF] active:scale-95 text-[#1F1B16] flex items-center justify-center transition-all cursor-pointer"
      >
        <ChevronLeft className="h-6 w-6 stroke-[2.25]" />
      </button>
    </header>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { keyboardOffset, isKeyboardOpen } = useKeyboardViewport()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  // FIX: ref para garantir que exchangeCodeForSession só é chamado uma vez
  // (evita double-invoke do React Strict Mode / hydration do Next.js)
  const exchangePromiseRef = useRef<{ code: string; promise: Promise<{ data: any; error: any }> } | null>(null)
  const supabase = getSupabaseBrowserClient()

  const passValidation = validatePassword(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const isFormValid = passValidation.isValid && passwordsMatch

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current) }, [])

  useEffect(() => {
    if (!sessionReady || success || linkError) return
    const timer = setTimeout(() => {
      passwordInputRef.current?.focus()
    }, 250)
    return () => clearTimeout(timer)
  }, [sessionReady, success, linkError])

  useEffect(() => {
    let active = true

    const init = async () => {
      try {
        // Já tem sessão ativa? (ex: usuário já autenticado)
        const { data: { session } } = await supabase.auth.getSession()
        if (!active || !isMountedRef.current) return
        if (session) {
          setSessionReady(true)
          return
        }

        // Fluxo PKCE: troca o "code" da URL por uma sessão
        const code = searchParams.get("code")
        if (code) {
          if (exchangePromiseRef.current?.code !== code) {
            exchangePromiseRef.current = {
              code,
              promise: supabase.auth.exchangeCodeForSession(code),
            }
          }
          const { data, error } = await exchangePromiseRef.current.promise
          if (!active || !isMountedRef.current) return
          if (error || !data?.session) {
            appToast.error("Este link de redefinição expirou ou é inválido.")
            setLinkError(true)
            return
          }
          setSessionReady(true)
          return
        }

        // Sem sessão e sem code: link inválido/expirado
        if (!active || !isMountedRef.current) return
        setLinkError(true)
      } catch {
        if (active && isMountedRef.current) {
          setLinkError(true)
        }
      }
    }

    init()
    // FIX: removido onAuthStateChange daqui — causava conflito com exchangeCodeForSession
    // e podia resultar em sessão sendo processada duas vezes
    return () => {
      active = false
    }
  }, [])

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (loading) return
    setError("")
    
    if (password !== confirmPassword) {
      const msg = "As senhas não coincidem"
      setError(msg)
      appToast.error(msg)
      return
    }

    const passCheck = validatePassword(password)
    if (!passCheck.isValid) {
      const msg = passCheck.error || "A senha deve conter no mínimo 8 caracteres, letra e número."
      setError(msg)
      appToast.error(msg)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      if (!isMountedRef.current) return

      if (error) throw error
      
      setSuccess(true)
      appToast.success("Senha alterada com sucesso!")
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: any) {
      if (!isMountedRef.current) return
      const msg = sanitizeAuthErrorMessage(error?.message)
      setError(msg)
      appToast.error(msg)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  if (success) {
    return (
      <div className="min-h-dvh w-full bg-white text-[#1F1B16] flex flex-col justify-between selection:bg-[#E3A008]/20">
        <ResetPasswordHeader onBack={() => router.push("/login")} />
        <main className="w-full max-w-xl mx-auto px-6 sm:px-8 flex-1 flex flex-col items-center justify-center pb-16">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h1 className="text-[22px] font-bold text-[#1F1B16] leading-[30px]">
              Senha alterada!
            </h1>
            <p className="text-sm text-[#6B6157]">
              Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full bg-[#E3A008] hover:bg-[#d09106] active:scale-[0.99] text-[#1F1B16] font-bold text-base h-[52px] rounded-[10px] flex items-center justify-center transition-all cursor-pointer"
            >
              Ir para login
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (linkError) {
    return (
      <div className="min-h-dvh w-full bg-white text-[#1F1B16] flex flex-col justify-between selection:bg-[#E3A008]/20">
        <ResetPasswordHeader onBack={() => router.push("/login")} />
        <main className="w-full max-w-xl mx-auto px-6 sm:px-8 flex-1 flex flex-col items-center justify-center pb-16">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-red-500" />
              </div>
            </div>
            <h1 className="text-[22px] font-bold text-[#1F1B16] leading-[30px]">
              Link inválido ou expirado
            </h1>
            <p className="text-sm text-[#6B6157]">
              Este link de redefinição de senha não é mais válido. Solicite um novo link para continuar.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full bg-[#E3A008] hover:bg-[#d09106] active:scale-[0.99] text-[#1F1B16] font-bold text-base h-[52px] rounded-[10px] flex items-center justify-center transition-all cursor-pointer"
            >
              Voltar para login
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!sessionReady) {
    return <AuthSkeleton />
  }

  return (
    <div className="min-h-dvh w-full bg-white text-[#1F1B16] flex flex-col justify-between selection:bg-[#E3A008]/20">
      <ResetPasswordHeader onBack={() => router.back()} />

      <main
        className="w-full max-w-xl mx-auto px-6 sm:px-8 flex-1 flex flex-col pt-4 overflow-y-auto"
        style={{ paddingBottom: `${Math.max(168, keyboardOffset + 168)}px` }}
      >
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        <div className="flex flex-col animate-in fade-in duration-200">
          <h1 className="text-[22px] font-bold text-[#1F1B16] leading-[30px] mb-1">
            Crie uma nova senha
          </h1>
          <p className="text-xs text-[#6B6157] mb-6">
            Digite e confirme sua nova senha para proteger sua conta.
          </p>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <div
                className={`relative h-[52px] border rounded-[10px] px-4 flex items-center scroll-mb-44 transition-all ${
                  passwordFocused
                    ? "border-2 border-[#1F1B16]"
                    : "border-[#ECE7E0]"
                }`}
              >
                <label
                  htmlFor="reset-password-input"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs text-[#6B6157] font-medium"
                >
                  Nova senha
                </label>
                <input
                  ref={passwordInputRef}
                  id="reset-password-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  required
                  className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999] scroll-mb-44"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="ml-2 text-[#9C9188] hover:text-[#1F1B16] transition-colors cursor-pointer shrink-0"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {!passValidation.isValid && password.length > 0 && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">
                  {passValidation.error}
                </p>
              )}
            </div>

            <div>
              <div
                className={`relative h-[52px] border rounded-[10px] px-4 flex items-center scroll-mb-44 transition-all ${
                  confirmFocused
                    ? "border-2 border-[#1F1B16]"
                    : "border-[#ECE7E0]"
                }`}
              >
                <label
                  htmlFor="reset-confirm-password-input"
                  className="absolute -top-2 left-3 bg-white px-1 text-xs text-[#6B6157] font-medium"
                >
                  Confirmar senha
                </label>
                <input
                  id="reset-confirm-password-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                  required
                  className="w-full text-base text-[#1F1B16] bg-transparent outline-none placeholder:text-[#999] scroll-mb-44"
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">
                  As senhas não coincidem.
                </p>
              )}
            </div>
            <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
          </form>
        </div>
      </main>

      <footer
        className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[#ECE7E0]/60 px-6 pt-3 will-change-transform transition-[padding] duration-150 ease-out"
        style={{
          transform: `translate3d(0, -${keyboardOffset}px, 0)`,
          paddingBottom: isKeyboardOpen
            ? "16px"
            : "max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))",
        }}
      >
        <div className="w-full max-w-xl mx-auto flex flex-col">
          <p className="text-xs text-[#9C9188] leading-[17px] mb-4 text-center sm:text-left">
            Sua nova senha deve conter no mínimo 8 caracteres, incluindo letras e números.
          </p>

          <button
            type="button"
            disabled={!isFormValid || loading}
            onClick={() => handleResetPassword()}
            className={`w-full h-[52px] rounded-[10px] font-bold text-base flex items-center justify-center transition-all ${
              isFormValid && !loading
                ? "bg-[#E3A008] text-[#1F1B16] hover:bg-[#d09106] active:scale-[0.99] cursor-pointer"
                : "bg-[#F7F4EF] text-[#9C9188] cursor-not-allowed opacity-80"
            }`}
          >
            {loading ? "Salvando..." : "Continuar"}
          </button>
        </div>
      </footer>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ResetPasswordContent />
    </Suspense>
  )
}