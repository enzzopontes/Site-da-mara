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
   * Compacta a imagem no cliente ajustando dimensões e qualidade
   */
  async compressImage(
    file: File,
    maxWidth = 1200,
    maxHeight = 1200
  ): Promise<{ base64: string; mimeType: string }> {
    if (typeof window === "undefined") {
      const base64 = await this.fileToBase64(file)
      return { base64, mimeType: file.type || "image/jpeg" }
    }

    try {
      const dataUrl = await this.fileToDataUrl(file)
      return await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          try {
            let { width, height } = img
            if (width > maxWidth || height > maxHeight) {
              if (width / maxWidth > height / maxHeight) {
                height = Math.round((height * maxWidth) / width)
                width = maxWidth
              } else {
                width = Math.round((width * maxHeight) / height)
                height = maxHeight
              }
            }

            const canvas = document.createElement("canvas")
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext("2d")
            if (!ctx) {
              throw new Error("Contexto 2D indisponível")
            }

            let mimeType = (file.type || "image/jpeg").toLowerCase().trim()
            if (mimeType === "image/jpg" || mimeType === "image/pjpeg" || mimeType === "image/jfif") {
              mimeType = "image/jpeg"
            }

            if (mimeType === "image/jpeg") {
              ctx.fillStyle = "#FFFFFF"
              ctx.fillRect(0, 0, width, height)
            }

            ctx.drawImage(img, 0, 0, width, height)

            let quality = 0.82
            let resultDataUrl = canvas.toDataURL(mimeType, quality)
            let base64 = resultDataUrl.split(",")[1] || resultDataUrl

            if (mimeType === "image/png" && base64.length > 700000) {
              mimeType = "image/jpeg"
              ctx.fillStyle = "#FFFFFF"
              ctx.fillRect(0, 0, width, height)
              ctx.drawImage(img, 0, 0, width, height)
              resultDataUrl = canvas.toDataURL("image/jpeg", 0.8)
              base64 = resultDataUrl.split(",")[1] || resultDataUrl
            }

            if (base64.length > 700000) {
              resultDataUrl = canvas.toDataURL(mimeType, 0.65)
              base64 = resultDataUrl.split(",")[1] || resultDataUrl
            }

            resolve({ base64, mimeType })
          } catch (err) {
            reject(err)
          }
        }
        img.onerror = (err) => reject(err)
        img.src = dataUrl
      })
    } catch (error) {
      console.warn("[ImageUploadManager] Compressão falhou, usando fallback:", error)
      const base64 = await this.fileToBase64(file)
      return { base64, mimeType: file.type || "image/jpeg" }
    }
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

      // Normaliza MIME type antes da validação (trata tipo vazio ou extensões conhecidas)
      let detectedMime = (file.type || '').toLowerCase().trim()
      if (!detectedMime) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif') detectedMime = 'image/jpeg'
        else if (ext === 'png') detectedMime = 'image/png'
        else if (ext === 'webp') detectedMime = 'image/webp'
        else if (ext === 'gif') detectedMime = 'image/gif'
      } else if (detectedMime === 'image/jpg' || detectedMime === 'image/pjpeg' || detectedMime === 'image/jfif') {
        detectedMime = 'image/jpeg'
      } else if (detectedMime === 'image/x-png') {
        detectedMime = 'image/png'
      }

      // Compactação inteligente no cliente
      const { base64: base64Data, mimeType: compressedMime } = await this.compressImage(file)
      const effectiveMimeCandidate = compressedMime || detectedMime

      // Validação profunda de assinatura binária (magic bytes) e bloqueio de SVG/scripts
      const validation = validateImagePayload(effectiveMimeCandidate, base64Data)
      if (!validation.isValid) {
        throw new Error(validation.error || "Arquivo de imagem inválido")
      }

      const safeName = sanitizeFileName(file.name)
      const effectiveMime = validation.normalizedMime || effectiveMimeCandidate

      // Cria um ID único
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Salva no banco de dados
      // Garantimos que o objeto de inserção tenha a categoria correta
      const insertData = {
        id,
        name: safeName,
        data: base64Data,
        mime_type: effectiveMime,
        category: category, // Garantir que a categoria passada seja usada
        uploaded_at: new Date().toISOString(),
      };
      
      console.log(`[ImageUploadManager] Enviando para Supabase:`, { ...insertData, data: "BASE64_DATA_HIDDEN" });
      
      const { data, error } = await this.supabase
        .from("uploaded_images")
        .insert(insertData)
        .select("id, name, mime_type, category, uploaded_at")

      if (error) {
        if (
          error.code === '42501' ||
          error.message?.toLowerCase().includes('row-level security') ||
          error.message?.toLowerCase().includes('permission denied')
        ) {
          throw new Error("Permissão negada ao salvar imagem (RLS). Apenas administradores autenticados podem enviar arquivos.")
        }
        if (
          error.message?.includes('uploaded_images_data_max_length') ||
          error.details?.includes('uploaded_images_data_max_length') ||
          (error as any).hint?.includes('uploaded_images_data_max_length')
        ) {
          throw new Error("A imagem excede o limite máximo permitido pelo banco de dados. Tente uma imagem com menor resolução.")
        }
        throw new Error(error.message || "Erro ao salvar imagem no banco de dados.")
      }

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
   * Obtém todas as imagens cadastradas
   */
  async getAllImages(): Promise<UploadedImage[]> {
    try {
      console.log(`[ImageUploadManager] Buscando todas as imagens`)
      const { data, error } = await this.supabase
        .from("uploaded_images")
        .select("*")
        .order("uploaded_at", { ascending: false })

      if (error) {
        console.error(`[ImageUploadManager] Erro ao buscar todas as imagens:`, error)
        throw error
      }

      console.log(`[ImageUploadManager] ${data?.length || 0} imagens encontradas`)
      return (data || []).map((img: any) => ({
        id: img.id,
        name: img.name,
        data: img.data,
        mimeType: img.mime_type,
        uploadedAt: img.uploaded_at,
        category: img.category,
      }))
    } catch (error) {
      console.error("[ImageUploadManager] Error fetching all images:", error)
      return []
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
