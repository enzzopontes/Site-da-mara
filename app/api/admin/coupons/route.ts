import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { authenticateRequestUser } from "@/lib/supabase/route-auth"
import { isSecureAdminCheck } from "@/lib/security-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FALLBACK_ADMIN_EMAILS = "enzzobaraldo2008@gmail.com,maraysis9010@gmail.com"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function requireAdminUser(req: NextRequest, service: NonNullable<ReturnType<typeof getServiceClient>>) {
  const user = await authenticateRequestUser(req, service)
  if (!user) return { ok: false as const, status: 401, error: "Sessão inválida. Faça login novamente." }

  const emails =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    FALLBACK_ADMIN_EMAILS
  if (isSecureAdminCheck(user, emails)) return { ok: true as const, user }

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
    const service = getServiceClient()
    if (!service) {
      return NextResponse.json({ success: false, error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 })
    }

    const auth = await requireAdminUser(req, service)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
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
        return NextResponse.json(
          { success: false, error: `Erro ao limpar usos do cupom: ${usesErr.message}` },
          { status: 500 }
        )
      }

      const { error: freeErr } = await service.from("free_coupons").delete().eq("coupon_id", couponId)
      if (freeErr) {
        return NextResponse.json(
          { success: false, error: `Erro ao limpar cupons grátis vinculados: ${freeErr.message}` },
          { status: 500 }
        )
      }

      const { error: bannerErr } = await service
        .from("home_banners")
        .update({ coupon_id: null })
        .eq("coupon_id", couponId)
      if (bannerErr) {
        return NextResponse.json(
          { success: false, error: `Erro ao desvincular banners do cupom: ${bannerErr.message}` },
          { status: 500 }
        )
      }

      const { data: deleted, error: delErr } = await service
        .from("coupons")
        .delete()
        .eq("id", couponId)
        .select("id")

      if (delErr) {
        return NextResponse.json({ success: false, error: `Erro ao excluir cupom: ${delErr.message}` }, { status: 500 })
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
        return NextResponse.json(
          { success: false, error: `Erro ao consultar uso de cupom do pedido: ${readErr.message}` },
          { status: 500 }
        )
      }

      let refundedCount = 0
      if (uses && uses.length > 0) {
        const { error: delUsesErr } = await service.from("user_coupon_uses").delete().eq("order_id", orderId)
        if (delUsesErr) {
          return NextResponse.json(
            { success: false, error: `Erro ao estornar uso de cupom: ${delUsesErr.message}` },
            { status: 500 }
          )
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
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erro interno" }, { status: 500 })
  }
}
