import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getSafeRedirectPath(candidate: string | null): string {
  if (!candidate) return "/cardapio"
  const trimmed = candidate.trim()
  // Garante que é um caminho relativo interno (ex: /cardapio, /perfil)
  // e rejeita URLs com protocolo (https://) ou protocol-relative (//evil.com)
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\") && !trimmed.includes(":")) {
    return trimmed
  }
  return "/cardapio"
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const returnUrl = requestUrl.searchParams.get("returnUrl")

  if (code) {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const safePath = getSafeRedirectPath(next || returnUrl)
      return NextResponse.redirect(new URL(safePath, request.url))
    }
  }

  // Fallback em caso de erro ou falta de código
  return NextResponse.redirect(new URL("/login?error=auth-callback-failed", request.url))
}
