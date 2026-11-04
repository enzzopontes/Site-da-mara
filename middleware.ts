import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAdminUser } from "./lib/supabase/admin"
import { checkRateLimit } from "./lib/rate-limit"

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()

  // 0. Rate Limiting por IP (Proteção contra força bruta, scraping e DDoS)
  const clientIp =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"

  // Rate limit para APIs (60 req/min, 180/min para webhook do MP)
  if (url.pathname.startsWith("/api/")) {
    const isWebhook = url.pathname.startsWith("/api/mercadopago/webhook")
    const limit = isWebhook ? 180 : 60
    const rl = checkRateLimit(`api:${clientIp}`, limit, 60 * 1000)

    if (!rl.success) {
      return NextResponse.json(
        { error: "Limite de requisições excedido. Aguarde um minuto e tente novamente." },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }
  }

  // Rate limit para rotas sensíveis de login e cadastro (25 req/min por IP)
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/cadastro") || url.pathname.startsWith("/auth/")) {
    const rl = checkRateLimit(`auth:${clientIp}`, 25, 60 * 1000)
    if (!rl.success) {
      return new NextResponse(
        "Muitas tentativas de acesso. Por favor, aguarde um minuto e tente novamente.",
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }
  }

  // Proteção do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (!url.pathname.startsWith("/setup-required")) {
      const redirectUrl = new URL("/setup-required", request.url)
      return NextResponse.redirect(redirectUrl)
    }
    return NextResponse.next()
  }

  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const secureOptions = {
            ...options,
            secure: process.env.NODE_ENV === "production",
            sameSite: options?.sameSite || "lax",
          }
          request.cookies.set(name, value)
          supabaseResponse.cookies.set(name, value, secureOptions)
        })
      },
    },
  })

  // Refresh session and get user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. Proteção de Rotas Administrativas
  if (url.pathname.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("returnUrl", url.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Verificação autoritária e segura de admin
    let isAdmin = isAdminUser(user)

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // 2. Proteção de Rotas de Usuário (Pedidos, Perfil, Meus Dados, Checkout)
  const protectedUserRoutes = ["/pedidos", "/perfil", "/meus-dados", "/checkout"]
  if (protectedUserRoutes.some((route) => url.pathname.startsWith(route))) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("returnUrl", url.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
