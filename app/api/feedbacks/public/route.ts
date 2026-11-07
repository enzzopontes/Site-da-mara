import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase-fix"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const revalidate = 30

export async function GET() {
  try {
    // Usa service role key se configurada no servidor para acesso irrestrito às contagens reais
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const sb = serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)
      : getSupabase()

    // 1. Total real de pedidos feitos no restaurante
    let totalOrders = 0
    try {
      const { data: rpcOrders, error: rpcErr } = await sb.rpc("get_total_orders_count")
      if (!rpcErr && typeof rpcOrders === "number") {
        totalOrders = rpcOrders
      } else {
        const { count, error: countErr } = await sb.from("orders").select("*", { count: "exact", head: true })
        if (!countErr && typeof count === "number") {
          totalOrders = count
        }
      }
    } catch {
      totalOrders = 0
    }

    // 2. Média matemática exata de estrelas e lista de avaliações
    let totalReviews = 0
    let averageRating = 5.0
    let reviewsList: any[] = []
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    try {
      // Tenta RPC pública ou consulta direta
      const { data: rawFeedbacks, error: fbError } = await sb
        .from("feedbacks")
        .select("id, customer_name, rating, comment, created_at")
        .order("created_at", { ascending: false })
        .limit(50)

      if (!fbError && Array.isArray(rawFeedbacks) && rawFeedbacks.length > 0) {
        reviewsList = rawFeedbacks

        // Cálculo aritmético exato: sum(rating) / total
        let sumRatings = 0
        let validRatingsCount = 0

        rawFeedbacks.forEach((fb: any) => {
          const r = Number(fb.rating)
          if (!isNaN(r) && r >= 1 && r <= 5) {
            sumRatings += r
            validRatingsCount++
            const roundedR = Math.round(r)
            if (roundedR in ratingDistribution) {
              ratingDistribution[roundedR]++
            }
          }
        })

        if (validRatingsCount > 0) {
          totalReviews = validRatingsCount
          // Média precisa arredondada para 1 casa decimal
          averageRating = Math.round((sumRatings / validRatingsCount) * 10) / 10
        }
      } else {
        // Fallback para RPC se RLS restringiu SELECT direto
        const { data: rpcStats } = await sb.rpc("get_public_feedbacks_stats")
        if (rpcStats && typeof rpcStats.average === "number") {
          averageRating = Number(rpcStats.average)
          totalReviews = Number(rpcStats.total) || 0
        }

        const { data: rpcList } = await sb.rpc("get_public_feedbacks", { p_limit: 20 })
        if (Array.isArray(rpcList) && rpcList.length > 0) {
          reviewsList = rpcList
        }
      }
    } catch (err) {
      console.warn("Erro ao calcular média de estrelas:", err)
    }

    return NextResponse.json({
      success: true,
      totalOrders,
      totalReviews,
      averageRating,
      distribution: ratingDistribution,
      reviews: reviewsList,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      totalOrders: 0,
      totalReviews: 0,
      averageRating: 5.0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      reviews: [],
      error: error.message,
    })
  }
}
