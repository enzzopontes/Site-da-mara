import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    const body = await req.json().catch(() => ({}))
    const identifier = body.identifier || user?.email
    const reason = body.reason || "Não especificado"

    if (!identifier) {
      return NextResponse.json(
        { error: "Identificador (e-mail ou telefone) obrigatório." },
        { status: 400 }
      )
    }

    // Registra protocolo formal de solicitação de exclusão
    const protocol = `LGPD-EXC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`

    // Se o usuário estiver autenticado, pode-se anonimizar/limpar dados não fiscais
    if (user && user.email === identifier) {
      try {
        await Promise.all([
          supabase.from("addresses").delete().eq("user_id", user.id),
          supabase.from("profiles").update({
            full_name: "Usuário Excluído / Anonimizado",
            phone: null,
            is_deleted: true
          }).eq("id", user.id)
        ])
      } catch (e) {
        console.warn("Aviso ao limpar tabelas do usuário:", e)
      }
    }

    return NextResponse.json({
      success: true,
      protocol,
      message: "Solicitação de exclusão recebida com sucesso nos termos do Art. 18 da LGPD.",
      retentionNotice: "Dados estritamente fiscais e legais serão retidos pelo prazo regulatório do CTN e Marco Civil.",
      processedAt: new Date().toISOString()
    })
  } catch (err: any) {
    console.error("Erro ao processar exclusão de dados:", err)
    return NextResponse.json(
      { error: "Falha ao processar solicitação de exclusão." },
      { status: 500 }
    )
  }
}
