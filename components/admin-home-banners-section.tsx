"use client"

import { useState, useEffect } from "react"
import { bannersManager, isSafeImageUrl, type HomeBannerItem } from "@/lib/banners-manager"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { imageUploadManager, type UploadedImage } from "@/lib/image-upload-manager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Edit2, Image as ImageIcon, Tag, ArrowUpDown, Sparkles } from "lucide-react"

export function AdminHomeBannersSection() {
  const [banners, setBanners] = useState<HomeBannerItem[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [promoImages, setPromoImages] = useState<UploadedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<HomeBannerItem | null>(null)
  const [saving, setSaving] = useState(false)

  const [imageUrl, setImageUrl] = useState("")
  const [title, setTitle] = useState("")
  const [couponId, setCouponId] = useState<string>("")
  const [displayOrder, setDisplayOrder] = useState<number>(0)
  const [isActive, setIsActive] = useState<boolean>(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [bannersList, couponsList, imagesList] = await Promise.all([
        bannersManager.getAllBanners(),
        couponsManager.getCoupons(),
        imageUploadManager.getImagesByCategory("promo").catch(() => []),
      ])
      setBanners(bannersList)
      setCoupons(couponsList.filter((c) => c.isActive))
      setPromoImages(imagesList)
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
    setModalOpen(true)
  }

  const handleOpenEdit = (b: HomeBannerItem) => {
    setEditingBanner(b)
    setImageUrl(b.image_url)
    setTitle(b.title || "")
    setCouponId(b.coupon_id || "")
    setDisplayOrder(b.display_order)
    setIsActive(b.is_active)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUrl = imageUrl.trim()
    if (!cleanUrl) {
      alert("A URL da imagem é obrigatória.")
      return
    }

    if (!isSafeImageUrl(cleanUrl)) {
      alert("URL de imagem inválida ou insegura. Utilize URLs iniciando com https://, http://, / ou data:image/.")
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
      alert(`Erro ao salvar banner: ${err.message || err}`)
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
      alert(`Erro ao excluir: ${err.message || err}`)
    }
  }

  const handleToggleStatus = async (b: HomeBannerItem) => {
    try {
      await bannersManager.updateBanner(b.id, { is_active: !b.is_active })
      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: !item.is_active } : item))
      )
    } catch {
      alert("Erro ao alterar status.")
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
                <div className="aspect-[21/9] relative bg-stone-100 overflow-hidden">
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-stone-900">
                {editingBanner ? "Editar Banner Promocional" : "Novo Banner Promocional"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div>
                <Label className="text-xs font-semibold">URL da Imagem (Obrigatório)</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." required className="mt-1 text-xs" />
                {promoImages.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Ou selecionar do Banco de Imagens:
                    </span>
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {promoImages.slice(0, 6).map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setImageUrl(`data:${img.mimeType};base64,${img.data}`)}
                          className="w-12 h-8 rounded border border-stone-200 overflow-hidden shrink-0 hover:border-[#E3A008] transition-colors"
                        >
                          <img src={`data:${img.mimeType};base64,${img.data}`} alt="Thumb" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
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
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs">Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-[#E3A008] hover:bg-[#C88A00] text-black font-semibold text-xs">
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
