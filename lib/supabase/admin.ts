import { getSupabaseBrowserClient } from "./client"
import { isSecureAdminCheck } from "../security-auth"

const OWNER_FALLBACK_EMAILS = "enzzobaraldo2008@gmail.com,maraysis9010@gmail.com"

export function isAdminUser(user: any): boolean {
  if (!user || typeof window !== "undefined") return false
  const adminEmails = process.env.ADMIN_EMAILS || OWNER_FALLBACK_EMAILS
  return isSecureAdminCheck(user, adminEmails)
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) return false

  // Verificação autoritativa no banco de dados (tabela profiles.role)
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()

    if (!error && data?.role === "admin") {
      return true
    }
  } catch (e) {
    console.error("Erro ao verificar role de admin no banco:", e)
  }

  return false
}

export async function requireAdmin() {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const isUserAdmin = await isAdmin(user.id)
  if (!isUserAdmin) {
    throw new Error("Not authorized")
  }

  return user
}
