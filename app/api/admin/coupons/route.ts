import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { authenticateRequestUser } from "@/lib/supabase/route-auth"
import { isAdminUser } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function assertSameOriginForCookieAuth(req: NextRequest): boolean {
  if (
    req.headers.get("authorization")?.toLowerCase().startsWith("bearer ") &&
    !req.headers.get("cookie")
  ) {
    return true
  }

  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase()
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return false
  }

  const originOrReferer = req.headers.get("origin") || req.headers.get("referer")
  if (originOrReferer) {
    let parsed: URL
    try {
      parsed = new URL(originOrReferer)
    } catch {
      return false
    }
    if (parsed.host !== req.nextUrl.host) {
      return false
    }
  }

  return true
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function requireAdminUser(req: NextRequest, service: NonNullable<ReturnType<typeof getServiceClient>>) {
  const user = await authenticateRequestUser(req, service)
  if (!user) return { ok: false as const, status: 401, error: "Sessão inválida. Faça login novamente." }

  if (isAdminUser(user)) return { ok: true as const, user }

  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role === "admin") return { ok: true as const, user }

  return { ok: false as const, status: 403, error: "Acesso negado: apenas administradores." }
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("deleteCoupon"),
    couponId: z.string().uuid("couponId inválido."),
  }),
  z.object({
    action: z.literal("refundOrderCoupon"),
    orderId: z.string().uuid("orderId inválido."),
  }),
])

export async function POST(req: NextRequest) {
  try {
    if (!assertSameOriginForCookieAuth(req)) {
      return NextResponse.json({ success: false, error: "Origem da requisição não permitida." }, { status: 403 })
    }

    const service = getServiceClient()
    if (!service) {
      console.error("[api/admin/coupons] Supabase service client indisponível: variáveis de ambiente ausentes.")
      return NextResponse.json({ success: false, error: "Erro de configuração do servidor." }, { status: 500 })
    }

    const auth = await requireAdminUser(req, service)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const contentType = req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()
    if (contentType !== "application/json") {
      return NextResponse.json(
        { success: false, error: "Content-Type deve ser application/json." },
        { status: 415 }
      )
    }

    const rawBody = await req.json().catch(() => null)
    const parsed = ActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Requisição inválida." },
        { status: 400 }
      )
    }

    const payload = parsed.data

    if (payload.action === "deleteCoupon") {
      const { couponId } = payload

      const { error: usesErr } = await service.from("user_coupon_uses").delete().eq("coupon_id", couponId)
      if (usesErr) {
        console.error("[api/admin/coupons] Erro ao limpar user_coupon_uses:", usesErr)
        return NextResponse.json({ success: false, error: "Erro ao limpar usos do cupom." }, { status: 500 })
      }

      const { error: freeErr } = await service.from("free_coupons").delete().eq("coupon_id", couponId)
      if (freeErr) {
        console.error("[api/admin/coupons] Erro ao limpar free_coupons:", freeErr)
        return NextResponse.json(
          { success: false, error: "Erro ao limpar cupons grátis vinculados." },
          { status: 500 }
        )
      }

      const { error: bannerErr } = await service
        .from("home_banners")
        .update({ coupon_id: null })
        .eq("coupon_id", couponId)
      if (bannerErr) {
        console.error("[api/admin/coupons] Erro ao desvincular home_banners:", bannerErr)
        return NextResponse.json({ success: false, error: "Erro ao desvincular banners do cupom." }, { status: 500 })
      }

      const { data: deleted, error: delErr } = await service
        .from("coupons")
        .delete()
        .eq("id", couponId)
        .select("id")

      if (delErr) {
        console.error("[api/admin/coupons] Erro ao excluir cupom:", delErr)
        return NextResponse.json({ success: false, error: "Erro ao excluir cupom." }, { status: 500 })
      }
      if (!deleted || deleted.length === 0) {
        return NextResponse.json({ success: false, error: "Cupom não encontrado." }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: { deleted: true, couponId } })
    }

    if (payload.action === "refundOrderCoupon") {
      const { orderId } = payload
      const { data: uses, error: readErr } = await service
        .from("user_coupon_uses")
        .select("id, coupon_id")
        .eq("order_id", orderId)

      if (readErr) {
        console.error("[api/admin/coupons] Erro ao consultar user_coupon_uses:", readErr)
        return NextResponse.json(
          { success: false, error: "Erro ao consultar uso de cupom do pedido." },
          { status: 500 }
        )
      }

      let refundedCount = 0
      if (uses && uses.length > 0) {
        const { error: delUsesErr } = await service.from("user_coupon_uses").delete().eq("order_id", orderId)
        if (delUsesErr) {
          console.error("[api/admin/coupons] Erro ao estornar user_coupon_uses:", delUsesErr)
          return NextResponse.json({ success: false, error: "Erro ao estornar uso de cupom." }, { status: 500 })
        }

        for (const useRow of uses) {
          const { data: couponRow } = await service
            .from("coupons")
            .select("id, current_uses")
            .eq("id", useRow.coupon_id)
            .maybeSingle()

          if (couponRow) {
            const nextUses = Math.max(0, Number(couponRow.current_uses || 0) - 1)
            await service
              .from("coupons")
              .update({ current_uses: nextUses, updated_at: new Date().toISOString() })
              .eq("id", couponRow.id)
          }
          refundedCount++
        }
      }

      return NextResponse.json({ success: true, data: { refundedCount, orderId } })
    }

    return NextResponse.json({ success: false, error: "Ação não suportada." }, { status: 400 })
  } catch (err: unknown) {
    console.error("[api/admin/coupons] Erro interno:", err)
    return NextResponse.json({ success: false, error: "Erro interno ao processar requisição." }, { status: 500 })
  }
}
