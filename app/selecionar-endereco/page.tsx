"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronLeft,
  MapPin,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Navigation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { addressesManager } from "@/lib/addresses-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { appToast } from "@/lib/app-toast"
import {
  useMapGeocoding,
  DEFAULT_IACANGA_COORDS,
  CIDADE_PERMITIDA,
  UF_PERMITIDA,
} from "@/hooks/use-map-geocoding"
import { InteractiveMap } from "@/components/address-selection/interactive-map"
import { AddressSearchBox } from "@/components/address-selection/address-search-box"
import { OutOfAreaDialog } from "@/components/address-selection/out-of-area-dialog"
import { AddressContactForm } from "@/components/address-selection/address-contact-form"
import {
  AddressSelectionFormData,
  GeocodedAddress,
} from "@/lib/schemas/address-selection-schema"

const GUEST_STORAGE_KEY = "batata_top_guest_address"
const PENDING_STORAGE_KEY = "@batatatop:pendingAddress"

function SelecionarEnderecoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/checkout"

  const { user } = useAuth()
  const [step, setStep] = useState<"map" | "form">("map")
  const [showOutOfAreaModal, setShowOutOfAreaModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hook de mapas e geocodificação
  const {
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
  } = useMapGeocoding()

  // Solicita localização atual ao carregar se não tiver coordenadas prévias
  useEffect(() => {
    // Tenta obter localização suavemente
    if ("geolocation" in navigator) {
      navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((result) => {
        if (result.state === "granted") {
          requestCurrentLocation()
        }
      }).catch(() => {})
    }
  }, [requestCurrentLocation])

  // Validação ao avançar do mapa para o formulário
  const handleProceedToForm = () => {
    if (isResolvingAddress) return

    if (!currentAddress) {
      appToast.warning("Aguarde", "Identificando o endereço no mapa...")
      return
    }

    if (!currentAddress.isValidCity) {
      setShowOutOfAreaModal(true)
      return
    }

    setStep("form")
  }

  // Volta para a etapa do mapa ou sai da tela
  const handleBack = () => {
    if (step === "form") {
      setStep("map")
    } else {
      router.back()
    }
  }

  // Recentraliza em Iacanga caso o pino esteja fora
  const handleRecenterIacanga = () => {
    setCoords(DEFAULT_IACANGA_COORDS)
    triggerDebouncedReverseGeocode(
      DEFAULT_IACANGA_COORDS.latitude,
      DEFAULT_IACANGA_COORDS.longitude
    )
    setShowOutOfAreaModal(false)
  }

  // Submissão final do formulário com persistência completa
  const handleSubmitForm = async (formData: AddressSelectionFormData) => {
    setIsSubmitting(true)
    try {
      const fullStreet = formData.street
      const fullNumber = formData.semNumero ? "S/N" : (formData.number || "S/N")
      const fullComplement = formData.semComplemento ? "" : (formData.complement || "")
      const fullNeighborhood = formData.neighborhood
      const city = formData.city || CIDADE_PERMITIDA
      const state = formData.state || UF_PERMITIDA
      const cep = formData.cep || "17150-000"

      const addressPayload = {
        street: fullStreet,
        number: fullNumber,
        complement: fullComplement,
        neighborhood: fullNeighborhood,
        city,
        state,
        cep,
        is_default: true,
      }

      // 1. Se usuário autenticado no Supabase
      if (user) {
        const saved = await addressesManager.addAddress({
          ...addressPayload,
          user_id: user.id,
        })

        // Atualiza perfil com nome e telefone se fornecidos
        const supabase = getSupabaseBrowserClient()
        if (supabase) {
          try {
            await supabase.from("profiles").upsert({
              id: user.id,
              full_name: formData.fullName,
              phone: formData.phone,
              updated_at: new Date().toISOString(),
            })
          } catch {
            // Silêncio caso tabela profiles tenha esquema customizado
          }
        }

        // Salva cópia local para consistência imediata
        if (typeof window !== "undefined") {
          const serialized = JSON.stringify({
            ...addressPayload,
            id: saved?.id || "saved-user-address",
            latitude: formData.latitude,
            longitude: formData.longitude,
            contact_name: formData.fullName,
            contact_phone: formData.phone,
            label: formData.label,
          })
          localStorage.setItem(PENDING_STORAGE_KEY, serialized)
          localStorage.setItem(GUEST_STORAGE_KEY, serialized)
        }
      } else {
        // 2. Se visitante (não logado): salva no localStorage
        if (typeof window !== "undefined") {
          const guestData = {
            id: `guest-${Date.now()}`,
            user_id: "guest",
            ...addressPayload,
            latitude: formData.latitude,
            longitude: formData.longitude,
            contact_name: formData.fullName,
            contact_phone: formData.phone,
            reference_point: formData.reference_point || "",
            label: formData.label,
          }
          const serialized = JSON.stringify(guestData)
          localStorage.setItem(GUEST_STORAGE_KEY, serialized)
          localStorage.setItem(PENDING_STORAGE_KEY, serialized)
        }
      }

      appToast.success("Endereço salvo com sucesso!", `${fullStreet}, ${fullNumber}`)
      router.push(redirectTo)
    } catch (err: any) {
      console.error("[SelecionarEndereco] Erro ao salvar endereço:", err)
      appToast.error(
        "Erro ao salvar endereço",
        err.message || "Tente novamente em instantes."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top Header Fixo */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-neutral-100 bg-white/95 px-4 backdrop-blur-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-10 w-10 rounded-full text-neutral-800 hover:bg-neutral-100 active:scale-95"
          title="Voltar"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="text-center">
          <h1 className="text-xs font-black uppercase tracking-widest text-neutral-900">
            {step === "map" ? "Endereço de Entrega" : "Complemento e Contato"}
          </h1>
          <p className="text-[10px] font-semibold text-neutral-400">
            {step === "map" ? "Etapa 1 de 2 • Escolha no mapa" : "Etapa 2 de 2 • Finalizar cadastro"}
          </p>
        </div>

        <div className="w-10" />
      </header>

      {/* Alerta de Erro de Geolocalização (se houver) */}
      {geoError && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p>{geoError}</p>
          </div>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="text-amber-800 font-bold hover:underline shrink-0 ml-2"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col">
        {step === "map" ? (
          <div className="relative flex-1 flex flex-col h-[calc(100vh-64px)]">
            {/* Barra de Busca Suspensa no topo do mapa */}
            <div className="absolute top-4 left-4 right-4 z-30 max-w-md mx-auto">
              <AddressSearchBox
                query={searchQuery}
                suggestions={suggestions}
                isSearching={isSearching}
                notFound={searchNotFound}
                onQueryChange={searchPlaces}
                onSelectSuggestion={selectSuggestion}
                onClear={clearSearch}
              />
            </div>

            {/* Mapa Interativo em Tela Cheia */}
            <div className="flex-1 w-full h-full">
              <InteractiveMap
                latitude={coords.latitude}
                longitude={coords.longitude}
                isMoving={isMoving}
                isResolving={isResolvingAddress}
                isLocatingUser={isLocatingUser}
                onCenterChange={triggerDebouncedReverseGeocode}
                onDragStart={() => setIsMoving(true)}
                onRequestLocation={requestCurrentLocation}
              />
            </div>

            {/* Painel Inferior de Confirmação Flutuante */}
            <div className="absolute bottom-4 left-4 right-4 z-30 max-w-md mx-auto">
              <div className="rounded-3xl border border-neutral-100 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-[#FFB800]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate">
                      {isResolvingAddress ? (
                        <span className="text-neutral-400 font-normal">Identificando localização...</span>
                      ) : (
                        currentAddress?.street || "Selecione o ponto exato"
                      )}
                    </p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {isResolvingAddress ? (
                        "Aguarde um instante..."
                      ) : (
                        `${currentAddress?.neighborhood ? `${currentAddress.neighborhood}, ` : ""}${currentAddress?.city || CIDADE_PERMITIDA}/${currentAddress?.state || UF_PERMITIDA}`
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleProceedToForm}
                  disabled={isResolvingAddress}
                  className="w-full h-12 rounded-2xl bg-[#FFB800] text-neutral-950 font-black hover:bg-[#E5A600] active:scale-98 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isResolvingAddress ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Resolvendo endereço...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar este local</span>
                      <ArrowRight className="h-4 w-4 stroke-[3]" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ETAPA 2: COMPLEMENTO & CONTATO */
          <div className="mx-auto w-full max-w-lg px-4 pt-4 flex-1">
            {currentAddress && (
              <AddressContactForm
                initialAddress={currentAddress}
                initialContact={{
                  fullName: user?.user_metadata?.full_name || "",
                  phone: user?.user_metadata?.phone || "",
                }}
                isSubmitting={isSubmitting}
                onAdjustMarker={() => setStep("map")}
                onSubmit={handleSubmitForm}
              />
            )}
          </div>
        )}
      </main>

      {/* Modal de Alerta Fora da Área (Iacanga/SP) */}
      <OutOfAreaDialog
        isOpen={showOutOfAreaModal}
        onClose={() => setShowOutOfAreaModal(false)}
        onRecenterIacanga={handleRecenterIacanga}
      />
    </div>
  )
}

export default function SelecionarEnderecoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#FFB800]" />
            <p className="text-sm font-semibold text-neutral-600">
              Carregando mapa...
            </p>
          </div>
        </div>
      }
    >
      <SelecionarEnderecoContent />
    </Suspense>
  )
}
