import { getSupabase } from "./supabase-fix"

export interface Adicional {
  id: string
  name: string
  price: number
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: "batata" | "bebida" | "macarrao"
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
    price: 25.99,
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
    price: 25.99,
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
    price: 24.99,
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
    price: 24.99,
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
    price: 24.99,
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
    price: 28.99,
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
    price: 25.99,
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
    price: 26.99,
    image: "/products/costela.jpg",
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
    price: 28.99,
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
    price: 26.99,
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
    price: 26.99,
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
    price: 26.99,
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
    price: 26.99,
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
    price: 26.99,
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
    price: 28.99,
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
    price: 5.0,
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
    price: 5.0,
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
    price: 12.0,
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
    price: 12.0,
    image: "/products/coca-cola-2l.jpg",
    category: "bebida",
    available: true,
    adicionais: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

class ProductsManager {
  async getProducts(): Promise<Product[]> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("products")
        .select(`*, product_adicionais ( adicional_id, adicionais (*) )`)
        .order("name", { ascending: true })

      if (error || !data || data.length === 0) return [...DEFAULT_PRODUCTS, ...DEFAULT_BEBIDAS]

      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        price: Number(p.price),
        image: p.image_url || "/products/placeholder.jpg",
        category: p.category,
        available: p.available,
        adicionais: (p.product_adicionais || [])
          .map((pa: any) => pa.adicionais)
          .filter(Boolean)
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price),
          })),
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      }))
    } catch {
      return [...DEFAULT_PRODUCTS, ...DEFAULT_BEBIDAS]
    }
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
    return this.getBebidas()
  }

  async getProductById(id: string) {
    return (await this.getProducts()).find(p => p.id === id)
  }

  async createProduct(product: Omit<Product, "id" | "adicionais" | "createdAt" | "updatedAt">): Promise<Product | null> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("products")
        .insert([{
          name: product.name,
          description: product.description,
          price: product.price,
          image_url: product.image,
          category: product.category,
          available: product.available ?? true
        }])
        .select()
        .single()

      if (error) {
        console.error("Erro ao criar produto:", error.message)
        return null
      }

      return {
        ...data,
        id: data.id,
        image: data.image_url,
        adicionais: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }
    } catch (error) {
      console.error("Erro inesperado ao criar produto:", error)
      return null
    }
  }

  async updateProduct(id: string, updates: Partial<Omit<Product, "id" | "adicionais" | "createdAt" | "updatedAt">> & { available?: boolean }): Promise<boolean> {
    try {
      const supabase = await getSupabase()
      const dataToUpdate: any = {}
      
      if (updates.name !== undefined) dataToUpdate.name = updates.name
      if (updates.description !== undefined) dataToUpdate.description = updates.description
      if (updates.price !== undefined) dataToUpdate.price = updates.price
      if (updates.image !== undefined) dataToUpdate.image_url = updates.image
      if (updates.category !== undefined) dataToUpdate.category = updates.category
      if (updates.available !== undefined) dataToUpdate.available = updates.available

      const { error } = await supabase
        .from("products")
        .update(dataToUpdate)
        .eq("id", id)

      if (error) {
        console.error("Erro ao atualizar produto:", error.message)
        return false
      }

      return true
    } catch (error) {
      console.error("Erro inesperado ao atualizar produto:", error)
      return false
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const supabase = await getSupabase()
      await supabase.from("product_adicionais").delete().eq("product_id", id)
      const { error } = await supabase.from("products").delete().eq("id", id)
      return !error
    } catch {
      return false
    }
  }

  async setProductAdicionais(productId: string, adicionalIds: string[]) {
    try {
      const supabase = await getSupabase()
      await supabase.from("product_adicionais").delete().eq("product_id", productId)
      if (adicionalIds.length) {
        await supabase.from("product_adicionais").insert(
          adicionalIds.map(id => ({ product_id: productId, adicional_id: id }))
        )
      }
      return true
    } catch {
      return false
    }
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
        return { product: fallbackProduct, totalOrders: 35, customerPhotos: [] }
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
        totalOrders = 35
      }
      
      // Buscamos o total de clientes para garantir que pedidos >= clientes
      const totalCustomers = await this.getTotalCustomers()

      return {
        product: topProduct,
        totalOrders: Math.max(totalCustomers + 5, totalOrders), // Garante que pedidos > clientes
        customerPhotos: []
      }
    } catch {
      const products = await this.getProducts()
      const availableProducts = products.filter(p => p.available)
      return {
        product: availableProducts[0] || products[0],
        totalOrders: 35, // Base mínima coerente com 30 clientes
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

  async getRealRankingByCategory(category: string): Promise<string[]> {
    try {
      const supabase = await getSupabase()
      
      const { data, error } = await supabase
        .rpc("get_product_ranking", { p_limit: 100 })
      
      // Filtra apenas produtos que pertencem à categoria solicitada e estão disponíveis
      const products = await this.getProducts()
      const categoryProducts = products.filter(p => p.category === category && p.available)
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
        .sort((a, b) => (countsById[b.id] || 0) - (countsById[a.id] || 0))
        .map(p => p.name)
      
      return sorted
    } catch {
      return []
    }
  }
}

export const productsManager = new ProductsManager()
