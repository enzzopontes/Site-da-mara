"use client"

import { useState, useCallback, useRef, RefObject } from "react"
import { mapsService, type ReverseGeocodeResult } from "@/lib/maps-service"
import { appToast } from "@/lib/app-toast"

export type CurrentLocationResult = ReverseGeocodeResult & {
  lat?: number
  lng?: number
}

interface UseCurrentLocationOptions {
  onSuccess?: (address: CurrentLocationResult) => void
  numberInputRef?: RefObject<HTMLInputElement | null>
}

export function useCurrentLocation(options?: UseCurrentLocationOptions) {
  const [isLocating, setIsLocating] = useState(false)
  const inFlightRef = useRef(false)

  const requestLocation = useCallback(async () => {
    if (inFlightRef.current) {
      return null
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      appToast.warning(
        "GPS não suportado",
        "Seu dispositivo ou navegador não suporta geolocalização. Digite o CEP manualmente."
      )
      return null
    }

    inFlightRef.current = true
    setIsLocating(true)

    return new Promise<CurrentLocationResult | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            const address = await mapsService.reverseGeocode(latitude, longitude)

            if (!address) {
              appToast.error(
                "Erro ao obter endereço",
                "Não foi possível converter suas coordenadas. Digite o CEP manualmente."
              )
              resolve(null)
              return
            }

            // Validação de cidade de entrega (Iacanga/SP) antes de mutar estado
            const normalizedCity = (address.city || "").trim().toLowerCase()
            const normalizedState = (address.state || "").trim().toUpperCase()
            const isInDeliveryArea =
              normalizedCity === "iacanga" &&
              (normalizedState === "" ||
                normalizedState === "SP" ||
                normalizedState === "SÃO PAULO" ||
                normalizedState === "SAO PAULO")

            if (!isInDeliveryArea) {
              const detectedLabel = [address.city?.trim(), address.state?.trim()]
                .filter(Boolean)
                .join("/")
              appToast.warning(
                "Fora da área de entrega principal",
                detectedLabel
                  ? `Local detectado em ${detectedLabel}. Entregamos apenas em Iacanga/SP.`
                  : "Local detectado fora da área de entrega. Entregamos apenas em Iacanga/SP."
              )
              resolve(null)
              return
            }

            const result: CurrentLocationResult = {
              ...address,
              lat: latitude,
              lng: longitude,
            }

            if (options?.onSuccess) {
              options.onSuccess(result)
            }

            // Foco automático no campo Número
            if (options?.numberInputRef?.current) {
              setTimeout(() => {
                options.numberInputRef?.current?.focus()
              }, 50)
            }

            appToast.success(
              "Localização detectada!",
              "Endereço preenchido. Digite o número da sua residência."
            )

            resolve(result)
          } catch (err: any) {
            appToast.error(
              "Erro ao obter endereço",
              "Não foi possível converter suas coordenadas. Digite o CEP manualmente."
            )
            resolve(null)
          } finally {
            inFlightRef.current = false
            setIsLocating(false)
          }
        },
        (error) => {
          inFlightRef.current = false
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
