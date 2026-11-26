"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import { getSupabaseBrowserClient } from "./supabase/client"
import { addressesManager } from "./addresses-manager"
import type { User, Session } from "@supabase/supabase-js"
import {
  validateEmail,
  validateOtpToken,
  sanitizeAuthErrorMessage,
  checkOtpRateLimit,
  recordFailedOtpAttempt,
  resetOtpAttempts,
  getOtpCooldownRemaining,
  recordOtpSentCooldown,
  acquireOtpSendLock,
  releaseOtpSendLock,
  OTP_SEND_COOLDOWN_SECONDS,
  writeSavedUserProfile,
  clearSavedUserProfile,
  sanitizeReturnUrl,
} from "./security-auth"

const GUEST_ADDRESS_STORAGE_KEY = "batata_top_guest_address"

export interface ContinueSavedAccountResult {
  status: "authenticated" | "otp_sent" | "otp_cooldown"
  remainingSeconds?: number
  error?: string
}

export interface OtpSendResult {
  success: boolean
  message?: string
  cooldownRemaining?: number
  skipped?: boolean
}

function clearSupabaseBrowserCookiesAndStorage() {
  if (typeof window === "undefined") return

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth.token")) {
        localStorage.removeItem(key)
      }
    })
    localStorage.removeItem("batata_saved_session")
    localStorage.removeItem("batata_soft_logged_out")
  } catch {}

  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth.token")) {
        sessionStorage.removeItem(key)
      }
    })
    sessionStorage.removeItem("batata_saved_session")
    sessionStorage.removeItem("batata_soft_logged_out")
  } catch {}

  try {
    if (typeof document !== "undefined" && document.cookie) {
      document.cookie.split(";").forEach((cookieStr) => {
        const eqPos = cookieStr.indexOf("=")
        const cookieName = (eqPos > -1 ? cookieStr.slice(0, eqPos) : cookieStr).trim()
        if (cookieName.startsWith("sb-") || cookieName.includes("supabase.auth.token")) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
          document.cookie = `${cookieName}=; max-age=0; path=/`
        }
      })
    }
  } catch {}
}

function persistSavedAccountSession(session: Session | null) {
  if (typeof window === "undefined" || !session?.user?.email) return

  const cleanEmail = session.user.email.trim().toLowerCase()
  const rawName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    cleanEmail.split("@")[0]
  const rawProvider = session.user.app_metadata?.provider || "email"

  writeSavedUserProfile({
    name: String(rawName),
    email: cleanEmail,
    provider: String(rawProvider),
  })
}

interface AuthContextType {
  user: User | null
  loading: boolean
  authModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  signInWithOtp: (email: string) => Promise<OtpSendResult>
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>
  resendOtp: (email: string) => Promise<OtpSendResult>
  continueWithSavedAccount: (email: string) => Promise<ContinueSavedAccountResult>
  signInWithGoogle: (returnUrl?: string) => Promise<void>
  signIn: (returnUrl?: string) => Promise<void>
  // Métodos legados mantidos com fallback seguro
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: (options?: { forgetAccount?: boolean }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const authEpochRef = useRef(0)
  const signOutPromiseRef = useRef<Promise<void> | null>(null)
  const flushingGuestAddressRef = useRef(false)
  const supabase = getSupabaseBrowserClient()

  const openAuthModal = useCallback(() => setAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), [])

  // Sincroniza endereço de visitante salvo localmente para a conta autenticada (paridade com flushPendingAddress do App)
  const flushGuestAddress = useCallback(
    async (currentUser: User | null) => {
      if (typeof window === "undefined" || !currentUser?.id || flushingGuestAddressRef.current) {
        return
      }
      flushingGuestAddressRef.current = true
      try {
        const raw = localStorage.getItem(GUEST_ADDRESS_STORAGE_KEY)
        if (!raw) return

        let parsed: Record<string, unknown> | null = null
        try {
          parsed = JSON.parse(raw) as Record<string, unknown> | null
        } catch {
          localStorage.removeItem(GUEST_ADDRESS_STORAGE_KEY)
          return
        }

        if (
          !parsed ||
          typeof parsed !== "object" ||
          typeof parsed.street !== "string" ||
          !parsed.street.trim()
        ) {
          localStorage.removeItem(GUEST_ADDRESS_STORAGE_KEY)
          return
        }

        const city = typeof parsed.city === "string" && parsed.city.trim() ? parsed.city.trim() : "Iacanga"
        const state = typeof parsed.state === "string" && parsed.state.trim() ? parsed.state.trim() : "SP"
        const normalizedCity = city
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
        const normalizedState = state
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()

        if (normalizedCity !== "iacanga" || (normalizedState !== "sp" && normalizedState !== "sao paulo")) {
          localStorage.removeItem(GUEST_ADDRESS_STORAGE_KEY)
          return
        }

        const street = parsed.street.trim()
        const number =
          parsed.number != null && String(parsed.number).trim()
            ? String(parsed.number).trim()
            : "S/N"
        const neighborhood = typeof parsed.neighborhood === "string" ? parsed.neighborhood.trim() : ""

        const existingAddresses = await addressesManager.getUserAddresses(currentUser.id)
        const normalizePart = (value: string | null | undefined) => (value ?? "").trim().toLowerCase()
        const isDuplicate = existingAddresses.some(
          (addr) =>
            normalizePart(addr.street) === normalizePart(street) &&
            normalizePart(addr.number) === normalizePart(number) &&
            normalizePart(addr.neighborhood) === normalizePart(neighborhood)
        )

        if (isDuplicate) {
          localStorage.removeItem(GUEST_ADDRESS_STORAGE_KEY)
          return
        }

        const rawLabel = typeof parsed.label === "string" ? parsed.label.trim().toLowerCase() : ""
        const normalizedLabel: "casa" | "trabalho" | null =
          rawLabel === "casa" ? "casa" : rawLabel === "trabalho" ? "trabalho" : null

        const created = await addressesManager.addAddress({
          user_id: currentUser.id,
          street,
          number,
          complement: typeof parsed.complement === "string" ? parsed.complement.trim() : "",
          neighborhood,
          city,
          state: normalizedState === "sao paulo" ? "SP" : state.toUpperCase(),
          cep: typeof parsed.cep === "string" && parsed.cep.trim() ? parsed.cep.trim() : "17180-000",
          is_default: existingAddresses.length === 0,
          label: normalizedLabel,
          reference_point:
            typeof parsed.reference_point === "string" && parsed.reference_point.trim()
              ? parsed.reference_point.trim()
              : null,
          latitude:
            typeof parsed.latitude === "number" && Number.isFinite(parsed.latitude)
              ? parsed.latitude
              : null,
          longitude:
            typeof parsed.longitude === "number" && Number.isFinite(parsed.longitude)
              ? parsed.longitude
              : null,
        })

        if (!created) return

        localStorage.removeItem(GUEST_ADDRESS_STORAGE_KEY)
        window.dispatchEvent(new Event("address-changed"))
      } catch {
        // Mantém pendente no localStorage sem bloquear a autenticação
      } finally {
        flushingGuestAddressRef.current = false
      }
    },
    []
  )

  useEffect(() => {
    let isMounted = true

    if (typeof window !== "undefined") {
      try {
        const hadLegacySoftLogout = localStorage.getItem("batata_soft_logged_out") === "true"
        localStorage.removeItem("batata_saved_session")
        localStorage.removeItem("batata_soft_logged_out")
        if (hadLegacySoftLogout) {
          clearSupabaseBrowserCookiesAndStorage()
        }
      } catch {}
    }

    const epochAtStart = authEpochRef.current

    // 1. Carrega sessão inicial de forma assíncrona segura
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        if (!isMounted || authEpochRef.current !== epochAtStart) return
        if (session) {
          persistSavedAccountSession(session)
          if (session.user) {
            void flushGuestAddress(session.user)
          }
        }
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((err: any) => {
        console.error("[Auth] Erro ao recuperar sessão inicial:", err)
        if (isMounted && authEpochRef.current === epochAtStart) setLoading(false)
      })

    // 2. Listener ativo para mudanças de estado de autenticação em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (!isMounted) return
      authEpochRef.current += 1

      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        if (session) {
          persistSavedAccountSession(session)
        }
        if (event === "SIGNED_IN") {
          resetOtpAttempts()
          setAuthModalOpen(false)
          if (currentUser) {
            setTimeout(() => {
              void flushGuestAddress(currentUser)
            }, 0)
          }
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, flushGuestAddress])

  // ─── Envio do Código de 6 Dígitos (signInWithOtp) com Cooldown de 60s ─────
  const signInWithOtp = async (rawEmail: string): Promise<OtpSendResult> => {
    const validation = validateEmail(rawEmail)
    if (!validation.isValid || !validation.cleanEmail) {
      throw new Error(validation.error || "E-mail inválido")
    }

    const email = validation.cleanEmail

    const cooldownRemaining = getOtpCooldownRemaining(email)
    if (cooldownRemaining > 0) {
      return {
        success: true,
        skipped: true,
        cooldownRemaining,
        message: `Aguarde ${cooldownRemaining}s para reenviar`,
      }
    }

    if (!acquireOtpSendLock(email)) {
      const lockRemaining = getOtpCooldownRemaining(email) || OTP_SEND_COOLDOWN_SECONDS - 1
      return {
        success: true,
        skipped: true,
        cooldownRemaining: lockRemaining,
        message: "Envio já em andamento.",
      }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Cria automaticamente se for novo usuário (Passwordless sem dupla senha)
        },
      })

      if (error) {
        console.error("[Auth] Erro ao enviar OTP:", error)
        const errorMsg = error.message?.toLowerCase() || ""
        if (
          errorMsg.includes("429") ||
          errorMsg.includes("too many requests") ||
          errorMsg.includes("rate limit") ||
          errorMsg.includes("over_email_send_rate_limit") ||
          errorMsg.includes("over_request_rate_limit")
        ) {
          recordOtpSentCooldown(email, OTP_SEND_COOLDOWN_SECONDS)
        }
        const sanitized = sanitizeAuthErrorMessage(error.message)
        throw new Error(sanitized)
      }

      recordOtpSentCooldown(email, OTP_SEND_COOLDOWN_SECONDS)

      return {
        success: true,
        skipped: false,
        cooldownRemaining: OTP_SEND_COOLDOWN_SECONDS - 1,
        message: "Se o e-mail informado for válido, você receberá um código de acesso de 6 dígitos.",
      }
    } finally {
      releaseOtpSendLock(email)
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
    const token = rawToken.trim()

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
    authEpochRef.current += 1
    if (data?.session) {
      persistSavedAccountSession(data.session)
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      } catch (syncErr) {
        console.warn("[Auth] Aviso ao sincronizar setSession pós-OTP:", syncErr)
      }
    }
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

  /** Valida sessão salva no banco (Cenário A: autentica direto; Cenário B: encaminha OTP com trava de 60s). */
  const continueWithSavedAccount = async (rawEmail: string): Promise<ContinueSavedAccountResult> => {
    if (signOutPromiseRef.current) {
      await signOutPromiseRef.current.catch(() => {})
    }

    const validation = validateEmail(rawEmail)
    if (!validation.isValid || !validation.cleanEmail) {
      throw new Error(validation.error || "E-mail inválido")
    }

    const cleanEmail = validation.cleanEmail

    try {
      let {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.expires_at && session.expires_at * 1000 <= Date.now() + 60000) {
        try {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && refreshed?.session) {
            session = refreshed.session
          }
        } catch (refreshErr) {
          console.warn("[Auth] Falha ao renovar sessão da conta salva:", refreshErr)
        }
      }

      if (session) {
        const {
          data: { user: verifiedUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (!userError && verifiedUser && verifiedUser.email?.toLowerCase() === cleanEmail) {
          const {
            data: { session: latestSession },
          } = await supabase.auth.getSession()

          const profileUser = latestSession?.user ?? verifiedUser
          const profileEmail = profileUser.email?.trim().toLowerCase() || cleanEmail
          writeSavedUserProfile({
            name: String(
              profileUser.user_metadata?.full_name ||
                profileUser.user_metadata?.name ||
                profileEmail.split("@")[0]
            ),
            email: profileEmail,
            provider: String(profileUser.app_metadata?.provider || "email"),
          })
          if (latestSession) {
            try {
              await supabase.auth.setSession({
                access_token: latestSession.access_token,
                refresh_token: latestSession.refresh_token,
              })
            } catch {}
          }
          setUser(verifiedUser)
          setAuthModalOpen(false)
          return { status: "authenticated" }
        }
      }
    } catch (err) {
      console.warn("[Auth] Sessão salva inválida ou expirada no banco:", err)
    }

    // Cenário B: Token expirado ou ausente -> preserva estado sem limpeza agressiva de cookies
    setUser(null)

    const cooldownRemaining = getOtpCooldownRemaining(cleanEmail)
    if (cooldownRemaining > 0) {
      return {
        status: "otp_cooldown",
        remainingSeconds: cooldownRemaining,
      }
    }

    const sendRes = await signInWithOtp(cleanEmail)
    if (sendRes.skipped) {
      return {
        status: "otp_cooldown",
        remainingSeconds: sendRes.cooldownRemaining || getOtpCooldownRemaining(cleanEmail) || 59,
      }
    }

    return {
      status: "otp_sent",
      remainingSeconds: OTP_SEND_COOLDOWN_SECONDS - 1,
    }
  }

  // ─── Login com Google ─────────────────────────────────────────────────────
  const signInWithGoogle = async (returnUrl?: string) => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "")

    let rawNext = returnUrl
    if (!rawNext && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const queryNext = params.get("returnUrl") || params.get("next")
      if (queryNext) {
        rawNext = queryNext
      } else {
        const currentPath = window.location.pathname
        const isAuthRoute =
          currentPath === "/login" ||
          currentPath === "/cadastro" ||
          currentPath === "/reset-password" ||
          currentPath.startsWith("/auth/")
        if (!isAuthRoute) {
          rawNext = `${currentPath}${window.location.search || ""}`
        }
      }
    }

    const safeNext = sanitizeReturnUrl(rawNext, "/cardapio")
    const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`

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

  // ─── Limpeza Atômica de Logout (Preserva ou Esquece Sessão como no App) ──
  const signOut = async (options?: { forgetAccount?: boolean }) => {
    authEpochRef.current += 1
    const forgetAccount = Boolean(options?.forgetAccount)

    if (!forgetAccount) {
      try {
        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession()
        if (activeSession) {
          persistSavedAccountSession(activeSession)
        } else if (user?.email) {
          writeSavedUserProfile({
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email.split("@")[0],
            email: user.email,
            provider: String(user.app_metadata?.provider || "email"),
          })
        }
      } catch {}

      try {
        if (typeof window !== "undefined") {
          clearSupabaseBrowserCookiesAndStorage()
          sessionStorage.removeItem("bt_otp_security_state")
        }
      } catch {}
    } else {
      clearSavedUserProfile()
    }

    // 1. Zera imediatamente o estado na memória do React para a UI alternar instantaneamente
    setUser(null)

    // 2. Encerra sessão no Supabase antes de limpar cookies/storage para preservar o token em logout global
    const pendingPromise = (async () => {
      try {
        await supabase.auth.signOut({ scope: forgetAccount ? "global" : "local" })
      } catch (error) {
        console.error("[Auth] Erro ao encerrar sessão no servidor:", error)
      } finally {
        // 3. Limpa dados ativos da sessão do navegador
        try {
          if (typeof window !== "undefined") {
            clearSupabaseBrowserCookiesAndStorage()
            sessionStorage.removeItem("bt_otp_security_state")
          }
        } catch (e) {
          console.warn("[Auth] Aviso ao limpar local storage:", e)
        }
      }
    })()

    signOutPromiseRef.current = pendingPromise
    try {
      await pendingPromise
    } finally {
      if (signOutPromiseRef.current === pendingPromise) {
        signOutPromiseRef.current = null
      }
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
        continueWithSavedAccount,
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
