import { getSupabase } from "./supabase-fix"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"

// Converte "12,50" ou 12.5 em number; vazio vira null.
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/**
 * Chama /api/admin/products. Retorna data em sucesso.
 * Retorna null SOMENTE se a API estiver indisponivel (rede/404) => caller usa fallback.
 * Lanca Error com a mensagem do servidor em qualquer falha de negocio (401/403/400/500).
 */
async function callAdminApi<T = any>(body: Record<string, unknown>): Promise<T | null> {
  let res: Response
  try {
    res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
  } catch {
    return null
  }
  if (res.status === 404) return null

  let json: any = null
  try {
    json = await res.json()
  } catch {
    // corpo nao-JSON
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Falha na API (HTTP ${res.status}).`)
  }
  return json.data as T
}

export interface Adicional {
  id: string
  name: string
  price: number
  adicional_categoria?: string | null
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number | null
  original_price?: number | null
  discountPercentage?: number | null
  discount_percentage?: number | null
  badgeText?: string | null
  badge_text?: string | null
  isFeatured?: boolean
  is_featured?: boolean
  image: string
  category: string
  categoryId?: string | null
  category_id?: string | null
  available: boolean
  adicionais: Adicional[]
  createdAt: Date
  updatedAt: Date
}

export interface TopProductStats {
  product: Product
  totalOrders: number
  customerPhotos: string[] // URLs das fotos dos clientes
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Strogonoff de Alcatra",
    description: "Batata recheada com strogonoff de alcatra, requeijão cremoso, milho e batata palha",
    price: 29.99,
    image: "/products/strogonoff-alcatra.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Strogonoff de Frango",
    description: "Batata recheada com strogonoff de frango, requeijão cremoso, milho e batata palha",
    price: 28.99,
    image: "/products/strogonoff-frango.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "Calabresa Especial",
    description: "Batata recheada com calabresa, molho especial, cebola roxa, requeijão cremoso, milho e batata palha",
    price: 27.99,
    image: "/products/calabresa-especial.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    name: "Pizza",
    description: "Batata com presunto, queijo, mussarela, requeijão cremoso, milho e batata palha",
    price: 27.99,
    image: "/products/pizza.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    name: "Mussarela Supreme",
    description: "Batata recheada com muito queijo mussarela, requeijão cremoso, milho e batata palha",
    price: 27.99,
    image: "/products/mussarela-supreme.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "6",
    name: "Filé ao Alho",
    description: "Batata recheada com filé ao alho no molho especial, requeijão cremoso, milho, cebola roxa e batata palha",
    price: 32.99,
    image: "/products/file-ao-alho.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "7",
    name: "Brócolis com Bacon",
    description: "Batata recheada com molho especial em brócolis, bacon, requeijão, mussarela e batata palha",
    price: 27.99,
    image: "/products/brocolis-com-bacon.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "8",
    name: "Costela",
    description: "Batata recheada com molho especial de costela requeijão cremoso, mussarela, batata palha e pimenta biquinho",
    price: 29.99,
    image: "/products/costela.jpg",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "16",
    name: "Frango Cremoso",
    description: "Frango desfiado, molho especial, requeijão, mussarela, bacon e batata palha",
    price: 28.99,
    image: "https://eucwoxjmjfqylyrqunwk.supabase.co/storage/v1/object/public/Products/uploads/product/1795460349386-eyant0rqb.webp",
    category: "batata",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "9",
    name: "Filé ao Alho",
    description: "Macarrão, molho especial de filé ao alho, queijo ralado e salsa verde",
    price: 32.99,
    image: "/products/macarrao-file-ao-alho.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "10",
    name: "Strogonoff de Frango",
    description: "Macarrão, strogonoff de frango, queijo ralado",
    price: 28.99,
    image: "/products/macarrao-strogonoff-frango.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "11",
    name: "Strogonoff de Alcatra",
    description: "Macarrão, strogonoff de alcatra, queijo ralado",
    price: 29.99,
    image: "/products/macarrao-strogonoff-alcatra.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "12",
    name: "Bolonhesa",
    description: "Macarrão, molho vermelho com carne moída e queijo ralado",
    price: 27.99,
    image: "/products/macarrao-bolonhesa.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "13",
    name: "Brócolis com Bacon",
    description: "Macarrão e molho com brócolis, bacon, requeijão e queijo ralado",
    price: 27.99,
    image: "/products/macarrao-brocolis-bacon.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "14",
    name: "Mussarela Supreme",
    description: "Macarrão, molho especial, muita mussarela e queijo ralado",
    price: 27.99,
    image: "/products/macarrao-mussarela-supreme.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "15",
    name: "Mac & Cheese",
    description: "Macarrão, molho cheddar, bacon e queijo ralado",
    price: 29.99,
    image: "/products/macarrao-mac-cheese.jpg",
    category: "macarrao",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const DEFAULT_BEBIDAS: Product[] = [
  {
    id: "beb-1",
    name: "Coca-Cola 200ml",
    description: "Refrigerante Coca-Cola 200ml gelado",
    price: 3.5,
    image: "/products/coca-cola-200ml.jpg",
    category: "bebida",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "beb-2",
    name: "Coca-Cola Lata 350ml",
    description: "Refrigerante Coca-Cola lata gelada",
    price: 7.0,
    image: "/products/coca-cola-lata.jpg",
    category: "bebida",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "beb-3",
    name: "Coca-Cola Lata Zero 350ml",
    description: "Refrigerante Coca-Cola Zero lata gelada",
    price: 7.0,
    image: "/products/coca-cola-lata-zero.jpg",
    category: "bebida",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "beb-4",
    name: "Fanta 2L",
    description: "Refrigerante Fanta 2 litros gelado",
    price: 15.0,
    image: "/products/fanta-2l.jpg",
    category: "bebida",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "beb-5",
    name: "Coca-Cola 2L",
    description: "Refrigerante Coca-Cola 2 litros gelado",
    price: 15.0,
    image: "/products/coca-cola-2l.jpg",
    category: "bebida",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

class ProductsManager {
  async getProducts(options?: { strict?: boolean }): Promise<Product[]> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("products")
        .select(`*, product_adicionais ( adicional_id, adicionais (*) )`)
        .order("name", { ascending: true })

      if (error) {
        if (options?.strict) throw new Error(error.message)
        return [...DEFAULT_PRODUCTS, ...DEFAULT_BEBIDAS]
      }
      if (!data || data.length === 0) {
        return options?.strict ? [] : [...DEFAULT_PRODUCTS, ...DEFAULT_BEBIDAS]
      }

      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: Number(p.price),
        originalPrice: p.original_price != null ? Number(p.original_price) : null,
        original_price: p.original_price != null ? Number(p.original_price) : null,
        discountPercentage: p.discount_percentage != null ? Number(p.discount_percentage) : null,
        discount_percentage: p.discount_percentage != null ? Number(p.discount_percentage) : null,
        badgeText: p.badge_text || null,
        badge_text: p.badge_text || null,
        isFeatured: Boolean(p.is_featured),
        is_featured: Boolean(p.is_featured),
        image: p.image_url || "/products/placeholder.jpg",
        category: p.category,
        categoryId: p.category_id ?? null,
        category_id: p.category_id ?? null,
        available: p.available,
        adicionais: (p.product_adicionais || [])
          .map((pa: any) => pa.adicionais)
          .filter((a: any) => a && a.available !== false)
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price),
            adicional_categoria: a.adicional_categoria ?? null,
          })),
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      }))
    } catch (err) {
      if (options?.strict) throw err
      return [...DEFAULT_PRODUCTS, ...DEFAULT_BEBIDAS]
    }
  }

  async getProductsByCategory(
    slug: string,
    preloadedProducts?: Product[],
    includeInactive = false,
  ): Promise<Product[]> {
    if (!slug || !slug.trim()) return []
    const products = preloadedProducts ?? (await this.getProducts())
    const normalizedTarget = normalizeLegacyCategorySlug(slug)
    return products.filter((p) => {
      if (!includeInactive && p.available !== true) return false
      if (p.category_id && p.category_id === slug) return true
      if (p.categoryId && p.categoryId === slug) return true
      return normalizeLegacyCategorySlug(p.category) === normalizedTarget
    })
  }

  async getBatatas(includeInactive = false) {
    const products = await this.getProducts()
    return products.filter(p => p.category === "batata" && (includeInactive || p.available === true))
  }

  async getMacarrao(includeInactive = false) {
    const products = await this.getProducts()
    return products.filter(p => p.category === "macarrao" && (includeInactive || p.available === true))
  }

  async getBebidas(includeInactive = false) {
    const products = await this.getProducts()
    return products.filter(p => p.category === "bebida" && (includeInactive || p.available === true))
  }

  // Métodos de ordenação por popularidade para o Cardápio
  async getBatatasSortedByPopularity() {
    const products = await this.getBatatas()
    const ranking = await this.getRealRankingByCategory("batata")
    
    return [...products].sort((a, b) => {
      const indexA = ranking.indexOf(a.name)
      const indexB = ranking.indexOf(b.name)
      
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }

  async getMacarraoSortedByPopularity() {
    const products = await this.getMacarrao()
    const ranking = await this.getRealRankingByCategory("macarrao")
    
    return [...products].sort((a, b) => {
      const indexA = ranking.indexOf(a.name)
      const indexB = ranking.indexOf(b.name)
      
      if (indexA === -1 && indexB === -1) return 0
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }

  async getBebidasSortedByPopularity() {
    const products = await this.getBebidas()
    const ranking = await this.getRealRankingByCategory("bebida")

    return [...products].sort((a, b) => {
      const indexA = ranking.indexOf(a.name)
      const indexB = ranking.indexOf(b.name)

      if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name, "pt-BR")
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      if (indexA !== indexB) return indexA - indexB
      return a.name.localeCompare(b.name, "pt-BR")
    })
  }

  async getProductById(id: string) {
    return (await this.getProducts()).find(p => p.id === id)
  }

  async createProduct(
    product: Omit<Product, "id" | "adicionais" | "createdAt" | "updatedAt">,
    adicionalIds: string[] = [],
  ): Promise<Product> {
    const payload = {
      name: product.name,
      description: product.description,
      price: toNumber(product.price),
      image: product.image,
      category: product.category,
      category_id: product.category_id ?? product.categoryId ?? undefined,
      available: product.available ?? true,
      originalPrice: toNumber(product.originalPrice ?? (product as any).original_price),
      discountPercentage: toNumber(product.discountPercentage ?? (product as any).discount_percentage),
      badgeText: product.badgeText ?? (product as any).badge_text ?? null,
      isFeatured: product.isFeatured ?? (product as any).is_featured ?? false,
    }

    const res = await callAdminApi<{ product: any; warning?: string }>({
      action: "createProduct",
      product: payload,
      adicionalIds,
    })

    let data: any
    if (res) {
      data = res.product
      if (res.warning) console.warn("createProduct:", res.warning)
    } else {
      // Fallback (API indisponivel): insert direto, sujeito a RLS
      const supabase = await getSupabase()
      const insertRow: Record<string, unknown> = {
        name: payload.name,
        description: payload.description,
        price: payload.price,
        image_url: payload.image,
        category: payload.category,
        available: payload.available,
        original_price: payload.originalPrice,
        discount_percentage: payload.discountPercentage,
        badge_text: payload.badgeText,
        is_featured: payload.isFeatured,
      }
      if (payload.category_id !== undefined) insertRow.category_id = payload.category_id

      const { data: row, error } = await supabase
        .from("products")
        .insert([insertRow])
        .select()
        .single()
      if (error) throw new Error(`Erro ao criar produto: ${error.message}`)
      data = row
      if (adicionalIds.length) await this.setProductAdicionais(String(data.id), adicionalIds)
    }

    return {
      ...data,
      id: data.id,
      image: data.image_url,
      categoryId: data.category_id ?? null,
      category_id: data.category_id ?? null,
      adicionais: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  /** Atualiza produto. Se adicionalIds for passado, sincroniza vinculos na mesma chamada. */
  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, "id" | "adicionais" | "createdAt" | "updatedAt">> & { available?: boolean },
    adicionalIds?: string[],
  ): Promise<boolean> {
    const u: any = updates
    const payload: Record<string, unknown> = {}
    if (u.name !== undefined) payload.name = u.name
    if (u.description !== undefined) payload.description = u.description
    if (u.price !== undefined) payload.price = toNumber(u.price)
    if (u.image !== undefined) payload.image = u.image
    if (u.category !== undefined) payload.category = u.category
    if (u.category_id !== undefined || u.categoryId !== undefined)
      payload.category_id = u.category_id ?? u.categoryId ?? undefined
    if (u.available !== undefined) payload.available = u.available
    if (u.originalPrice !== undefined || u.original_price !== undefined)
      payload.originalPrice = toNumber(u.originalPrice ?? u.original_price)
    if (u.discountPercentage !== undefined || u.discount_percentage !== undefined)
      payload.discountPercentage = toNumber(u.discountPercentage ?? u.discount_percentage)
    if (u.badgeText !== undefined || u.badge_text !== undefined) payload.badgeText = u.badgeText ?? u.badge_text ?? null
    if (u.isFeatured !== undefined || u.is_featured !== undefined)
      payload.isFeatured = u.isFeatured ?? u.is_featured ?? false

    const res = await callAdminApi({
      action: "updateProduct",
      productId: id,
      updates: payload,
      ...(adicionalIds ? { adicionalIds } : {}),
    })
    if (res) return true

    // Fallback (API indisponivel): update direto, sujeito a RLS
    const supabase = await getSupabase()
    const row: Record<string, unknown> = {}
    if (payload.name !== undefined) row.name = payload.name
    if (payload.description !== undefined) row.description = payload.description
    if (payload.price !== undefined) row.price = payload.price
    if (payload.image !== undefined) row.image_url = payload.image
    if (payload.category !== undefined) row.category = payload.category
    if (payload.category_id !== undefined) row.category_id = payload.category_id
    if (payload.available !== undefined) row.available = payload.available
    if (payload.originalPrice !== undefined) row.original_price = payload.originalPrice
    if (payload.discountPercentage !== undefined) row.discount_percentage = payload.discountPercentage
    if (payload.badgeText !== undefined) row.badge_text = payload.badgeText
    if (payload.isFeatured !== undefined) row.is_featured = payload.isFeatured
    if (Object.keys(row).length) {
      const { error } = await supabase.from("products").update(row).eq("id", id)
      if (error) throw new Error(`Erro ao atualizar produto: ${error.message}`)
    }
    if (adicionalIds) await this.setProductAdicionais(id, adicionalIds)
    return true
  }

  async deleteProduct(id: string): Promise<boolean> {
    const res = await callAdminApi<{ deleted: boolean }>({ action: "deleteProduct", productId: id })
    if (res?.deleted) return true

    // Fallback (API indisponivel): delete direto sujeito a RLS (trigger no banco desvincula order_items)
    const supabase = await getSupabase()
    const { error: relErr } = await supabase.from("product_adicionais").delete().eq("product_id", id)
    if (relErr) throw new Error(`Erro ao remover vínculos do produto: ${relErr.message}`)
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) throw new Error(`Erro ao excluir produto: ${error.message}`)
    return true
  }

  async setProductAdicionais(productId: string, adicionalIds: string[]): Promise<boolean> {
    const res = await callAdminApi({ action: "setAdicionais", productId, adicionalIds })
    if (res) return true

    // Fallback (API indisponivel): direto, sujeito a RLS
    const supabase = await getSupabase()
    const { error: delErr } = await supabase.from("product_adicionais").delete().eq("product_id", productId)
    if (delErr) throw new Error(`Erro ao limpar adicionais: ${delErr.message}`)
    if (adicionalIds.length) {
      const { error } = await supabase
        .from("product_adicionais")
        .insert(adicionalIds.map((id) => ({ product_id: productId, adicional_id: id })))
      if (error) throw new Error(`Erro ao vincular adicionais: ${error.message}`)
    }
    return true
  }

  async getMostRequestedProduct(): Promise<TopProductStats> {
    try {
      const supabase = await getSupabase()
      
      const { data, error } = await supabase
        .rpc("get_product_ranking", { p_limit: 50 })
      
      const products = await this.getProducts()
      const availableProducts = products.filter(p => p.available)

      if (error || !data || data.length === 0) {
        const fallbackProduct = availableProducts[0] || products[0]
        return { product: fallbackProduct, totalOrders: 0, customerPhotos: [] }
      }

      let topProduct: Product | undefined
      let totalOrders = 0

      for (const item of data) {
        const p = availableProducts.find(prod => prod.id === item.product_id)
        if (p) {
          topProduct = p
          totalOrders = Number(item.total_quantity || 0)
          break
        }
      }

      if (!topProduct) {
        topProduct = availableProducts[0] || products[0]
        totalOrders = 0
      }

      return {
        product: topProduct,
        totalOrders,
        customerPhotos: []
      }
    } catch {
      const products = await this.getProducts()
      const availableProducts = products.filter(p => p.available)
      return {
        product: availableProducts[0] || products[0],
        totalOrders: 0,
        customerPhotos: []
      }
    }
  }

  async getTopProducts(): Promise<TopProductStats[]> {
    const batatas = await this.getRealRankingByCategory("batata")
    const macarrao = await this.getRealRankingByCategory("macarrao")
    const products = await this.getProducts()
    
    const top3Names = [...batatas.slice(0, 3), ...macarrao.slice(0, 3)]
    
    return top3Names.map(name => {
      const p = products.find(prod => prod.name === name) || products[0]
      return {
        product: p,
        totalOrders: 0,
        customerPhotos: []
      }
    })
  }

  async getTotalCustomers(): Promise<number> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase.rpc("get_total_customers")
      if (error || data === null || data === undefined || typeof Number(data) !== "number" || isNaN(Number(data))) {
        return 30
      }
      return Number(data)
    } catch {
      return 30
    }
  }

  async getGlobalRankingNames(limit = 50, preloadedProducts?: Product[]): Promise<string[]> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase.rpc("get_product_ranking", { p_limit: limit })
      if (error || !Array.isArray(data) || data.length === 0) return []

      const directNames = data
        .map((item: any) => item.product_name ?? item.name)
        .filter((n: unknown): n is string => typeof n === "string" && n.trim().length > 0)
      if (directNames.length > 0) return directNames

      const products = preloadedProducts ?? (await this.getProducts())
      const byId = new Map(products.map((p) => [p.id, p.name]))
      return data
        .map((item: any) => (item.product_id ? byId.get(String(item.product_id)) : undefined))
        .filter((n: string | undefined): n is string => Boolean(n))
    } catch {
      return []
    }
  }

  async getRealRankingByCategory(category: string, preloadedProducts?: Product[]): Promise<string[]> {
    try {
      const supabase = await getSupabase()
      
      const { data, error } = await supabase
        .rpc("get_product_ranking", { p_limit: 100 })
      
      // Filtra apenas produtos que pertencem à categoria solicitada e estão disponíveis
      const products = preloadedProducts ?? (await this.getProducts())
      const normalizedTarget = normalizeLegacyCategorySlug(category)
      const categoryProducts = products.filter((p) => {
        if (!p.available) return false
        if (p.category_id && p.category_id === category) return true
        if (p.categoryId && p.categoryId === category) return true
        return normalizeLegacyCategorySlug(p.category) === normalizedTarget
      })
      const categoryProductNames = categoryProducts.map(p => p.name)

      if (error || !data || data.length === 0) {
        return categoryProductNames
      }

      const countsById: Record<string, number> = {}
      data.forEach((item: any) => {
        if (item.product_id) {
          countsById[item.product_id] = Number(item.total_quantity || 0)
        }
      })

      // Ordena por quantidade vendida
      const sorted = [...categoryProducts]
        .sort((a, b) => {
          const diff = (countsById[b.id] || 0) - (countsById[a.id] || 0)
          return diff !== 0 ? diff : a.name.localeCompare(b.name, "pt-BR")
        })
        .map(p => p.name)
      
      return sorted
    } catch {
      return []
    }
  }
}

export const productsManager = new ProductsManager()

