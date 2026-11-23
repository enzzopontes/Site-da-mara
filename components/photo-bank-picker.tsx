"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Check, Image as ImageIcon, RefreshCw } from "lucide-react"
import { imageUploadManager, type UploadedImage } from "@/lib/image-upload-manager"

interface PhotoBankPickerProps {
  value: string
  onSelect: (url: string) => void
  enabled?: boolean
}

export function PhotoBankPicker({
  value,
  onSelect,
  enabled = true,
}: PhotoBankPickerProps) {
  const [photos, setPhotos] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({})

  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  const normalized = value.trim()

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-800">
            Banco de Fotos
          </span>
          {hasLoaded && !loading && !error && (
            <span className="text-[11px] text-gray-500">
              ({photos.length})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadPhotos()}
          disabled={loading}
          aria-label="Atualizar banco de fotos"
          title="Atualizar banco de fotos"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {loading && !hasLoaded ? (
        <div role="status" aria-live="polite">
          <span className="sr-only">Carregando banco de fotos...</span>
          <div className="grid grid-cols-4 gap-2 p-1">
            {Array.from({ length: 10 }).map((_, index) => (
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
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
          {photos.map((image) => {
            const photoUrl = image.url || `/api/images/${image.id}`
            const isSelected =
              normalized.length > 0 &&
              (normalized === photoUrl || normalized.endsWith(photoUrl))
            const imgSrc = image.data
              ? image.data.startsWith("data:")
                ? image.data
                : `data:${image.mimeType || "image/jpeg"};base64,${image.data}`
              : photoUrl

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => onSelect(photoUrl)}
                aria-pressed={isSelected}
                aria-label={`Selecionar foto ${image.name}`}
                title={image.name}
                className={`relative aspect-square overflow-hidden rounded-md border bg-gray-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 ${
                  isSelected
                    ? "ring-2 ring-[#E3A008] ring-offset-1 border-[#E3A008]"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                {failedIds[image.id] ? (
                  <span className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                ) : (
                  <img
                    src={imgSrc}
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
