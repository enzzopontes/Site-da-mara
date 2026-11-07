"use client"

import { appToast } from "@/lib/app-toast"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { bannersManager, isSafeImageUrl, type HomeBannerItem } from "@/lib/banners-manager"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { imageUploadManager, type UploadedImage } from "@/lib/image-upload-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Edit2, Image as ImageIcon, Tag, ArrowUpDown, Sparkles, Upload, CheckCircle2, Link2, X } from "lucide-react"

export function AdminHomeBannersSection() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [banners, setBanners] = useState<HomeBannerItem[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [promoImages, setPromoImages] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<HomeBannerItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const [imageUrl, setImageUrl] = useState("")
  const [title, setTitle] = useState("")
  const [couponId, setCouponId] = useState<string>("")
  const [displayOrder, setDisplayOrder] = useState<number>(0)
  const [isActive, setIsActive] = useState<boolean>(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [bannersList, couponsList, imagesList] = await Promise.all([
        bannersManager.getAllBanners().catch(() => []),
        couponsManager.getCoupons().catch(() => []),
        imageUploadManager.getAllImages().catch(() => []),
      ])
      // Prioriza banners e ordena os mais recentes
      const sortedImages = (imagesList || []).sort((a, b) => {
        const aIsBanner = a.name.toLowerCase().includes("banner") ? 1 : 0
        const bIsBanner = b.name.toLowerCase().includes("banner") ? 1 : 0
        return bIsBanner - aIsBanner
      })
      setBanners(bannersList)
      setCoupons(couponsList.filter((c) => c.isActive))
      setPromoImages(sortedImages)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditingBanner(null)
    setImageUrl("")
    setTitle("")
    setCouponId("")
    setDisplayOrder(banners.length > 0 ? banners[0].display_order + 1 : 0)
    setIsActive(true)
    setShowUrlInput(false)
    setModalOpen(true)
  }

  const handleOpenEdit = (b: HomeBannerItem) => {
    setEditingBanner(b)
    setImageUrl(b.image_url)
    setTitle(b.title || "")
    setCouponId(b.coupon_id || "")
    setDisplayOrder(b.display_order)
    setIsActive(b.is_active)
    setShowUrlInput(false)
    setModalOpen(true)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const ext = file.name.split(".").pop() || "jpg"
      const fileName = `home-banner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from("coupon-banners")
        .upload(fileName, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        })

      if (!storageErr) {
        const { data: pubData } = supabase.storage
          .from("coupon-banners")
          .getPublicUrl(fileName)
        if (pubData?.publicUrl) {
          setImageUrl(pubData.publicUrl)
          return
        }
      }

      const base64DataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      setImageUrl(base64DataUrl)
    } catch {
      appToast.error("Imagem inválida", "Não foi possível carregar a imagem selecionada.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUrl = imageUrl.trim()
    if (!cleanUrl) {
      appToast.warning("Campo obrigatório", "A URL ou imagem do banner é obrigatória.")
      return
    }

    if (!isSafeImageUrl(cleanUrl)) {
      appToast.warning("URL inválida", "Utilize URLs iniciando com https://, http://, / ou data:image/.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        image_url: cleanUrl,
        title: title.trim() || null,
        coupon_id: couponId ? couponId : null,
        display_order: Number(displayOrder) || 0,
        is_active: isActive,
      }

      if (editingBanner) {
        await bannersManager.updateBanner(editingBanner.id, payload)
      } else {
        await bannersManager.createBanner(payload)
      }

      setModalOpen(false)
      await loadData()
    } catch (err: any) {
      appToast.error("Erro ao salvar banner", err.message || "Falha ao salvar banner.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este banner?")) return
    try {
      await bannersManager.deleteBanner(id)
      await loadData()
    } catch (err: any) {
      appToast.error("Erro ao excluir", err.message || "Falha ao excluir banner.")
    }
  }

  const handleToggleStatus = async (b: HomeBannerItem) => {
    try {
      await bannersManager.updateBanner(b.id, { is_active: !b.is_active })
      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: !item.is_active } : item))
      )
    } catch {
      appToast.error("Erro de status", "Erro ao alterar status do banner.")
    }
  }

  return (
    <Card className="border-stone-200 shadow-sm mt-8">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#E3A008]" />
            Banners Promocionais da Home (App & Web)
          </CardTitle>
          <p className="text-xs text-stone-500 mt-1">
            Sincronizados em tempo real entre o Aplicativo Mobile e o Site.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-[#E3A008] hover:bg-[#C88A00] text-black font-semibold text-xs gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" /> Novo Banner
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-xs text-stone-500 animate-pulse">Carregando banners...</div>
        ) : banners.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 border border-dashed rounded-xl">
            Nenhum banner cadastrado. Clique em &quot;Novo Banner&quot; para adicionar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((b) => (
              <div
                key={b.id}
                className="group relative rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-shadow"
              >
                <div className="aspect-[16/9] relative bg-stone-100 overflow-hidden">
                  <img src={b.image_url} alt={b.title || "Banner"} className="w-full h-full object-cover" />
                  {!b.is_active && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold uppercase tracking-wider">
                      Inativo
                    </div>
                  )}
                  {b.coupon && (
                    <div className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#E3A008]" />
                      Cupom: {b.coupon.code}
                    </div>
                  )}
                </div>

                <div className="p-3 flex items-center justify-between gap-2 border-t border-stone-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-800 truncate">{b.title || "Sem título"}</p>
                    <p className="text-[10px] text-stone-400 flex items-center gap-1">
                      <ArrowUpDown className="w-2.5 h-2.5" /> Ordem: {b.display_order}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch checked={b.is_active} onCheckedChange={() => handleToggleStatus(b)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-stone-600 hover:text-stone-900" onClick={() => handleOpenEdit(b)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(b.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-stone-900">
                {editingBanner ? "Editar Banner Promocional" : "Novo Banner Promocional"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold text-stone-900">
                    Arte do Banner 16:9 (Obrigatório)
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-[11px] gap-1 px-2.5 border-stone-300 hover:bg-stone-50 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-stone-600" />
                      {uploading ? "Subindo..." : "Subir do Computador"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUrlInput((v) => !v)}
                      className={`h-7 text-[11px] gap-1 px-2 text-stone-600 hover:text-stone-900 cursor-pointer ${
                        showUrlInput ? "bg-stone-100 font-semibold" : ""
                      }`}
                      title="Inserir link externo"
                    >
                      <Link2 className="w-3 h-3" />
                      URL
                    </Button>
                  </div>
                </div>

                {/* Campo compacto de URL externa (aparece apenas quando solicitado) */}
                {showUrlInput && (
                  <div className="flex gap-1.5 mb-2.5 p-2 bg-stone-50 rounded-lg border border-stone-200">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Cole o link da imagem (ex: https://...)"
                      className="text-xs h-7 flex-1 bg-white"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUrlInput(false)}
                      className="h-7 w-7 p-0 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Galeria de Banners no Supabase com nomezinho em cima e miniatura embaixo */}
                {promoImages.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#E3A008]" />
                      Banners no Supabase (toque para escolher):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 py-1 rounded-lg border border-stone-200/80 p-2 bg-stone-50/50">
                      {promoImages.map((img) => {
                        const directUrl = `/api/images/${img.id}`
                        const dataUrl = img.data ? `data:${img.mimeType};base64,${img.data}` : directUrl
                        const isSelected =
                          imageUrl === directUrl ||
                          imageUrl === dataUrl ||
                          imageUrl.includes(img.id)

                        const friendlyName =
                          img.name
                            .replace(/\.[^/.]+$/, "")
                            .replace(/^banner[-_]?\d*[-_]?/i, "")
                            .replace(/[-_]/g, " ")
                            .toUpperCase() || img.name

                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => {
                              setImageUrl(directUrl)
                              if (!title) setTitle(friendlyName)
                            }}
                            className={`p-1.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between group ${
                              isSelected
                                ? "border-[#E3A008] bg-amber-500/10 ring-2 ring-[#E3A008]/40 shadow-xs"
                                : "border-stone-200 hover:border-stone-400 bg-white"
                            }`}
                          >
                            {/* Nomezinho em cima */}
                            <div className="flex items-center justify-between gap-1 mb-1 px-0.5">
                              <span
                                className={`text-[10px] font-bold truncate block ${
                                  isSelected ? "text-[#C1440E]" : "text-stone-700"
                                }`}
                                title={img.name}
                              >
                                {friendlyName}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-3 h-3 text-[#E3A008] shrink-0" />
                              )}
                            </div>

                            {/* Imagem pequena embaixo */}
                            <div className="w-full aspect-[16/9] rounded overflow-hidden bg-stone-100 border border-stone-200/50">
                              <img
                                src={dataUrl}
                                alt={img.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-lg border border-dashed border-stone-200 text-stone-400 text-xs">
                    Nenhum banner encontrado no Supabase. Clique em "Subir do Computador".
                  </div>
                )}

                {/* Banner Selecionado com destaque */}
                {Boolean(imageUrl) && (
                  <div className="mt-2.5 p-2 rounded-lg border border-[#E3A008]/40 bg-amber-50/40 flex items-center gap-3">
                    <div className="w-20 aspect-[16/9] rounded overflow-hidden shrink-0 border border-stone-200 bg-stone-100 shadow-2xs">
                      <img src={imageUrl} alt="Selecionado" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">
                        ✓ Imagem Selecionada
                      </span>
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {title || imageUrl}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageUrl("")}
                      className="h-7 text-[11px] text-stone-500 hover:text-red-600 cursor-pointer"
                    >
                      Trocar
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold">Título do Banner (Opcional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Combo do Fim de Semana" className="mt-1 text-xs" />
              </div>

              <div>
                <Label className="text-xs font-semibold">Cupom Vinculado (Copiado ao Clicar)</Label>
                <select
                  value={couponId}
                  onChange={(e) => setCouponId(e.target.value)}
                  className="mt-1 w-full text-xs rounded-md border border-stone-200 bg-white px-3 py-2 text-stone-800"
                >
                  <option value="">Nenhum cupom vinculado</option>
                  {coupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — ({c.type === "percentage" ? `${c.discount}%` : `R$ ${c.discount}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Ordem de Exibição</Label>
                  <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)} className="mt-1 text-xs" />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-2 h-9">
                    <Switch checked={isActive} onCheckedChange={setIsActive} id="banner-active" />
                    <Label htmlFor="banner-active" className="text-xs font-semibold cursor-pointer">Ativo na Home</Label>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs cursor-pointer">Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-[#E3A008] hover:bg-[#C88A00] text-black font-semibold text-xs cursor-pointer">
                  {saving ? "Salvando..." : "Salvar Banner"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
