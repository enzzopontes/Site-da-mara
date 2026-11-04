import { getSupabaseBrowserClient } from "./supabase/client"
import { validateImagePayload, sanitizeFileName } from "./security-validation"

export interface UploadedImage {
  id: string
  name: string
  data: string // Base64 encoded image data
  mimeType: string
  uploadedAt: string
  category: "product" | "promo" | "general"
}

class ImageUploadManager {
  private get supabase() {
    return getSupabaseBrowserClient()
  }

  /**
   * Converte um arquivo para base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove o prefixo data:image/...;base64, se existir
        const base64 = result.split(',')[1] || result
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Faz upload de uma imagem e retorna a URL para uso no site
   */
  async uploadImage(
    file: File,
    category: "product" | "promo" | "general" = "general"
  ): Promise<{ id: string; url: string; name: string }> {
    try {
      console.log(`[ImageUploadManager] Iniciando upload - Arquivo: ${file.name}, Categoria: ${category}`);
      
      // Validação do arquivo
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("A imagem não pode ser maior que 5MB")
      }

      // Converte para base64
      const base64Data = await this.fileToBase64(file)

      // Validação profunda de assinatura binária (magic bytes) e bloqueio de SVG/scripts
      const validation = validateImagePayload(file.type, base64Data)
      if (!validation.isValid) {
        throw new Error(validation.error || "Arquivo de imagem inválido")
      }

      const safeName = sanitizeFileName(file.name)

      // Cria um ID único
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Salva no banco de dados
      // Garantimos que o objeto de inserção tenha a categoria correta
      const insertData = {
        id,
        name: safeName,
        data: base64Data,
        mime_type: file.type.toLowerCase().trim(),
        category: category, // Garantir que a categoria passada seja usada
        uploaded_at: new Date().toISOString(),
      };
      
      console.log(`[ImageUploadManager] Enviando para Supabase:`, { ...insertData, data: "BASE64_DATA_HIDDEN" });
      
      const { data, error } = await this.supabase
        .from("uploaded_images")
        .insert(insertData)
        .select()

      if (error) throw error

      // Retorna a URL para uso no site
      const url = `/api/images/${id}`

      return {
        id,
        url,
        name: file.name,
      }
    } catch (error) {
      console.error("[ImageUploadManager] Error uploading image:", error)
      throw error
    }
  }

  /**
   * Obtém todas as imagens de uma categoria
   */
  async getImagesByCategory(
    category: "product" | "promo" | "general"
  ): Promise<UploadedImage[]> {
    try {
      console.log(`[ImageUploadManager] Buscando imagens da categoria: ${category}`);
      const { data, error } = await this.supabase
        .from("uploaded_images")
        .select("*")
        .eq("category", category)
        .order("uploaded_at", { ascending: false })

      if (error) {
        console.error(`[ImageUploadManager] Erro ao buscar imagens da categoria ${category}:`, error);
        throw error
      }

      console.log(`[ImageUploadManager] ${data?.length || 0} imagens encontradas para categoria ${category}`);
      return (data || []).map((img: any) => ({
        id: img.id,
        name: img.name,
        data: img.data,
        mimeType: img.mime_type,
        uploadedAt: img.uploaded_at,
        category: img.category,
      }))
    } catch (error) {
      console.error("[ImageUploadManager] Error fetching images:", error)
      return []
    }
  }

  /**
   * Obtém uma imagem específica por ID
   */
  async getImageById(id: string): Promise<UploadedImage | null> {
    try {
      const { data, error } = await this.supabase
        .from("uploaded_images")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      if (!data) return null

      return {
        id: data.id,
        name: data.name,
        data: data.data,
        mimeType: data.mime_type,
        uploadedAt: data.uploaded_at,
        category: data.category,
      }
    } catch (error) {
      console.error("[ImageUploadManager] Error fetching image:", error)
      return null
    }
  }

  /**
   * Deleta uma imagem
   */
  async deleteImage(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("uploaded_images")
        .delete()
        .eq("id", id)

      if (error) throw error

      return true
    } catch (error) {
      console.error("[ImageUploadManager] Error deleting image:", error)
      return false
    }
  }

  /**
   * Gera uma URL de dados para visualização imediata (sem salvar no BD)
   */
  fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

export const imageUploadManager = new ImageUploadManager()
