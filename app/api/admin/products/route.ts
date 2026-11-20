import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { isSecureAdminCheck } from "@/lib/security-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Json = Record<string, any>

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const ok = (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status })
const fail = (error: string, status = 400) => NextResponse.json({ success: false, error }, { status })

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new ApiError(500, "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada.")
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function requireAdmin(service: ReturnType<typeof getServiceClient>) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new ApiError(401, "Sessão inválida. Faça login novamente.")

  const user = data.user
  // Mesmos admins hardcoded usados nas páginas do painel (fallback quando não há env).
  const emails =
    process.env.ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
    "enzzobaraldo2008@gmail.com,maraysis9010@gmail.com"
  if (isSecureAdminCheck(user, emails)) return user

  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role === "admin") return user

  throw new ApiError(403, "Acesso negado: você não é administrador.")
}

// Aceita "12,50" ou 12.5. Retorna null se vazio.
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function pick(obj: Json, camel: string, snake: string) {
  return obj[camel] !== undefined ? obj[camel] : obj[snake]
}

function buildProductRow(input: Json, partial: boolean) {
  const row: Json = {}
  const has = (v: unknown) => v !== undefined

  if (has(input.name)) row.name = String(input.name).trim()
  if (has(input.description)) row.description = input.description
  if (has(input.price)) {
    const price = toNumber(input.price)
    if (price === null || price < 0) throw new ApiError(400, "Preço inválido.")
    row.price = price
  }
  const image = pick(input, "image", "image_url")
  if (has(image)) row.image_url = image
  if (has(input.category)) row.category = input.category
  if (has(input.available)) row.available = Boolean(input.available)

  const original = pick(input, "originalPrice", "original_price")
  if (has(original)) row.original_price = toNumber(original)
  const discount = pick(input, "discountPercentage", "discount_percentage")
  if (has(discount)) {
    const d = toNumber(discount)
    row.discount_percentage = d === null ? null : Math.round(d)
  }
  const badge = pick(input, "badgeText", "badge_text")
  if (has(badge)) row.badge_text = badge ? String(badge).trim() || null : null
  const featured = pick(input, "isFeatured", "is_featured")
  if (has(featured)) row.is_featured = Boolean(featured)

  if (!partial) {
    if (!row.name) throw new ApiError(400, "Nome do produto é obrigatório.")
    if (row.price === undefined) throw new ApiError(400, "Preço do produto é obrigatório.")
    if (!row.category) throw new ApiError(400, "Categoria é obrigatória.")
    row.available = row.available ?? true
  }
  return row
}

function cleanIds(ids: unknown): string[] {
  if (ids === undefined || ids === null) return []
  if (!Array.isArray(ids)) throw new ApiError(400, "adicionalIds deve ser uma lista.")
  return [...new Set(ids.map((i) => String(i).trim()).filter(Boolean))]
}

async function syncAdicionais(
  service: ReturnType<typeof getServiceClient>,
  productId: string,
  adicionalIds: string[],
) {
  const { data: old, error: readErr } = await service
    .from("product_adicionais")
    .select("adicional_id")
    .eq("product_id", productId)
  if (readErr) throw new ApiError(500, `Erro ao ler adicionais atuais: ${readErr.message}`)

  const { error: delErr } = await service.from("product_adicionais").delete().eq("product_id", productId)
  if (delErr) throw new ApiError(500, `Erro ao limpar adicionais: ${delErr.message}`)

  if (adicionalIds.length === 0) return

  const { error: insErr } = await service
    .from("product_adicionais")
    .insert(adicionalIds.map((adicional_id) => ({ product_id: productId, adicional_id })))

  if (insErr) {
    // Rollback best-effort: restaura vínculos anteriores
    if (old?.length) {
      await service
        .from("product_adicionais")
        .insert(old.map((r: Json) => ({ product_id: productId, adicional_id: r.adicional_id })))
    }
    throw new ApiError(500, `Erro ao vincular adicionais: ${insErr.message}`)
  }
}

export async function POST(request: Request) {
  try {
    let body: Json
    try {
      body = await request.json()
    } catch {
      return fail("Corpo da requisição inválido (JSON esperado).", 400)
    }

    const service = getServiceClient()
    await requireAdmin(service)

    const action = body.action as string

    if (action === "createProduct") {
      const row = buildProductRow(body.product ?? {}, false)
      const adicionalIds = cleanIds(body.adicionalIds)

      const { data: product, error } = await service.from("products").insert(row).select().single()
      if (error || !product) throw new ApiError(500, `Erro ao criar produto: ${error?.message ?? "sem retorno"}`)

      // Produto salvo mesmo que vínculo falhe; erro vira aviso, não perde o produto.
      let warning: string | undefined
      if (adicionalIds.length) {
        try {
          await syncAdicionais(service, String(product.id), adicionalIds)
        } catch (e: any) {
          warning = e?.message || "Produto criado, mas adicionais não foram vinculados."
        }
      }
      return ok({ product, warning }, 201)
    }

    if (action === "updateProduct") {
      const productId = String(body.productId ?? "").trim()
      if (!productId) throw new ApiError(400, "productId é obrigatório.")

      const row = buildProductRow(body.updates ?? {}, true)
      let product: Json | null = null

      if (Object.keys(row).length) {
        const { data, error } = await service.from("products").update(row).eq("id", productId).select().maybeSingle()
        if (error) throw new ApiError(500, `Erro ao atualizar produto: ${error.message}`)
        if (!data) throw new ApiError(404, "Produto não encontrado.")
        product = data
      }

      if (body.adicionalIds !== undefined) {
        await syncAdicionais(service, productId, cleanIds(body.adicionalIds))
      }
      return ok({ product })
    }

    if (action === "setAdicionais") {
      const productId = String(body.productId ?? "").trim()
      if (!productId) throw new ApiError(400, "productId é obrigatório.")
      await syncAdicionais(service, productId, cleanIds(body.adicionalIds))
      return ok({ productId })
    }

    return fail("Ação inválida. Use createProduct, updateProduct ou setAdicionais.", 400)
  } catch (e: any) {
    if (e instanceof ApiError) return fail(e.message, e.status)
    console.error("[api/admin/products]", e)
    return fail(e?.message || "Erro interno do servidor.", 500)
  }
}
