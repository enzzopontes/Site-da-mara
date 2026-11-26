export const PRODUCTS_STORAGE_BUCKET = "Products"
export const PRODUCTS_STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/Products/"

const CONTROL_CHARS_OR_BACKSLASH_RE = /[\u0000-\u001F\u007F\\]/

export interface BuildUploadStoragePathOptions {
  preferredName?: string
  fallbackFileName?: string
  collisionIndex?: number
  randomFallback?: string
}

export function slugifyProductImageName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")
}

export function stripFileExtension(fileName: string): string {
  const trimmed = fileName.trim()
  if (!trimmed) return ""

  const lastSlash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"))
  const lastDot = trimmed.lastIndexOf(".")

  if (lastDot <= lastSlash + 1 || lastDot === trimmed.length - 1) {
    return trimmed
  }

  return trimmed.slice(0, lastDot)
}

export function extractProductsBucketPath(
  imageUrl: string,
  supabaseUrl?: string
): string | null {
  const trimmed = imageUrl.trim()
  if (!trimmed || CONTROL_CHARS_OR_BACKSLASH_RE.test(trimmed)) {
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null
  }

  if (parsed.username || parsed.password) {
    return null
  }

  if (supabaseUrl !== undefined && supabaseUrl.trim() !== "") {
    let expected: URL
    try {
      expected = new URL(supabaseUrl.trim())
    } catch {
      return null
    }

    if (expected.protocol !== "http:" && expected.protocol !== "https:") {
      return null
    }

    if (parsed.origin !== expected.origin) {
      return null
    }
  }

  const withoutHashOrQuery = trimmed.split("#")[0].split("?")[0]
  const schemeSeparator = withoutHashOrQuery.indexOf("://")
  if (schemeSeparator === -1) {
    return null
  }

  const rawPathStart = withoutHashOrQuery.indexOf("/", schemeSeparator + 3)
  if (rawPathStart === -1) {
    return null
  }

  const rawPath = withoutHashOrQuery.slice(rawPathStart)
  if (
    !rawPath.startsWith(PRODUCTS_STORAGE_PUBLIC_PREFIX) ||
    !parsed.pathname.startsWith(PRODUCTS_STORAGE_PUBLIC_PREFIX)
  ) {
    return null
  }

  const rawRelative = rawPath.slice(PRODUCTS_STORAGE_PUBLIC_PREFIX.length)
  if (!rawRelative || rawRelative.includes("..")) {
    return null
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(rawRelative)
  } catch {
    return null
  }

  if (CONTROL_CHARS_OR_BACKSLASH_RE.test(decoded) || decoded.includes("..")) {
    return null
  }

  const normalized = decoded.replace(/^\/+/, "")
  if (!normalized) {
    return null
  }

  const segments = normalized.split("/")
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return null
  }

  return normalized
}

export function isWebpStoragePath(storagePath: string): boolean {
  return storagePath.trim().toLowerCase().endsWith(".webp")
}

export function buildTargetWebpStoragePath(
  currentStoragePath: string,
  productName: string,
  collisionIndex = 0
): string | null {
  const trimmedPath = currentStoragePath.trim().replace(/^\/+/, "")
  if (
    !trimmedPath ||
    !isWebpStoragePath(trimmedPath) ||
    trimmedPath.includes("..") ||
    CONTROL_CHARS_OR_BACKSLASH_RE.test(trimmedPath)
  ) {
    return null
  }

  const slug = slugifyProductImageName(productName)
  if (!slug) {
    return null
  }

  const lastSlash = trimmedPath.lastIndexOf("/")
  const folderPrefix = lastSlash >= 0 ? trimmedPath.slice(0, lastSlash + 1) : ""
  const suffix =
    Number.isInteger(collisionIndex) && collisionIndex > 0
      ? `-${collisionIndex + 1}`
      : ""

  return `${folderPrefix}${slug}${suffix}.webp`
}

export function buildUploadStoragePath(
  category: string,
  ext: string,
  options?: BuildUploadStoragePathOptions
): string {
  const safeCategory =
    category
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "") || "general"

  const safeExt =
    ext
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "webp"

  const preferredSlug = options?.preferredName
    ? slugifyProductImageName(options.preferredName)
    : ""

  const fallbackSlug = options?.fallbackFileName
    ? slugifyProductImageName(stripFileExtension(options.fallbackFileName))
    : ""

  const randomFallback =
    options?.randomFallback?.trim().replace(/[^a-z0-9_-]/gi, "") || ""

  const baseName =
    preferredSlug ||
    fallbackSlug ||
    randomFallback ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  const collisionIndex = options?.collisionIndex ?? 0
  const suffix =
    Number.isInteger(collisionIndex) && collisionIndex > 0
      ? `-${collisionIndex + 1}`
      : ""

  return `uploads/${safeCategory}/${baseName}${suffix}.${safeExt}`
}
