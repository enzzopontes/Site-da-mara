"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { GeocodedAddress } from "@/lib/schemas/address-selection-schema"
import { formatCep } from "@/lib/maps-service"

export const DEFAULT_IACANGA_COORDS = {
  latitude: -21.8402,
  longitude: -49.0058,
}

export const CIDADE_PERMITIDA = "Iacanga"
export const UF_PERMITIDA = "SP"
const NOMINATIM_CONTACT = "contato@batatatop.com.br"

export interface AutocompleteSuggestion {
  place_id: number | string
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    pedestrian?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    municipality?: string
    state?: string
    postcode?: string
  }
}

export function useMapGeocoding(initialCoords?: { latitude: number; longitude: number } | null) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    initialCoords || DEFAULT_IACANGA_COORDS
  )
  const [currentAddress, setCurrentAddress] = useState<GeocodedAddress | null>(null)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [isLocatingUser, setIsLocatingUser] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Autocomplete
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchNotFound, setSearchNotFound] = useState(false)

  const reverseDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const reverseAbortRef = useRef<AbortController | null>(null)

  // Reverse geocoding function
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<GeocodedAddress | null> => {
      if (reverseAbortRef.current) reverseAbortRef.current.abort()
      const controller = new AbortController()
      reverseAbortRef.current = controller

      setIsResolvingAddress(true)
      setGeoError(null)

      try {
        // 1. Tenta API interna do Next.js
        const internalRes = await fetch(
          `/api/geocode/reverse?lat=${lat}&lng=${lng}`,
          { signal: controller.signal }
        )

        if (internalRes.ok) {
          const data = await internalRes.json()
          if (data && data.city) {
            const isCityValid =
              (data.city || "").trim().toLowerCase() === CIDADE_PERMITIDA.toLowerCase() &&
              (data.state || "").trim().toUpperCase() === UF_PERMITIDA

            const res: GeocodedAddress = {
              street: data.street || "",
              neighborhood: data.neighborhood || "",
              city: data.city || CIDADE_PERMITIDA,
              state: data.state || UF_PERMITIDA,
              cep: data.cep || "17150-000",
              latitude: lat,
              longitude: lng,
              formatted: data.displayName || `${data.street}, ${data.neighborhood}, ${data.city}`,
              isValidCity: isCityValid,
            }
            setCurrentAddress(res)
            return res
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return null
      }

      // 2. Fallback Nominatim direto
      try {
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&email=${encodeURIComponent(NOMINATIM_CONTACT)}`
        const osmRes = await fetch(osmUrl, {
          headers: {
            "Accept-Language": "pt-BR",
            "User-Agent": `BatataTopDelivery/1.0 (${NOMINATIM_CONTACT})`,
          },
          signal: controller.signal,
        })

        if (osmRes.ok) {
          const data = await osmRes.json()
          const addr = data.address || {}
          const street = addr.road || addr.pedestrian || addr.residential || ""
          const neighborhood =
            addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || ""
          const city = addr.city || addr.town || addr.municipality || addr.village || "Iacanga"
          const stateCode = addr["ISO3166-2-lvl4"]?.replace("BR-", "") || (addr.state?.toLowerCase().includes("paulo") ? "SP" : "SP")
          const cep = formatCep(addr.postcode || "17150-000") || "17150-000"

          const isCityValid =
            city.trim().toLowerCase() === CIDADE_PERMITIDA.toLowerCase() &&
            stateCode.trim().toUpperCase() === UF_PERMITIDA

          const res: GeocodedAddress = {
            street,
            neighborhood,
            city,
            state: stateCode,
            cep,
            latitude: lat,
            longitude: lng,
            formatted: data.display_name || `${street}, ${neighborhood}, ${city}`,
            isValidCity: isCityValid,
          }
          setCurrentAddress(res)
          return res
        }
      } catch (err: any) {
        if (err.name === "AbortError") return null
        setGeoError("Não foi possível obter os dados do endereço para este ponto.")
      } finally {
        setIsResolvingAddress(false)
        setIsMoving(false)
      }

      return null
    },
    []
  )

  // Disparo com debounce ao movimentar o mapa
  const triggerDebouncedReverseGeocode = useCallback(
    (lat: number, lng: number) => {
      setCoords({ latitude: lat, longitude: lng })
      setIsMoving(true)

      if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current)
      reverseDebounceRef.current = setTimeout(() => {
        reverseGeocode(lat, lng).then(() => {
          setIsMoving(false)
        })
      }, 450)
    },
    [reverseGeocode]
  )

  // Localização atual do navegador
  const requestCurrentLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoError("Geolocalização não é suportada pelo seu navegador.")
      return
    }

    setIsLocatingUser(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ latitude, longitude })
        triggerDebouncedReverseGeocode(latitude, longitude)
        setIsLocatingUser(false)
      },
      (error) => {
        setIsLocatingUser(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError(
              "Permissão de localização negada pelo navegador. Você pode pesquisar o endereço digitando no campo de busca ou arrastando o mapa."
            )
            break
          case error.POSITION_UNAVAILABLE:
            setGeoError("Sinal de GPS indisponível no momento. Use a busca por texto.")
            break
          case error.TIMEOUT:
            setGeoError("Tempo limite para capturar sua localização expirou. Tente novamente.")
            break
          default:
            setGeoError("Erro ao capturar localização. Use a busca textual ou o mapa.")
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }, [triggerDebouncedReverseGeocode])

  // Busca textual / Autocomplete com restrição para Iacanga/SP
  const searchPlaces = useCallback((query: string) => {
    setSearchQuery(query)
    setSearchNotFound(false)

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    searchDebounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort()
      const controller = new AbortController()
      searchAbortRef.current = controller

      setIsSearching(true)
      try {
        const q = encodeURIComponent(`${trimmed}, ${CIDADE_PERMITIDA}, ${UF_PERMITIDA}, Brasil`)
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${q}&addressdetails=1&limit=6&countrycodes=br&email=${encodeURIComponent(NOMINATIM_CONTACT)}`

        const res = await fetch(url, {
          headers: {
            "Accept-Language": "pt-BR",
            "User-Agent": `BatataTopDelivery/1.0 (${NOMINATIM_CONTACT})`,
          },
          signal: controller.signal,
        })

        if (!res.ok) throw new Error("Falha na busca")
        const data = await res.json()

        const filtered = (data || []).filter((item: any) => {
          const city = (
            item.address?.city ||
            item.address?.town ||
            item.address?.municipality ||
            item.address?.village ||
            ""
          ).toLowerCase()
          return city === CIDADE_PERMITIDA.toLowerCase()
        })

        setSuggestions(filtered)
        setSearchNotFound(filtered.length === 0)
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([])
          setSearchNotFound(true)
        }
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [])

  const selectSuggestion = useCallback(
    (item: AutocompleteSuggestion) => {
      const lat = parseFloat(item.lat)
      const lon = parseFloat(item.lon)
      setCoords({ latitude: lat, longitude: lon })
      setSuggestions([])
      setSearchQuery("")
      triggerDebouncedReverseGeocode(lat, lon)
    },
    [triggerDebouncedReverseGeocode]
  )

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    setSuggestions([])
    setSearchNotFound(false)
  }, [])

  // Geocodifica as coordenadas iniciais ao montar
  useEffect(() => {
    reverseGeocode(coords.latitude, coords.longitude)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    coords,
    setCoords,
    currentAddress,
    isResolvingAddress,
    isLocatingUser,
    isMoving,
    setIsMoving,
    geoError,
    setGeoError,
    searchQuery,
    suggestions,
    isSearching,
    searchNotFound,
    searchPlaces,
    selectSuggestion,
    clearSearch,
    triggerDebouncedReverseGeocode,
    requestCurrentLocation,
  }
}
