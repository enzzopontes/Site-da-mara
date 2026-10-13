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

    const supabase = await getSupabase()

    // Busca a imagem no banco de dados
    const { data, error } = await supabase
      .from("uploaded_images")
      .select("data, mime_type")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      )
    }

    // Converte base64 para Buffer
    const buffer = Buffer.from(data.data, "base64")

    // Whitelist segura de MIME types (bloqueia SVG executável)
    const rawMime = (data.mime_type || "image/jpeg").toLowerCase().trim()
    const safeMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const isSafeMime = safeMimes.includes(rawMime)
    const contentType = isSafeMime ? rawMime : "application/octet-stream"

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
