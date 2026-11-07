export interface ReverseGeocodeResult {
  street: string
  neighborhood: string
  city: string
  state: string
  cep: string
  displayName?: string
}

/**
 * Normaliza o CEP no formato 00000-000
 */
export function formatCep(rawCep: string): string {
  const digits = (rawCep || "").replace(/\D/g, "").slice(0, 8)
  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, "$1-$2")
  }
  return digits
}

/**
 * Serviço de geocodificação reversa com timeout de 10s e fallbacks.
 */
export const mapsService = {
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      // 1. Tenta endpoint interno do Next.js
      const localResponse = await fetch(
        `/api/geocode/reverse?lat=${latitude}&lng=${longitude}`,
        { signal: controller.signal }
      )

      if (localResponse.ok) {
        const data = await localResponse.json()
        if (data && data.city) {
          clearTimeout(timeoutId)
          return data
        }
      }
    } catch {
      // Fallback em caso de erro na rota interna
    }

    // 2. Fallback client-side para Nominatim (OpenStreetMap)
    try {
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
      const osmResponse = await fetch(osmUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "BatataTopDelivery/1.0 (contato@batatatopiacanga.com.br)",
        },
        signal: controller.signal,
      })
      
      if (osmResponse.ok) {
        const osmData = await osmResponse.json()
        const address = osmData.address || {}

        const street = address.road || address.pedestrian || address.street || address.residential || ""
        const neighborhood = address.suburb || address.neighbourhood || address.quarter || address.residential || ""
        const city = address.city || address.town || address.municipality || address.village || "Iacanga"
        const state = address.state_code || (address.state === "São Paulo" ? "SP" : address.state) || "SP"
        const rawPostcode = address.postcode || "17150-000"
        const cep = formatCep(rawPostcode) || "17150-000"

        clearTimeout(timeoutId)
        return {
          street,
          neighborhood,
          city,
          state,
          cep,
          displayName: osmData.display_name,
        }
      }
    } catch (err) {
      clearTimeout(timeoutId)
      throw err
    } finally {
      clearTimeout(timeoutId)
    }

    throw new Error("Não foi possível obter os dados do endereço para estas coordenadas.")
  },
}
