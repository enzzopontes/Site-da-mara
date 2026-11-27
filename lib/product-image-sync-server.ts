import type { SupabaseClient } from "@supabase/supabase-js"
import {
  PRODUCTS_STORAGE_BUCKET,
  buildTargetWebpStoragePath,
  extractProductsBucketPath,
  isWebpStoragePath,
} from "./product-image-naming"

export interface SyncProductWebpImageNameParams {
  service: SupabaseClient
  productId: string
  productName: string
  imageUrl: string | null | undefined
  supabaseUrl?: string
}

export interface SyncProductWebpImageNameResult {
  renamed: boolean
  imageUrl: string
  oldPath?: string
  newPath?: string
  reason?: string
}

const VALID_MEDIA_CATEGORIES = new Set(["product", "promo", "brand", "general"])

function isMissingTableOrColumnError(error: { code?: string } | null | undefined): boolean {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.code === "42703" ||
    error?.code === "PGRST204"
  )
}

function isStorageCollisionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const err = error as {
    statusCode?: string | number
    status?: string | number
    message?: string
    error?: string
  }
  const status = String(err.statusCode ?? err.status ?? "")
  if (status === "409") return true
  const text = `${err.message ?? ""} ${err.error ?? ""}`.toLowerCase()
  return text.includes("already exists") || text.includes("duplicate") || text.includes("409")
}

function matchesImageReference(
  candidate: unknown,
  exactUrls: Set<string>,
  currentPath: string,
  supabaseUrl: string
): boolean {
  if (typeof candidate !== "string") return false
  if (exactUrls.has(candidate) || exactUrls.has(candidate.trim())) return true
  const extracted = extractProductsBucketPath(candidate, supabaseUrl)
  return extracted === currentPath
}

function containsImageReference(
  value: unknown,
  exactUrls: Set<string>,
  currentPath: string,
  supabaseUrl: string
): boolean {
  if (typeof value === "string") {
    return matchesImageReference(value, exactUrls, currentPath, supabaseUrl)
  }
  if (Array.isArray(value)) {
    return value.some((item) =>
      containsImageReference(item, exactUrls, currentPath, supabaseUrl)
    )
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      containsImageReference(entry, exactUrls, currentPath, supabaseUrl)
    )
  }
  return false
}

async function hasSharedReference(
  service: SupabaseClient,
  productId: string,
  rawImageUrl: string,
  trimmedUrl: string,
  currentPath: string,
  resolvedSupabaseUrl: string
): Promise<boolean> {
  const exactUrls = new Set<string>([trimmedUrl])
  if (rawImageUrl) exactUrls.add(rawImageUrl)

  const { data: otherProducts, error: productsErr } = await service
    .from("products")
    .select("id, image_url")
    .not("image_url", "is", null)
    .neq("id", productId)

  if (productsErr) return true
  for (const row of otherProducts ?? []) {
    if (matchesImageReference(row?.image_url, exactUrls, currentPath, resolvedSupabaseUrl)) {
      return true
    }
  }

  const optionalChecks: Array<{ table: string; column: string }> = [
    { table: "home_banners", column: "image_url" },
    { table: "coupons", column: "banner_image_url" },
    { table: "combos", column: "image_url" },
  ]

  for (const check of optionalChecks) {
    const { data, error } = await service
      .from(check.table)
      .select(check.column)
      .not(check.column, "is", null)

    if (error) {
      if (isMissingTableOrColumnError(error)) continue
      return true
    }
    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      if (matchesImageReference(row?.[check.column], exactUrls, currentPath, resolvedSupabaseUrl)) {
        return true
      }
    }
  }

  const { data: settingsRows, error: settingsErr } = await service
    .from("store_settings")
    .select("setting_value")

  if (settingsErr) {
    if (!isMissingTableOrColumnError(settingsErr)) return true
  } else {
    for (const row of settingsRows ?? []) {
      if (containsImageReference(row?.setting_value, exactUrls, currentPath, resolvedSupabaseUrl)) {
        return true
      }
    }
  }

  return false
}

export async function syncProductWebpImageName(
  params: SyncProductWebpImageNameParams
): Promise<SyncProductWebpImageNameResult> {
  const { service, productId } = params
  const rawImageUrl = typeof params.imageUrl === "string" ? params.imageUrl : ""
  const trimmedUrl = rawImageUrl.trim()
  const trimmedName = typeof params.productName === "string" ? params.productName.trim() : ""

  if (!trimmedUrl || !trimmedName) {
    return { renamed: false, imageUrl: params.imageUrl || "" }
  }

  const resolvedSupabaseUrl = (
    params.supabaseUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim()

  if (!resolvedSupabaseUrl) {
    return { renamed: false, imageUrl: trimmedUrl, reason: "missing-supabase-url" }
  }

  const currentPath = extractProductsBucketPath(trimmedUrl, resolvedSupabaseUrl)

  if (!currentPath || !isWebpStoragePath(currentPath)) {
    return { renamed: false, imageUrl: trimmedUrl, reason: "not-storage-webp" }
  }

  const baseDesiredPath = buildTargetWebpStoragePath(currentPath, trimmedName, 0)
  if (!baseDesiredPath) {
    return { renamed: false, imageUrl: trimmedUrl, reason: "empty-slug" }
  }

  if (baseDesiredPath === currentPath) {
    return { renamed: false, imageUrl: trimmedUrl, reason: "already-synced" }
  }

  const shared = await hasSharedReference(
    service,
    productId,
    rawImageUrl,
    trimmedUrl,
    currentPath,
    resolvedSupabaseUrl
  )
  if (shared) {
    return { renamed: false, imageUrl: trimmedUrl, reason: "shared-reference" }
  }

  const dir = currentPath.includes("/")
    ? currentPath.slice(0, currentPath.lastIndexOf("/"))
    : ""

  const storage = service.storage.from(PRODUCTS_STORAGE_BUCKET)
  const existingPaths = new Set<string>()
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data: listed, error: listErr } = await storage.list(dir, {
      limit: pageSize,
      offset,
    })

    if (listErr) {
      return { renamed: false, imageUrl: trimmedUrl, reason: "storage-list-failed" }
    }

    const batch = listed ?? []
    for (const item of batch) {
      if (!item?.name) continue
      existingPaths.add(dir ? `${dir}/${item.name}` : item.name)
    }

    if (batch.length < pageSize) break
    offset += pageSize
  }

  let targetPath: string | null = null
  let copied = false
  let cachedBlob: Blob | null = null

  for (let collisionIndex = 0; collisionIndex <= 20; collisionIndex++) {
    const candidate = buildTargetWebpStoragePath(currentPath, trimmedName, collisionIndex)
    if (!candidate) continue
    if (candidate === currentPath) {
      return { renamed: false, imageUrl: trimmedUrl, reason: "already-synced" }
    }
    if (existingPaths.has(candidate)) {
      continue
    }

    const { error: copyErr } = await storage.copy(currentPath, candidate)
    if (!copyErr) {
      targetPath = candidate
      copied = true
      break
    }

    if (isStorageCollisionError(copyErr)) {
      existingPaths.add(candidate)
      continue
    }

    if (!cachedBlob) {
      const { data: blob, error: downloadErr } = await storage.download(currentPath)
      if (downloadErr || !blob) {
        return { renamed: false, imageUrl: trimmedUrl, reason: "storage-copy-failed" }
      }
      cachedBlob = blob
    }

    const { error: uploadErr } = await storage.upload(candidate, cachedBlob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    })
    if (!uploadErr) {
      targetPath = candidate
      copied = true
      break
    }

    if (isStorageCollisionError(uploadErr)) {
      existingPaths.add(candidate)
      continue
    }

    return { renamed: false, imageUrl: trimmedUrl, reason: "storage-copy-failed" }
  }

  if (!copied || !targetPath) {
    return { renamed: false, imageUrl: trimmedUrl, reason: "collision-exhausted" }
  }

  const newUrl = storage.getPublicUrl(targetPath).data.publicUrl
  if (!newUrl) {
    try {
      await storage.remove([targetPath])
    } catch {
      // ignore rollback cleanup errors
    }
    return { renamed: false, imageUrl: trimmedUrl, reason: "storage-copy-failed" }
  }

  const now = new Date().toISOString()
  const { data: updatedRows, error: updateErr } = await service
    .from("products")
    .update({ image_url: newUrl, updated_at: now })
    .eq("id", productId)
    .eq("image_url", rawImageUrl)
    .select("id")

  if (updateErr || !updatedRows || updatedRows.length === 0) {
    try {
      await storage.remove([targetPath])
    } catch {
      // ignore rollback cleanup errors
    }
    return { renamed: false, imageUrl: trimmedUrl, reason: "db-update-failed" }
  }

  try {
    const { data: existingMeta } = await service
      .from("media_metadata")
      .select("category")
      .eq("storage_path", currentPath)
      .maybeSingle()

    const rawCategory =
      typeof existingMeta?.category === "string" ? existingMeta.category.trim() : ""
    const category = VALID_MEDIA_CATEGORIES.has(rawCategory) ? rawCategory : "product"

    const { error: upsertErr } = await service
      .from("media_metadata")
      .upsert(
        {
          storage_path: targetPath,
          category,
          updated_at: now,
        },
        { onConflict: "storage_path" }
      )

    if (upsertErr) {
      console.warn("[product-image-sync] Falha ao gravar media_metadata:", upsertErr)
    } else {
      const { error: deleteErr } = await service
        .from("media_metadata")
        .delete()
        .eq("storage_path", currentPath)

      if (deleteErr) {
        console.warn("[product-image-sync] Falha ao remover media_metadata antigo:", deleteErr)
      }
    }
  } catch (metaErr) {
    console.warn("[product-image-sync] Falha ao migrar media_metadata:", metaErr)
  }

  try {
    const { error: removeErr } = await storage.remove([currentPath])
    if (removeErr) {
      console.warn("[product-image-sync] Falha ao remover arquivo antigo no Storage:", removeErr)
    }
  } catch (removeErr) {
    console.warn("[product-image-sync] Exceção ao remover arquivo antigo no Storage:", removeErr)
  }

  return {
    renamed: true,
    imageUrl: newUrl,
    oldPath: currentPath,
    newPath: targetPath,
  }
}
