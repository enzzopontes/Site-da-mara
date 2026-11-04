import { getSupabaseBrowserClient } from "./client"
import { isSecureAdminCheck } from "../security-auth"

export function isAdminUser(user: any): boolean {
  if (!user) return false
  const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || ""
  return isSecureAdminCheck(user, adminEmails)
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) return false

  // 1. Verificação instantânea baseada no e-mail confirmado e metadados de autenticação
  if (isAdminUser(user)) {
    return true
  }

  // 2. Verificação de segurança no banco de dados (tabela profiles.role)
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
