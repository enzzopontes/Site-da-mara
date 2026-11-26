"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  AlertCircle,
  Check,
  Compass,
  Info,
  Link2,
  Loader2,
  Lock,
  Package,
  SlidersHorizontal,
  Tag,
  WifiOff,
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
  MAX_CATEGORY_ICON_BYTES,
  PRESET_3D_ICONS,
  isSafeCategoryHref,
  isSafeIconUrl,
  sanitizeCategorySlug,
} from "@/lib/category-icons"
import {
  type AnalyzedIconImage,
  ICON_ZOOM_DEFAULT,
  analyzeIconImageFile,
  exportFramedIconFile,
  isRasterIconFile,
  renderFramedIconPreviewDataUrl,
} from "@/lib/icon-image-processor"
import {
  createCategoryAction,
  updateCategoryAction,
  uploadCategoryIconAction,
  type CategoryFormInput,
} from "@/app/admin/categorias/actions"
import { CategoryIconBankPicker } from "@/components/admin/categories/category-icon-bank-picker"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"

export interface CategoryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCategory: CategoryWithCounts | null
  nextOrders: { homeBar: number; homeFeatured: number; menu: number }
  onSaved: (saved: Category) => void
  quickMenuCreate?: boolean
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
  quickMenuCreate = false,
}: CategoryFormModalProps) {
  const isEdit = Boolean(initialCategory)
  const isQuickMenuMode = Boolean(quickMenuCreate) && !isEdit

  const [kind, setKind] = useState<CategoryKind>("product_category")
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState("")
  const [customHref, setCustomHref] = useState("/cardapio")

  const [iconUrl, setIconUrl] = useState("")
  const [iconSource, setIconSource] = useState<"upload" | "preset_3d">("upload")
  const [originalStorageUrl, setOriginalStorageUrl] = useState<string | null>(null)
  const [removeOldOnReplace, setRemoveOldOnReplace] = useState(false)
  const [pendingRetryFile, setPendingRetryFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [pendingAnalyzedIcon, setPendingAnalyzedIcon] = useState<AnalyzedIconImage | null>(null)
  const [iconZoomPercent, setIconZoomPercent] = useState<number>(ICON_ZOOM_DEFAULT)
  const [framedPreviewUrl, setFramedPreviewUrl] = useState<string | null>(null)
  const [framedUploadDirty, setFramedUploadDirty] = useState(false)
  const [bankRefreshTrigger, setBankRefreshTrigger] = useState(0)

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
  const [isOffline, setIsOffline] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncOnlineStatus = () => {
      setIsOffline(typeof navigator !== "undefined" && !navigator.onLine)
    }
    syncOnlineStatus()
    window.addEventListener("online", syncOnlineStatus)
    window.addEventListener("offline", syncOnlineStatus)
    return () => {
      window.removeEventListener("online", syncOnlineStatus)
      window.removeEventListener("offline", syncOnlineStatus)
    }
  }, [])

  const fallbackIcon = initialCategory?.fallback_icon || "UtensilsCrossed"
  const prevInitKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      prevInitKeyRef.current = null
      return
    }

    const initKey = `${initialCategory?.id ?? "new"}:${isQuickMenuMode ? "quick" : "full"}`
    if (prevInitKeyRef.current === initKey) return
    prevInitKeyRef.current = initKey

    if (initialCategory) {
      setKind(initialCategory.kind)
      setName(initialCategory.name)
      setSlug(initialCategory.slug)
      setSlugManuallyEdited(true)
      setDescription(initialCategory.description || "")
      setCustomHref(initialCategory.custom_href || "/cardapio")

      setIconUrl(initialCategory.icon_url || "")
      setIconSource(initialCategory.icon_type === "preset_3d" ? "preset_3d" : "upload")
      setOriginalStorageUrl(
        isStorageCategoryIconUrl(initialCategory.icon_url) ? initialCategory.icon_url : null
      )

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
    } else if (isQuickMenuMode) {
      setKind("product_category")
      setName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setDescription("")
      setCustomHref("/cardapio")

      setIconUrl("")
      setIconSource("upload")
      setOriginalStorageUrl(null)

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
    } else {
      setKind("product_category")
      setName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setDescription("")
      setCustomHref("/cardapio")

      setIconUrl("")
      setIconSource("upload")
      setOriginalStorageUrl(null)

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

    setRemoveOldOnReplace(false)
    setPendingRetryFile(null)
    setErrors({})
    setPendingAnalyzedIcon(null)
    setIconZoomPercent(ICON_ZOOM_DEFAULT)
    setFramedPreviewUrl(null)
    setFramedUploadDirty(false)
    setAnalyzingImage(false)
  }, [open, initialCategory, isQuickMenuMode])

  useEffect(() => {
    if (!pendingAnalyzedIcon) {
      setFramedPreviewUrl(null)
      return
    }
    try {
      const nextUrl = renderFramedIconPreviewDataUrl(pendingAnalyzedIcon, {
        zoomPercent: iconZoomPercent,
        useAutoTrim: true,
      })
      setFramedPreviewUrl(nextUrl)
    } catch {
      setFramedPreviewUrl(null)
    }
  }, [pendingAnalyzedIcon, iconZoomPercent])

  const hasExistingStorageIcon = Boolean(originalStorageUrl)

  const safeAccentPreview = HEX_COLOR_REGEX.test(accentColor) ? accentColor : "#E3A008"
  const safeBadgePreview = HEX_COLOR_REGEX.test(badgeColor) ? badgeColor : "#C1440E"
  const autoSlugPreview = sanitizeCategorySlug(slug || name)

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

  async function performFileUpload(
    file: File,
    options?: { keepFramedStudio?: boolean; silentSuccessToast?: boolean }
  ): Promise<string | null> {
    const validationErr = validateUploadFile(file)
    if (validationErr) {
      setErrors((prev) => ({ ...prev, icon: validationErr }))
      toast.error(validationErr)
      return null
    }

    setErrors((prev) => ({ ...prev, icon: undefined }))

    if (!options?.keepFramedStudio) {
      setPendingRetryFile(file)
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const oldUrlToDelete = originalStorageUrl || ""
      formData.append("removeOld", String(removeOldOnReplace && Boolean(oldUrlToDelete)))
      if (oldUrlToDelete) {
        formData.append("oldUrl", oldUrlToDelete)
      }

      const result = await uploadCategoryIconAction(formData)
      if (!result.ok) {
        setErrors((prev) => ({ ...prev, icon: result.error }))
        toast.error(result.error)
        return null
      }

      setIconUrl(result.data.publicUrl)
      setIconSource("upload")
      setOriginalStorageUrl(result.data.publicUrl)
      setPendingRetryFile(null)
      setFramedUploadDirty(false)
      setBankRefreshTrigger((prev) => prev + 1)

      if (!options?.silentSuccessToast) {
        toast.success("Ícone enviado com sucesso!")
      }
      return result.data.publicUrl
    } catch {
      const msg = "Falha ao enviar a imagem. Tente novamente."
      setErrors((prev) => ({ ...prev, icon: msg }))
      toast.error(msg)
      return null
    } finally {
      setUploading(false)
    }
  }

  async function handleFileSelected(file: File) {
    const validationErr = validateUploadFile(file)
    if (validationErr) {
      setErrors((prev) => ({ ...prev, icon: validationErr }))
      toast.error(validationErr)
      return
    }

    if (file.type === "image/svg+xml") {
      setPendingAnalyzedIcon(null)
      setFramedPreviewUrl(null)
      setFramedUploadDirty(false)
      await performFileUpload(file)
      return
    }

    if (isRasterIconFile(file)) {
      setAnalyzingImage(true)
      setErrors((prev) => ({ ...prev, icon: undefined }))
      setPendingRetryFile(null)
      try {
        const analyzed = await analyzeIconImageFile(file)
        setPendingAnalyzedIcon(analyzed)
        setIconZoomPercent(ICON_ZOOM_DEFAULT)
        setFramedUploadDirty(true)
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Não foi possível processar a imagem selecionada."
        setErrors((prev) => ({ ...prev, icon: msg }))
        toast.error(msg)
      } finally {
        setAnalyzingImage(false)
      }
      return
    }

    await performFileUpload(file)
  }

  async function handleUploadFramedIcon(silentSuccessToast = false): Promise<string | null> {
    if (!pendingAnalyzedIcon) return iconUrl.trim() || null
    try {
      const framedFile = await exportFramedIconFile(pendingAnalyzedIcon, {
        zoomPercent: iconZoomPercent,
        useAutoTrim: true,
      })
      return await performFileUpload(framedFile, {
        keepFramedStudio: true,
        silentSuccessToast,
      })
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Falha ao gerar o PNG enquadrado 512×512."
      setErrors((prev) => ({ ...prev, icon: msg }))
      toast.error(msg)
      return null
    }
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

    if (!isQuickMenuMode && kind === "home_shortcut" && customHref.trim()) {
      const href = customHref.trim()
      if (!isSafeCategoryHref(href)) {
        next.custom_href = "Use um link seguro começando com / (sem //) ou https://."
      }
    }

    if (!pendingAnalyzedIcon && iconUrl.trim() && !isSafeIconUrl(iconUrl.trim())) {
      next.icon = "URL inválida. Use caminho relativo (/) ou https://."
    }

    if (!HEX_COLOR_REGEX.test(accentColor)) {
      next.accent_color = "Use um código hexadecimal válido (#RRGGBB)."
    }

    if (!isQuickMenuMode && badgeText.trim() && !HEX_COLOR_REGEX.test(badgeColor)) {
      next.badge_color = "Cor do selo inválida (#RRGGBB)."
    }

    if (!isQuickMenuMode && kind === "product_category" && showOnHomeFeatured) {
      if (
        !Number.isInteger(homeFeaturedLimit) ||
        homeFeaturedLimit < 1 ||
        homeFeaturedLimit > 24
      ) {
        next.home_featured_limit = "Informe um limite entre 1 e 24."
      }
    }

    return next
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isOffline) return
    if (saving || uploading || analyzingImage) return

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error("Revise os campos destacados antes de salvar.")
      return
    }

    setErrors({})
    setSaving(true)

    try {
      let finalIconUrl: string | null = null
      let finalIconType: CategoryIconType = "lucide"

      if (pendingAnalyzedIcon && (framedUploadDirty || !iconUrl.trim())) {
        const uploadedUrl = await handleUploadFramedIcon(true)
        if (!uploadedUrl) {
          return
        }
        finalIconUrl = uploadedUrl
        finalIconType = "upload"
      } else {
        const trimmedUrl = iconUrl.trim()
        if (trimmedUrl) {
          finalIconUrl = trimmedUrl
          finalIconType =
            iconSource === "preset_3d" || PRESET_3D_ICONS.some((p) => p.path === trimmedUrl)
              ? "preset_3d"
              : "upload"
        } else {
          finalIconUrl = null
          finalIconType = "lucide"
        }
      }

      const payload: CategoryFormInput = isQuickMenuMode
        ? {
            name: name.trim(),
            slug: sanitizeCategorySlug(slug || name),
            description: null,
            kind: "product_category",
            icon_type: finalIconType,
            icon_url: finalIconUrl,
            fallback_icon: fallbackIcon,
            accent_color: accentColor,
            badge_text: null,
            badge_color: null,
            custom_href: null,
            is_active: true,
            show_on_home_bar: showOnHomeBar,
            home_bar_order: nextOrders.homeBar,
            show_on_home_featured: false,
            home_featured_order: nextOrders.homeFeatured,
            home_featured_limit: 6,
            show_on_menu: true,
            menu_order: nextOrders.menu,
            menu_layout_zone: "main",
            allows_addons: allowsAddons,
            allows_notes: allowsNotes,
            show_ranking: true,
          }
        : {
            name: name.trim(),
            slug: isEdit ? initialCategory?.slug : sanitizeCategorySlug(slug || name),
            description: description.trim() || null,
            kind,
            icon_type: finalIconType,
            icon_url: finalIconUrl,
            fallback_icon: fallbackIcon,
            accent_color: accentColor,
            badge_text: badgeText.trim() || null,
            badge_color: badgeText.trim() ? badgeColor || "#C1440E" : null,
            custom_href: kind === "home_shortcut" ? customHref.trim() || "/cardapio" : null,
            is_active: isActive,
            show_on_home_bar: showOnHomeBar,
            home_bar_order: initialCategory
              ? initialCategory.home_bar_order
              : nextOrders.homeBar,
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

      const result =
        isEdit && initialCategory
          ? await updateCategoryAction(initialCategory.id, payload)
          : await createCategoryAction(payload)

      if (!result.ok) {
        setErrors({ form: result.error })
        toast.error(result.error)
        return
      }

      if (!isQuickMenuMode) {
        toast.success(
          isEdit
            ? "Categoria atualizada com sucesso!"
            : "Categoria criada com sucesso!"
        )
      }
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

  function renderIconBankSection(showAccentControls: boolean) {
    return (
      <div className="rounded-2xl border border-[#ECE7E0] bg-[#F7F5F0]/55 p-4 space-y-4">
        <div className="text-sm font-semibold text-[#1F1B16]">Ícone 3D da Categoria</div>

        <CategoryIconBankPicker
          value={iconUrl}
          categoryName={name.trim() || undefined}
          enabled={open}
          disabled={saving || isOffline}
          uploading={uploading}
          analyzing={analyzingImage}
          pendingAnalyzedIcon={pendingAnalyzedIcon}
          framedPreviewUrl={framedPreviewUrl}
          framedUploadDirty={framedUploadDirty}
          iconZoomPercent={iconZoomPercent}
          hasExistingStorageIcon={hasExistingStorageIcon}
          removeOldOnReplace={removeOldOnReplace}
          pendingRetryFile={pendingRetryFile}
          errorMessage={errors.icon}
          onChangeUrl={(url, source) => {
            setIconUrl(url)
            setIconSource(
              source === "preset_3d" || PRESET_3D_ICONS.some((p) => p.path === url.trim())
                ? "preset_3d"
                : "upload"
            )
            setPendingAnalyzedIcon(null)
            setFramedPreviewUrl(null)
            setFramedUploadDirty(false)
            setPendingRetryFile(null)
            if (errors.icon) {
              setErrors((prev) => ({ ...prev, icon: undefined }))
            }
          }}
          onClearImage={() => {
            setIconUrl("")
            setPendingAnalyzedIcon(null)
            setFramedPreviewUrl(null)
            setFramedUploadDirty(false)
            setPendingRetryFile(null)
            if (errors.icon) {
              setErrors((prev) => ({ ...prev, icon: undefined }))
            }
          }}
          onSelectFile={(file) => void handleFileSelected(file)}
          onZoomChange={(zoom) => {
            setIconZoomPercent(zoom)
            setFramedUploadDirty(true)
          }}
          onAutoFit={() => {
            setIconZoomPercent(ICON_ZOOM_DEFAULT)
            setFramedUploadDirty(true)
          }}
          onUploadFramed={() => void handleUploadFramedIcon(false)}
          onRetryUpload={() => {
            if (pendingRetryFile) void performFileUpload(pendingRetryFile)
          }}
          onToggleRemoveOld={setRemoveOldOnReplace}
          refreshTrigger={bankRefreshTrigger}
        />

        {showAccentControls && (
          <div className="pt-3 border-t border-[#ECE7E0]">{renderAccentColorControls()}</div>
        )}
      </div>
    )
  }

  function renderAccentColorControls() {
    return (
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
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving || uploading || analyzingImage) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-[#ECE7E0] text-[#1F1B16] p-0">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#ECE7E0] bg-[#F7F5F0]/70">
            <DialogTitle className="text-xl font-bold text-[#1F1B16]">
              {isQuickMenuMode
                ? "Nova Categoria no Cardápio"
                : isEdit
                  ? `Editar categoria: ${initialCategory?.name}`
                  : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription className="text-[#1F1B16]/70">
              {isQuickMenuMode
                ? "Crie rapidamente uma categoria de produto para cadastrar itens agora."
                : "Configure identidade visual, visibilidade na Home/Cardápio e regras de negócio."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-6">
            {isOffline && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900"
              >
                <WifiOff className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  Sem conexão com a internet. Reconecte para enviar imagens ou salvar alterações.
                </span>
              </div>
            )}

            {errors.form && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#C1440E]/30 bg-[#C1440E]/8 px-3.5 py-3 text-sm text-[#C1440E]"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            {isQuickMenuMode ? (
              <>
                {/* Warm Quick-Menu Notice */}
                <div className="flex items-start gap-2.5 rounded-xl border border-[#E3A008]/45 bg-[#FEF8EC] px-3.5 py-2.5 text-xs text-[#6E4D00]">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#B47B00]" />
                  <span>
                    {showOnHomeBar
                      ? "Importe o ícone 3D agora (ou selecione do banco abaixo). Com a opção ativada, esta categoria já aparece na Grade 3D da Home e na Prévia ao Vivo."
                      : 'Importe o ícone 3D agora (ou selecione do banco abaixo). Com a opção desativada, esta categoria fica fora da Home (visível apenas no Cardápio) e aparece marcada como "Fora da Home" na Prévia ao Vivo para você ativar quando quiser.'}
                  </span>
                </div>

                {/* Nome da Categoria + Live Auto-Slug Tag */}
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name-quick" className="text-sm font-medium text-[#1F1B16]">
                    Nome da categoria <span className="text-[#C1440E]">*</span>
                  </Label>
                  <Input
                    id="cat-name-quick"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={isOffline || saving}
                    maxLength={60}
                    placeholder="Ex.: Lasanhas, Bolos, Açaí, Porções..."
                    className="bg-white border-[#ECE7E0] focus-visible:border-[#E3A008] focus-visible:ring-[#E3A008]/25"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center rounded-md bg-[#F7F5F0] border border-[#ECE7E0] px-2 py-0.5 font-mono text-[11px] text-[#1F1B16]/70">
                      slug: {autoSlugPreview || "nova-categoria"}
                    </span>
                  </div>
                  {errors.name && <p className="text-xs text-[#C1440E]">{errors.name}</p>}
                  {errors.slug && <p className="text-xs text-[#C1440E]">{errors.slug}</p>}
                </div>

                {/* Ícone 3D da Categoria (Upload + Banco + URL) */}
                {renderIconBankSection(false)}

                {/* Regras Simples (2 switches) */}
                <div className="rounded-2xl border border-[#ECE7E0] bg-white p-4 space-y-3">
                  <div className="text-sm font-semibold text-[#1F1B16]">Regras da Categoria</div>
                  <div className="divide-y divide-[#ECE7E0]">
                    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                      <div>
                        <Label
                          htmlFor="sw-quick-addons"
                          className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                        >
                          Aceita adicionais
                        </Label>
                        <p className="text-xs text-[#1F1B16]/60">
                          Permite ao cliente escolher ingredientes extras nos itens desta categoria.
                        </p>
                      </div>
                      <Switch
                        id="sw-quick-addons"
                        checked={allowsAddons}
                        onCheckedChange={setAllowsAddons}
                        disabled={isOffline || saving}
                        className="data-[state=checked]:bg-[#E3A008]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <div>
                        <Label
                          htmlFor="sw-quick-notes"
                          className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                        >
                          Aceita observações
                        </Label>
                        <p className="text-xs text-[#1F1B16]/60">
                          Habilita campo de observação livre no modal do produto.
                        </p>
                      </div>
                      <Switch
                        id="sw-quick-notes"
                        checked={allowsNotes}
                        onCheckedChange={setAllowsNotes}
                        disabled={isOffline || saving}
                        className="data-[state=checked]:bg-[#E3A008]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                      <div>
                        <Label
                          htmlFor="sw-quick-home-bar"
                          className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                        >
                          Mostrar na Grade 3D da Home
                        </Label>
                        <p className="text-xs text-[#1F1B16]/60">
                          Ativado aparece na barra 3D da Home; desativado fica apenas no Cardápio.
                        </p>
                      </div>
                      <Switch
                        id="sw-quick-home-bar"
                        checked={showOnHomeBar}
                        onCheckedChange={setShowOnHomeBar}
                        disabled={isOffline || saving}
                        className="data-[state=checked]:bg-[#E3A008]"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
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
                        <div className="font-semibold text-sm text-[#1F1B16]">
                          Categoria de Produto
                        </div>
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
                        Bloqueado na edição para nunca quebrar links existentes nem produtos
                        legados.
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
                        if (errors.custom_href) {
                          setErrors((prev) => ({ ...prev, custom_href: undefined }))
                        }
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

                {/* Ícone 3D da Categoria (Upload + Banco + URL + Accent Color) */}
                {renderIconBankSection(true)}

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
                      <Label
                        htmlFor="cat-badge-text"
                        className="text-xs font-medium text-[#1F1B16]/80"
                      >
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
                      <Label
                        htmlFor="cat-badge-color"
                        className="text-xs font-medium text-[#1F1B16]/80"
                      >
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
                        <Label
                          htmlFor="sw-active"
                          className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                        >
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
                        <Label
                          htmlFor="sw-home-bar"
                          className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                        >
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
                                      setErrors((prev) => ({
                                        ...prev,
                                        home_featured_limit: undefined,
                                      }))
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
                          <Label
                            htmlFor="sw-addons"
                            className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                          >
                            Aceita adicionais
                          </Label>
                          <p className="text-xs text-[#1F1B16]/60">
                            Permite ao cliente escolher ingredientes extras nos itens desta
                            categoria.
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
                          <Label
                            htmlFor="sw-notes"
                            className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                          >
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
                          <Label
                            htmlFor="sw-ranking"
                            className="text-sm font-medium text-[#1F1B16] cursor-pointer"
                          >
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
              </>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-[#ECE7E0] bg-[#F7F5F0]/70">
            <Button
              type="button"
              variant="outline"
              disabled={saving || uploading || analyzingImage}
              onClick={() => onOpenChange(false)}
              className="border-[#ECE7E0] bg-white hover:bg-[#F7F5F0] text-[#1F1B16]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || uploading || analyzingImage || isOffline}
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
              ) : analyzingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando imagem...
                </>
              ) : isEdit ? (
                "Salvar alterações"
              ) : isQuickMenuMode ? (
                "Criar categoria no Cardápio"
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
