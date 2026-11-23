import { getSupabaseBrowserClient } from "./supabase/client"
import { validateImagePayload, sanitizeFileName } from "./security-validation"

export const STORAGE_BUCKET = "Products"

export const IMAGE_CATEGORIES = ["product", "promo", "brand", "general"] as const
export type ImageCategory = (typeof IMAGE_CATEGORIES)[number]

export interface WebpConversionProgress {
  current: number
  total: number
  currentName: string
  converted: number
  failed: number
}

export interface WebpConversionResult {
  total: number
  converted: number
  failed: number
  updatedRefs: number
  errors: Array<{ id: string; name: string; error: string }>
}

export interface UploadedImage {
  id: string
  name: string
  data: string // Base64 encoded image data
  mimeType: string
  uploadedAt: string
  category: ImageCategory
  url?: string
  source?: "storage" | "database"
}

export function getPublicUrl(image: UploadedImage): string {
  return image.url || `/api/images/${image.id}`
}

class ImageUploadManager {
  private isConvertingWebp = false

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
    category: ImageCategory = "general"
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
          try {
            const { error: metaError } = await this.supabase
              .from("media_metadata")
              .upsert(
                {
                  storage_path: storagePath,
                  category,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "storage_path" }
              )
            if (metaError) {
              console.warn(
                "[ImageUploadManager] Falha ao salvar categoria em media_metadata:",
                metaError
              )
            }
          } catch (metaErr) {
            console.warn(
              "[ImageUploadManager] Exceção ao salvar categoria em media_metadata:",
              metaErr
            )
          }

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
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
    if (ext === "gif") return "image/gif"
    return "image/jpeg"
  }

  private resolveStorageMimeType(metadataMime: unknown, fileName: string): string {
    if (typeof metadataMime === "string") {
      const normalized = metadataMime.toLowerCase().trim()
      if (normalized === "image/webp") return "image/webp"
      if (normalized === "image/png" || normalized === "image/x-png") return "image/png"
      if (
        normalized === "image/jpeg" ||
        normalized === "image/jpg" ||
        normalized === "image/pjpeg"
      ) {
        return "image/jpeg"
      }
      if (normalized === "image/gif") return "image/gif"
    }
    return this.inferMimeFromName(fileName)
  }

  private isValidCategory(value: unknown): value is ImageCategory {
    return (
      typeof value === "string" &&
      (IMAGE_CATEGORIES as readonly string[]).includes(value)
    )
  }

  private isStorageImage(image: Pick<UploadedImage, "id" | "source">): boolean {
    if (image.source === "storage") return true
    if (image.source === "database") return false
    return image.id.includes("/") || /\.(webp|jpe?g|png|gif)$/i.test(image.id)
  }

  private supportsWebpCanvas(): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return false
    }
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 1
      canvas.height = 1
      return canvas.toDataURL("image/webp").startsWith("data:image/webp")
    } catch {
      return false
    }
  }

  private async fetchMediaMetadataMap(): Promise<Map<string, ImageCategory>> {
    const map = new Map<string, ImageCategory>()
    try {
      const { data, error } = await this.supabase
        .from("media_metadata")
        .select("storage_path, category")

      if (error) {
        console.warn("[ImageUploadManager] Erro ao consultar media_metadata:", error)
        return map
      }

      for (const row of data || []) {
        if (
          row &&
          typeof row.storage_path === "string" &&
          this.isValidCategory(row.category)
        ) {
          map.set(row.storage_path, row.category)
        }
      }
    } catch (error) {
      console.warn("[ImageUploadManager] Exceção ao consultar media_metadata:", error)
    }
    return map
  }

  private async listStorageImages(): Promise<UploadedImage[]> {
    try {
      const folders = [
        "",
        "uploads/product",
        "uploads/promo",
        "uploads/brand",
        "uploads/general",
      ] as const
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

            const category: ImageCategory =
              folder === "uploads/brand"
                ? "brand"
                : folder === "uploads/promo"
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
                const mimeType = this.resolveStorageMimeType(
                  item.metadata?.mimetype,
                  item.name
                )

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

  private isMissingTableError(error: { code?: string | null } | null): boolean {
    return error?.code === "42P01" || error?.code === "PGRST205"
  }

  /**
   * Obtém todas as imagens cadastradas
   */
  async getAllImages(): Promise<UploadedImage[]> {
    try {
      console.log(`[ImageUploadManager] Buscando todas as imagens`)
      const [storageImages, dbResult, metadataMap] = await Promise.all([
        this.listStorageImages(),
        this.supabase
          .from("uploaded_images")
          .select("*")
          .order("uploaded_at", { ascending: false }),
        this.fetchMediaMetadataMap(),
      ])

      const { data, error } = dbResult

      if (error) {
        if (this.isMissingTableError(error)) {
          console.warn(
            "[ImageUploadManager] Tabela uploaded_images indisponível; retornando apenas imagens do Storage:",
            error
          )
        } else {
          console.error(`[ImageUploadManager] Erro ao buscar todas as imagens:`, error)
          throw error
        }
      }

      const mergedStorageImages: UploadedImage[] = storageImages.map((img) => {
        const overrideCategory = metadataMap.get(img.id)
        return overrideCategory ? { ...img, category: overrideCategory } : img
      })

      const dbImages: UploadedImage[] = (error ? [] : data || []).map((img: any) => ({
        id: img.id,
        name: img.name,
        data: img.data,
        mimeType: img.mime_type,
        uploadedAt: img.uploaded_at,
        category: img.category,
        url: `/api/images/${img.id}`,
        source: "database",
      }))

      const combined = [...mergedStorageImages, ...dbImages].sort(
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
    const [storageImages, dbResult, metadataMap] = await Promise.all([
      this.listStorageImages(),
      this.supabase
        .from("uploaded_images")
        .select("*")
        .order("uploaded_at", { ascending: false }),
      this.fetchMediaMetadataMap(),
    ])

    const { data, error } = dbResult

    if (error) {
      if (this.isMissingTableError(error)) {
        console.warn(
          "[ImageUploadManager] Tabela uploaded_images indisponível; retornando apenas imagens do Storage:",
          error
        )
      } else {
        console.error("[ImageUploadManager] Error listing all images:", error)
        throw new Error(error.message || "Erro ao carregar imagens do banco.")
      }
    }

    const mergedStorageImages: UploadedImage[] = storageImages.map((img) => {
      const overrideCategory = metadataMap.get(img.id)
      return overrideCategory ? { ...img, category: overrideCategory } : img
    })

    const dbImages: UploadedImage[] = (error ? [] : data || []).map(
      (img: {
        id: string
        name: string
        data: string
        mime_type: string
        uploaded_at: string
        category: ImageCategory
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

    return [...mergedStorageImages, ...dbImages].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }

  /**
   * Obtém todas as imagens de uma categoria
   */
  async getImagesByCategory(
    category: ImageCategory
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

        try {
          const { error: metaError } = await this.supabase
            .from("media_metadata")
            .delete()
            .eq("storage_path", id)
          if (metaError) {
            console.warn(
              "[ImageUploadManager] Falha ao remover media_metadata após exclusão no Storage:",
              metaError
            )
          }
        } catch (metaErr) {
          console.warn(
            "[ImageUploadManager] Exceção ao remover media_metadata após exclusão no Storage:",
            metaErr
          )
        }

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
   * Atualiza a categoria de uma imagem sem mover o arquivo nem alterar sua URL
   */
  async updateImageCategory(
    image: UploadedImage,
    newCategory: ImageCategory
  ): Promise<void> {
    if (!this.isValidCategory(newCategory)) {
      throw new Error(`Categoria de imagem inválida: "${String(newCategory)}".`)
    }

    if (this.isStorageImage(image)) {
      const { data, error } = await this.supabase
        .from("media_metadata")
        .upsert(
          {
            storage_path: image.id,
            category: newCategory,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "storage_path" }
        )
        .select("storage_path")

      if (error) {
        throw new Error(
          error.message || "Erro ao atualizar categoria da imagem no Storage."
        )
      }
      if (!data || data.length === 0) {
        throw new Error(
          "Nenhuma linha atualizada em media_metadata (permissão RLS ou registro ausente)."
        )
      }
      return
    }

    const { data, error } = await this.supabase
      .from("uploaded_images")
      .update({ category: newCategory })
      .eq("id", image.id)
      .select("id")

    if (error) {
      throw new Error(
        error.message || "Erro ao atualizar categoria da imagem no banco."
      )
    }
    if (!data || data.length === 0) {
      throw new Error(
        "Nenhuma imagem atualizada em uploaded_images (permissão RLS ou registro ausente)."
      )
    }
  }

  private async convertBlobToWebp(
    blob: Blob,
    maxBase64Bytes?: number
  ): Promise<{ base64: string; blob: Blob }> {
    const objectUrl = URL.createObjectURL(blob)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () =>
          reject(new Error("Falha ao decodificar imagem para conversão WebP."))
        el.src = objectUrl
      })

      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (!width || !height) {
        throw new Error("Dimensões inválidas ao decodificar imagem.")
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Contexto 2D indisponível")
      }

      const renderWebp = (w: number, h: number, quality: number): string => {
        canvas.width = w
        canvas.height = h
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL("image/webp", quality)
        if (!dataUrl.startsWith("data:image/webp")) {
          throw new Error("Navegador não suportou exportação em image/webp.")
        }
        return dataUrl.split(",")[1] || dataUrl
      }

      let base64 = renderWebp(width, height, 0.82)

      if (typeof maxBase64Bytes === "number") {
        const qualitySteps = [0.72, 0.65, 0.55, 0.45, 0.35]
        for (const q of qualitySteps) {
          if (base64.length <= maxBase64Bytes) break
          base64 = renderWebp(width, height, q)
        }

        let scale = 0.85
        while (base64.length > maxBase64Bytes && scale >= 0.25) {
          const nextW = Math.max(160, Math.round(width * scale))
          const nextH = Math.max(160, Math.round(height * scale))
          base64 = renderWebp(nextW, nextH, 0.4)
          scale -= 0.15
        }

        if (base64.length > maxBase64Bytes) {
          throw new Error(
            "A imagem convertida para WebP excede o limite de 2,75 MB do banco."
          )
        }
      }

      return {
        base64,
        blob: this.base64ToBlob(base64, "image/webp"),
      }
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  /**
   * Converte em lote imagens legadas (JPG/PNG) para WebP atualizando referências
   */
  async convertLegacyImagesToWebp(
    onProgress?: (progress: WebpConversionProgress) => void
  ): Promise<WebpConversionResult> {
    if (this.isConvertingWebp) {
      throw new Error("Uma conversão de imagens para WebP já está em andamento.")
    }

    if (!this.supportsWebpCanvas()) {
      throw new Error(
        "Conversão para WebP requer um navegador com suporte a WebP no Canvas."
      )
    }

    this.isConvertingWebp = true
    try {
      const allImages = await this.listAllImages()
      const seenKeys = new Set<string>()
      const seenUrls = new Set<string>()
      const legacyImages = allImages.filter((img) => {
        const mime = (img.mimeType || "").toLowerCase().trim()
        if (mime === "image/webp") return false
        const isLegacyMime =
          mime === "image/jpeg" ||
          mime === "image/jpg" ||
          mime === "image/pjpeg" ||
          mime === "image/png" ||
          mime === "image/x-png"
        const isLegacyExt =
          /\.(jpe?g|png)$/i.test(img.name || "") ||
          /\.(jpe?g|png)$/i.test(img.id || "")
        if (!isLegacyMime && !isLegacyExt) return false

        const dedupeKey = `${img.source || "unknown"}:${img.id}`
        const oldUrl = getPublicUrl(img)
        if (seenKeys.has(dedupeKey) || seenUrls.has(oldUrl)) return false
        seenKeys.add(dedupeKey)
        seenUrls.add(oldUrl)
        return true
      })

      const total = legacyImages.length
      let converted = 0
      let failed = 0
      let updatedRefs = 0
      const errors: Array<{ id: string; name: string; error: string }> = []
      const MAX_BASE64_BYTES = 2_750_000

      for (let i = 0; i < legacyImages.length; i++) {
        const image = legacyImages[i]
        const current = i + 1

        onProgress?.({
          current,
          total,
          currentName: image.name,
          converted,
          failed,
        })

        try {
          if (this.isStorageImage(image)) {
            const oldUrl = getPublicUrl(image)
            const response = await fetch(oldUrl, { cache: "no-store" })
            if (!response.ok) {
              throw new Error(
                `Falha ao baixar imagem original (${response.status} ${response.statusText}).`
              )
            }
            const originalBlob = await response.blob()
            const webp = await this.convertBlobToWebp(originalBlob)

            const baseWebpPath = /\.(jpe?g|png)$/i.test(image.id)
              ? image.id.replace(/\.(jpe?g|png)$/i, ".webp")
              : `${image.id}.webp`

            let newStoragePath = baseWebpPath
            let { error: uploadError } = await this.supabase.storage
              .from(STORAGE_BUCKET)
              .upload(newStoragePath, webp.blob, {
                contentType: "image/webp",
                cacheControl: "31536000",
                upsert: false,
              })

            if (uploadError) {
              const errMsg = (uploadError.message || "").toLowerCase()
              const statusCode = String((uploadError as any).statusCode ?? "")
              const isCollision =
                statusCode === "409" ||
                errMsg.includes("already exists") ||
                errMsg.includes("duplicate") ||
                errMsg.includes("resource already exists")

              if (isCollision) {
                const randSuffix = Math.random().toString(36).slice(2, 6)
                newStoragePath = baseWebpPath.replace(
                  /\.webp$/i,
                  `-${Date.now()}-${randSuffix}.webp`
                )
                const retryRes = await this.supabase.storage
                  .from(STORAGE_BUCKET)
                  .upload(newStoragePath, webp.blob, {
                    contentType: "image/webp",
                    cacheControl: "31536000",
                    upsert: false,
                  })
                uploadError = retryRes.error
              }
            }

            if (uploadError) {
              throw new Error(
                uploadError.message ||
                  "Falha ao enviar versão WebP para o Storage."
              )
            }

            const { data: newPublicUrlData } = this.supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(newStoragePath)
            const newUrl = newPublicUrlData.publicUrl

            try {
              const { error: metaUpsertError } = await this.supabase
                .from("media_metadata")
                .upsert(
                  {
                    storage_path: newStoragePath,
                    category: image.category,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "storage_path" }
                )
              if (metaUpsertError) {
                console.warn(
                  "[ImageUploadManager] Falha ao salvar media_metadata na conversão WebP:",
                  metaUpsertError
                )
              }
            } catch (metaErr) {
              console.warn(
                "[ImageUploadManager] Exceção ao salvar media_metadata na conversão WebP:",
                metaErr
              )
            }

            let refsDelta = 0
            try {
              const { data: sessionData } = await this.supabase.auth.getSession()
              const accessToken = sessionData?.session?.access_token
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
              }
              if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`
              }

              const migrateRes = await fetch(
                "/api/admin/images/migrate-webp-refs",
                {
                  method: "POST",
                  headers,
                  body: JSON.stringify({ oldUrl, newUrl }),
                }
              )

              const migrateBody = await migrateRes.json().catch(() => null)
              if (!migrateRes.ok || migrateBody?.ok !== true) {
                throw new Error(
                  migrateBody?.error ||
                    `Erro ao migrar referências (${migrateRes.status}).`
                )
              }

              refsDelta = Number(migrateBody?.updated?.total ?? 0)
            } catch (migrateErr) {
              // Rollback: remove novo arquivo e metadata sem remover o arquivo original
              try {
                const { error: rbStorageError } = await this.supabase.storage
                  .from(STORAGE_BUCKET)
                  .remove([newStoragePath])
                if (rbStorageError) {
                  console.warn(
                    "[ImageUploadManager] Falha no rollback do Storage:",
                    rbStorageError
                  )
                }
              } catch (rbStorageErr) {
                console.warn(
                  "[ImageUploadManager] Falha no rollback do Storage:",
                  rbStorageErr
                )
              }
              try {
                const { error: rbMetaError } = await this.supabase
                  .from("media_metadata")
                  .delete()
                  .eq("storage_path", newStoragePath)
                if (rbMetaError) {
                  console.warn(
                    "[ImageUploadManager] Falha no rollback de media_metadata:",
                    rbMetaError
                  )
                }
              } catch (rbMetaErr) {
                console.warn(
                  "[ImageUploadManager] Falha no rollback de media_metadata:",
                  rbMetaErr
                )
              }
              throw migrateErr
            }

            const { data: removedOldFiles, error: removeOldError } =
              await this.supabase.storage
                .from(STORAGE_BUCKET)
                .remove([image.id])
            if (
              removeOldError ||
              !removedOldFiles ||
              removedOldFiles.length === 0
            ) {
              const removeReason =
                removeOldError?.message ||
                "nenhum arquivo removido (permissão RLS ou arquivo ausente)"
              console.warn(
                "[ImageUploadManager] Falha ao remover arquivo legado do Storage após migração:",
                removeOldError || removedOldFiles
              )
              updatedRefs += refsDelta
              failed += 1
              errors.push({
                id: image.id,
                name: image.name,
                error: `Imagem convertida e referências migradas, mas falha ao remover arquivo legado: ${removeReason}.`,
              })
            } else {
              try {
                const { error: deleteOldMetaError } = await this.supabase
                  .from("media_metadata")
                  .delete()
                  .eq("storage_path", image.id)
                if (deleteOldMetaError) {
                  console.warn(
                    "[ImageUploadManager] Falha ao remover media_metadata legado:",
                    deleteOldMetaError
                  )
                }
              } catch (deleteOldMetaErr) {
                console.warn(
                  "[ImageUploadManager] Exceção ao remover media_metadata legado:",
                  deleteOldMetaErr
                )
              }

              updatedRefs += refsDelta
              converted += 1
            }
          } else {
            let sourceBlob: Blob
            if (image.data) {
              sourceBlob = this.base64ToBlob(
                image.data,
                image.mimeType || "image/jpeg"
              )
            } else {
              const response = await fetch(getPublicUrl(image), {
                cache: "no-store",
              })
              if (!response.ok) {
                throw new Error(
                  `Falha ao baixar imagem do banco (${response.status} ${response.statusText}).`
                )
              }
              sourceBlob = await response.blob()
            }

            const webp = await this.convertBlobToWebp(
              sourceBlob,
              MAX_BASE64_BYTES
            )

            const { data: updatedRows, error: updateError } =
              await this.supabase
                .from("uploaded_images")
                .update({
                  data: webp.base64,
                  mime_type: "image/webp",
                })
                .eq("id", image.id)
                .select("id")

            if (updateError) {
              throw new Error(
                updateError.message || "Falha ao atualizar imagem WebP no banco."
              )
            }
            if (!updatedRows || updatedRows.length === 0) {
              throw new Error(
                "Nenhuma imagem atualizada em uploaded_images (permissão RLS ou registro ausente)."
              )
            }

            converted += 1
          }
        } catch (err: any) {
          failed += 1
          errors.push({
            id: image.id,
            name: image.name,
            error: err?.message || "Erro desconhecido ao converter imagem.",
          })
        } finally {
          onProgress?.({
            current,
            total,
            currentName: image.name,
            converted,
            failed,
          })
        }
      }

      return {
        total,
        converted,
        failed,
        updatedRefs,
        errors,
      }
    } finally {
      this.isConvertingWebp = false
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
