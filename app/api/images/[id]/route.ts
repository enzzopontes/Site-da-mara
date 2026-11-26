import { getSupabase } from "@/lib/supabase-fix"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Image ID is required" },
        { status: 400 }
      )
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const isLegacyUploadId = /^[0-9]{10,16}-[a-z0-9]{6,16}$/i.test(id)
    if (!isUuid && !isLegacyUploadId) {
      return NextResponse.json(
        { error: "Invalid image ID" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Busca a imagem no banco de dados
    const { data, error } = await supabase
      .from("uploaded_images")
      .select("data, mime_type")
      .eq("id", id)
      .single()

    if (error || !data || typeof data.data !== "string" || data.data.length === 0) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      )
    }

    // Converte base64 para Buffer
    const buffer = Buffer.from(data.data, "base64")
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      )
    }

    // Detecta assinatura binária real (magic bytes) para não confiar cegamente no mime_type do banco
    const detectMagicMime = (buf: Buffer): string | null => {
      if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg"
      if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png"
      if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif"
      if (
        buf.length >= 12 &&
        buf.subarray(0, 4).toString("ascii") === "RIFF" &&
        buf.subarray(8, 12).toString("ascii") === "WEBP"
      ) {
        return "image/webp"
      }
      return null
    }

    // Whitelist segura de MIME types (bloqueia SVG executável e valida magic bytes)
    const rawMime = (data.mime_type || "image/jpeg").toLowerCase().trim()
    const safeMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const magicMime = detectMagicMime(buffer)
    const isSafeMime = safeMimes.includes(rawMime) && magicMime !== null
    const contentType = isSafeMime ? magicMime : "application/octet-stream"

    // Retorna a imagem com cabeçalhos rígidos de isolamento
    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "public, max-age=31536000, immutable",
    }

    if (!isSafeMime) {
      responseHeaders["Content-Disposition"] = "attachment; filename=\"image\""
    }

    return new NextResponse(buffer, {
      headers: responseHeaders,
    })
  } catch (error) {
    console.error("[Images API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
