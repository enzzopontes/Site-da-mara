import { getSupabaseBrowserClient } from "./supabase/client"
import { validateImagePayload, sanitizeFileName } from "./security-validation"

export const STORAGE_BUCKET = "Products"

export interface UploadedImage {
  id: string
  name: string
  data: string // Base64 encoded image data
  mimeType: string
  uploadedAt: string
  category: "product" | "promo" | "general"
  url?: string
  source?: "storage" | "database"
}

export function getPublicUrl(image: UploadedImage): string {
  return image.url || `/api/images/${image.id}`
}

class ImageUploadManager {
  private get supabase() {
    return getSupabaseBrowserClient()
  }

  getPublicUrl(image: UploadedImage): string {
    return getPublicUrl(image)
  }

  private mimeToExt(mimeType: string): string {
    const normalized = (mimeType || "").toLowerCase().trim()
    if (normalized === "image/webp") return "webp"
    if (normalized === "image/png") return "png"
    if (normalized === "image/gif") return "gif"
    return "jpg"
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mimeType })
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
    maxWidth = 1000,
    maxHeight = 1000
  ): Promise<{ base64: string; mimeType: string; blob: Blob; ext: string }> {
    if (typeof window === "undefined") {
      const base64 = await this.fileToBase64(file)
      const mimeType = file.type || "image/jpeg"
      return { base64, mimeType, blob: file, ext: this.mimeToExt(mimeType) }
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

            const MAX_BASE64_BYTES = 2_750_000
            let mimeType = (file.type || "image/jpeg").toLowerCase().trim()
            if (mimeType === "image/jpg" || mimeType === "image/pjpeg" || mimeType === "image/jfif") {
              mimeType = "image/jpeg"
            }

            const renderDataUrl = (w: number, h: number, mime: string, q: number): string => {
              canvas.width = w
              canvas.height = h
              if (mime === "image/jpeg") {
                ctx.fillStyle = "#FFFFFF"
                ctx.fillRect(0, 0, w, h)
              } else {
                ctx.clearRect(0, 0, w, h)
              }
              ctx.drawImage(img, 0, 0, w, h)
              return canvas.toDataURL(mime, q)
            }

            const renderAt = (w: number, h: number, mime: string, q: number): string => {
              const url = renderDataUrl(w, h, mime, q)
              return url.split(",")[1] || url
            }

            let base64: string
            const webpDataUrl = renderDataUrl(width, height, "image/webp", 0.82)
            if (webpDataUrl.startsWith("data:image/webp")) {
              mimeType = "image/webp"
              base64 = webpDataUrl.split(",")[1] || webpDataUrl
            } else {
              if (mimeType !== "image/png") {
                mimeType = "image/jpeg"
              }
              base64 = renderAt(width, height, mimeType, 0.82)
            }

            if (mimeType === "image/png" && base64.length > 700_000) {
              mimeType = "image/jpeg"
              base64 = renderAt(width, height, mimeType, 0.8)
            }

            const qualitySteps = [0.72, 0.65, 0.55, 0.45, 0.35]
            for (const q of qualitySteps) {
              if (base64.length <= 700_000) break
              base64 = renderAt(width, height, mimeType, q)
            }

            // BUG-08 FIX: Redução iterativa de dimensões até respeitar estritamente o limite de 2.750.000 bytes do banco
            let scale = 0.85
            while (base64.length > MAX_BASE64_BYTES && scale >= 0.25) {
              if (mimeType !== "image/webp") {
                mimeType = "image/jpeg"
              }
              const nextW = Math.max(160, Math.round(width * scale))
              const nextH = Math.max(160, Math.round(height * scale))
              base64 = renderAt(nextW, nextH, mimeType, 0.4)
              scale -= 0.15
            }

            if (base64.length > MAX_BASE64_BYTES) {
              reject(new Error("A imagem é complexa demais e excede o limite de 2,75 MB após compressão."))
              return
            }

            const blob = this.base64ToBlob(base64, mimeType)
            const ext = this.mimeToExt(mimeType)
            resolve({ base64, mimeType, blob, ext })
          } catch (err) {
            reject(err)
          }
        }
        img.onerror = (err) => reject(err)
        img.src = dataUrl
      })
    } catch (error: any) {
      throw new Error(error?.message || "Não foi possível decodificar ou converter a imagem.")
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
        else if (ext === 'avif') detectedMime = 'image/avif'
        else if (ext === 'bmp') detectedMime = 'image/bmp'
      } else if (detectedMime === 'image/jpg' || detectedMime === 'image/pjpeg' || detectedMime === 'image/jfif') {
        detectedMime = 'image/jpeg'
      } else if (detectedMime === 'image/x-png') {
        detectedMime = 'image/png'
      } else if (detectedMime === 'image/x-ms-bmp') {
        detectedMime = 'image/bmp'
      }

      // Compactação inteligente no cliente
      const compressed = await this.compressImage(file)
      const { base64: base64Data, mimeType: compressedMime } = compressed
      if (base64Data.length > 2_750_000) {
        throw new Error("A imagem comprimida excede o limite de 2,75 MB do banco. Escolha uma imagem menor.")
      }
      const effectiveMimeCandidate = compressedMime || detectedMime

      // Validação profunda de assinatura binária (magic bytes) e bloqueio de SVG/scripts
      const validation = validateImagePayload(effectiveMimeCandidate, base64Data)
      if (!validation.isValid) {
        throw new Error(validation.error || "Arquivo de imagem inválido")
      }

      const safeName = sanitizeFileName(file.name)
      const effectiveMime = validation.normalizedMime || effectiveMimeCandidate
      const ext = this.mimeToExt(effectiveMime) || compressed.ext
      const randomSuffix = Math.random().toString(36).substr(2, 9)
      const storagePath = `uploads/${category}/${Date.now()}-${randomSuffix}.${ext}`

      try {
        const { error: storageError } = await this.supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, compressed.blob, {
            contentType: effectiveMime,
            cacheControl: "31536000",
            upsert: false,
          })

        if (!storageError) {
          const { data: publicUrlData } = this.supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(storagePath)

          return {
            id: storagePath,
            url: publicUrlData.publicUrl,
            name: file.name,
          }
        }

        console.warn(
          "[ImageUploadManager] Falha no upload para Supabase Storage, usando fallback no banco:",
          storageError
        )
      } catch (storageErr) {
        console.warn(
          "[ImageUploadManager] Exceção no upload para Supabase Storage, usando fallback no banco:",
          storageErr
        )
      }

      // Cria um ID único
      const id = `${Date.now()}-${randomSuffix}`

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

  private inferMimeFromName(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase()
    if (ext === "webp") return "image/webp"
    if (ext === "png") return "image/png"
    if (ext === "gif") return "image/gif"
    return "image/jpeg"
  }

  private async listStorageImages(): Promise<UploadedImage[]> {
    try {
      const folders = ["", "uploads/product", "uploads/promo", "uploads/general"] as const
      const results = await Promise.all(
        folders.map(async (folder) => {
          try {
            const { data, error } = await this.supabase.storage
              .from(STORAGE_BUCKET)
              .list(folder, {
                limit: 500,
                sortBy: { column: "created_at", order: "desc" },
              })

            if (error || !data) {
              if (error) {
                console.warn(`[ImageUploadManager] Erro ao listar pasta '${folder}' no Storage:`, error)
              }
              return [] as UploadedImage[]
            }

            const category: UploadedImage["category"] =
              folder === "uploads/promo"
                ? "promo"
                : folder === "uploads/general"
                ? "general"
                : "product"

            return data
              .filter(
                (item: any) =>
                  Boolean(item?.id) &&
                  Boolean(item?.name) &&
                  item.name !== ".emptyFolderPlaceholder" &&
                  !item.name.startsWith(".")
              )
              .map((item: any): UploadedImage => {
                const fullPath = folder ? `${folder}/${item.name}` : item.name
                const { data: publicUrlData } = this.supabase.storage
                  .from(STORAGE_BUCKET)
                  .getPublicUrl(fullPath)
                const mimeType =
                  item.metadata?.mimetype || this.inferMimeFromName(item.name)

                return {
                  id: fullPath,
                  name: item.name,
                  data: "",
                  mimeType,
                  uploadedAt:
                    item.created_at || item.updated_at || new Date(0).toISOString(),
                  category,
                  url: publicUrlData.publicUrl,
                  source: "storage",
                }
              })
          } catch (folderError) {
            console.warn(`[ImageUploadManager] Exceção ao listar pasta '${folder}' no Storage:`, folderError)
            return [] as UploadedImage[]
          }
        })
      )

      return results.flat()
    } catch (error) {
      console.warn("[ImageUploadManager] Error listing storage images:", error)
      return []
    }
  }

  /**
   * Obtém todas as imagens cadastradas
   */
  async getAllImages(): Promise<UploadedImage[]> {
    try {
      console.log(`[ImageUploadManager] Buscando todas as imagens`)
      const [storageImages, dbResult] = await Promise.all([
        this.listStorageImages(),
        this.supabase
          .from("uploaded_images")
          .select("*")
          .order("uploaded_at", { ascending: false }),
      ])

      const { data, error } = dbResult

      if (error) {
        console.error(`[ImageUploadManager] Erro ao buscar todas as imagens:`, error)
        throw error
      }

      const dbImages: UploadedImage[] = (data || []).map((img: any) => ({
        id: img.id,
        name: img.name,
        data: img.data,
        mimeType: img.mime_type,
        uploadedAt: img.uploaded_at,
        category: img.category,
        url: `/api/images/${img.id}`,
        source: "database",
      }))

      const combined = [...storageImages, ...dbImages].sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )

      console.log(`[ImageUploadManager] ${combined.length} imagens encontradas`)
      return combined
    } catch (error) {
      console.error("[ImageUploadManager] Error fetching all images:", error)
      return []
    }
  }

  /**
   * Lista todas as imagens cadastradas, propagando erros para o chamador
   */
  async listAllImages(): Promise<UploadedImage[]> {
    const [storageImages, dbResult] = await Promise.all([
      this.listStorageImages(),
      this.supabase
        .from("uploaded_images")
        .select("*")
        .order("uploaded_at", { ascending: false }),
    ])

    const { data, error } = dbResult

    if (error) {
      console.error("[ImageUploadManager] Error listing all images:", error)
      throw new Error(error.message || "Erro ao carregar imagens do banco.")
    }

    const dbImages: UploadedImage[] = (data || []).map(
      (img: {
        id: string
        name: string
        data: string
        mime_type: string
        uploaded_at: string
        category: UploadedImage["category"]
      }) => ({
        id: img.id,
        name: img.name,
        data: img.data,
        mimeType: img.mime_type,
        uploadedAt: img.uploaded_at,
        category: img.category,
        url: `/api/images/${img.id}`,
        source: "database",
      })
    )

    return [...storageImages, ...dbImages].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
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
      const isStoragePath = id.includes("/") || /\.(webp|jpe?g|png|gif)$/i.test(id)
      if (isStoragePath) {
        const { error } = await this.supabase.storage
          .from(STORAGE_BUCKET)
          .remove([id])

        if (error) throw error
        return true
      }

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
