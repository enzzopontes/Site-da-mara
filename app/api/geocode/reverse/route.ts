import { NextRequest, NextResponse } from "next/server"
import { cleanStreetName, formatCep } from "@/lib/maps-service"

const NOMINATIM_USER_AGENT = "BatataTopIacanga/1.0 (contato@batatatop.com.br)"
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX_ENTRIES = 200

const BRAZIL_STATES: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
}

interface ReverseGeocodePayload {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  cep: string
  zipCode: string
  displayName?: string
  source: "google" | "photon" | "nominatim" | "bigdatacloud"
}

interface PhotonFeature {
  properties?: {
    osm_key?: string
    name?: string
    street?: string
    housenumber?: string
    locality?: string
    district?: string
    city?: string
    county?: string
    state?: string
    postcode?: string
  }
}

const reverseCache = new Map<string, { expiresAt: number; data: ReverseGeocodePayload }>()

function getCached(key: string): ReverseGeocodePayload | null {
  const entry = reverseCache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    reverseCache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: ReverseGeocodePayload) {
  if (reverseCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = reverseCache.keys().next().value
    if (oldestKey !== undefined) {
      reverseCache.delete(oldestKey)
    }
  }
  reverseCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data })
}

function normalizeBrazilState(state?: string): string {
  if (!state) return ""
  const trimmed = state.trim()
  if (!trimmed) return ""

  const withoutPrefix = trimmed.replace(/^BR-/i, "").trim()
  if (/^[A-Za-z]{2}$/.test(withoutPrefix)) {
    return withoutPrefix.toUpperCase()
  }

  const normalized = withoutPrefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")

  return BRAZIL_STATES[normalized] || withoutPrefix
}

function isIacanga(city: string): boolean {
  return (
    city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() === "iacanga"
  )
}

function resolveCep(rawCep: string | undefined, city: string): string {
  const formatted = formatCep(rawCep || "")
  if (/^\d{5}-\d{3}$/.test(formatted)) {
    return formatted
  }
  return isIacanga(city) ? "17180-000" : ""
}

function pickBestPhotonFeature(features: PhotonFeature[]): PhotonFeature | null {
  if (!features.length) return null
  return (
    features.find((f) => {
      const p = f.properties
      return Boolean(p && (p.street || (p.osm_key === "highway" && p.name)))
    }) ||
    features.find((f) => {
      const p = f.properties
      return Boolean(p && (p.name || p.city || p.county || p.district))
    }) ||
    features[0]
  )
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

  // Validação numérica + bounding-box do Brasil (cobre SP/Iacanga e impede abuso global da cota)
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -34 ||
    lat > 6 ||
    lng < -74 ||
    lng > -34
  ) {
    return NextResponse.json(
      { error: "Coordenadas geográficas inválidas ou fora da área atendida." },
      { status: 400 }
    )
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const respond = (payload: ReverseGeocodePayload) => {
    if (payload.street && payload.city) {
      setCached(cacheKey, payload)
    }
    return NextResponse.json(payload)
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  // 1. Google Geocoding API (apenas se chave server-side configurada)
  if (apiKey) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&region=br&key=${apiKey}`
      const googleRes = await fetch(googleUrl, { signal: AbortSignal.timeout(6000) })

      if (googleRes.ok) {
        const gData = await googleRes.json()
        if (gData.status === "OK" && gData.results && gData.results[0]) {
          const first = gData.results[0]
          let street = ""
          let number = ""
          let neighborhood = ""
          let city = ""
          let state = ""
          let rawCep = ""

          for (const c of first.address_components || []) {
            const types: string[] = c.types || []
            if (types.includes("route")) street = c.long_name
            else if (types.includes("street_number")) number = c.long_name
            else if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
              neighborhood = c.long_name
            } else if (types.includes("administrative_area_level_2")) city = c.long_name
            else if (!city && types.includes("locality")) city = c.long_name
            else if (types.includes("administrative_area_level_1")) state = c.short_name
            else if (types.includes("postal_code")) rawCep = c.long_name
          }

          if (!street && first.formatted_address) {
            street = first.formatted_address.split(",")[0]
          }

          const zipCode = resolveCep(rawCep, city)

          return respond({
            street: cleanStreetName(street),
            number,
            neighborhood,
            city,
            state: normalizeBrazilState(state),
            cep: zipCode,
            zipCode,
            displayName: first.formatted_address,
            source: "google",
          })
        } else if (process.env.NODE_ENV !== "production") {
          console.warn(`[geocode/reverse] Google Geocoding status=${gData.status ?? "unknown"}`)
        }
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(`[geocode/reverse] Google Geocoding HTTP ${googleRes.status}`)
      }
    } catch {
      // Segue para Photon
    }
  }

  let partialResult: ReverseGeocodePayload | null = null

  // 2. Photon (Komoot / OpenStreetMap)
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&radius=0.5&limit=3`
    const photonRes = await fetch(photonUrl, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6000),
    })

    if (photonRes.ok) {
      const photonData = await photonRes.json()
      const features: PhotonFeature[] = Array.isArray(photonData?.features)
        ? photonData.features
        : []
      const best = pickBestPhotonFeature(features)
      const p = best?.properties

      if (p) {
        const street = cleanStreetName(
          p.street || (p.osm_key === "highway" ? p.name || "" : "")
        )
        const number = p.housenumber || ""
        const city = p.city || p.county || ""
        const neighborhood =
          p.locality || (p.district && p.district !== city ? p.district : "") || ""
        const state = normalizeBrazilState(p.state)
        const zipCode = resolveCep(p.postcode, city)
        const displayName = [street, number, neighborhood, city, state]
          .filter(Boolean)
          .join(", ")

        const payload: ReverseGeocodePayload = {
          street,
          number,
          neighborhood,
          city,
          state,
          cep: zipCode,
          zipCode,
          displayName: displayName || undefined,
          source: "photon",
        }

        if (city) {
          return respond(payload)
        }
        if (street || neighborhood || state) {
          partialResult = payload
        }
      }
    }
  } catch {
    // Segue para Nominatim
  }

  // 3. Fallback Nominatim (OpenStreetMap) em Português
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR,pt;q=0.9`
    const res = await fetch(osmUrl, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(6000),
    })

    if (res.ok) {
      const data = await res.json()
      const addr = data?.address || {}

      const rawStreet = addr.road || addr.pedestrian || addr.street || addr.residential || ""
      const street = cleanStreetName(rawStreet)
      const number = addr.house_number || ""
      const neighborhood =
        addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || ""
      const city = addr.city || addr.town || addr.municipality || addr.village || ""
      const state = normalizeBrazilState(addr["ISO3166-2-lvl4"] || addr.state)
      const zipCode = resolveCep(addr.postcode, city)

      const payload: ReverseGeocodePayload = {
        street,
        number,
        neighborhood,
        city,
        state,
        cep: zipCode,
        zipCode,
        displayName: data?.display_name,
        source: "nominatim",
      }

      if (city) {
        return respond(payload)
      }
      if (!partialResult && (street || neighborhood || state)) {
        partialResult = payload
      }
    }
  } catch {
    // Segue para BigDataCloud
  }

  // 4. Fallback BigDataCloud (quando Photon e Nominatim falham ou não retornam cidade)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
    const bdcRes = await fetch(bdcUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (bdcRes.ok) {
      const data = await bdcRes.json()
      const city = data?.city || data?.locality || ""
      const state = normalizeBrazilState(
        data?.principalSubdivisionCode || data?.principalSubdivision
      )

      if (city || state) {
        const street = partialResult?.street || ""
        const number = partialResult?.number || ""
        const neighborhood = partialResult?.neighborhood || ""
        const resolvedCity = city || partialResult?.city || ""
        const resolvedState = state || partialResult?.state || ""
        const zipCode = resolveCep(partialResult?.zipCode || partialResult?.cep, resolvedCity)
        const displayName =
          [street, number, neighborhood, resolvedCity, resolvedState]
            .filter(Boolean)
            .join(", ") || undefined

        return respond({
          street,
          number,
          neighborhood,
          city: resolvedCity,
          state: resolvedState,
          cep: zipCode,
          zipCode,
          displayName,
          source: "bigdatacloud",
        })
      }
    }
  } catch {
    // Todos os provedores falharam
  }

  if (partialResult) {
    return NextResponse.json(partialResult)
  }

  return NextResponse.json(
    { error: "Serviço de mapas indisponível." },
    { status: 502 }
  )
}
