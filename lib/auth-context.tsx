"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { getSupabaseBrowserClient } from "./supabase/client"
import type { User, Session } from "@supabase/supabase-js"
import {
  validateEmail,
  validateOtpToken,
  sanitizeAuthErrorMessage,
  checkOtpRateLimit,
  recordFailedOtpAttempt,
  resetOtpAttempts,
} from "./security-auth"

interface AuthContextType {
  user: User | null
  loading: boolean
  authModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  signInWithOtp: (email: string) => Promise<{ success: boolean; message?: string }>
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>
  resendOtp: (email: string) => Promise<{ success: boolean; message?: string }>
  signInWithGoogle: () => Promise<void>
  signIn: () => Promise<void>
  // Métodos legados mantidos com fallback seguro
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const openAuthModal = useCallback(() => setAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), [])

  useEffect(() => {
    let isMounted = true

    // 1. Carrega sessão inicial de forma assíncrona segura
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        if (!isMounted) return
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((err: any) => {
        console.error("[Auth] Erro ao recuperar sessão inicial:", err)
        if (isMounted) setLoading(false)
      })

    // 2. Listener ativo para mudanças de estado de autenticação em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (!isMounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)

      if (event === "SIGNED_IN") {
        resetOtpAttempts()
        setAuthModalOpen(false)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // ─── Envio do Código de 6 Dígitos (signInWithOtp) ─────────────────────────
  const signInWithOtp = async (rawEmail: string): Promise<{ success: boolean; message?: string }> => {
    const validation = validateEmail(rawEmail)
    if (!validation.isValid || !validation.cleanEmail) {
      throw new Error(validation.error || "E-mail inválido")
    }

    const email = validation.cleanEmail

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Cria automaticamente se for novo usuário (Passwordless sem dupla senha)
      },
    })

    if (error) {
      console.error("[Auth] Erro ao enviar OTP:", error)
      const sanitized = sanitizeAuthErrorMessage(error.message)
      throw new Error(sanitized)
    }

    return {
      success: true,
      message: "Se o e-mail informado for válido, você receberá um código de acesso de 6 dígitos.",
    }
  }

  // ─── Validação do Código de 6 Dígitos (verifyOtp) ─────────────────────────
  const verifyOtp = async (
    rawEmail: string,
    rawToken: string
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Checa trava anti-brute force local
    const rateLimit = checkOtpRateLimit()
    if (rateLimit.isBlocked) {
      const err = `Muitas tentativas incorretas. Por segurança, tente novamente em ${rateLimit.remainingMinutes || 5} minutos.`
      return { success: false, error: err }
    }

    const emailValidation = validateEmail(rawEmail)
    if (!emailValidation.isValid || !emailValidation.cleanEmail) {
      return { success: false, error: emailValidation.error || "E-mail inválido" }
    }

    const tokenValidation = validateOtpToken(rawToken)
    if (!tokenValidation.isValid) {
      return { success: false, error: tokenValidation.error || "Código inválido" }
    }

    const email = emailValidation.cleanEmail
    const token = rawToken.trim().replace(/\D/g, "")

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    })

    if (error) {
      console.error("[Auth] Erro ao verificar OTP:", error)
      const attemptResult = recordFailedOtpAttempt()
      if (attemptResult.isBlocked) {
        return {
          success: false,
          error: "Limite de tentativas excedido por segurança. Aguarde 5 minutos antes de tentar novamente.",
        }
      }

      const sanitized = sanitizeAuthErrorMessage(error.message)
      const attemptsWarning =
        attemptResult.attemptsLeft <= 2
          ? ` (${attemptResult.attemptsLeft} ${attemptResult.attemptsLeft === 1 ? "tentativa restante" : "tentativas restantes"})`
          : ""

      return { success: false, error: `${sanitized}${attemptsWarning}` }
    }

    // Sucesso: reseta histórico de erros e atualiza usuário instantaneamente
    resetOtpAttempts()
    if (data?.user) {
      setUser(data.user)
      setAuthModalOpen(false)
    }

    return { success: true }
  }

  // Reenvio seguro de código
  const resendOtp = async (rawEmail: string) => {
    return signInWithOtp(rawEmail)
  }

  // ─── Login com Google ─────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    const redirectUrl = `${siteUrl}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
    if (error) {
      console.error("[Auth] Erro no Google OAuth:", error)
      throw new Error(sanitizeAuthErrorMessage(error.message))
    }
  }

  const signIn = signInWithGoogle

  // ─── Métodos com senha (legados) ──────────────────────────────────────────
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(sanitizeAuthErrorMessage(error.message))
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(sanitizeAuthErrorMessage(error.message))
  }

  const resetPassword = async (email: string) => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")
    const redirectUrl = `${siteUrl}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })
    if (error) throw new Error(sanitizeAuthErrorMessage(error.message))
  }

  // ─── Limpeza Atômica de Logout ────────────────────────────────────────────
  const signOut = async () => {
    // 1. Zera imediatamente o estado na memória do React para a UI alternar instantaneamente
    setUser(null)

    // 2. Limpa dados de sessão e rascunhos de carrinho/autenticação no storage local
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("bt_otp_security_state")
        // Remove qualquer chave supabase armazenada localmente se houver
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase.auth.token")) {
            localStorage.removeItem(key)
          }
        })
      }
    } catch (e) {
      console.warn("[Auth] Aviso ao limpar local storage:", e)
    }

    // 3. Notifica o backend do Supabase para invalidar o refresh token
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("[Auth] Erro ao encerrar sessão no servidor:", error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithOtp,
        verifyOtp,
        resendOtp,
        signInWithGoogle,
        signIn,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
