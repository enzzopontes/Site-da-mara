import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { isSecureAdminCheck } from "@/lib/security-auth"
import { sendBarkNotification, sendBarkTestNotification } from "@/lib/bark-service"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase URL ou SERVICE_ROLE_KEY não configuradas")
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function resolveAuthenticatedUser(req: NextRequest, service: ReturnType<typeof getSupabaseAdmin>) {
  const authHeader = req.headers.get("authorization") || ""
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (bearerToken) {
    const { data, error } = await service.auth.getUser(bearerToken)
    if (!error && data?.user) return data.user
  }

  try {
    const serverClient = await createServerClient()
    const { data, error } = await serverClient.auth.getUser()
    if (!error && data?.user) return data.user
  } catch {}

  return null
}

async function checkIsAdminUser(user: any, service: ReturnType<typeof getSupabaseAdmin>): Promise<boolean> {
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role === "admin") return true

  const allowedEmails =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    ""
  return isSecureAdminCheck(user, allowedEmails)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const user = await resolveAuthenticatedUser(req, supabase)
    if (!user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 })
    }

    const isAdmin = await checkIsAdminUser(user, supabase)
    const body = await req.json().catch(() => ({}))
    const { action = "test", orderId } = body

    if (action === "test") {
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: "Acesso restrito a administradores" }, { status: 403 })
      }
      const result = await sendBarkTestNotification()
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: "Alarme de teste enviado ao iPhone!" })
    }

    if (action === "notify") {
      if (!orderId || typeof orderId !== "string") {
        return NextResponse.json({ success: false, error: "orderId obrigatório" }, { status: 400 })
      }

      const { data: order, error } = await supabase
        .from("orders")
        .select("id, user_id, order_number, customer_name, total_amount, payment_method, status, metadata")
        .eq("id", orderId)
        .maybeSingle()

      if (error || !order) {
        return NextResponse.json({ success: false, error: "Pedido não encontrado" }, { status: 404 })
      }

      if (!isAdmin && order.user_id !== user.id) {
        return NextResponse.json({ success: false, error: "Acesso negado ao pedido" }, { status: 403 })
      }

      // Interrompe imediatamente se o pedido não estiver em estado notificável ('pending' ou recém-aprovado 'preparing')
      if (order.status !== "pending" && order.status !== "preparing") {
        return NextResponse.json({
          success: false,
          skipped: true,
          message: "Pedido não elegível para notificação",
        })
      }

      const attempts = Number(order.metadata?.bark_attempts || 0)
      if (attempts >= 5) {
        return NextResponse.json({
          success: false,
          skipped: true,
          message: "Limite de 5 tentativas do Bark atingido para este pedido",
        })
      }

      const result = await sendBarkNotification({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
      })

      // NEW-08 FIX: Incrementa bark_attempts atomicamente via merge_order_metadata mesmo em falha para evitar loop infinito
      const nextAttempt = attempts + 1
      await supabase.rpc("merge_order_metadata", {
        order_id: orderId,
        patch: {
          bark_attempts: nextAttempt,
          bark_last_sent_at: new Date().toISOString(),
          ...(result.success ? {} : { bark_last_error: result.error || "failed" }),
        },
      })

      return NextResponse.json({
        success: result.success,
        attempt: nextAttempt,
        error: result.error,
      })
    }

    return NextResponse.json({ success: false, error: "Ação inválida" }, { status: 400 })
  } catch (err: any) {
    console.error("[api/bark] Erro interno:", err?.message || err)
    return NextResponse.json({ success: false, error: err?.message || "Erro interno" }, { status: 500 })
  }
}
