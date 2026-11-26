"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from "lucide-react"
import {
  listCategoryIconsAction,
  type CategoryBankIconItem,
} from "@/app/admin/categorias/actions"
import { PRESET_3D_ICONS, isSafeIconUrl } from "@/lib/category-icons"
import {
  ICON_ZOOM_MAX,
  ICON_ZOOM_MIN,
  type AnalyzedIconImage,
} from "@/lib/icon-image-processor"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface CategoryIconBankPickerProps {
  value: string
  categoryName?: string
  enabled?: boolean
  disabled?: boolean
  uploading: boolean
  analyzing: boolean
  pendingAnalyzedIcon: AnalyzedIconImage | null
  framedPreviewUrl: string | null
  framedUploadDirty: boolean
  iconZoomPercent: number
  useAutoTrim?: boolean
  hasExistingStorageIcon: boolean
  removeOldOnReplace: boolean
  pendingRetryFile: File | null
  errorMessage?: string
  onChangeUrl: (url: string, source: "preset_3d" | "upload" | "manual") => void
  onClearImage: () => void
  onSelectFile: (file: File) => void
  onZoomChange: (zoom: number) => void
  onAutoFit: () => void
  onUploadFramed: () => void
  onRetryUpload: () => void
  onToggleRemoveOld: (checked: boolean) => void
  refreshTrigger?: number
}

const REFERENCE_3D_ICON_PATH = "/assets/icones3d/icone batata.png"

function isSafeFramedPreviewDataUrl(raw: string | null | undefined): raw is string {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return false
  return /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(trimmed)
}

function normalizeIconUrlKey(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ""
  const withoutHashQuery = trimmed.split(/[?#]/)[0].toLowerCase()
  try {
    return decodeURIComponent(withoutHashQuery)
  } catch {
    return withoutHashQuery
  }
}

export function CategoryIconBankPicker({
  value,
  categoryName,
  enabled = true,
  disabled = false,
  uploading,
  analyzing,
  pendingAnalyzedIcon,
  framedPreviewUrl,
  framedUploadDirty,
  iconZoomPercent,
  useAutoTrim = true,
  hasExistingStorageIcon,
  removeOldOnReplace,
  pendingRetryFile,
  errorMessage,
  onChangeUrl,
  onClearImage,
  onSelectFile,
  onZoomChange,
  onAutoFit,
  onUploadFramed,
  onRetryUpload,
  onToggleRemoveOld,
  refreshTrigger,
}: CategoryIconBankPickerProps) {
  const [storageIcons, setStorageIcons] = useState<CategoryBankIconItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({})
  const [previewFailed, setPreviewFailed] = useState(false)
  const [referenceFailed, setReferenceFailed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const normalizedValue = (value ?? "").trim()
  const safeFramedPreviewUrl = isSafeFramedPreviewDataUrl(framedPreviewUrl)
    ? framedPreviewUrl.trim()
    : null
  const activePreviewSrc = safeFramedPreviewUrl ?? normalizedValue
  const isActivePreviewSafe = safeFramedPreviewUrl
    ? true
    : isSafeIconUrl(normalizedValue)
  const isBusy = uploading || analyzing || Boolean(disabled)
  const displayCategoryLabel = categoryName?.trim() || "Categoria"

  useEffect(() => {
    setPreviewFailed(false)
  }, [activePreviewSrc])

  const loadIcons = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setFailedIds({})

    try {
      const result = await listCategoryIconsAction()
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) {
        return
      }
      if (!result.ok) {
        setError(result.error || "Não foi possível carregar o banco de ícones 3D.")
        return
      }
      setStorageIcons(result.data?.icons ?? [])
      setHasLoaded(true)
    } catch (err) {
      if (!isMountedRef.current || requestIdRef.current !== currentRequestId) {
        return
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível carregar o banco de ícones 3D."
      setError(message)
    } finally {
      if (isMountedRef.current && requestIdRef.current === currentRequestId) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void loadIcons()
  }, [enabled, refreshTrigger, loadIcons])

  const allIcons = useMemo<CategoryBankIconItem[]>(() => {
    const merged: CategoryBankIconItem[] = []
    const seenKeys = new Set<string>()

    for (const item of storageIcons) {
      const key = normalizeIconUrlKey(item.url)
      if (!key || seenKeys.has(key)) continue
      seenKeys.add(key)
      merged.push(item)
    }

    for (const preset of PRESET_3D_ICONS) {
      const key = normalizeIconUrlKey(preset.path)
      if (!key || seenKeys.has(key)) continue
      seenKeys.add(key)
      merged.push({
        id: `preset:${preset.id}`,
        name: preset.label,
        url: preset.path,
        source: "preset_3d",
      })
    }

    return merged
  }, [storageIcons])

  const selectedUrlKey = useMemo(
    () => normalizeIconUrlKey(normalizedValue),
    [normalizedValue]
  )

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file && !isBusy) {
      onSelectFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isBusy) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return
    }
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (isBusy) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      onSelectFile(file)
    }
  }

  const isFramingDirty = Boolean(pendingAnalyzedIcon && framedUploadDirty)

  return (
    <div className="rounded-xl border border-[#ECE7E0] bg-gray-50/70 p-2.5 space-y-3">
      {/* 1. Selected Preview Bar */}
      {activePreviewSrc.length > 0 && (
        <div className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-[#F7F5F0] border border-[#ECE7E0] p-1 flex items-center justify-center shrink-0 overflow-hidden">
            {previewFailed || !isActivePreviewSafe ? (
              <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            ) : (
              <img
                src={activePreviewSrc}
                alt="Ícone 3D selecionado"
                onError={() => setPreviewFailed(true)}
                className="w-full h-full object-contain select-none"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800">
              {isFramingDirty ? "Ícone 3D em enquadramento" : "Ícone 3D selecionado"}
            </p>
            <p
              className="text-[11px] text-gray-500 truncate"
              title={
                isFramingDirty || !normalizedValue
                  ? "PNG 512×512 transparente pronto para envio"
                  : normalizedValue
              }
            >
              {isFramingDirty || !normalizedValue
                ? "PNG 512×512 transparente pronto para envio"
                : normalizedValue}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearImage}
            disabled={isBusy}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white min-h-[36px] px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors shrink-0"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            <span>Remover</span>
          </button>
        </div>
      )}

      {/* 2. Drag-and-Drop / Click Upload Zone */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg,image/svg+xml"
          onChange={handleFileChange}
          disabled={isBusy}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => !isBusy && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={isBusy}
          className={`w-full flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70 ${
            isDragging
              ? "border-[#E3A008] bg-[#FEF8EC]"
              : "border-gray-300 bg-white hover:border-[#E3A008] hover:bg-[#FEF8EC]/40"
          }`}
        >
          {analyzing ? (
            <>
              <Loader2
                className="h-4 w-4 animate-spin text-[#8A6100]"
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-gray-800">
                Analisando transparência e auto-trim...
              </span>
            </>
          ) : uploading ? (
            <>
              <Loader2
                className="h-4 w-4 animate-spin text-[#8A6100]"
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-gray-800">
                Enviando ícone 3D...
              </span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-[#8A6100]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800">
                Arraste o ícone 3D aqui ou clique para enviar
              </span>
              <span className="text-[11px] text-gray-500">
                PNG, WebP, JPG ou SVG (até 2MB) — auto-trim + enquadramento 512×512
              </span>
            </>
          )}
        </button>

        {pendingRetryFile && !uploading && (
          <div className="flex justify-center">
            <Button
              type="button"
              size="sm"
              onClick={onRetryUpload}
              disabled={isBusy}
              className="bg-[#E3A008] hover:bg-[#C1440E] text-white font-semibold"
            >
              Tentar enviar novamente
            </Button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {hasExistingStorageIcon && (
          <label className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-2.5 py-2 cursor-pointer">
            <Checkbox
              checked={removeOldOnReplace}
              onCheckedChange={(checked) => onToggleRemoveOld(checked === true)}
              disabled={isBusy}
            />
            <span className="text-xs text-gray-700">
              Remover ícone anterior do Storage ao substituir
            </span>
          </label>
        )}
      </div>

      {/* 3. Estúdio de Enquadramento 3D */}
      {pendingAnalyzedIcon && (
        <div className="rounded-xl border border-[#E3A008]/40 bg-[#FEF8EC]/50 p-3 space-y-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {useAutoTrim && pendingAnalyzedIcon.bounds.trimmed ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                -{pendingAnalyzedIcon.bounds.trimPercent}% de borda transparente removida
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-[#ECE7E0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#1F1B16]/75">
                Sem bordas transparentes extras
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-[#ECE7E0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#1F1B16]/75">
              512×512 PNG
            </span>
            {framedUploadDirty ? (
              <span className="inline-flex items-center rounded-full border border-[#E3A008]/45 bg-[#FEF8EC] px-2 py-0.5 text-[11px] font-semibold text-[#8A6100]">
                Pendente de envio — envia ao salvar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Check className="h-3 w-3" aria-hidden="true" />
                Enviado
              </span>
            )}
          </div>

          {/* Comparador lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#ECE7E0] bg-white/80 p-2.5">
            {/* Grade 3D da Home */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#1F1B16]/75">
                Grade 3D da Home
              </p>
              <div className="flex items-start gap-2">
                <div className="rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] px-2 py-2 flex flex-col items-center w-[92px] shrink-0">
                  {referenceFailed ? (
                    <span className="w-11 h-11 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                    </span>
                  ) : (
                    <img
                      src={REFERENCE_3D_ICON_PATH}
                      alt="Referência Batata"
                      onError={() => setReferenceFailed(true)}
                      className="w-11 h-11 object-contain select-none"
                    />
                  )}
                  <span className="mt-1.5 text-[11px] font-semibold text-[#1F1B16] text-center leading-tight line-clamp-1 w-full">
                    Batata
                  </span>
                  <span className="mt-0.5 rounded-full bg-white border border-[#ECE7E0] px-1.5 py-0.5 text-[9px] font-medium text-[#1F1B16]/60">
                    Referência
                  </span>
                </div>

                <div className="rounded-xl border border-[#E3A008]/60 bg-[#F7F5F0] px-2 py-2 flex flex-col items-center w-[92px] shrink-0 ring-1 ring-[#E3A008]/25">
                  {safeFramedPreviewUrl ? (
                    <img
                      src={safeFramedPreviewUrl}
                      alt={displayCategoryLabel}
                      className="w-11 h-11 object-contain select-none"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="w-11 h-11 rounded-lg bg-[#ECE7E0] animate-pulse"
                    />
                  )}
                  <span className="mt-1.5 text-[11px] font-semibold text-[#1F1B16] text-center leading-tight line-clamp-1 w-full">
                    {displayCategoryLabel}
                  </span>
                  <span className="mt-0.5 rounded-full bg-[#FEF8EC] border border-[#E3A008]/40 px-1.5 py-0.5 text-[9px] font-semibold text-[#8A6100]">
                    Novo
                  </span>
                </div>
              </div>
            </div>

            {/* Mini-pílula do Cardápio */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#1F1B16]/75">
                Mini-pílula do Cardápio
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-800">
                  {referenceFailed ? (
                    <ImageIcon className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <img
                      src={REFERENCE_3D_ICON_PATH}
                      alt=""
                      onError={() => setReferenceFailed(true)}
                      className="w-4 h-4 object-contain select-none"
                    />
                  )}
                  Batatas
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E3A008]/60 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-800 ring-1 ring-[#E3A008]/25">
                  {safeFramedPreviewUrl ? (
                    <img
                      src={safeFramedPreviewUrl}
                      alt=""
                      className="w-4 h-4 object-contain select-none"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="w-4 h-4 rounded bg-gray-200 animate-pulse"
                    />
                  )}
                  {displayCategoryLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Slider Tamanho / Zoom */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label
                htmlFor="category-icon-zoom-slider"
                className="text-xs font-semibold text-[#1F1B16]"
              >
                Tamanho / Zoom
              </Label>
              <span className="inline-flex items-center rounded-md bg-white border border-[#E3A008]/40 px-2 py-0.5 font-mono text-xs font-bold text-[#8A6100]">
                {iconZoomPercent}%
              </span>
            </div>
            <input
              id="category-icon-zoom-slider"
              type="range"
              min={ICON_ZOOM_MIN}
              max={ICON_ZOOM_MAX}
              step={1}
              value={iconZoomPercent}
              disabled={isBusy}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-full accent-[#E3A008] cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-[#1F1B16]/55">
              <span>{ICON_ZOOM_MIN}%</span>
              <span>100%</span>
              <span>125%</span>
              <span>{ICON_ZOOM_MAX}%</span>
            </div>
          </div>

          {/* Framing Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={onAutoFit}
              className="border-[#ECE7E0] bg-white hover:bg-[#FEF8EC] text-[#1F1B16]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Ajustar automático
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isBusy}
              onClick={onUploadFramed}
              className="bg-[#E3A008] hover:bg-[#C1440E] text-white font-semibold"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Enviando PNG...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  Enviar PNG enquadrado
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              className="border-[#ECE7E0] bg-white hover:bg-[#F7F5F0] text-[#1F1B16]"
            >
              Trocar imagem
            </Button>
          </div>
        </div>
      )}

      {/* 4. Banco de ícones 3D disponíveis */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold text-gray-800">
              Banco de ícones 3D disponíveis
            </span>
            <span className="text-[11px] text-gray-500">({allIcons.length})</span>
          </div>
          <button
            type="button"
            onClick={() => void loadIcons()}
            disabled={loading || isBusy}
            aria-label="Atualizar banco de ícones 3D"
            title="Atualizar banco de ícones 3D"
            className="inline-flex items-center gap-1 rounded-md shrink-0 min-h-[36px] px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Atualizar</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" aria-hidden="true" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadIcons()}
              disabled={loading || isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008] focus-visible:ring-offset-1 transition-colors shrink-0"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading && !hasLoaded ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">Carregando banco de ícones 3D...</span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-0.5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-xl bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-0.5">
            {allIcons.map((item) => {
              const itemKey = normalizeIconUrlKey(item.url)
              const isSelected =
                !isFramingDirty &&
                selectedUrlKey.length > 0 &&
                (normalizedValue === item.url || selectedUrlKey === itemKey)
              const safeUrl = isSafeIconUrl(item.url)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onChangeUrl(
                      item.url,
                      item.source === "preset_3d" ? "preset_3d" : "upload"
                    )
                  }
                  disabled={isBusy}
                  aria-pressed={isSelected}
                  aria-label={`Selecionar ícone ${item.name}`}
                  title={item.name}
                  className="group flex flex-col items-center gap-1 text-left disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none"
                >
                  <div
                    className={`relative w-full aspect-square rounded-xl bg-[#F7F5F0] border overflow-hidden flex items-center justify-center transition-all group-focus-visible:ring-2 group-focus-visible:ring-[#E3A008] group-focus-visible:ring-offset-1 ${
                      isSelected
                        ? "ring-2 ring-[#E3A008] border-[#E3A008]"
                        : "border-[#ECE7E0] group-hover:border-[#E3A008]/70"
                    }`}
                  >
                    {failedIds[item.id] || !safeUrl ? (
                      <ImageIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                          setFailedIds((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-contain p-1.5 select-none"
                      />
                    )}

                    <span
                      className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${
                        item.source === "preset_3d"
                          ? "bg-white/90 text-[#8A6100] border border-[#ECE7E0]"
                          : "bg-[#FEF8EC]/95 text-[#C1440E] border border-[#E3A008]/30"
                      }`}
                    >
                      {item.source === "preset_3d" ? "Oficial" : "3D"}
                    </span>

                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E3A008] text-white shadow-sm"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="w-full text-center text-[10px] font-medium text-gray-700 truncate px-0.5">
                    {item.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Manual URL Input */}
      <div className="space-y-1 pt-0.5">
        <Label
          htmlFor="category-icon-manual-url"
          className="text-[11px] font-medium text-gray-500"
        >
          Ou cole uma URL manualmente
        </Label>
        <Input
          id="category-icon-manual-url"
          value={value}
          onChange={(e) => onChangeUrl(e.target.value, "manual")}
          disabled={isBusy}
          placeholder="/assets/icones3d/icone.png ou https://..."
          className="h-9 text-xs bg-white border-gray-200 rounded-xl"
        />
      </div>
    </div>
  )
}
