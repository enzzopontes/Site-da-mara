"use client"

import { useEffect, useRef, useState } from "react"
import { LocateFixed, Plus, Minus, MapPin, Loader2, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import "leaflet/dist/leaflet.css"

interface InteractiveMapProps {
  latitude: number
  longitude: number
  isMoving: boolean
  isResolving: boolean
  isLocatingUser: boolean
  onCenterChange: (lat: number, lng: number) => void
  onDragStart: () => void
  onRequestLocation: () => void
}

export function InteractiveMap({
  latitude,
  longitude,
  isMoving,
  isResolving,
  isLocatingUser,
  onCenterChange,
  onDragStart,
  onRequestLocation,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  // Inicializa o Leaflet no cliente
  useEffect(() => {
    let isSubscribed = true
    if (!containerRef.current || mapInstanceRef.current) return

    import("leaflet").then((L) => {
      if (!isSubscribed || !containerRef.current) return

      // Inicializa o mapa
      const map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      })

      // Tile layer OpenStreetMap (alta resolução / render rápido)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: ["a", "b", "c"],
      }).addTo(map)

      // Eventos de movimento
      map.on("movestart", () => {
        onDragStart()
      })

      map.on("moveend", () => {
        const center = map.getCenter()
        onCenterChange(center.lat, center.lng)
      })

      // Clique no mapa centraliza suavemente no ponto clicado
      map.on("click", (e: any) => {
        map.panTo(e.latlng, { animate: true, duration: 0.5 })
      })

      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      isSubscribed = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Sincroniza centro quando coordenadas externas mudam (ex: GPS ou sugestão de busca)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return
    const currentCenter = mapInstanceRef.current.getCenter()
    const diffLat = Math.abs(currentCenter.lat - latitude)
    const diffLng = Math.abs(currentCenter.lng - longitude)

    // Apenas move o mapa se a diferença for significativa (> 0.0001) para não criar loop com moveend
    if (diffLat > 0.0001 || diffLng > 0.0001) {
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom(), {
        animate: true,
      })
    }
  }, [latitude, longitude, mapReady])

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut()
  }

  return (
    <div className="relative w-full h-full min-h-[380px] bg-neutral-100 overflow-hidden select-none">
      {/* Contêiner Leaflet */}
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Sombra fixa no solo (sob o pino) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
        style={{ marginTop: "18px" }}
      >
        <div className="h-2.5 w-4 rounded-full bg-black/25 blur-[1px] transition-all duration-200" />
      </div>

      {/* Pino Central Fixo com animação de elevação idêntica ao app mobile */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: isMoving
            ? "translate(-50%, calc(-50% - 10px))"
            : "translate(-50%, -50%)",
        }}
      >
        <div className="relative flex items-center justify-center">
          {/* Ícone fixo com alternância de cor suave */}
          <MapPin
            className={`h-11 w-11 transition-colors duration-200 drop-shadow-md ${
              isMoving ? "text-neutral-400 fill-neutral-400" : "text-[#FFB800] fill-[#FFB800]"
            }`}
          />
          {/* Ponto central indicador */}
          <div className="absolute top-[13px] h-2.5 w-2.5 rounded-full bg-white shadow-xs" />
        </div>
      </div>

      {/* Pill indicador de resolução de endereço */}
      {isResolving && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 shadow-md backdrop-blur-xs text-xs font-semibold text-neutral-700 animate-in fade-in zoom-in-95">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFB800]" />
          <span>Buscando endereço...</span>
        </div>
      )}

      {/* Controles Flutuantes do Mapa */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col gap-2">
        {/* Botão de Localização Atual (GPS) */}
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onRequestLocation}
          disabled={isLocatingUser}
          className="h-11 w-11 rounded-full bg-white shadow-lg text-neutral-800 hover:bg-neutral-50 active:scale-95 transition-all border border-neutral-200/80"
          title="Usar minha localização atual"
        >
          {isLocatingUser ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#FFB800]" />
          ) : (
            <LocateFixed className="h-5 w-5 text-neutral-700" />
          )}
        </Button>

        {/* Zoom In / Out */}
        <div className="flex flex-col rounded-xl bg-white shadow-lg border border-neutral-200/80 overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-10 w-11 items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 border-b border-neutral-100 transition-colors"
            title="Aproximar"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-10 w-11 items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 transition-colors"
            title="Afastar"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
