import { NextRequest, NextResponse } from "next/server"
import { cleanStreetName, type SearchAddressResult } from "@/lib/maps-service"

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

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    osm_id?: number | string
    osm_key?: string
    name?: string
    street?: string
    housenumber?: string
    locality?: string
    district?: string
    city?: string
    state?: string
    postcode?: string
    countrycode?: string
    country?: string
  }
}

const searchCache = new Map<string, { expiresAt: number; data: SearchAddressResult[] }>()

function normalizeQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
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

function isIacanga(city?: string): boolean {
  if (!city) return false
  return (
    city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() === "iacanga"
  )
}

function isBrazilFeature(feature: PhotonFeature): boolean {
  const p = feature.properties
  if (!p) return false
  if (p.countrycode) {
    return p.countrycode.toUpperCase() === "BR"
  }
  if (p.country) {
    const c = p.country
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
    return c === "brasil" || c === "brazil"
  }
  return false
}

function getCached(key: string): SearchAddressResult[] | null {
  const entry = searchCache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    searchCache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: SearchAddressResult[]) {
  if (searchCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value
    if (oldestKey !== undefined) {
      searchCache.delete(oldestKey)
    }
  }
  searchCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()

  if (q.length < 2 || q.length > 150) {
    return NextResponse.json({ results: [] }, { status: 200 })
  }

  const cacheKey = normalizeQuery(q)
  const cached = getCached(cacheKey)
  if (cached) {
    return NextResponse.json({ results: cached }, { status: 200 })
  }

  // 1. Provedor primário: Photon (Komoot / OpenStreetMap)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${q} Iacanga`)}&lat=-21.8928&lon=-49.0226&limit=8`
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

      const brazilFeatures = features.filter(isBrazilFeature)
      brazilFeatures.sort((a, b) => {
        const aCity = a.properties?.city || a.properties?.district
        const bCity = b.properties?.city || b.properties?.district
        const aMatch = isIacanga(aCity) ? 1 : 0
        const bMatch = isIacanga(bCity) ? 1 : 0
        return bMatch - aMatch
      })

      const results: SearchAddressResult[] = brazilFeatures
        .map((feature): SearchAddressResult | null => {
          const p = feature.properties
          const coords = feature.geometry?.coordinates
          if (!p || !Array.isArray(coords) || coords.length < 2) return null

          const lon = coords[0]
          const lat = coords[1]
          const road = cleanStreetName(
            p.street || (p.osm_key === "highway" ? p.name : "") || p.name || ""
          )
          const city = p.city || p.district || ""
          const neighborhood =
            p.locality || (p.district && p.district !== p.city ? p.district : "") || ""
          const state = normalizeBrazilState(p.state)

          return {
            place_id: p.osm_id || `${lon},${lat}`,
            display_name: [road, neighborhood, city, state].filter(Boolean).join(", "),
            lat: String(coords[1]),
            lon: String(coords[0]),
            address: {
              road,
              house_number: p.housenumber,
              suburb: neighborhood,
              neighbourhood: neighborhood,
              city,
              state,
              postcode: p.postcode,
            },
          }
        })
        .filter((item): item is SearchAddressResult => item !== null)

      setCached(cacheKey, results)
      return NextResponse.json({ results }, { status: 200 })
    }
  } catch {
    // Segue para fallback do Nominatim
  }

  // 2. Fallback: Nominatim /search (somente se Photon falhar)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(`${q}, Iacanga, SP, Brasil`)}&addressdetails=1&limit=6&countrycodes=br`
    const res = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(6000),
    })

    if (res.ok) {
      const data = await res.json()
      const results: SearchAddressResult[] = Array.isArray(data) ? data : []
      setCached(cacheKey, results)
      return NextResponse.json({ results }, { status: 200 })
    }
  } catch {
    // Ambos os provedores falharam
  }

  return NextResponse.json(
    { results: [], error: "Serviço de busca de endereços indisponível." },
    { status: 502 }
  )
}
