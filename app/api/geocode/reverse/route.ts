import { NextRequest, NextResponse } from "next/server"
import { formatCep } from "@/lib/maps-service"

function cleanStreetName(name: string): string {
  if (!name) return ""
  let s = name.trim()
  // Normaliza nomes em inglês vindos de geocodificadores: "50 Street" -> "Rua 50", "50th Street" -> "Rua 50"
  s = s.replace(/^(\d+)(?:st|nd|rd|th)?\s+Street$/i, "Rua $1")
  s = s.replace(/\b(\d+)\s+Street\b/i, "Rua $1")
  s = s.replace(/\bStreet\s+(\d+)\b/i, "Rua $1")
  return s
}

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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY

  // 1. Tenta Google Maps Geocoding API oficial se a chave estiver configurada
  if (apiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&region=br&key=${apiKey}`
      const googleRes = await fetch(googleUrl, { signal: AbortSignal.timeout(6000) })

      if (googleRes.ok) {
        const gData = await googleRes.json()
        if (gData.status === "OK" && gData.results && gData.results[0]) {
          const first = gData.results[0]
          let street = ""
          let neighborhood = ""
          let city = "Iacanga"
          let state = "SP"
          let cep = ""

          for (const c of first.address_components) {
            const types = c.types
            if (types.includes("route")) street = c.long_name
            else if (types.includes("sublocality_level_1") || types.includes("sublocality")) neighborhood = c.long_name
            else if (types.includes("administrative_area_level_2")) city = c.long_name
            else if (types.includes("administrative_area_level_1")) state = c.short_name
            else if (types.includes("postal_code")) cep = c.long_name
          }

          if (!street && first.formatted_address) {
            street = first.formatted_address.split(",")[0]
          }

          return NextResponse.json({
            street: cleanStreetName(street),
            neighborhood,
            city,
            state,
            cep: formatCep(cep) || "17150-000",
            displayName: first.formatted_address,
          })
        }
      }
    } catch {
      // Segue para fallback do Nominatim
    }
  }

  // 2. Fallback Nominatim (OpenStreetMap) em Português
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)

    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR,pt;q=0.9`
    const res = await fetch(osmUrl, {
      headers: {
        "User-Agent": "BatataTopDelivery/1.0 (contato@batatatopiacanga.com.br)",
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
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

    const rawStreet = addr.road || addr.pedestrian || addr.street || addr.residential || ""
    const street = cleanStreetName(rawStreet)
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
