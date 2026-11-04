import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Faça login para exportar seus dados." },
        { status: 401 }
      )
    }

    // Busca dados associados ao titular
    const [profileRes, ordersRes, addressesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("orders").select("id, created_at, status, total, payment_method, items").eq("user_id", user.id),
      supabase.from("addresses").select("*").eq("user_id", user.id)
    ])

    const exportPayload = {
      termo: "Relatório de Portabilidade de Dados Pessoais - LGPD (Lei nº 13.709/2018 - Art. 18, V)",
      geradoEm: new Date().toISOString(),
      controlador: {
        nomeFantasia: "BatataTop Delivery",
        razaoSocial: "66.599.795 QUEILA LAIS MARQUES DA SILVA",
        cnpj: "66.599.795/0001-04",
        endereco: "Rua Carlos Roberto Crepaldi, 120, Sala, Jardim Alvorada, Iacanga - SP, CEP 17187-074",
        dominio: "batatatopiacanga.com.br",
        dpoNome: "Maraysis Pontes Baraldo",
        dpoContato: "maraysis9010@gmail.com"
      },
      titular: {
        id: user.id,
        email: user.email,
        telefone: user.phone || user.user_metadata?.phone || null,
        nomeCompleto: user.user_metadata?.full_name || null,
        criadoEm: user.created_at,
        ultimoLogin: user.last_sign_in_at,
        metadados: user.user_metadata || {}
      },
      perfil: profileRes.data || null,
      enderecosCadastrados: addressesRes.data || [],
      historicoPedidos: ordersRes.data || []
    }

    const jsonString = JSON.stringify(exportPayload, null, 2)
    const fileName = `meus-dados-batatatop-${new Date().toISOString().split("T")[0]}.json`

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, max-age=0"
      }
    })
  } catch (err: any) {
    console.error("Erro ao exportar dados do usuário:", err)
    return NextResponse.json(
      { error: "Falha ao gerar arquivo de exportação de dados." },
      { status: 500 }
    )
  }
}
