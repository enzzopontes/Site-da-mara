"use client"

import { useState, useCallback, RefObject } from "react"
import { mapsService, type ReverseGeocodeResult } from "@/lib/maps-service"
import { appToast } from "@/lib/app-toast"

interface UseCurrentLocationOptions {
  onSuccess?: (address: ReverseGeocodeResult) => void
  numberInputRef?: RefObject<HTMLInputElement | null>
}

export function useCurrentLocation(options?: UseCurrentLocationOptions) {
  const [isLocating, setIsLocating] = useState(false)

  const requestLocation = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      appToast.warning(
        "GPS não suportado",
        "Seu dispositivo ou navegador não suporta geolocalização. Digite o CEP manualmente."
      )
      return null
    }

    setIsLocating(true)

    return new Promise<ReverseGeocodeResult | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            const address = await mapsService.reverseGeocode(latitude, longitude)

            if (options?.onSuccess) {
              options.onSuccess(address)
            }

            // Foco automático no campo Número
            if (options?.numberInputRef?.current) {
              setTimeout(() => {
                options.numberInputRef?.current?.focus()
              }, 50)
            }

            // Validação de cidade de entrega (Iacanga)
            if (address.city.toLowerCase() !== "iacanga") {
              appToast.warning(
                "Fora da área de entrega principal",
                `Local detectado em ${address.city}/${address.state}. Entregamos prioritariamente em Iacanga.`
              )
            } else {
              appToast.success(
                "Localização detectada!",
                "Endereço preenchido. Digite o número da sua residência."
              )
            }

            resolve(address)
          } catch (err: any) {
            appToast.error(
              "Erro ao obter endereço",
              "Não foi possível converter suas coordenadas. Digite o CEP manualmente."
            )
            resolve(null)
          } finally {
            setIsLocating(false)
          }
        },
        (error) => {
          setIsLocating(false)

          switch (error.code) {
            case error.PERMISSION_DENIED:
              appToast.warning(
                "Permissão de GPS negada",
                "Você pode continuar digitando seu CEP e endereço manualmente abaixo."
              )
              break
            case error.POSITION_UNAVAILABLE:
              appToast.error(
                "Sinal de GPS indisponível",
                "Não foi possível obter sua localização no momento. Digite o CEP manualmente."
              )
              break
            case error.TIMEOUT:
              appToast.error(
                "Tempo limite esgotado",
                "O GPS demorou muito para responder (10s). Digite o CEP manualmente."
              )
              break
            default:
              appToast.error(
                "Erro de localização",
                "Ocorreu um erro ao obter sua localização. Digite o CEP manualmente."
              )
              break
          }
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }, [options])

  return {
    isLocating,
    requestLocation,
  }
}
