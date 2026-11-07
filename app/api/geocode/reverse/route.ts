import { NextRequest, NextResponse } from "next/server"
import { formatCep } from "@/lib/maps-service"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const latStr = searchParams.get("lat")
  const lngStr = searchParams.get("lng")

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "Latitude e longitude são obrigatórias." },
      { status: 400 }
    )
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "Coordenadas geográficas inválidas." },
      { status: 400 }
    )
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)

    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`
    const res = await fetch(osmUrl, {
      headers: {
        "User-Agent": "BatataTopDelivery/1.0 (contato@batatatopiacanga.com.br)",
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        { error: "Serviço de mapas indisponível." },
        { status: 502 }
      )
    }

    const data = await res.json()
    const addr = data.address || {}

    const street = addr.road || addr.pedestrian || addr.street || addr.residential || ""
    const neighborhood =
      addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || ""
    const city = addr.city || addr.town || addr.municipality || addr.village || "Iacanga"
    const state =
      addr["ISO3166-2-lvl4"]?.replace("BR-", "") ||
      (addr.state === "São Paulo" ? "SP" : addr.state) ||
      "SP"
    const cep = formatCep(addr.postcode || "17150-000") || "17150-000"

    return NextResponse.json({
      street,
      neighborhood,
      city,
      state,
      cep,
      displayName: data.display_name,
    })
  } catch (error: any) {
    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Tempo limite esgotado ao consultar serviço de mapas." },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: "Falha ao processar geocodificação reversa." },
      { status: 500 }
    )
  }
}
