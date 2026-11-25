"use client"

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react"
import {
  AlertCircle,
  Check,
  Compass,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Package,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  type Category,
  type CategoryIconType,
  type CategoryKind,
  type CategoryWithCounts,
  type MenuLayoutZone,
} from "@/lib/categories-db"
import {
  ACCENT_COLOR_PRESETS,
  ALLOWED_CATEGORY_ICON_MIME_TYPES,
  BADGE_PRESETS,
  FALLBACK_ICON_NAMES,
  MAX_CATEGORY_ICON_BYTES,
  PRESET_3D_ICONS,
  isSafeCategoryHref,
  sanitizeCategorySlug,
} from "@/lib/category-icons"
import { CategoryIcon, getLucideIconComponent } from "@/components/category-icon"
import {
  createCategoryAction,
  updateCategoryAction,
  uploadCategoryIconAction,
  type CategoryFormInput,
} from "@/app/admin/categorias/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export interface CategoryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCategory: CategoryWithCounts | null
  nextOrders: { homeBar: number; homeFeatured: number; menu: number }
  onSaved: (saved: Category) => void
}

type FieldErrors = Partial<
  Record<
    | "name"
    | "slug"
    | "custom_href"
    | "icon"
    | "accent_color"
    | "badge_color"
    | "home_featured_limit"
    | "form",
    string
  >
>

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

function isStorageCategoryIconUrl(url?: string | null): boolean {
  return Boolean(url && url.includes("/storage/v1/object/public/category-icons/"))
}

export function CategoryFormModal({
  open,
  onOpenChange,
  initialCategory,
  nextOrders,
  onSaved,
}: CategoryFormModalProps) {
  const isEdit = Boolean(initialCategory)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [kind, setKind] = useState<CategoryKind>("product_category")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [customHref, setCustomHref] = useState("/cardapio")

  const [iconType, setIconType] = useState<CategoryIconType>("preset_3d")
  const [presetIconUrl, setPresetIconUrl] = useState<string>(PRESET_3D_ICONS[0]?.path || "")
  const [uploadedIconUrl, setUploadedIconUrl] = useState<string>("")
  const [originalStorageUrl, setOriginalStorageUrl] = useState<string | null>(null)
  const [removeOldOnReplace, setRemoveOldOnReplace] = useState(true)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [pendingRetryFile, setPendingRetryFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [fallbackIcon, setFallbackIcon] = useState<string>("UtensilsCrossed")
  const [accentColor, setAccentColor] = useState<string>("#E3A008")

  const [badgeText, setBadgeText] = useState("")
  const [badgeColor, setBadgeColor] = useState("#C1440E")

  const [isActive, setIsActive] = useState(true)
  const [showOnHomeBar, setShowOnHomeBar] = useState(true)
  const [showOnHomeFeatured, setShowOnHomeFeatured] = useState(false)
  const [homeFeaturedLimit, setHomeFeaturedLimit] = useState(6)
  const [showOnMenu, setShowOnMenu] = useState(true)
  const [menuLayoutZone, setMenuLayoutZone] = useState<MenuLayoutZone>("main")

  const [allowsAddons, setAllowsAddons] = useState(true)
  const [allowsNotes, setAllowsNotes] = useState(true)
  const [showRanking, setShowRanking] = useState(true)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!open) return

    if (initialCategory) {
      setKind(initialCategory.kind)
      setName(initialCategory.name)
      setSlug(initialCategory.slug)
      setSlugManuallyEdited(true)
      setDescription(initialCategory.description || "")
      setCustomHref(initialCategory.custom_href || "/cardapio")

      setIconType(initialCategory.icon_type)
      if (initialCategory.icon_type === "preset_3d" && initialCategory.icon_url) {
        setPresetIconUrl(initialCategory.icon_url)
      } else {
        setPresetIconUrl(PRESET_3D_ICONS[0]?.path || "")
      }

      if (initialCategory.icon_type === "upload" && initialCategory.icon_url) {
        setUploadedIconUrl(initialCategory.icon_url)
        setOriginalStorageUrl(
          isStorageCategoryIconUrl(initialCategory.icon_url) ? initialCategory.icon_url : null
        )
      } else {
        setUploadedIconUrl("")
        setOriginalStorageUrl(null)
      }

      setFallbackIcon(initialCategory.fallback_icon || "UtensilsCrossed")
      setAccentColor(initialCategory.accent_color || "#E3A008")
      setBadgeText(initialCategory.badge_text || "")
      setBadgeColor(initialCategory.badge_color || "#C1440E")

      setIsActive(initialCategory.is_active)
      setShowOnHomeBar(initialCategory.show_on_home_bar)
      setShowOnHomeFeatured(initialCategory.show_on_home_featured)
      setHomeFeaturedLimit(initialCategory.home_featured_limit || 6)
      setShowOnMenu(initialCategory.show_on_menu)
      setMenuLayoutZone(initialCategory.menu_layout_zone || "main")

      setAllowsAddons(initialCategory.allows_addons)
      setAllowsNotes(initialCategory.allows_notes)
      setShowRanking(initialCategory.show_ranking)
    } else {
      setKind("product_category")
      setName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setDescription("")
      setCustomHref("/cardapio")

      setIconType("preset_3d")
      setPresetIconUrl(PRESET_3D_ICONS[0]?.path || "")
      setUploadedIconUrl("")
      setOriginalStorageUrl(null)

      setFallbackIcon("UtensilsCrossed")
      setAccentColor("#E3A008")
      setBadgeText("")
      setBadgeColor("#C1440E")

      setIsActive(true)
      setShowOnHomeBar(true)
      setShowOnHomeFeatured(false)
      setHomeFeaturedLimit(6)
      setShowOnMenu(true)
      setMenuLayoutZone("main")

      setAllowsAddons(true)
      setAllowsNotes(true)
      setShowRanking(true)
    }

    setRemoveOldOnReplace(true)
    setPendingRetryFile(null)
    setErrors({})
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [open, initialCategory])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const activeIconUrl =
    iconType === "upload"
      ? localPreviewUrl || uploadedIconUrl || null
      : iconType === "preset_3d"
        ? presetIconUrl || null
        : null

  const hasExistingStorageIcon = Boolean(
    originalStorageUrl || isStorageCategoryIconUrl(uploadedIconUrl)
  )

  const safeAccentPreview = HEX_COLOR_REGEX.test(accentColor) ? accentColor : "#E3A008"
  const safeBadgePreview = HEX_COLOR_REGEX.test(badgeColor) ? badgeColor : "#C1440E"

  function handleNameChange(value: string) {
    setName(value)
    if (!isEdit && !slugManuallyEdited) {
      setSlug(sanitizeCategorySlug(value))
    }
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
  }

  function handleSlugChange(value: string) {
    if (isEdit) return
    setSlugManuallyEdited(true)
    setSlug(sanitizeCategorySlug(value))
    if (errors.slug) setErrors((prev) => ({ ...prev, slug: undefined }))
  }

  function validateUploadFile(file: File): string | null {
    if (!ALLOWED_CATEGORY_ICON_MIME_TYPES.includes(file.type as any)) {
      return "Formato não suportado. Envie PNG, WebP, JPG ou SVG."
    }
    if (file.size <= 0 || file.size > MAX_CATEGORY_ICON_BYTES) {
      return "A imagem ultrapassa o limite máximo de 2MB."
    }
    return null
  }

  async function performFileUpload(file: File) {
    const validationErr = validateUploadFile(file)
    if (validationErr) {
      setErrors((prev) => ({ ...prev, icon: validationErr }))
      toast.error(validationErr)
      return
    }

    setErrors((prev) => ({ ...prev, icon: undefined }))
    setPendingRetryFile(file)
    setIconType("upload")

    const preview = URL.createObjectURL(file)
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return preview
    })

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const oldUrlToDelete = originalStorageUrl || (isStorageCategoryIconUrl(uploadedIconUrl) ? uploadedIconUrl : "")
      formData.append("removeOld", String(removeOldOnReplace && Boolean(oldUrlToDelete)))
      if (oldUrlToDelete) {
        formData.append("oldUrl", oldUrlToDelete)
      }

      const result = await uploadCategoryIconAction(formData)
      if (!result.ok) {
        setErrors((prev) => ({ ...prev, icon: result.error }))
        toast.error(result.error)
        return
      }

      setUploadedIconUrl(result.data.publicUrl)
      setOriginalStorageUrl(result.data.publicUrl)
      setPendingRetryFile(null)
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      toast.success("Ícone enviado com sucesso!")
    } catch {
      const msg = "Falha ao enviar a imagem. Tente novamente."
      setErrors((prev) => ({ ...prev, icon: msg }))
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    void performFileUpload(file)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (uploading || saving) return
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    void performFileUpload(file)
  }

  function validateForm(): FieldErrors {
    const next: FieldErrors = {}
    const trimmedName = name.trim()

    if (trimmedName.length < 2) {
      next.name = "Informe pelo menos 2 caracteres para o nome."
    } else if (trimmedName.length > 60) {
      next.name = "Nome deve ter no máximo 60 caracteres."
    }

    if (!isEdit) {
      const sanitized = sanitizeCategorySlug(slug || trimmedName)
      if (!sanitized) {
        next.slug = "Informe um slug válido (letras ou números)."
      }
    }

    if (kind === "home_shortcut" && customHref.trim()) {
      const href = customHref.trim()
      if (!isSafeCategoryHref(href)) {
        next.custom_href = "Use um link seguro começando com / (sem //) ou https://."
      }
    }

    if (iconType === "upload" && !uploadedIconUrl) {
      next.icon = "Envie uma imagem válida para usar o modo de upload."
    }

    if (!HEX_COLOR_REGEX.test(accentColor)) {
      next.accent_color = "Use um código hexadecimal válido (#RRGGBB)."
    }

    if (badgeText.trim() && !HEX_COLOR_REGEX.test(badgeColor)) {
      next.badge_color = "Cor do selo inválida (#RRGGBB)."
    }

    if (kind === "product_category" && showOnHomeFeatured) {
      if (!Number.isInteger(homeFeaturedLimit) || homeFeaturedLimit < 1 || homeFeaturedLimit > 24) {
        next.home_featured_limit = "Informe um limite entre 1 e 24."
      }
    }

    return next
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving || uploading) return

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error("Revise os campos destacados antes de salvar.")
      return
    }

    setErrors({})
    setSaving(true)

    const payload: CategoryFormInput = {
      name: name.trim(),
      slug: isEdit ? initialCategory?.slug : sanitizeCategorySlug(slug || name),
      description: description.trim() || null,
      kind,
      icon_type: iconType,
      icon_url:
        iconType === "upload"
          ? uploadedIconUrl || null
          : iconType === "preset_3d"
            ? presetIconUrl || null
            : null,
      fallback_icon: fallbackIcon || "UtensilsCrossed",
      accent_color: accentColor,
      badge_text: badgeText.trim() || null,
      badge_color: badgeText.trim() ? (badgeColor || "#C1440E") : null,
      custom_href: kind === "home_shortcut" ? customHref.trim() || "/cardapio" : null,
      is_active: isActive,
      show_on_home_bar: showOnHomeBar,
      home_bar_order: initialCategory ? initialCategory.home_bar_order : nextOrders.homeBar,
      show_on_home_featured: kind === "product_category" ? showOnHomeFeatured : false,
      home_featured_order: initialCategory
        ? initialCategory.home_featured_order
        : nextOrders.homeFeatured,
      home_featured_limit: Math.min(24, Math.max(1, Number(homeFeaturedLimit) || 6)),
      show_on_menu: kind === "product_category" ? showOnMenu : false,
      menu_order: initialCategory ? initialCategory.menu_order : nextOrders.menu,
      menu_layout_zone: menuLayoutZone,
      allows_addons: kind === "product_category" ? allowsAddons : false,
      allows_notes: kind === "product_category" ? allowsNotes : false,
      show_ranking: kind === "product_category" ? showRanking : false,
    }

    try {
      const result = isEdit && initialCategory
        ? await updateCategoryAction(initialCategory.id, payload)
        : await createCategoryAction(payload)

      if (!result.ok) {
        setErrors({ form: result.error })
        toast.error(result.error)
        return
      }

      toast.success(
        isEdit ? "Categoria atualizada com sucesso!" : "Categoria criada com sucesso!"
      )
      onSaved(result.data)
      onOpenChange(false)
    } catch {
      const msg = "Erro inesperado ao salvar categoria."
      setErrors({ form: msg })
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const linkedProductsCount = initialCategory?.total_products ?? 0
  const disableShortcutKind = isEdit && linkedProductsCount > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving || uploading) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[#ECE7E0] text-[#1F1B16] p-0">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#ECE7E0] bg-[#F7F5F0]/70">
            <DialogTitle className="text-xl font-bold text-[#1F1B16]">
              {isEdit ? `Editar categoria: ${initialCategory?.name}` : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription className="text-[#1F1B16]/70">
              Configure identidade visual, visibilidade na Home/Cardápio e regras de negócio.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-6">
            {errors.form && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#C1440E]/30 bg-[#C1440E]/8 px-3.5 py-3 text-sm text-[#C1440E]"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {/* Kind Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#1F1B16]">Tipo de Categoria</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setKind("product_category")}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    kind === "product_category"
                      ? "bg-[#FEF8EC] border-[#E3A008] ring-2 ring-[#E3A008]/25"
                      : "bg-white border-[#ECE7E0] hover:bg-[#F7F5F0]/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      kind === "product_category"
                        ? "bg-[#E3A008] text-white"
                        : "bg-[#F7F5F0] text-[#1F1B16]/70"
                    }`}
                  >
                    <Package className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B16]">Categoria de Produto</div>
                    <p className="text-xs text-[#1F1B16]/65 mt-0.5">
                      Agrupa produtos no cardápio, destaques da Home e regras de adicionais.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={disableShortcutKind}
                  onClick={() => setKind("home_shortcut")}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    disableShortcutKind ? "opacity-55 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    kind === "home_shortcut"
                      ? "bg-[#FEF8EC] border-[#E3A008] ring-2 ring-[#E3A008]/25"
                      : "bg-white border-[#ECE7E0] hover:bg-[#F7F5F0]/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      kind === "home_shortcut"
                        ? "bg-[#E3A008] text-white"
                        : "bg-[#F7F5F0] text-[#1F1B16]/70"
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#1F1B16]">Atalho da Home</div>
                    <p className="text-xs text-[#1F1B16]/65 mt-0.5">
                      Botão rápido na barra 3D da Home (ex.: Cardápio, Cupons, Promoções).
                    </p>
                    {disableShortcutKind && (
                      <p className="text-[11px] font-medium text-[#C1440E] mt-1">
                        Indisponível: possui {linkedProductsCount} produto(s) vinculado(s).
                      </p>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Nome & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name" className="text-sm font-medium text-[#1F1B16]">
                  Nome <span className="text-[#C1440E]">*</span>
                </Label>
                <Input
                  id="cat-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  maxLength={60}
                  placeholder="Ex.: Batatas Recheadas"
                  className="bg-white border-[#ECE7E0] focus-visible:border-[#E3A008] focus-visible:ring-[#E3A008]/25"
                />
                {errors.name && <p className="text-xs text-[#C1440E]">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="cat-slug"
                  className="text-sm font-medium text-[#1F1B16] flex items-center gap-1.5"
                >
                  <span>Slug (URL)</span>
                  {isEdit && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F5F0] border border-[#ECE7E0] px-2 py-0.5 text-[11px] font-normal text-[#1F1B16]/70">
                      <Lock className="w-3 h-3 text-[#C1440E]" />
                      Protegido
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="cat-slug"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    readOnly={isEdit}
                    disabled={isEdit}
                    maxLength={48}
                    placeholder="batatas-recheadas"
                    className={`font-mono text-sm border-[#ECE7E0] ${
                      isEdit
                        ? "bg-[#F7F5F0] text-[#1F1B16]/65 pr-9 cursor-not-allowed"
                        : "bg-white focus-visible:border-[#E3A008] focus-visible:ring-[#E3A008]/25"
                    }`}
                  />
                  {isEdit && (
                    <Lock className="w-4 h-4 text-[#1F1B16]/45 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>
                {isEdit ? (
                  <p className="text-[11px] text-[#1F1B16]/60">
                    Bloqueado na edição para nunca quebrar links existentes nem produtos legados.
                  </p>
                ) : errors.slug ? (
                  <p className="text-xs text-[#C1440E]">{errors.slug}</p>
                ) : (
                  <p className="text-[11px] text-[#1F1B16]/60">
                    Gerado automaticamente a partir do nome.
                  </p>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-description" className="text-sm font-medium text-[#1F1B16]">
                  Descrição
                </Label>
                <span className="text-[11px] text-[#1F1B16]/50">{description.length}/240</span>
              </div>
              <Textarea
                id="cat-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={240}
                rows={2}
                placeholder="Breve descrição exibida abaixo do título da categoria"
                className="bg-white border-[#ECE7E0] focus-visible:border-[#E3A008] focus-visible:ring-[#E3A008]/25 resize-none"
              />
            </div>

            {/* Link customizado (home_shortcut only) */}
            {kind === "home_shortcut" && (
              <div className="space-y-1.5 rounded-xl border border-[#ECE7E0] bg-[#FEF8EC]/60 p-4">
                <Label
                  htmlFor="cat-custom-href"
                  className="text-sm font-semibold text-[#1F1B16] flex items-center gap-1.5"
                >
                  <Link2 className="w-4 h-4 text-[#C1440E]" />
                  Link customizado
                </Label>
                <Input
                  id="cat-custom-href"
                  value={customHref}
                  onChange={(e) => {
                    setCustomHref(e.target.value)
                    if (errors.custom_href) setErrors((prev) => ({ ...prev, custom_href: undefined }))
                  }}
                  maxLength={300}
                  placeholder="/cardapio ou /cupons"
                  className="bg-white border-[#ECE7E0] focus-visible:border-[#E3A008] focus-visible:ring-[#E3A008]/25"
                />
                {errors.custom_href ? (
                  <p className="text-xs text-[#C1440E]">{errors.custom_href}</p>
                ) : (
                  <p className="text-[11px] text-[#1F1B16]/65">
                    Caminho interno (ex.: <code className="font-mono">/cardapio</code>,{" "}
                    <code className="font-mono">/cupons</code>) ou URL externa{" "}
                    <code className="font-mono">https://</code>.
                  </p>
                )}
              </div>
            )}

            {/* Visual Icon Configurator */}
            <div className="rounded-2xl border border-[#ECE7E0] bg-[#F7F5F0]/55 p-4 space-y-4">
              {/* Live preview header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#ECE7E0]">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-[#ECE7E0] shadow-xs">
                    <CategoryIcon
                      iconUrl={activeIconUrl}
                      iconType={iconType}
                      fallbackIcon={fallbackIcon}
                      accentColor={safeAccentPreview}
                      alt={name || "Prévia do ícone"}
                      sizeClassName="w-12 h-12"
                      iconClassName="w-6 h-6"
                    />
                    {badgeText.trim() && (
                      <span
                        style={{ backgroundColor: safeBadgePreview }}
                        className="absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                      >
                        {badgeText.trim()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1F1B16]">
                      Ícone & Identidade Visual
                    </div>
                    <p className="text-xs text-[#1F1B16]/65 mt-0.5">
                      Prévia em tempo real • Reserva:{" "}
                      <span className="font-medium text-[#1F1B16]">{fallbackIcon}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        style={{ backgroundColor: safeAccentPreview }}
                        className="inline-block h-3 w-3 rounded-full border border-black/10"
                      />
                      <span className="text-[11px] font-mono text-[#1F1B16]/70">
                        {accentColor.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs
                value={iconType}
                onValueChange={(v) => {
                  setIconType(v as CategoryIconType)
                  if (errors.icon) setErrors((prev) => ({ ...prev, icon: undefined }))
                }}
              >
                <TabsList className="grid w-full grid-cols-3 bg-white border border-[#ECE7E0] h-10 p-1 rounded-xl">
                  <TabsTrigger
                    value="upload"
                    className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-[#FEF8EC] data-[state=active]:text-[#1F1B16] data-[state=active]:border-[#E3A008]/40"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger
                    value="preset_3d"
                    className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-[#FEF8EC] data-[state=active]:text-[#1F1B16] data-[state=active]:border-[#E3A008]/40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Presets 3D
                  </TabsTrigger>
                  <TabsTrigger
                    value="lucide"
                    className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-[#FEF8EC] data-[state=active]:text-[#1F1B16] data-[state=active]:border-[#E3A008]/40"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Ícone Lucide
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Upload */}
                <TabsContent value="upload" className="pt-3 space-y-3">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (!uploading && !saving) setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
                      isDragging
                        ? "border-[#E3A008] bg-[#FEF8EC]"
                        : "border-[#ECE7E0] bg-white hover:border-[#E3A008]/60"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_CATEGORY_ICON_MIME_TYPES.join(",")}
                      onChange={handleFileInputChange}
                      className="hidden"
                      disabled={uploading || saving}
                    />

                    <div className="flex flex-col items-center gap-2.5">
                      {uploadedIconUrl || localPreviewUrl ? (
                        <div className="flex items-center gap-3">
                          <CategoryIcon
                            iconUrl={localPreviewUrl || uploadedIconUrl}
                            iconType="upload"
                            fallbackIcon={fallbackIcon}
                            accentColor={safeAccentPreview}
                            sizeClassName="w-14 h-14"
                          />
                          <div className="text-left">
                            <p className="text-sm font-medium text-[#1F1B16]">
                              {uploading
                                ? "Enviando imagem..."
                                : uploadedIconUrl
                                  ? "Imagem carregada"
                                  : "Prévia local pronta"}
                            </p>
                            <p className="text-xs text-[#1F1B16]/60">
                              PNG, WebP, JPG ou SVG • Máximo 2MB
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF8EC] text-[#C1440E]">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1F1B16]">
                              Arraste o ícone aqui ou selecione um arquivo
                            </p>
                            <p className="text-xs text-[#1F1B16]/60 mt-0.5">
                              PNG, WebP, JPG ou SVG • Tamanho máximo 2MB
                            </p>
                          </div>
                        </>
                      )}

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploading || saving}
                          onClick={() => fileInputRef.current?.click()}
                          className="border-[#ECE7E0] bg-white hover:bg-[#FEF8EC] text-[#1F1B16]"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              {uploadedIconUrl ? "Substituir imagem" : "Escolher arquivo"}
                            </>
                          )}
                        </Button>

                        {pendingRetryFile && !uploading && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void performFileUpload(pendingRetryFile)}
                            className="bg-[#E3A008] hover:bg-[#C1440E] text-white"
                          >
                            Tentar enviar novamente
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {hasExistingStorageIcon && (
                    <label className="flex items-center gap-2.5 rounded-lg bg-white border border-[#ECE7E0] px-3 py-2.5 cursor-pointer">
                      <Checkbox
                        checked={removeOldOnReplace}
                        onCheckedChange={(checked) => setRemoveOldOnReplace(checked === true)}
                        disabled={uploading || saving}
                      />
                      <span className="text-xs text-[#1F1B16]/80">
                        Remover imagem anterior do Storage ao substituir
                      </span>
                    </label>
                  )}

                  {errors.icon && <p className="text-xs text-[#C1440E]">{errors.icon}</p>}
                </TabsContent>

                {/* Tab 2: Presets 3D */}
                <TabsContent value="preset_3d" className="pt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PRESET_3D_ICONS.map((preset) => {
                      const selected = iconType === "preset_3d" && presetIconUrl === preset.path
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setPresetIconUrl(preset.path)
                            setIconType("preset_3d")
                          }}
                          className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all cursor-pointer ${
                            selected
                              ? "bg-[#FEF8EC] border-[#E3A008] ring-2 ring-[#E3A008]/35"
                              : "bg-white border-[#ECE7E0] hover:bg-[#FEF8EC]/50"
                          }`}
                        >
                          {selected && (
                            <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E3A008] text-white">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                          <img
                            src={preset.path}
                            alt={preset.label}
                            className="w-12 h-12 object-contain select-none"
                          />
                          <span className="text-xs font-medium text-[#1F1B16] text-center leading-tight">
                            {preset.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </TabsContent>

                {/* Tab 3: Lucide + Accent Color */}
                <TabsContent value="lucide" className="pt-3 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-[#1F1B16]/65">
                      Ícone Lucide (também usado como ícone de reserva)
                    </Label>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                      {FALLBACK_ICON_NAMES.map((iconName) => {
                        const IconComp = getLucideIconComponent(iconName)
                        const selected = fallbackIcon === iconName
                        return (
                          <button
                            key={iconName}
                            type="button"
                            title={iconName}
                            onClick={() => setFallbackIcon(iconName)}
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 transition-all cursor-pointer ${
                              selected
                                ? "bg-[#FEF8EC] border-[#E3A008] ring-2 ring-[#E3A008]/35 text-[#C1440E]"
                                : "bg-white border-[#ECE7E0] text-[#1F1B16]/75 hover:bg-[#FEF8EC]/50"
                            }`}
                          >
                            <IconComp className="w-5 h-5" />
                            <span className="text-[10px] truncate w-full text-center">
                              {iconName}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Always-accessible Accent Color + Fallback Icon summary row */}
              <div className="pt-3 border-t border-[#ECE7E0] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#1F1B16]">
                    Cor de destaque (Accent)
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ACCENT_COLOR_PRESETS.map((preset) => {
                      const active = accentColor.toLowerCase() === preset.hex.toLowerCase()
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          title={preset.label}
                          onClick={() => {
                            setAccentColor(preset.hex)
                            if (errors.accent_color) {
                              setErrors((prev) => ({ ...prev, accent_color: undefined }))
                            }
                          }}
                          style={{ backgroundColor: preset.hex }}
                          className={`h-7 w-7 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                            active
                              ? "scale-110 ring-2 ring-offset-2 ring-[#1F1B16] border-white"
                              : "border-black/15 hover:scale-105"
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                        </button>
                      )
                    })}
                    <div className="flex items-center gap-1.5 ml-1">
                      <input
                        type="color"
                        aria-label="Selecionar cor de destaque"
                        value={safeAccentPreview}
                        onChange={(e) => {
                          setAccentColor(e.target.value.toUpperCase())
                          if (errors.accent_color) {
                            setErrors((prev) => ({ ...prev, accent_color: undefined }))
                          }
                        }}
                        className="h-7 w-8 cursor-pointer rounded border border-[#ECE7E0] bg-white p-0.5"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => {
                          setAccentColor(e.target.value.toUpperCase())
                          if (errors.accent_color) {
                            setErrors((prev) => ({ ...prev, accent_color: undefined }))
                          }
                        }}
                        maxLength={7}
                        placeholder="#E3A008"
                        className="h-7 w-24 font-mono text-xs bg-white border-[#ECE7E0]"
                      />
                    </div>
                  </div>
                  {errors.accent_color && (
                    <p className="text-xs text-[#C1440E]">{errors.accent_color}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-[#1F1B16]">
                    Ícone de reserva (fallback)
                  </Label>
                  <Select value={fallbackIcon} onValueChange={setFallbackIcon}>
                    <SelectTrigger className="w-full h-9 bg-white border-[#ECE7E0] text-sm">
                      <SelectValue placeholder="Escolha um ícone" />
                    </SelectTrigger>
                    <SelectContent className="z-[150] bg-white border-[#ECE7E0] max-h-60">
                      {FALLBACK_ICON_NAMES.map((iconName) => {
                        const IconComp = getLucideIconComponent(iconName)
                        return (
                          <SelectItem key={iconName} value={iconName}>
                            <span className="inline-flex items-center gap-2">
                              <IconComp className="w-4 h-4 text-[#C1440E]" />
                              <span>{iconName}</span>
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Badge / Selo Opcional */}
            <div className="rounded-2xl border border-[#ECE7E0] bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#C1440E]" />
                <span className="text-sm font-semibold text-[#1F1B16]">
                  Selo / Badge (opcional)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {BADGE_PRESETS.map((preset) => {
                  const selected =
                    badgeText.toUpperCase() === preset.text &&
                    badgeColor.toLowerCase() === preset.color.toLowerCase()
                  return (
                    <button
                      key={preset.text}
                      type="button"
                      onClick={() => {
                        setBadgeText(preset.text)
                        setBadgeColor(preset.color)
                        if (errors.badge_color) {
                          setErrors((prev) => ({ ...prev, badge_color: undefined }))
                        }
                      }}
                      style={{
                        backgroundColor: selected ? preset.color : `${preset.color}16`,
                        color: selected ? "#FFFFFF" : preset.color,
                        borderColor: `${preset.color}40`,
                      }}
                      className="rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide transition-all cursor-pointer"
                    >
                      {preset.text}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => {
                    setBadgeText("")
                    if (errors.badge_color) {
                      setErrors((prev) => ({ ...prev, badge_color: undefined }))
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ECE7E0] bg-[#F7F5F0] px-2.5 py-1 text-xs font-medium text-[#1F1B16]/75 hover:bg-[#ECE7E0] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-badge-text" className="text-xs font-medium text-[#1F1B16]/80">
                    Texto do selo (máx. 20 caracteres)
                  </Label>
                  <Input
                    id="cat-badge-text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    maxLength={20}
                    placeholder="Ex.: NOVO, PROMO, CHEF..."
                    className="bg-white border-[#ECE7E0] focus-visible:border-[#E3A008]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cat-badge-color" className="text-xs font-medium text-[#1F1B16]/80">
                    Cor do selo
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cat-badge-color"
                      type="color"
                      value={safeBadgePreview}
                      onChange={(e) => {
                        setBadgeColor(e.target.value.toUpperCase())
                        if (errors.badge_color) {
                          setErrors((prev) => ({ ...prev, badge_color: undefined }))
                        }
                      }}
                      className="h-9 w-10 cursor-pointer rounded-md border border-[#ECE7E0] bg-white p-1"
                    />
                    <Input
                      value={badgeColor}
                      onChange={(e) => {
                        setBadgeColor(e.target.value.toUpperCase())
                        if (errors.badge_color) {
                          setErrors((prev) => ({ ...prev, badge_color: undefined }))
                        }
                      }}
                      maxLength={7}
                      className="w-24 font-mono text-xs bg-white border-[#ECE7E0]"
                    />
                  </div>
                </div>
              </div>
              {errors.badge_color && (
                <p className="text-xs text-[#C1440E]">{errors.badge_color}</p>
              )}
            </div>

            {/* Visibilidade e Layout */}
            <div className="rounded-2xl border border-[#ECE7E0] bg-[#F7F5F0]/55 p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C1440E]" />
                <span className="text-sm font-semibold text-[#1F1B16]">
                  Visibilidade & Layout
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-xl bg-white border border-[#ECE7E0] px-3.5 py-2.5">
                  <div>
                    <Label htmlFor="sw-active" className="text-sm font-medium text-[#1F1B16] cursor-pointer">
                      Categoria ativa
                    </Label>
                    <p className="text-xs text-[#1F1B16]/60">
                      Desativar oculta a categoria da loja sem apagar produtos.
                    </p>
                  </div>
                  <Switch
                    id="sw-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    className="data-[state=checked]:bg-[#E3A008]"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl bg-white border border-[#ECE7E0] px-3.5 py-2.5">
                  <div>
                    <Label htmlFor="sw-home-bar" className="text-sm font-medium text-[#1F1B16] cursor-pointer">
                      Exibir na barra 3D da Home
                    </Label>
                    <p className="text-xs text-[#1F1B16]/60">
                      Mostra o atalho visual na faixa superior de categorias da página inicial.
                    </p>
                  </div>
                  <Switch
                    id="sw-home-bar"
                    checked={showOnHomeBar}
                    onCheckedChange={setShowOnHomeBar}
                    className="data-[state=checked]:bg-[#E3A008]"
                  />
                </div>

                {kind === "product_category" && (
                  <>
                    <div className="rounded-xl bg-white border border-[#ECE7E0] px-3.5 py-2.5 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Label
                            htmlFor="sw-home-featured"
                            className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                          >
                            Exibir nos destaques da Home
                          </Label>
                          <p className="text-xs text-[#1F1B16]/60">
                            Cria uma vitrine de produtos desta categoria na página inicial.
                          </p>
                        </div>
                        <Switch
                          id="sw-home-featured"
                          checked={showOnHomeFeatured}
                          onCheckedChange={setShowOnHomeFeatured}
                          className="data-[state=checked]:bg-[#E3A008]"
                        />
                      </div>

                      {showOnHomeFeatured && (
                        <div className="pt-2 border-t border-[#ECE7E0] flex flex-wrap items-center justify-between gap-3">
                          <Label
                            htmlFor="cat-featured-limit"
                            className="text-xs font-medium text-[#1F1B16]/80"
                          >
                            Quantidade máxima de produtos na Home (1 a 24)
                          </Label>
                          <div className="flex flex-col items-end">
                            <Input
                              id="cat-featured-limit"
                              type="number"
                              min={1}
                              max={24}
                              value={homeFeaturedLimit}
                              onChange={(e) => {
                                const parsed = Number.parseInt(e.target.value, 10)
                                setHomeFeaturedLimit(Number.isNaN(parsed) ? 1 : parsed)
                                if (errors.home_featured_limit) {
                                  setErrors((prev) => ({ ...prev, home_featured_limit: undefined }))
                                }
                              }}
                              className="w-24 h-8 text-center bg-white border-[#ECE7E0]"
                            />
                            {errors.home_featured_limit && (
                              <p className="text-xs text-[#C1440E] mt-1">
                                {errors.home_featured_limit}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-white border border-[#ECE7E0] px-3.5 py-2.5 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Label
                            htmlFor="sw-menu"
                            className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                          >
                            Exibir no Cardápio
                          </Label>
                          <p className="text-xs text-[#1F1B16]/60">
                            Exibe esta seção na página completa do cardápio.
                          </p>
                        </div>
                        <Switch
                          id="sw-menu"
                          checked={showOnMenu}
                          onCheckedChange={setShowOnMenu}
                          className="data-[state=checked]:bg-[#E3A008]"
                        />
                      </div>

                      {showOnMenu && (
                        <div className="pt-2 border-t border-[#ECE7E0] flex flex-wrap items-center justify-between gap-3">
                          <Label className="text-xs font-medium text-[#1F1B16]/80">
                            Posição no Cardápio (Desktop)
                          </Label>
                          <Select
                            value={menuLayoutZone}
                            onValueChange={(v) => setMenuLayoutZone(v as MenuLayoutZone)}
                          >
                            <SelectTrigger className="w-56 h-8 bg-white border-[#ECE7E0] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[150] bg-white border-[#ECE7E0]">
                              <SelectItem value="main">Principal</SelectItem>
                              <SelectItem value="sidebar_right">
                                Lateral Direita (Desktop)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Regras de Negócio (product_category only) */}
            {kind === "product_category" && (
              <div className="rounded-2xl border border-[#ECE7E0] bg-white p-4 space-y-3">
                <div className="text-sm font-semibold text-[#1F1B16]">Regras de Negócio</div>

                <div className="divide-y divide-[#ECE7E0]">
                  <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                    <div>
                      <Label htmlFor="sw-addons" className="text-sm font-medium text-[#1F1B16] cursor-pointer">
                        Aceita adicionais
                      </Label>
                      <p className="text-xs text-[#1F1B16]/60">
                        Permite ao cliente escolher ingredientes extras nos itens desta categoria.
                      </p>
                    </div>
                    <Switch
                      id="sw-addons"
                      checked={allowsAddons}
                      onCheckedChange={setAllowsAddons}
                      className="data-[state=checked]:bg-[#E3A008]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <div>
                      <Label htmlFor="sw-notes" className="text-sm font-medium text-[#1F1B16] cursor-pointer">
                        Aceita observações
                      </Label>
                      <p className="text-xs text-[#1F1B16]/60">
                        Habilita campo de observação livre no modal do produto.
                      </p>
                    </div>
                    <Switch
                      id="sw-notes"
                      checked={allowsNotes}
                      onCheckedChange={setAllowsNotes}
                      className="data-[state=checked]:bg-[#E3A008]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                    <div>
                      <Label htmlFor="sw-ranking" className="text-sm font-medium text-[#1F1B16] cursor-pointer">
                        Exibir ranking de mais pedidos
                      </Label>
                      <p className="text-xs text-[#1F1B16]/60">
                        Destaca os itens mais vendidos desta categoria para o cliente.
                      </p>
                    </div>
                    <Switch
                      id="sw-ranking"
                      checked={showRanking}
                      onCheckedChange={setShowRanking}
                      className="data-[state=checked]:bg-[#E3A008]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-[#ECE7E0] bg-[#F7F5F0]/70">
            <Button
              type="button"
              variant="outline"
              disabled={saving || uploading}
              onClick={() => onOpenChange(false)}
              className="border-[#ECE7E0] bg-white hover:bg-[#F7F5F0] text-[#1F1B16]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || uploading}
              className="bg-[#E3A008] hover:bg-[#C1440E] text-white font-semibold shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguarde o upload...
                </>
              ) : isEdit ? (
                "Salvar alterações"
              ) : (
                "Criar categoria"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
