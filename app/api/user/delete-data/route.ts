import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Autenticação obrigatória para solicitar exclusão ou anonimização de dados." },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const identifier = String(body.identifier || user.email || "").trim().toLowerCase()

    if (user.email && identifier && identifier !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Identificador não corresponde à conta autenticada." },
        { status: 403 }
      )
    }

    // Registra protocolo formal de solicitação de exclusão
    const protocol = `LGPD-EXC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`

    // NEW-02 FIX: Remove coluna inexistente is_deleted, limpa cpf, payment_cards e user_push_tokens, e valida erros
    const [addrRes, cardsRes, tokensRes, profileRes] = await Promise.all([
      supabase.from("addresses").delete().eq("user_id", user.id),
      supabase.from("payment_cards").delete().eq("user_id", user.id),
      supabase.from("user_push_tokens").delete().eq("user_id", user.id),
      supabase
        .from("profiles")
        .update({
          full_name: "Usuário Excluído / Anonimizado",
          phone: null,
          cpf: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id),
    ])

    const dbError = addrRes.error || cardsRes.error || tokensRes.error || profileRes.error
    if (dbError) {
      console.error("[delete-data] Erro ao limpar dados do usuário:", dbError.message)
      return NextResponse.json(
        { error: "Não foi possível concluir a anonimização dos seus dados no banco." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      protocol,
      message: "Solicitação de exclusão processada com sucesso nos termos do Art. 18 da LGPD.",
      retentionNotice: "Dados estritamente fiscais e legais serão retidos pelo prazo regulatório do CTN e Marco Civil.",
      processedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error("Erro ao processar exclusão de dados:", err)
    return NextResponse.json(
      { error: "Falha ao processar solicitação de exclusão." },
      { status: 500 }
    )
  }
}
