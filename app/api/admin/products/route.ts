import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { authenticateRequestUser } from "@/lib/supabase/route-auth"
import { isAdminUser } from "@/lib/supabase/admin"

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

async function requireAdmin(request: NextRequest, service: ReturnType<typeof getServiceClient>) {
  const user = await authenticateRequestUser(request, service)
  if (!user) throw new ApiError(401, "Sessão inválida. Faça login novamente.")

  if (isAdminUser(user)) return user

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

const CategorySchema = z.enum(["batata", "macarrao", "bebida"], {
  message: "Categoria inválida. Use batata, macarrao ou bebida.",
})

const AdicionalCategoriaSchema = z.enum(["proteinas", "molhos", "queijos"], {
  message: "Categoria de adicional inválida. Use proteinas, molhos ou queijos.",
})

const SafeImageUrlSchema = z
  .string()
  .trim()
  .max(2048, "URL da imagem muito longa.")
  .refine(
    (val) => val === "" || val.startsWith("/") || /^https?:\/\/[^\s]+$/i.test(val),
    "URL da imagem inválida (use caminho relativo iniciado por / ou URL http/https)."
  )

const ProductCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Nome do produto é obrigatório.").max(120, "Nome muito longo."),
    description: z.string().max(1000, "Descrição muito longa.").nullable().optional(),
    price: z.number({ message: "Preço do produto é obrigatório." }).positive("Preço deve ser maior que zero.").max(10000, "Preço inválido."),
    category: CategorySchema,
    image_url: SafeImageUrlSchema.nullable().optional(),
    available: z.boolean().default(true),
    original_price: z.number().positive("Preço original deve ser maior que zero.").max(10000).nullable().optional(),
    discount_percentage: z.number().int().min(1).max(99).nullable().optional(),
    badge_text: z.string().trim().max(40).nullable().optional(),
    is_featured: z.boolean().optional(),
  })
  .refine(
    (data) => data.original_price == null || data.original_price > data.price,
    { message: "Preço original deve ser maior que o preço promocional." }
  )

const ProductUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Nome do produto não pode ser vazio.").max(120, "Nome muito longo.").optional(),
    description: z.string().max(1000, "Descrição muito longa.").nullable().optional(),
    price: z.number().positive("Preço deve ser maior que zero.").max(10000, "Preço inválido.").optional(),
    category: CategorySchema.optional(),
    image_url: SafeImageUrlSchema.nullable().optional(),
    available: z.boolean().optional(),
    original_price: z.number().positive("Preço original deve ser maior que zero.").max(10000).nullable().optional(),
    discount_percentage: z.number().int().min(1).max(99).nullable().optional(),
    badge_text: z.string().trim().max(40).nullable().optional(),
    is_featured: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.original_price == null ||
      data.price == null ||
      data.original_price > data.price,
    { message: "Preço original deve ser maior que o preço promocional." }
  )

const AdicionalCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome do adicional é obrigatório.").max(100, "Nome muito longo."),
  price: z.number({ message: "Preço do adicional é obrigatório." }).positive("Preço deve ser maior que zero.").max(1000),
  available: z.boolean().default(true),
  adicional_categoria: AdicionalCategoriaSchema.nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
})

const AdicionalUpdateSchema = z.object({
  name: z.string().trim().min(1, "Nome do adicional não pode ser vazio.").max(100, "Nome muito longo.").optional(),
  price: z.number().positive("Preço deve ser maior que zero.").max(1000).optional(),
  available: z.boolean().optional(),
  adicional_categoria: AdicionalCategoriaSchema.nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
})

function buildProductRow(input: Json, partial: boolean) {
  const raw: Json = {}
  const has = (v: unknown) => v !== undefined

  if (has(input.name)) raw.name = String(input.name).trim()
  if (has(input.description)) raw.description = input.description === null ? null : String(input.description)
  if (has(input.price)) {
    const price = toNumber(input.price)
    if (price === null) throw new ApiError(400, "Preço inválido.")
    raw.price = price
  }
  const image = pick(input, "image", "image_url")
  if (has(image)) raw.image_url = image === null ? null : String(image).trim() || null
  if (has(input.category)) raw.category = String(input.category).trim()
  if (has(input.available)) raw.available = Boolean(input.available)

  const original = pick(input, "originalPrice", "original_price")
  if (has(original)) raw.original_price = toNumber(original)
  const discount = pick(input, "discountPercentage", "discount_percentage")
  if (has(discount)) {
    const d = toNumber(discount)
    raw.discount_percentage = d === null ? null : Math.round(d)
  }
  const badge = pick(input, "badgeText", "badge_text")
  if (has(badge)) raw.badge_text = badge ? String(badge).trim() || null : null
  const featured = pick(input, "isFeatured", "is_featured")
  if (has(featured)) raw.is_featured = Boolean(featured)

  const parsed = partial ? ProductUpdateSchema.safeParse(raw) : ProductCreateSchema.safeParse(raw)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    throw new ApiError(400, firstIssue?.message || "Dados do produto inválidos.")
  }

  const row: Json = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) row[k] = v
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

export async function POST(request: NextRequest) {
  try {
    let body: Json
    try {
      body = await request.json()
    } catch {
      return fail("Corpo da requisição inválido (JSON esperado).", 400)
    }

    const service = getServiceClient()
    await requireAdmin(request, service)

    const action = body.action as string

    if (action === "createProduct") {
      const row = buildProductRow(body.product ?? {}, false)
      const adicionalIds = row.category === "bebida" ? [] : cleanIds(body.adicionalIds)

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

      if (row.category === "bebida") {
        await syncAdicionais(service, productId, [])
      } else if (body.adicionalIds !== undefined) {
        await syncAdicionais(service, productId, cleanIds(body.adicionalIds))
      }
      return ok({ product })
    }

    if (action === "deleteProduct") {
      const productId = String(body.productId ?? "").trim()
      if (!productId) throw new ApiError(400, "productId é obrigatório.")

      const { error: relErr } = await service.from("product_adicionais").delete().eq("product_id", productId)
      if (relErr) throw new ApiError(500, `Erro ao remover vínculos de adicionais: ${relErr.message}`)

      const { error: oiErr } = await service
        .from("order_items")
        .update({ product_id: null })
        .eq("product_id", productId)
      if (oiErr) throw new ApiError(500, `Erro ao desvincular itens de pedidos: ${oiErr.message}`)

      const { data: deleted, error: delErr } = await service
        .from("products")
        .delete()
        .eq("id", productId)
        .select("id")
      if (delErr) throw new ApiError(500, `Erro ao excluir produto: ${delErr.message}`)
      if (!deleted || deleted.length === 0) throw new ApiError(404, "Produto não encontrado.")

      return ok({ deleted: true, productId })
    }

    if (action === "setAdicionais") {
      const productId = String(body.productId ?? "").trim()
      if (!productId) throw new ApiError(400, "productId é obrigatório.")
      await syncAdicionais(service, productId, cleanIds(body.adicionalIds))
      return ok({ productId })
    }

    if (action === "createAdicional") {
      const raw = body.adicional ?? {}
      const parsed = AdicionalCreateSchema.safeParse({
        name: raw.name !== undefined ? String(raw.name) : "",
        price: toNumber(raw.price),
        available: raw.available !== undefined ? Boolean(raw.available) : true,
        adicional_categoria: raw.adicional_categoria || null,
        category: raw.category ? String(raw.category) : null,
      })
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message || "Dados do adicional inválidos.")
      }

      const { data: adicional, error } = await service
        .from("adicionais")
        .insert([parsed.data])
        .select()
        .single()
      if (error || !adicional) throw new ApiError(500, `Erro ao criar adicional: ${error?.message ?? "sem retorno"}`)
      return ok({ adicional }, 201)
    }

    if (action === "updateAdicional") {
      const adicionalId = String(body.adicionalId ?? "").trim()
      if (!adicionalId) throw new ApiError(400, "adicionalId é obrigatório.")

      const raw = body.updates ?? {}
      const candidate: Json = {}
      if (raw.name !== undefined) candidate.name = String(raw.name)
      if (raw.price !== undefined) {
        const p = toNumber(raw.price)
        if (p === null) throw new ApiError(400, "Preço inválido.")
        candidate.price = p
      }
      if (raw.available !== undefined) candidate.available = Boolean(raw.available)
      if (raw.adicional_categoria !== undefined) candidate.adicional_categoria = raw.adicional_categoria || null
      if (raw.category !== undefined) candidate.category = raw.category ? String(raw.category) : null

      const parsed = AdicionalUpdateSchema.safeParse(candidate)
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message || "Dados do adicional inválidos.")
      }

      const { data: adicional, error } = await service
        .from("adicionais")
        .update(parsed.data)
        .eq("id", adicionalId)
        .select()
        .maybeSingle()
      if (error) throw new ApiError(500, `Erro ao atualizar adicional: ${error.message}`)
      if (!adicional) throw new ApiError(404, "Adicional não encontrado.")
      return ok({ adicional })
    }

    if (action === "deleteAdicional") {
      const adicionalId = String(body.adicionalId ?? "").trim()
      if (!adicionalId) throw new ApiError(400, "adicionalId é obrigatório.")

      const { error: relErr } = await service.from("product_adicionais").delete().eq("adicional_id", adicionalId)
      if (relErr) throw new ApiError(500, `Erro ao remover vínculos do adicional: ${relErr.message}`)

      const { data: deleted, error: delErr } = await service
        .from("adicionais")
        .delete()
        .eq("id", adicionalId)
        .select("id")
      if (delErr) throw new ApiError(500, `Erro ao excluir adicional: ${delErr.message}`)
      if (!deleted || deleted.length === 0) throw new ApiError(404, "Adicional não encontrado.")

      return ok({ deleted: true, adicionalId })
    }

    return fail(
      "Ação inválida. Use createProduct, updateProduct, deleteProduct, setAdicionais, createAdicional, updateAdicional ou deleteAdicional.",
      400
    )
  } catch (e: any) {
    if (e instanceof ApiError) return fail(e.message, e.status)
    console.error("[api/admin/products]", e)
    return fail(e?.message || "Erro interno do servidor.", 500)
  }
}
