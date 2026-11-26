export interface ReverseGeocodeResult {
  street: string
  neighborhood: string
  city: string
  state: string
  cep: string
  displayName?: string
}

export interface SearchAddressResult {
  place_id: number | string
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    pedestrian?: string
    suburb?: string
    neighbourhood?: string
    quarter?: string
    city?: string
    town?: string
    municipality?: string
    village?: string
    state?: string
    postcode?: string
    house_number?: string
  }
}

/**
 * Limpa nomes em inglês de ruas gerados por geocodificadores ("50 Street" -> "Rua 50")
 */
export function cleanStreetName(name: string): string {
  if (!name) return ""
  let s = name.trim()
  s = s.replace(/^(\d+)(?:st|nd|rd|th)?\s+Street$/i, "Rua $1")
  s = s.replace(/\b(\d+)\s+Street\b/i, "Rua $1")
  s = s.replace(/\bStreet\s+(\d+)\b/i, "Rua $1")
  return s
}

/**
 * Normaliza o CEP no formato 00000-000
 */
export function formatCep(rawCep: string): string {
  const digits = (rawCep || "").replace(/\D/g, "").slice(0, 8)
  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, "$1-$2")
  }
  return ""
}

/**
 * Serviço de geocodificação reversa com timeout de 12s e fallbacks.
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<SearchAddressResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(trimmed)}`, {
    signal,
  })
  if (!res.ok) return []

  const data = await res.json()
  return Array.isArray(data?.results) ? data.results : []
}

export const mapsService = {
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(
        `/api/geocode/reverse?lat=${latitude}&lng=${longitude}`,
        { signal: controller.signal }
      )

      if (!response.ok) return null

      const data = await response.json()
      if (!data) return null

      return {
        ...data,
        street: cleanStreetName(data.street || ""),
      }
    } catch {
      return null
    } finally {
      clearTimeout(timeoutId)
    }
  },

  searchAddress,
}
