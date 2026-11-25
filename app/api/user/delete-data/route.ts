import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { authenticateRequestUser } from "@/lib/supabase/route-auth"
import { evaluateOriginForCors } from "@/lib/security-transport"
import { checkRateLimit } from "@/lib/rate-limit"
import { secureRandomBetween } from "@/lib/secure-random"

const ALLOWED_ORIGINS = [
  "https://batatatop.vercel.app",
  "https://batatatopiacanga.com.br",
  "https://www.batatatopiacanga.com.br",
  process.env.NEXT_PUBLIC_SITE_URL || "",
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
].filter(Boolean)

function buildCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin")
  const cors = evaluateOriginForCors(origin, ALLOWED_ORIGINS)
  if (!cors.isAllowed || !cors.origin) return {}
  return {
    "Access-Control-Allow-Origin": cors.origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  }
}

function maskIdentifier(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return "***"
  const atIdx = trimmed.indexOf("@")
  if (atIdx > 2) {
    return `${trimmed.slice(0, 2)}***@${trimmed.slice(atIdx + 1)}`
  }
  if (trimmed.length > 4) {
    return `***${trimmed.slice(-4)}`
  }
  return "***"
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) })
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.")
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function extractDigits(value?: string | null): string {
  return String(value || "").replace(/\D/g, "")
}

function phonesMatch(input: string, stored?: string | null): boolean {
  const inputDigits = extractDigits(input)
  const storedDigits = extractDigits(stored)
  if (!inputDigits || !storedDigits) return false
  if (inputDigits === storedDigits) return true
  const stripBrCountryCode = (digits: string) =>
    digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits
  return stripBrCountryCode(inputDigits) === stripBrCountryCode(storedDigits)
}

function isMissingRelationOrColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const code = String(error.code || "")
  const message = String(error.message || "").toLowerCase()
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("could not find the")
  )
}

export async function POST(req: NextRequest) {
  const corsHeaders = buildCorsHeaders(req)
  try {
    const clientIp =
      req.headers.get("x-vercel-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1"

    const ipRl = checkRateLimit(`delete-data:ip:${clientIp}`, 5, 15 * 60 * 1000)
    if (!ipRl.success) {
      return NextResponse.json(
        { error: "Muitas solicitações. Aguarde alguns minutos e tente novamente." },
        { status: 429, headers: corsHeaders }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const user = await authenticateRequestUser(req, supabaseAdmin)

    if (!user) {
      return NextResponse.json(
        { error: "Autenticação obrigatória para solicitar exclusão ou anonimização de dados." },
        { status: 401, headers: corsHeaders }
      )
    }

    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()

    const body = await req.json().catch(() => ({}))
    const rawIdentifier = String(body.identifier || "").trim()

    const hasAccountContact = Boolean(
      user.email || extractDigits(user.phone) || extractDigits(profileRow?.phone)
    )

    if (rawIdentifier && hasAccountContact) {
      const matchesEmail =
        Boolean(user.email) &&
        rawIdentifier.toLowerCase() === String(user.email).trim().toLowerCase()
      const matchesPhone =
        phonesMatch(rawIdentifier, user.phone) ||
        phonesMatch(rawIdentifier, profileRow?.phone)

      if (!matchesEmail && !matchesPhone) {
        return NextResponse.json(
          { error: "Identificador não corresponde à conta autenticada." },
          { status: 403, headers: corsHeaders }
        )
      }
    }

    const resolvedIdentifier = maskIdentifier((rawIdentifier || user.email || profileRow?.phone || user.id).slice(0, 160))
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 500)
        : null
    const rawSource = typeof body.source === "string" ? body.source.trim().toLowerCase() : ""
    const source =
      rawSource === "app" || rawSource === "site"
        ? rawSource
        : req.headers.get("authorization")
          ? "app"
          : "site"

    // Registra protocolo formal de solicitação de exclusão
    const nowIso = new Date().toISOString()
    const protocol = `LGPD-EXC-${Date.now().toString(36).toUpperCase()}-${secureRandomBetween(1000, 9999)}`

    // NEW-02 FIX: Remove coluna inexistente is_deleted, limpa cpf, payment_cards e user_push_tokens, e valida erros
    const [addrRes, cardsRes, tokensRes, adminTokensRes, notifReadsRes, loyaltyRes] = await Promise.all([
      supabaseAdmin.from("addresses").delete().eq("user_id", user.id),
      supabaseAdmin.from("payment_cards").delete().eq("user_id", user.id),
      supabaseAdmin.from("user_push_tokens").delete().eq("user_id", user.id),
      supabaseAdmin.from("admin_push_tokens").delete().eq("user_id", user.id),
      supabaseAdmin.from("notification_reads").delete().eq("user_id", user.id),
      supabaseAdmin.from("loyalty_rewards").delete().eq("user_id", user.id),
    ])

    let profileRes = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: "Usuário Excluído / Anonimizado",
        phone: null,
        cpf: null,
        loyalty_orders_count: 0,
        notify_orders_push: false,
        notify_promo_push: false,
        notify_promo_email: false,
        notify_promo_whatsapp: false,
        notify_promo_sms: false,
        updated_at: nowIso,
      })
      .eq("id", user.id)

    if (profileRes.error && isMissingRelationOrColumnError(profileRes.error)) {
      profileRes = await supabaseAdmin
        .from("profiles")
        .update({
          full_name: "Usuário Excluído / Anonimizado",
          phone: null,
          cpf: null,
          updated_at: nowIso,
        })
        .eq("id", user.id)
    }

    const notifError =
      notifReadsRes.error && !isMissingRelationOrColumnError(notifReadsRes.error)
        ? notifReadsRes.error
        : null

    const adminTokError =
      adminTokensRes.error && !isMissingRelationOrColumnError(adminTokensRes.error)
        ? adminTokensRes.error
        : null
    const loyaltyError =
      loyaltyRes.error && !isMissingRelationOrColumnError(loyaltyRes.error)
        ? loyaltyRes.error
        : null

    const dbError = addrRes.error || cardsRes.error || tokensRes.error || adminTokError || notifError || loyaltyError || profileRes.error
    if (dbError) {
      console.error("[delete-data] Erro ao limpar dados do usuário:", dbError.message)
      return NextResponse.json(
        { error: "Não foi possível concluir a anonimização dos seus dados no banco." },
        { status: 500, headers: corsHeaders }
      )
    }

    // Registra protocolo na tabela dedicada (fallback gracioso se a migração ainda não foi aplicada)
    const { error: requestInsertError } = await supabaseAdmin
      .from("account_deletion_requests")
      .insert({
        user_id: user.id,
        protocol,
        identifier: resolvedIdentifier,
        reason,
        source,
        status: "processed",
        created_at: nowIso,
        processed_at: nowIso,
      })

    if (requestInsertError) {
      if (isMissingRelationOrColumnError(requestInsertError)) {
        console.warn("[delete-data] Tabela account_deletion_requests indisponível; seguindo sem persistência de protocolo.")
      } else {
        console.warn("[delete-data] Aviso ao registrar protocolo em account_deletion_requests:", requestInsertError.message)
      }
    }

    // Limpa PII do auth.users.user_metadata e bloqueia logins futuros preservando registros fiscais
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      ban_duration: "876000h",
      user_metadata: {
        full_name: "Usuário Excluído / Anonimizado",
        name: null,
        phone: null,
        cpf: null,
        birth_date: null,
        avatar_url: null,
        deleted_at: nowIso,
        deletion_protocol: protocol,
      },
    })

    if (authUpdateError) {
      console.error("[delete-data] Erro ao anonimizar metadados e bloquear conta no Auth:", authUpdateError.message)
      return NextResponse.json(
        { error: "Não foi possível concluir o bloqueio e anonimização da conta." },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        protocol,
        message: "Solicitação de exclusão processada com sucesso nos termos do Art. 18 da LGPD.",
        retentionNotice: "Dados estritamente fiscais e legais serão retidos pelo prazo regulatório do CTN e Marco Civil.",
        processedAt: nowIso,
      },
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("[delete-data] Erro ao processar exclusão de dados:", err instanceof Error ? err.message : "unknown")
    return NextResponse.json(
      { error: "Falha ao processar solicitação de exclusão." },
      { status: 500, headers: corsHeaders }
    )
  }
}
