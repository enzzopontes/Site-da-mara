import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAdminUser } from "./lib/supabase/admin"
import { checkRateLimitDistributed } from "./lib/rate-limit"
import { buildContentSecurityPolicy } from "./lib/security-transport"

export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV !== "production"
  const cspHeader = buildContentSecurityPolicy({ nonce, isDev })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", cspHeader)

  const withCsp = (response: NextResponse): NextResponse => {
    response.headers.set("Content-Security-Policy", cspHeader)
    return response
  }

  const nextWithNonce = (): NextResponse =>
    withCsp(NextResponse.next({ request: { headers: requestHeaders } }))

  const url = request.nextUrl.clone()

  // 0. Rate Limiting por IP (Proteção contra força bruta, scraping e DDoS)
  const clientIp =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"

  // Rate limit para APIs (60 req/min, 180/min para webhook do MP)
  if (url.pathname.startsWith("/api/")) {
    const isGeocode =
      url.pathname === "/api/geocode" || url.pathname.startsWith("/api/geocode/")
    const isWebhook = url.pathname.startsWith("/api/mercadopago/webhook")
    const limit = isWebhook ? 180 : 60
    const rateLimitKey = isGeocode ? `geocode:${clientIp}` : `api:${clientIp}`
    const rl = await checkRateLimitDistributed(rateLimitKey, limit, 60 * 1000)

    if (!rl.success) {
      const retryAfter = String(
        Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000)) || 60
      )
      return withCsp(
        NextResponse.json(
          { error: "Limite de requisições excedido. Aguarde um minuto e tente novamente." },
          { status: 429, headers: { "Retry-After": retryAfter } }
        )
      )
    }

    if (isGeocode) {
      return nextWithNonce()
    }
  }

  // Rate limit para rotas sensíveis de login e cadastro (25 req/min por IP)
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/cadastro") || url.pathname.startsWith("/auth/")) {
    const rl = await checkRateLimitDistributed(`auth:${clientIp}`, 25, 60 * 1000)
    if (!rl.success) {
      const retryAfter = String(
        Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000)) || 60
      )
      return withCsp(
        new NextResponse(
          "Muitas tentativas de acesso. Por favor, aguarde um minuto e tente novamente.",
          { status: 429, headers: { "Retry-After": retryAfter } }
        )
      )
    }
  }

  // Proteção do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (!url.pathname.startsWith("/setup-required")) {
      const redirectUrl = new URL("/setup-required", request.url)
      return withCsp(NextResponse.redirect(redirectUrl))
    }
    return nextWithNonce()
  }

  const supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
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

  // 1. Proteção de Rotas Administrativas (Web e API)
  const isAdminApiRoute =
    url.pathname === "/api/admin" || url.pathname.startsWith("/api/admin/")

  if (isAdminApiRoute) {
    let apiUser = user
    const authHeader = request.headers.get("authorization") || ""
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim()

    if (!apiUser && bearerToken) {
      const { data: bearerData } = await supabase.auth.getUser(bearerToken)
      apiUser = bearerData?.user ?? null
    }

    if (!apiUser) {
      return withCsp(
        NextResponse.json(
          { success: false, error: "Sessão inválida. Faça login novamente." },
          { status: 401 }
        )
      )
    }

    let isApiAdmin = isAdminUser(apiUser)
    if (!isApiAdmin) {
      const profileClient =
        !user && bearerToken
          ? createServerClient(supabaseUrl, supabaseKey, {
              global: { headers: { Authorization: `Bearer ${bearerToken}` } },
              cookies: {
                getAll() {
                  return []
                },
                setAll() {},
              },
            })
          : supabase

      const { data: profile } = await profileClient
        .from("profiles")
        .select("role")
        .eq("id", apiUser.id)
        .maybeSingle()

      if (profile?.role === "admin") {
        isApiAdmin = true
      }
    }

    if (!isApiAdmin) {
      return withCsp(
        NextResponse.json(
          { success: false, error: "Acesso negado: apenas administradores." },
          { status: 403 }
        )
      )
    }
  }

  if (url.pathname.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("returnUrl", url.pathname)
      return withCsp(NextResponse.redirect(redirectUrl))
    }

    // Verificação autoritária e segura de admin
    let isAdmin = isAdminUser(user)

    if (!isAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()

      if (profile?.role === "admin") {
        isAdmin = true
      }
    }

    if (!isAdmin) {
      return withCsp(NextResponse.redirect(new URL("/", request.url)))
    }
  }

  // 2. Proteção de Rotas de Usuário (Pedidos, subrotas de Perfil, Meus Dados, Checkout)
  const protectedUserRoutes = ["/pedidos/", "/perfil/", "/meus-dados", "/checkout"]
  const isProtectedUserRoute = protectedUserRoutes.some((route) =>
    route.endsWith("/")
      ? url.pathname.startsWith(route) && url.pathname !== route
      : url.pathname === route || url.pathname.startsWith(`${route}/`)
  )
  if (isProtectedUserRoute) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("returnUrl", url.pathname)
      return withCsp(NextResponse.redirect(redirectUrl))
    }
  }

  return withCsp(supabaseResponse)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
