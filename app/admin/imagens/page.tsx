"use client"

import { appToast } from "@/lib/app-toast"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { AdminTableSkeleton } from "@/components/skeletons/admin-skeleton"
import {
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { useAdminHeaderSearch } from "@/components/admin/admin-header-search-context"
import {
  imageUploadManager,
  UploadedImage,
  ImageCategory,
  WebpConversionProgress,
} from "@/lib/image-upload-manager"
import Link from "next/link"
import { isAdmin as checkIsAdminRole } from "@/lib/supabase/admin"

const IMAGE_CATEGORY_OPTIONS: ReadonlyArray<{
  key: ImageCategory
  label: string
  badgeColor: string
}> = [
  { key: "product", label: "Produto", badgeColor: "bg-amber-500 text-stone-950" },
  { key: "promo", label: "Banner / Promoção", badgeColor: "bg-orange-700 text-white" },
  { key: "brand", label: "Logo / Identidade", badgeColor: "bg-violet-600 text-white" },
  { key: "general", label: "Geral", badgeColor: "bg-blue-600 text-white" },
]

const CATEGORY_META: Record<ImageCategory, { label: string; badgeColor: string }> = {
  product: { label: "Produto", badgeColor: "bg-amber-500 text-stone-950" },
  promo: { label: "Banner / Promoção", badgeColor: "bg-orange-700 text-white" },
  brand: { label: "Logo / Identidade", badgeColor: "bg-violet-600 text-white" },
  general: { label: "Geral", badgeColor: "bg-blue-600 text-white" },
}

const CATEGORIES: ReadonlyArray<{
  key: "all" | ImageCategory
  label: string
}> = [
  { key: "all", label: "Todas" },
  ...IMAGE_CATEGORY_OPTIONS.map(({ key, label }) => ({ key, label })),
]

const isLegacyImage = (image: UploadedImage): boolean => {
  const mime = (image.mimeType || "").toLowerCase().trim()
  if (mime === "image/webp") return false
  const isLegacyMime =
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/pjpeg" ||
    mime === "image/png" ||
    mime === "image/x-png"
  const isLegacyExt =
    /\.(jpe?g|png)$/i.test(image.name || "") ||
    /\.(jpe?g|png)$/i.test(image.id || "")
  return isLegacyMime || isLegacyExt
}

const getImageFormat = (
  image: UploadedImage
): { label: string; isWebp: boolean; isLegacy: boolean } => {
  const mime = (image.mimeType || "").toLowerCase().trim()
  if (mime === "image/webp") {
    return { label: "WEBP", isWebp: true, isLegacy: false }
  }
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/pjpeg") {
    return { label: "JPG", isWebp: false, isLegacy: true }
  }
  if (mime === "image/png" || mime === "image/x-png") {
    return { label: "PNG", isWebp: false, isLegacy: true }
  }
  if (mime === "image/gif") {
    return { label: "GIF", isWebp: false, isLegacy: false }
  }

  const extMatch = (image.name || image.id || "").match(/\.([a-z0-9]+)$/i)
  const ext = extMatch?.[1]?.toLowerCase()
  if (ext === "webp") return { label: "WEBP", isWebp: true, isLegacy: false }
  if (ext === "jpg" || ext === "jpeg") return { label: "JPG", isWebp: false, isLegacy: true }
  if (ext === "png") return { label: "PNG", isWebp: false, isLegacy: true }
  if (ext === "gif") return { label: "GIF", isWebp: false, isLegacy: false }

  const fallback = mime.startsWith("image/") ? mime.replace("image/", "").toUpperCase() : "IMG"
  return { label: fallback, isWebp: false, isLegacy: false }
}

export default function AdminImagensPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<"all" | ImageCategory>("all")
  const [uploadCategory, setUploadCategory] = useState<ImageCategory>("product")
  const { query: searchQuery } = useAdminHeaderSearch({
    placeholder: "Buscar imagem por nome...",
    ariaLabel: "Buscar imagem por nome",
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<Record<string, string>>({})
  const [updatingCategoryIds, setUpdatingCategoryIds] = useState<Record<string, boolean>>({})

  // Batch WebP conversion modal state
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [isConvertingWebp, setIsConvertingWebp] = useState(false)
  const [conversionProgress, setConversionProgress] = useState<WebpConversionProgress | null>(null)
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Deletion modal state
  const [imageToDelete, setImageToDelete] = useState<UploadedImage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const uploadProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const legacyCount = images.filter(isLegacyImage).length
  const hasUpdatingCategory = Object.keys(updatingCategoryIds).length > 0
  const isAnyMutationActive = uploading || isDeleting || isConvertingWebp || hasUpdatingCategory
  const isUploadBusy = uploading || isConvertingWebp || isDeleting

  useEffect(() => {
    return () => {
      if (uploadProgressTimerRef.current) clearTimeout(uploadProgressTimerRef.current)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else {
        let active = true
        checkIsAdminRole(user.id)
          .then((allowed) => {
            if (!active) return
            if (allowed) {
              setIsAdmin(true)
              loadImages()
            } else {
              appToast.error("Acesso negado", "Você não tem permissão para acessar esta página.")
              router.push("/")
            }
          })
          .catch(() => {
            if (active) router.push("/")
          })
        return () => {
          active = false
        }
      }
    }
  }, [user, loading, router])

  const loadImages = async () => {
    try {
      setLoadingImages(true)
      const allImages = await imageUploadManager.getAllImages()


      

      setImages(allImages)
    } catch (error) {
      console.error("Erro ao carregar imagens:", error)
    } finally {
      setLoadingImages(false)
    }
  }

  const handleFileUpload = async (files: FileList | File[] | null) => {
    if (uploading || isConvertingWebp || isDeleting) return
    if (!files) return
    const fileList = Array.from(files)
    if (fileList.length === 0) return

    const validFiles = fileList.filter(file => file.type.startsWith("image/"))
    if (validFiles.length === 0) {
      setUploadError("Nenhum arquivo de imagem válido (JPG, PNG, WebP) foi selecionado.")
      return
    }

    try {
      if (uploadProgressTimerRef.current) {
        clearTimeout(uploadProgressTimerRef.current)
        uploadProgressTimerRef.current = null
      }
      setUploading(true)
      setUploadError(null)

      let successCount = 0
      const errors: string[] = []

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        const progressText = validFiles.length > 1
          ? `Processando imagem ${i + 1} de ${validFiles.length} (${file.name})...`
          : `Processando ${file.name}...`
        setUploadProgress(progressText)

        if (file.size > 5 * 1024 * 1024) {
          errors.push(`${file.name}: excede 5MB`)
          continue
        }

        try {
          await imageUploadManager.uploadImage(file, uploadCategory)
          successCount++
        } catch (err: any) {
          errors.push(`${file.name}: ${err?.message || "erro ao enviar"}`)
        }
      }

      if (successCount > 0) {
        setSelectedCategory("all")
        await loadImages()
      }

      if (errors.length === 0) {
        setUploadProgress(
          validFiles.length > 1
            ? `${validFiles.length} imagens enviadas com sucesso!`
            : "Upload concluído com sucesso!"
        )
        setUploadError(null)
      } else if (successCount > 0) {
        setUploadProgress(`${successCount} de ${validFiles.length} imagens enviadas com sucesso.`)
        setUploadError(`Erros em ${errors.length} arquivo(s): ${errors.join("; ")}`)
      } else {
        setUploadProgress(null)
        setUploadError(`Falha ao enviar: ${errors.join("; ")}`)
      }

      if (uploadProgressTimerRef.current) {
        clearTimeout(uploadProgressTimerRef.current)
      }
      uploadProgressTimerRef.current = setTimeout(() => {
        setUploadProgress(null)
        uploadProgressTimerRef.current = null
      }, 4000)
    } catch (err) {
      console.error("Erro no upload:", err)
      setUploadProgress(null)
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar imagem.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploading || isConvertingWebp || isDeleting) return
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (uploading || isConvertingWebp || isDeleting) return
    if (e.dataTransfer.files) {
      await handleFileUpload(e.dataTransfer.files)
    }
  }

  const confirmDelete = async () => {
    if (!imageToDelete || isDeleting || isConvertingWebp || uploading) return
    try {
      setIsDeleting(true)
      const success = await imageUploadManager.deleteImage(imageToDelete.id)
      if (success) {
        setImages(prev => prev.filter(img => img.id !== imageToDelete.id))
        setImageToDelete(null)
      } else {
        appToast.error("Erro ao excluir", "Erro ao excluir imagem do servidor.")
      }
    } catch {
      appToast.error("Erro ao deletar", "Erro ao tentar deletar a imagem.")
    } finally {
      setIsDeleting(false)
    }
  }

  const getImageUrl = (img: UploadedImage) => img.url || `/api/images/${img.id}`

  const getImagePreviewSrc = (img: UploadedImage) =>
    img.data
      ? img.data.startsWith("data:")
        ? img.data
        : `data:${img.mimeType || "image/jpeg"};base64,${img.data}`
      : getImageUrl(img)

  const handleCopyUrl = async (image: UploadedImage) => {
    const url = getImageUrl(image)
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const publicUrl = url.startsWith("http") ? url : `${origin}${url}`
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedId(image.id)
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current)
      }
      copiedTimerRef.current = setTimeout(() => {
        setCopiedId(null)
        copiedTimerRef.current = null
      }, 2500)
    } catch (error) {
      appToast.error(
        "Erro ao copiar URL",
        error instanceof Error ? error.message : "Não foi possível copiar o link para a área de transferência."
      )
    }
  }

  const handleImageLoad = (id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    setDimensions(prev => ({
      ...prev,
      [id]: `${naturalWidth} × ${naturalHeight}px`,
    }))
  }

  const handleCategoryChange = async (image: UploadedImage, newCategory: ImageCategory) => {
    if (
      newCategory === image.category ||
      updatingCategoryIds[image.id] ||
      isConvertingWebp ||
      isDeleting ||
      uploading
    ) {
      return
    }

    setUpdatingCategoryIds(prev => ({ ...prev, [image.id]: true }))
    try {
      await imageUploadManager.updateImageCategory(image, newCategory)
      setImages(prev =>
        prev.map(img => (img.id === image.id ? { ...img, category: newCategory } : img))
      )
      appToast.success(
        "Categoria atualizada",
        `"${image.name}" movida para ${CATEGORY_META[newCategory].label}.`
      )
    } catch (error) {
      appToast.error(
        "Erro ao atualizar categoria",
        error instanceof Error ? error.message : "Não foi possível reclassificar a imagem."
      )
    } finally {
      setUpdatingCategoryIds(prev => {
        const next = { ...prev }
        delete next[image.id]
        return next
      })
    }
  }

  const handleConvertLegacyImages = async () => {
    if (isAnyMutationActive || legacyCount === 0) return
    try {
      setIsConvertingWebp(true)
      setConversionProgress(null)
      const result = await imageUploadManager.convertLegacyImagesToWebp(progress => {
        setConversionProgress(progress)
      })
      await loadImages()
      setShowConvertModal(false)

      if (result.total === 0) {
        appToast.info("Nenhuma imagem legada", "Todas as imagens já estão em formato WebP.")
      } else if (result.converted === 0 && result.failed > 0) {
        appToast.error(
          "Falha na conversão WebP",
          `Nenhuma imagem pôde ser convertida (${result.failed} erro(s)).`
        )
      } else if (result.failed > 0) {
        appToast.warning(
          "Conversão concluída com avisos",
          `${result.converted} de ${result.total} imagem(ns) convertida(s), ${result.updatedRefs} referência(s) atualizada(s) e ${result.failed} falha(s).`
        )
      } else {
        appToast.success(
          "Conversão WebP concluída",
          `${result.converted} imagem(ns) convertida(s) e ${result.updatedRefs} referência(s) atualizada(s).`
        )
      }
    } catch (error) {
      appToast.error(
        "Erro na conversão WebP",
        error instanceof Error ? error.message : "Não foi possível converter as imagens para WebP."
      )
    } finally {
      setIsConvertingWebp(false)
      setConversionProgress(null)
    }
  }

  const conversionPercent =
    conversionProgress && conversionProgress.total > 0
      ? Math.min(100, Math.round((conversionProgress.current / conversionProgress.total) * 100))
      : 0

  const filteredImages = images.filter(img => {
    const matchesCategory = selectedCategory === "all" ? true : img.category === selectedCategory
    const matchesSearch = searchQuery.trim() === "" ? true : img.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryCount = (catKey: "all" | ImageCategory) => {
    if (catKey === "all") return images.length
    return images.filter(img => img.category === catKey).length
  }

  if (loading || !isAdmin) {
    return <AdminTableSkeleton rows={6} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#1A1A1A]">
      <main className="flex-1 py-8 px-4 md:px-8">
        <div className="container mx-auto max-w-7xl">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="mb-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-semibold gap-2 -ml-2">
                  <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-tr from-[#C1440E] to-[#E3A008] rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/10">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">Galeria de Mídia</h1>
                  <p className="text-stone-500 text-xs md:text-sm">Biblioteca centralizada de assets, fotos de cardápio e banners</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {legacyCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowConvertModal(true)}
                  disabled={isAnyMutationActive || legacyCount === 0 || loadingImages}
                  className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold gap-2 shadow-sm rounded-xl whitespace-normal h-auto min-h-10 py-2 px-4 text-left sm:text-center"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Converter JPG/PNG para WebP</span>
                  <span className="text-[11px] font-extrabold bg-stone-950/15 text-stone-950 px-1.5 py-0.5 rounded-md shrink-0">
                    {legacyCount}
                  </span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={loadImages}
                disabled={loadingImages || isAnyMutationActive}
                className="bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-medium gap-2 shadow-sm rounded-xl h-10 px-4"
              >
                <RefreshCw className={`h-4 w-4 ${loadingImages ? "animate-spin text-amber-800" : "text-stone-500"}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Upload Zone (iFood Media Standard) */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-6 md:p-8 shadow-sm mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-[#E3A008]" /> Enviar nova imagem
                </h2>
                <p className="text-xs text-stone-500">Selecione a categoria de destino antes de carregar o arquivo</p>
              </div>

              {/* Upload Category Selector */}
              <div className="flex flex-wrap items-center gap-1.5 bg-stone-100/80 p-1 rounded-xl">
                {IMAGE_CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    disabled={isUploadBusy}
                    onClick={() => setUploadCategory(cat.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      uploadCategory === cat.key
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isUploadBusy) fileInputRef.current?.click()
              }}
              aria-disabled={isUploadBusy}
              className={`mt-6 border-2 border-dashed rounded-2xl p-8 md:p-10 text-center transition-all ${
                isUploadBusy
                  ? "cursor-not-allowed opacity-60 border-stone-200 bg-stone-50/50"
                  : isDragging
                  ? "cursor-pointer border-[#E3A008] bg-amber-50/50 scale-[0.99]"
                  : "cursor-pointer border-stone-200 hover:border-amber-400 bg-stone-50/50 hover:bg-stone-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleFileUpload(e.target.files)}
                disabled={isUploadBusy}
              />

              <div className="flex flex-col items-center justify-center gap-3">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragging ? "bg-amber-100 text-amber-800" : "bg-white text-stone-400 shadow-sm"
                }`}>
                  <UploadCloud className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-bold text-stone-800">
                    Clique para selecionar uma ou mais imagens ou arraste aqui
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Formatos aceitos: JPG, PNG, WebP (Até 5MB por imagem)
                  </p>
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl text-left break-words max-w-full border border-amber-200 mt-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span className="min-w-0 break-words">{uploadProgress || "Enviando imagem..."}</span>
                  </div>
                )}

                {uploadProgress && !uploading && !uploadError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl text-left break-words max-w-full border border-emerald-200 mt-2">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{uploadProgress}</span>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl text-left break-words max-w-full border border-rose-200 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 break-words">{uploadError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Library Section */}
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat.key
                        ? "bg-[#1A1A1A] text-white shadow-sm"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      selectedCategory === cat.key
                        ? "bg-stone-700 text-stone-200"
                        : "bg-stone-200 text-stone-600"
                    }`}>
                      {getCategoryCount(cat.key)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gallery Grid */}
            {loadingImages ? (
              <div className="bg-white rounded-2xl border border-stone-200/80 p-16 text-center shadow-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-200 border-t-amber-500 mx-auto mb-3" />
                <p className="text-stone-600 text-xs font-semibold">Carregando galeria de imagens...</p>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200/80 p-16 text-center shadow-sm">
                <div className="h-16 w-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-stone-800">Nenhuma imagem encontrada</h3>
                <p className="text-xs text-stone-500 mt-1">
                  {searchQuery ? "Tente buscar com outro termo." : "Faça o upload da sua primeira foto usando a área acima."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredImages.map(image => {
                  const isCopied = copiedId === image.id
                  const dim = dimensions[image.id]
                  const categoryMeta = CATEGORY_META[image.category] ?? CATEGORY_META.general
                  const format = getImageFormat(image)
                  const isUpdatingCategory = Boolean(updatingCategoryIds[image.id])

                  return (
                    <div
                      key={image.id}
                      className="group bg-white rounded-2xl border border-stone-200/80 hover:border-amber-400 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                        <img
                          src={getImagePreviewSrc(image)}
                          alt={image.name}
                          loading="lazy"
                          decoding="async"
                          onLoad={e => handleImageLoad(image.id, e)}
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg?height=300&width=300&query=imagem" }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <span className={`absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate pointer-events-none text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-sm ${categoryMeta.badgeColor}`}>
                          {categoryMeta.label}
                        </span>
                        {dim && (
                          <span className="absolute bottom-2 right-2 whitespace-nowrap pointer-events-none text-[10px] font-bold bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-md shadow-sm">
                            {dim}
                          </span>
                        )}
                      </div>

                      {/* Card Info & Actions */}
                      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-bold text-stone-900 truncate" title={image.name}>
                              {image.name}
                            </p>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-stone-600 mt-1">
                              <span>{new Date(image.uploadedAt).toLocaleDateString("pt-BR")}</span>
                              <span
                                className={`uppercase text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded-md border ${
                                  format.isWebp
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : format.isLegacy
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-stone-100 text-stone-600 border-stone-200"
                                }`}
                              >
                                {format.label}
                              </span>
                            </div>
                          </div>

                          {/* Category Reclassification Select */}
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label={`Categoria de ${image.name}`}
                              value={image.category}
                              disabled={isUpdatingCategory || isConvertingWebp || isDeleting || uploading}
                              onChange={e => handleCategoryChange(image, e.target.value as ImageCategory)}
                              className="w-full min-w-0 h-10 sm:h-8 pl-2.5 pr-7 text-base sm:text-xs font-semibold text-stone-700 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            >
                              {IMAGE_CATEGORY_OPTIONS.map(opt => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {isUpdatingCategory && (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-800 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyUrl(image)}
                            className={`min-w-0 flex-1 text-xs font-semibold h-10 sm:h-8 rounded-lg gap-1.5 transition-colors ${
                              isCopied
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                                <span className="truncate">Copiar URL</span>
                              </>
                            )}
                          </Button>

                          <a
                            href={getImageUrl(image)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Abrir imagem em nova aba"
                            className="shrink-0 h-10 w-10 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Excluir imagem"
                            onClick={() => setImageToDelete(image)}
                            disabled={isConvertingWebp || isUpdatingCategory || isDeleting || uploading}
                            className="shrink-0 h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Excluir imagem"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Deletion Confirmation Modal */}
      <Dialog
        open={Boolean(imageToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setImageToDelete(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => {
            if (isDeleting) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (isDeleting) e.preventDefault()
          }}
          className="bg-white rounded-3xl sm:max-w-md w-full p-6 shadow-2xl border border-stone-100 flex flex-col gap-4"
        >
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-extrabold text-stone-900">
                  Excluir imagem permanentemente?
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 mt-1">
                  Esta ação não pode ser desfeita. A imagem deixará de carregar em qualquer produto ou banner vinculado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Thumbnail preview */}
          {imageToDelete && (
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
              <img
                src={getImagePreviewSrc(imageToDelete)}
                alt={imageToDelete.name}
                className="h-14 w-14 rounded-xl object-cover border border-stone-200"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-900 truncate">{imageToDelete.name}</p>
                <p className="text-[11px] text-stone-500">
                  Categoria: {CATEGORY_META[imageToDelete.category]?.label ?? "Geral"}
                </p>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImageToDelete(null)}
              disabled={isDeleting}
              className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold px-4"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting || isConvertingWebp || uploading}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 gap-1.5 shadow-sm shadow-rose-600/20"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir Imagem
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch WebP Conversion Confirmation Modal */}
      <Dialog
        open={showConvertModal}
        onOpenChange={(open) => {
          if (!open && !isConvertingWebp) setShowConvertModal(false)
        }}
      >
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => {
            if (isConvertingWebp) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            if (isConvertingWebp) e.preventDefault()
          }}
          className="bg-white rounded-3xl sm:max-w-md w-full p-6 shadow-2xl border border-stone-100 flex flex-col gap-4"
        >
          <DialogHeader className="text-left">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-extrabold text-stone-900">
                  Converter JPG/PNG para WebP?
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500 mt-1">
                  {legacyCount} {legacyCount === 1 ? "imagem JPG/PNG será convertida" : "imagens JPG/PNG serão convertidas"} para
                  WebP preservando a transparência. Todas as referências de URL no banco de dados serão atualizadas antes de remover os arquivos antigos.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isConvertingWebp && (
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-bold text-stone-800">
                <span className="truncate">
                  {conversionProgress
                    ? `Convertendo ${conversionProgress.current} de ${conversionProgress.total} — ${conversionProgress.currentName}`
                    : `Preparando conversão de ${legacyCount} imagem(ns)...`}
                </span>
                <span className="text-amber-800 flex-shrink-0">{conversionPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C1440E] to-[#E3A008] transition-all duration-300"
                  style={{ width: `${conversionPercent}%` }}
                />
              </div>
              {conversionProgress && (
                <p className="text-[11px] text-stone-500">
                  Convertidas: {conversionProgress.converted}
                  {conversionProgress.failed > 0 ? ` • Falhas: ${conversionProgress.failed}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConvertModal(false)}
              disabled={isConvertingWebp}
              className="rounded-xl border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold px-4"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConvertLegacyImages}
              disabled={isAnyMutationActive || legacyCount === 0}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold px-4 gap-1.5 shadow-sm shadow-amber-500/20"
            >
              {isConvertingWebp ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Iniciar Conversão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
