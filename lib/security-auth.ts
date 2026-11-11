/**
 * Módulo de Segurança de Identidade, Autenticação e Controle de Acesso
 * Atualizado com Proteção Anti-Brute Force, Rate Limit e OTP Sanitization
 */
import { z } from "zod"

// Schema estrito de validação de e-mail com Zod
export const emailSchema = z
  .string()
  .trim()
  .min(5, "O e-mail deve ter no mínimo 5 caracteres")
  .max(120, "O e-mail não pode exceder 120 caracteres")
  .email("Formato de e-mail inválido")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
    "Formato de e-mail inválido"
  )

export function validateEmail(email: string): { isValid: boolean; error?: string; cleanEmail?: string } {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    const firstIssue = result.error.issues?.[0]?.message || "E-mail inválido"
    return { isValid: false, error: firstIssue }
  }
  return { isValid: true, cleanEmail: result.data.toLowerCase() }
}

export function validateOtpToken(token: string): { isValid: boolean; error?: string } {
  const cleaned = token.replace(/\D/g, "")
  if (cleaned.length !== 6) {
    return { isValid: false, error: "O código deve conter exatamente 6 dígitos numéricos" }
  }
  return { isValid: true }
}

// ─── Sanitização de Mensagens de Erro (Anti-Enumeration) ─────────────────────
export function sanitizeAuthErrorMessage(rawMessage?: string): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    return "Ocorreu um erro no processamento. Tente novamente."
  }

  const msg = rawMessage.toLowerCase()

  // 1. Rate Limit e Status 429 do Supabase
  if (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("over_email_send_rate_limit") ||
    msg.includes("over_request_rate_limit")
  ) {
    return "Muitas solicitações em pouco tempo. Por segurança, aguarde alguns minutos antes de tentar novamente."
  }

  // 2. Erros de código OTP (expirado, inválido, já utilizado)
  if (
    msg.includes("token has expired") ||
    msg.includes("otp expired") ||
    msg.includes("expired")
  ) {
    return "O código de verificação expirou. Por favor, solicite um novo código."
  }

  if (
    msg.includes("invalid token") ||
    msg.includes("token is invalid") ||
    msg.includes("token has already been used") ||
    msg.includes("invalid_grant") ||
    msg.includes("verification failed")
  ) {
    return "Código de verificação incorreto ou já utilizado. Verifique os dígitos."
  }

  // 3. Prevenção de enumeração de usuário: respostas genéricas
  if (
    msg.includes("user already registered") ||
    msg.includes("user not found") ||
    msg.includes("email already in use") ||
    msg.includes("already exists")
  ) {
    return "Não foi possível concluir a operação com os dados informados. Verifique e tente novamente."
  }

  // 4. Credenciais antigas
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou dados de acesso inválidos."
  }

  if (msg.includes("email not confirmed")) {
    return "Por favor, confirme seu e-mail antes de entrar."
  }

  return "Ocorreu uma instabilidade na autenticação. Tente novamente em instantes."
}

// ─── Proteção Anti-Brute Force Local (Client Rate-Limiting) ────────────────
const MAX_VERIFY_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutos de bloqueio após 5 erros seguidos

interface OtpAttemptState {
  attempts: number
  lockoutUntil: number | null
}

const attemptStorageKey = "bt_otp_security_state"

function getSecurityState(): OtpAttemptState {
  if (typeof window === "undefined") return { attempts: 0, lockoutUntil: null }
  try {
    const raw = sessionStorage.getItem(attemptStorageKey)
    if (!raw) return { attempts: 0, lockoutUntil: null }
    const parsed = JSON.parse(raw) as OtpAttemptState
    if (parsed.lockoutUntil && Date.now() > parsed.lockoutUntil) {
      sessionStorage.removeItem(attemptStorageKey)
      return { attempts: 0, lockoutUntil: null }
    }
    return parsed
  } catch {
    return { attempts: 0, lockoutUntil: null }
  }
}

function saveSecurityState(state: OtpAttemptState) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(attemptStorageKey, JSON.stringify(state))
  } catch {}
}

export function checkOtpRateLimit(): { isBlocked: boolean; remainingMinutes?: number; attemptsLeft: number } {
  const state = getSecurityState()
  if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
    const diffMs = state.lockoutUntil - Date.now()
    const remainingMinutes = Math.ceil(diffMs / 60000)
    return { isBlocked: true, remainingMinutes, attemptsLeft: 0 }
  }
  const attemptsLeft = Math.max(0, MAX_VERIFY_ATTEMPTS - state.attempts)
  return { isBlocked: false, attemptsLeft }
}

export function recordFailedOtpAttempt(): { isBlocked: boolean; attemptsLeft: number; remainingMinutes?: number } {
  const state = getSecurityState()
  const newAttempts = state.attempts + 1

  if (newAttempts >= MAX_VERIFY_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
    saveSecurityState({ attempts: newAttempts, lockoutUntil })
    return { isBlocked: true, attemptsLeft: 0, remainingMinutes: 5 }
  }

  saveSecurityState({ attempts: newAttempts, lockoutUntil: null })
  return { isBlocked: false, attemptsLeft: MAX_VERIFY_ATTEMPTS - newAttempts }
}

export function resetOtpAttempts() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(attemptStorageKey)
  } catch {}
}

// ─── Verificação de Admin Seguro ───────────────────────────────────────────
export function isSecureAdminCheck(user: any, allowedEmailsCsv?: string): boolean {
  if (!user || typeof user !== "object") return false

  if (user.app_metadata?.role === "admin") {
    return true
  }

  if (user.email && allowedEmailsCsv) {
    const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at)
    if (!isEmailConfirmed) {
      return false
    }

    const email = String(user.email).trim().toLowerCase()
    const allowedList = allowedEmailsCsv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (allowedList.includes(email)) {
      return true
    }
  }

  return false
}

// Validação de senha legada mantida para retrocompatibilidade sem breaking change
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (typeof password !== "string") {
    return { isValid: false, error: "Senha inválida" }
  }
  if (password.length < 8) {
    return { isValid: false, error: "A senha deve ter no mínimo 8 caracteres" }
  }
  if (password.length > 128) {
    return { isValid: false, error: "A senha não pode ultrapassar 128 caracteres" }
  }
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  if (!hasLetter || !hasDigit) {
    return { isValid: false, error: "A senha deve conter pelo menos uma letra e um número" }
  }
  return { isValid: true }
}
