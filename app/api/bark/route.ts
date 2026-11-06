import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendBarkNotification, sendBarkTestNotification } from "@/lib/bark-service"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Supabase URL ou SERVICE_ROLE_KEY não configuradas")
  }
  return createClient(url, key)
}

const FALLBACK_ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { action = "test", orderId } = body

    if (action === "test") {
      const result = await sendBarkTestNotification()
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: "Alarme de teste enviado ao iPhone!" })
    }

    if (action === "notify") {
      if (!orderId) {
        return NextResponse.json({ success: false, error: "orderId obrigatório" }, { status: 400 })
      }

      const supabase = getSupabaseAdmin()
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, payment_method, status, metadata")
        .eq("id", orderId)
        .maybeSingle()

      if (error || !order) {
        return NextResponse.json({ success: false, error: "Pedido não encontrado" }, { status: 404 })
      }

      // Interrompe imediatamente se o pedido não estiver mais 'pending'
      if (order.status !== "pending") {
        return NextResponse.json({
          success: false,
          skipped: true,
          message: `Pedido não está mais pendente (status atual: ${order.status})`,
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

      if (result.success) {
        // Atualiza metadata com incremento de tentativa
        const existingMeta = order.metadata || {}
        await supabase
          .from("orders")
          .update({
            metadata: {
              ...existingMeta,
              bark_attempts: attempts + 1,
              bark_last_sent_at: new Date().toISOString(),
            },
          })
          .eq("id", orderId)
      }

      return NextResponse.json({
        success: result.success,
        attempt: attempts + 1,
        error: result.error,
      })
    }

    return NextResponse.json({ success: false, error: "Ação inválida" }, { status: 400 })
  } catch (err: any) {
    console.error("[api/bark] Erro interno:", err?.message || err)
    return NextResponse.json({ success: false, error: err?.message || "Erro interno" }, { status: 500 })
  }
}
