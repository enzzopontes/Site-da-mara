import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
  PRODUCTS_STORAGE_BUCKET,
  PRODUCTS_STORAGE_PUBLIC_PREFIX,
  slugifyProductImageName,
  stripFileExtension,
  extractProductsBucketPath,
  isWebpStoragePath,
  buildTargetWebpStoragePath,
  buildUploadStoragePath,
} from "../lib/product-image-naming.ts"

describe("product-image-naming constants", () => {
  it("exports bucket name and public storage prefix", () => {
    assert.equal(PRODUCTS_STORAGE_BUCKET, "Products")
    assert.equal(
      PRODUCTS_STORAGE_PUBLIC_PREFIX,
      "/storage/v1/object/public/Products/"
    )
  })
})

describe("slugifyProductImageName", () => {
  it("normalizes Portuguese accents, plus signs, and parenthesized weights", () => {
    assert.equal(
      slugifyProductImageName("Salada Gourmet com Frango (500g)"),
      "salada-gourmet-com-frango-500g"
    )
    assert.equal(
      slugifyProductImageName("Omelete À Moda da Casa"),
      "omelete-a-moda-da-casa"
    )
    assert.equal(
      slugifyProductImageName("Omelete Mussarela + Tomate + Palmito"),
      "omelete-mussarela-tomate-palmito"
    )
    assert.equal(
      slugifyProductImageName("Lasanha à Bolonhesa"),
      "lasanha-a-bolonhesa"
    )
    assert.equal(
      slugifyProductImageName("Coração de Alcachofra c/ Requeijão & Açafrão"),
      "coracao-de-alcachofra-c-requeijao-acafrao"
    )
  })

  it("caps output at 80 chars without trailing hyphen and returns empty for punctuation-only input", () => {
    const longName = `${"a".repeat(79)} bbbbb`
    const slug = slugifyProductImageName(longName)
    assert.equal(slug.length, 79)
    assert.equal(slug.endsWith("-"), false)

    assert.equal(slugifyProductImageName("   +++ () ---  "), "")
  })
})

describe("stripFileExtension", () => {
  it("strips only the last file extension when present", () => {
    assert.equal(stripFileExtension("foto.webp"), "foto")
    assert.equal(stripFileExtension("prato.final.png"), "prato.final")
    assert.equal(stripFileExtension("sem-extensao"), "sem-extensao")
    assert.equal(stripFileExtension(".hidden"), ".hidden")
    assert.equal(stripFileExtension("pasta/foto.jpeg"), "pasta/foto")
  })
})

describe("extractProductsBucketPath", () => {
  const supabaseOrigin = "https://abc123.supabase.co"

  it("extracts decoded relative path and strips query/hash", () => {
    const url =
      "https://abc123.supabase.co/storage/v1/object/public/Products/uploads/product/Salada%20Gourmet.webp?v=2#hero"
    assert.equal(
      extractProductsBucketPath(url, supabaseOrigin),
      "uploads/product/Salada Gourmet.webp"
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/root-image.webp"
      ),
      "root-image.webp"
    )
  })

  it("rejects path traversal, credentials, control chars, invalid URLs, wrong bucket, and origin mismatch", () => {
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/uploads/../secret.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/uploads/%2e%2e/secret.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://user:pass@abc123.supabase.co/storage/v1/object/public/Products/a.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/a%00.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/uploads\\a.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/uploads%5Ca.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://other.supabase.co/storage/v1/object/public/Products/a.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Other/a.webp",
        supabaseOrigin
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath("not-a-valid-url", supabaseOrigin),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "ftp://abc123.supabase.co/storage/v1/object/public/Products/a.webp"
      ),
      null
    )
    assert.equal(
      extractProductsBucketPath(
        "https://abc123.supabase.co/storage/v1/object/public/Products/"
      ),
      null
    )
  })
})

describe("isWebpStoragePath", () => {
  it("matches .webp case-insensitively and rejects other extensions", () => {
    assert.equal(isWebpStoragePath("uploads/product/item.webp"), true)
    assert.equal(isWebpStoragePath("  ITEM.WEBP  "), true)
    assert.equal(isWebpStoragePath("uploads/product/item.png"), false)
    assert.equal(isWebpStoragePath("uploads/product/item.jpg"), false)
    assert.equal(isWebpStoragePath(""), false)
  })
})

describe("buildTargetWebpStoragePath", () => {
  it("preserves nested folder prefix and root paths", () => {
    assert.equal(
      buildTargetWebpStoragePath(
        "uploads/product/old-123.webp",
        "Salada Gourmet com Frango (500g)"
      ),
      "uploads/product/salada-gourmet-com-frango-500g.webp"
    )
    assert.equal(
      buildTargetWebpStoragePath("old-root.webp", "Lasanha à Bolonhesa"),
      "lasanha-a-bolonhesa.webp"
    )
  })

  it("appends collision suffixes -2, -3 when collisionIndex > 0", () => {
    assert.equal(
      buildTargetWebpStoragePath(
        "uploads/product/old.webp",
        "Omelete À Moda da Casa",
        1
      ),
      "uploads/product/omelete-a-moda-da-casa-2.webp"
    )
    assert.equal(
      buildTargetWebpStoragePath("root.webp", "Omelete À Moda da Casa", 2),
      "omelete-a-moda-da-casa-3.webp"
    )
  })

  it("returns null for non-webp paths or empty product slug", () => {
    assert.equal(
      buildTargetWebpStoragePath("uploads/product/old.png", "Lasanha à Bolonhesa"),
      null
    )
    assert.equal(
      buildTargetWebpStoragePath("uploads/product/old.webp", "+++"),
      null
    )
  })
})

describe("buildUploadStoragePath", () => {
  it("uses preferredName first and sanitizes category and ext", () => {
    assert.equal(
      buildUploadStoragePath("Product/Hero!", ".WEBP", {
        preferredName: "Omelete Mussarela + Tomate + Palmito",
        fallbackFileName: "IMG_9999.jpg",
      }),
      "uploads/producthero/omelete-mussarela-tomate-palmito.webp"
    )
  })

  it("falls back to stripped fallbackFileName when preferredName is absent or empty", () => {
    assert.equal(
      buildUploadStoragePath("product", "webp", {
        preferredName: "   ",
        fallbackFileName: "Lasanha à Bolonhesa.png",
      }),
      "uploads/product/lasanha-a-bolonhesa.webp"
    )
  })

  it("falls back to randomFallback or generated token and defaults invalid category/ext", () => {
    assert.equal(
      buildUploadStoragePath("!!!", "???", {
        preferredName: "",
        fallbackFileName: "",
        randomFallback: "1700000000000-abc1234",
      }),
      "uploads/general/1700000000000-abc1234.webp"
    )

    const generated = buildUploadStoragePath("product", "webp")
    assert.match(generated, /^uploads\/product\/\d+-[a-z0-9]+\.webp$/)
  })

  it("sanitizes randomFallback so traversal and path separators never appear in filename segment", () => {
    for (const maliciousFallback of ["../evil/path", "..\\evil\\path"]) {
      const result = buildUploadStoragePath("product", "webp", {
        preferredName: "",
        fallbackFileName: "",
        randomFallback: maliciousFallback,
      })
      assert.ok(result.startsWith("uploads/product/"))
      assert.ok(result.endsWith(".webp"))

      const filenameSegment = result.slice("uploads/product/".length)
      assert.ok(filenameSegment.length > ".webp".length)
      assert.equal(filenameSegment.includes(".."), false)
      assert.equal(filenameSegment.includes("/"), false)
      assert.equal(filenameSegment.includes("\\"), false)
      assert.equal(result.split("/").length, 3)
    }
  })

  it("appends collision suffix when collisionIndex > 0", () => {
    assert.equal(
      buildUploadStoragePath("product", "webp", {
        preferredName: "Salada Gourmet com Frango (500g)",
        collisionIndex: 1,
      }),
      "uploads/product/salada-gourmet-com-frango-500g-2.webp"
    )
    assert.equal(
      buildUploadStoragePath("product", "png", {
        fallbackFileName: "Lasanha à Bolonhesa.jpeg",
        collisionIndex: 2,
      }),
      "uploads/product/lasanha-a-bolonhesa-3.png"
    )
  })
})
