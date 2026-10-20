"use client"

import { useEffect, useState, useRef } from "react"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
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
  Search,
  X,
} from "lucide-react"
import { imageUploadManager, UploadedImage } from "@/lib/image-upload-manager"
import Link from "next/link"

const ADMIN_EMAILS = ["enzzobaraldo2008@gmail.com", "maraysis9010@gmail.com"]

const CATEGORIES = [
  { key: "all", label: "Todas", color: "bg-neutral-900 text-white" },
  { key: "product", label: "Produtos", color: "bg-amber-500 text-white" },
  { key: "promo", label: "Promoções", color: "bg-orange-600 text-white" },
  { key: "general", label: "Geral", color: "bg-blue-600 text-white" },
] as const

export default function AdminImagensPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<"all" | "product" | "promo" | "general">("all")
  const [uploadCategory, setUploadCategory] = useState<"product" | "promo" | "general">("product")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<Record<string, string>>({})
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Deletion modal state
  const [imageToDelete, setImageToDelete] = useState<UploadedImage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true)
        loadImages()
      } else {
        alert("Você não tem permissão para acessar esta página")
        router.push("/")
      }
    }
  }, [user, loading, router])

  const loadImages = async () => {
    try {
      setLoadingImages(true)
      const productImages = await imageUploadManager.getImagesByCategory("product")
      const promoImages = await imageUploadManager.getImagesByCategory("promo")
      const generalImages = await imageUploadManager.getImagesByCategory("general")
      
      const allImages = [...productImages, ...promoImages, ...generalImages]
      setImages(allImages)
    } catch (error) {
      console.error("Erro ao carregar imagens:", error)
    } finally {
      setLoadingImages(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    if (!file.type.startsWith("image/")) {
      setUploadError("O arquivo selecionado deve ser uma imagem (JPG, PNG, WebP).")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("A imagem excede o tamanho máximo permitido de 5MB.")
      return
    }

    try {
      setUploading(true)
      setUploadError(null)
      setUploadProgress(`Processando ${file.name}...`)

      await imageUploadManager.uploadImage(file, uploadCategory)
      setUploadProgress("Upload concluído com sucesso!")
      await loadImages()

      setTimeout(() => {
        setUploadProgress(null)
      }, 3000)
    } catch (err) {
      console.error("Erro no upload:", err)
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
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      await handleFileUpload(e.dataTransfer.files)
    }
  }

  const confirmDelete = async () => {
    if (!imageToDelete) return
    try {
      setIsDeleting(true)
      const success = await imageUploadManager.deleteImage(imageToDelete.id)
      if (success) {
        setImages(prev => prev.filter(img => img.id !== imageToDelete.id))
        setImageToDelete(null)
      } else {
        alert("Erro ao excluir imagem do servidor.")
      }
    } catch {
      alert("Erro ao tentar deletar a imagem.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopyUrl = async (id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const publicUrl = `${origin}/api/images/${id}`
    await navigator.clipboard.writeText(publicUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleImageLoad = (id: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    setDimensions(prev => ({
      ...prev,
      [id]: `${naturalWidth} × ${naturalHeight}px`,
    }))
  }

  const filteredImages = images.filter(img => {
    const matchesCategory = selectedCategory === "all" ? true : img.category === selectedCategory
    const matchesSearch = searchQuery.trim() === "" ? true : img.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getCategoryCount = (catKey: string) => {
    if (catKey === "all") return images.length
    return images.filter(img => img.category === catKey).length
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-300 border-t-amber-600 mx-auto mb-4" />
          <p className="text-stone-700 font-semibold text-sm">Verificando credenciais de acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#1A1A1A]">
      <HeaderWrapper />

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

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadImages}
                disabled={loadingImages}
                className="bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-medium gap-2 shadow-sm rounded-xl h-10 px-4"
              >
                <RefreshCw className={`h-4 w-4 ${loadingImages ? "animate-spin text-amber-600" : "text-stone-500"}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Upload Zone (iFood Media Standard) */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-6 md:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-[#E3A008]" /> Enviar nova imagem
                </h2>
                <p className="text-xs text-stone-500">Selecione a categoria de destino antes de carregar o arquivo</p>
              </div>

              {/* Upload Category Selector */}
              <div className="flex items-center gap-2 bg-stone-100/80 p-1 rounded-xl">
                {(["product", "promo", "general"] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setUploadCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      uploadCategory === cat
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-800"
                    }`}
                  >
                    {cat === "product" ? "Produto" : cat === "promo" ? "Promoção" : "Geral"}
                  </button>
                ))}
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-6 border-2 border-dashed rounded-2xl p-8 md:p-10 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-[#E3A008] bg-amber-50/50 scale-[0.99]"
                  : "border-stone-200 hover:border-amber-400 bg-stone-50/50 hover:bg-stone-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => handleFileUpload(e.target.files)}
                disabled={uploading}
              />

              <div className="flex flex-col items-center justify-center gap-3">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragging ? "bg-amber-100 text-amber-600" : "bg-white text-stone-400 shadow-sm"
                }`}>
                  <UploadCloud className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-sm font-bold text-stone-800">
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Formatos aceitos: JPG, PNG, WebP (Até 5MB)
                  </p>
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 mt-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    {uploadProgress || "Enviando imagem..."}
                  </div>
                )}

                {uploadProgress && !uploading && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 mt-2">
                    <Check className="h-3.5 w-3.5" />
                    {uploadProgress}
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 mt-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {uploadError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Library Section */}
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key as any)}
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

              {/* Search Field */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar imagem por nome..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map(image => {
                  const isCopied = copiedId === image.id
                  const dim = dimensions[image.id]
                  const categoryBadgeColor =
                    image.category === "product"
                      ? "bg-amber-500 text-white"
                      : image.category === "promo"
                      ? "bg-orange-600 text-white"
                      : "bg-blue-600 text-white"

                  const categoryLabel =
                    image.category === "product"
                      ? "Produto"
                      : image.category === "promo"
                      ? "Promoção"
                      : "Geral"

                  return (
                    <div
                      key={image.id}
                      className="group bg-white rounded-2xl border border-stone-200/80 hover:border-amber-400 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                        <img
                          src={`data:${image.mimeType};base64,${image.data}`}
                          alt={image.name}
                          onLoad={e => handleImageLoad(image.id, e)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-sm ${categoryBadgeColor}`}>
                            {categoryLabel}
                          </span>
                          {dim && (
                            <span className="text-[10px] font-bold bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded-md shadow-sm">
                              {dim}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Info & Actions */}
                      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-stone-900 truncate" title={image.name}>
                            {image.name}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
                            <span>{new Date(image.uploadedAt).toLocaleDateString("pt-BR")}</span>
                            <span className="uppercase text-[9px] font-semibold tracking-wider text-stone-400">
                              {image.mimeType.replace("image/", "")}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyUrl(image.id)}
                            className={`flex-1 text-xs font-semibold h-8 rounded-lg gap-1.5 transition-colors ${
                              isCopied
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-stone-500" />
                                <span>Copiar URL</span>
                              </>
                            )}
                          </Button>

                          <a
                            href={`/api/images/${image.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setImageToDelete(image)}
                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
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
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-stone-900">Excluir imagem permanentemente?</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Esta ação não pode ser desfeita. A imagem deixará de carregar em qualquer produto ou banner vinculado.
                </p>
              </div>
            </div>

            {/* Thumbnail preview */}
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
              <img
                src={`data:${imageToDelete.mimeType};base64,${imageToDelete.data}`}
                alt={imageToDelete.name}
                className="h-14 w-14 rounded-xl object-cover border border-stone-200"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-900 truncate">{imageToDelete.name}</p>
                <p className="text-[11px] text-stone-400 capitalize">Categoria: {imageToDelete.category}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
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
                disabled={isDeleting}
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
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
