"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react"
import { imageUploadManager, type UploadedImage } from "@/lib/image-upload-manager"

interface PhotoBankPickerProps {
  value: string
  onSelect: (url: string) => void
  enabled?: boolean
  usedUrls?: string[]
  category?: "product" | "promo" | "general"
  emptyUsedMessage?: string
  hidePreview?: boolean
}

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/jfif",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-ms-bmp",
])

const ACCEPTED_EXTENSIONS = new Set(["jpg", "jpeg", "jfif", "png", "webp", "avif", "bmp"])
const ALLOWED_CATEGORIES = new Set(["product", "promo", "general"] as const)
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function isAcceptedImageFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase().trim()
  if (mime) return ACCEPTED_MIME_TYPES.has(mime)
  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  return ACCEPTED_EXTENSIONS.has(ext)
}

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return false
  if (trimmed.includes("..")) return false
  if (/^https?:\/\//i.test(trimmed)) return true
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true
  return false
}

function getNormalizedImageKeys(rawUrl: string): string[] {
  const trimmed = rawUrl.trim()
  if (!trimmed) return []

  const lower = trimmed.toLowerCase()
  const keys = new Set<string>([lower])

  const withoutQuery = lower.split(/[?#]/)[0]
  if (withoutQuery) {
    keys.add(withoutQuery)
  }

  let decoded = withoutQuery
  try {
    decoded = decodeURIComponent(withoutQuery)
    if (decoded) keys.add(decoded)
  } catch {
    // ignore malformed URI sequences
  }

  const apiMatch = decoded.match(/(\/api\/images\/[^/]+)$/)
  if (apiMatch) {
    keys.add(apiMatch[1])
  }

  const productsMatch = decoded.match(/(?:^|\/)products\/(.+)$/)
  if (productsMatch && productsMatch[1]) {
    const relPath = productsMatch[1].replace(/^\/+/, "")
    if (relPath) {
      keys.add(`products:${relPath}`)
    }
  }

  const couponBannersMatch = decoded.match(/(?:^|\/)coupon-banners\/(.+)$/)
  if (couponBannersMatch && couponBannersMatch[1]) {
    const relPath = couponBannersMatch[1].replace(/^\/+/, "")
    if (relPath) {
      keys.add(`coupon-banners:${relPath}`)
    }
  }

  return Array.from(keys)
}

export function PhotoBankPicker({
  value,
  onSelect,
  enabled = true,
  usedUrls = [],
  category = "product",
  emptyUsedMessage = "Todas as fotos do banco já estão em uso em outros produtos.",
  hidePreview = false,
}: PhotoBankPickerProps) {
  const [photos, setPhotos] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({})
  const [previewFailed, setPreviewFailed] = useState(false)

  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadingRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const normalized = (value ?? "").trim()

  useEffect(() => {
    setPreviewFailed(false)
  }, [normalized])

  const loadPhotos = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setFailedIds({})

    try {
      const images = await imageUploadManager.listAllImages()
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) {
        return
      }
      setPhotos(images)
      setHasLoaded(true)
    } catch (err) {
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) {
        return
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível carregar o banco de fotos."
      setError(message)
    } finally {
      if (isMountedRef.current && requestIdRef.current === currentRequestId) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void loadPhotos()
  }, [enabled, loadPhotos])

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (uploadingRef.current) return

      if (!isAcceptedImageFile(file)) {
        setUploadError("Formato inválido. Envie uma imagem JPG, PNG, WebP, BMP ou AVIF.")
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }

      if (file.size <= 0) {
        setUploadError("Arquivo de imagem vazio.")
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError("Imagem muito grande. O tamanho máximo permitido é 5MB.")
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }

      uploadingRef.current = true
      setUploading(true)
      setUploadError(null)

      try {
        const safeCategory = ALLOWED_CATEGORIES.has(category) ? category : "product"
        const uploaded = await imageUploadManager.uploadImage(file, safeCategory)
        if (!isMountedRef.current) return
        onSelect(uploaded.url || `/api/images/${uploaded.id}`)
        await loadPhotos()
      } catch (err) {
        if (!isMountedRef.current) return
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Não foi possível enviar a imagem."
        setUploadError(message)
      } finally {
        uploadingRef.current = false
        if (isMountedRef.current) {
          setUploading(false)
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [onSelect, loadPhotos, category]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleUploadFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (uploading || uploadingRef.current) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void handleUploadFile(file)
    }
  }

  const usedKeySet = useMemo(() => {
    const set = new Set<string>()
    for (const url of usedUrls) {
      for (const key of getNormalizedImageKeys(url)) {
        set.add(key)
      }
    }
    return set
  }, [usedUrls])

  const selectedKeySet = useMemo(() => {
    return new Set(getNormalizedImageKeys(normalized))
  }, [normalized])

  const availablePhotos = useMemo(() => {
    return photos.filter((image) => {
      const photoUrl = image.url || `/api/images/${image.id}`
      const keys = getNormalizedImageKeys(photoUrl)
      const isSelected = keys.some((k) => selectedKeySet.has(k))
      if (isSelected) return true
      const isUsedByOther = keys.some((k) => usedKeySet.has(k))
      return !isUsedByOther
    })
  }, [photos, selectedKeySet, usedKeySet])

  return (
    <div className="rounded-xl border border-[#ECE7E0] bg-gray-50/70 p-2.5 space-y-2.5">
      {!hidePreview && normalized.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white p-2">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100 flex items-center justify-center">
            {previewFailed || !isSafeImageUrl(normalized) ? (
              <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            ) : (
              <img
                src={normalized}
                alt="Imagem selecionada"
                onError={() => setPreviewFailed(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800">Imagem selecionada</p>
            <p className="text-[11px] text-gray-500 truncate" title={normalized}>
              {normalized}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect("")}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white min-h-[36px] px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors shrink-0"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            <span>Remover</span>
          </button>
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/bmp,.jfif,image/jfif"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={uploading}
          className={`w-full flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70 ${
            isDragging
              ? "border-[#E3A008] bg-amber-50/70"
              : "border-gray-300 bg-white hover:border-[#E3A008] hover:bg-amber-50/30"
          }`}
        >
          {uploading ? (
            <>
              <Loader2
                className="h-4 w-4 animate-spin text-[#8A6100]"
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-gray-800">
                Convertendo e enviando...
              </span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-[#8A6100]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800">
                Arraste a foto aqui ou clique para enviar
              </span>
              <span className="text-[11px] text-gray-500">
                JPG, PNG, BMP ou AVIF — convertido automaticamente para WebP
              </span>
            </>
          )}
        </button>

        {uploadError && (
          <div
            role="alert"
            className="mt-1.5 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-800">
            Banco de fotos disponíveis
          </span>
          {hasLoaded && !loading && !error && (
            <span className="text-[11px] text-gray-500">
              ({availablePhotos.length})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadPhotos()}
          disabled={loading || uploading}
          aria-label="Atualizar banco de fotos"
          title="Atualizar banco de fotos"
          className="inline-flex items-center gap-1 rounded-md shrink-0 min-h-[36px] px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {loading && !hasLoaded ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Carregando banco de fotos...</span>
          <div className="grid grid-cols-4 gap-2 p-1">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square rounded-md bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-4 text-center"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" aria-hidden="true" />
          <p className="text-xs text-red-700">
            Erro ao carregar fotos do banco: {error}
          </p>
          <button
            type="button"
            onClick={() => void loadPhotos()}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-white px-3 py-5 text-center">
          <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <p className="text-xs text-gray-500">
            Nenhuma foto cadastrada no banco de fotos.
          </p>
        </div>
      ) : availablePhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-white px-3 py-5 text-center">
          <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          <p className="text-xs text-gray-500">
            {emptyUsedMessage}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
          {availablePhotos.map((image) => {
            const photoUrl = image.url || `/api/images/${image.id}`
            const photoKeys = getNormalizedImageKeys(photoUrl)
            const isSelected =
              normalized.length > 0 &&
              (normalized === photoUrl ||
                photoKeys.some((k) => selectedKeySet.has(k)))
            const rawMime = (image.mimeType || "").toLowerCase().trim()
            let safeThumbSrc: string | null = null
            if (image.data) {
              if (ACCEPTED_MIME_TYPES.has(rawMime)) {
                if (image.data.startsWith("data:")) {
                  const dataMimeMatch = image.data.match(/^data:([^;,]+)[;,]/i)
                  const dataMime = (dataMimeMatch?.[1] || "").toLowerCase().trim()
                  if (ACCEPTED_MIME_TYPES.has(dataMime)) {
                    safeThumbSrc = image.data
                  }
                } else {
                  safeThumbSrc = `data:${rawMime};base64,${image.data}`
                }
              }
            } else if (isSafeImageUrl(photoUrl)) {
              safeThumbSrc = photoUrl
            }

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(photoUrl)}
                disabled={uploading}
                aria-pressed={isSelected}
                aria-label={`Selecionar foto ${image.name}`}
                title={image.name}
                className={`relative aspect-square overflow-hidden rounded-md border bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 ${
                  isSelected
                    ? "ring-2 ring-[#E3A008] ring-offset-1 border-[#E3A008]"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                {failedIds[image.id] || !safeThumbSrc ? (
                  <span className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                ) : (
                  <img
                    src={safeThumbSrc}
                    alt={image.name}
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setFailedIds((prev) => ({ ...prev, [image.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                )}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8A6100] text-white shadow-sm"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
