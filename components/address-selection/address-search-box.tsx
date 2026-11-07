"use client"

import { useRef, useEffect } from "react"
import { Search, X, Loader2, MapPin, ChevronRight, AlertCircle } from "lucide-react"
import { AutocompleteSuggestion } from "@/hooks/use-map-geocoding"

interface AddressSearchBoxProps {
  query: string
  suggestions: AutocompleteSuggestion[]
  isSearching: boolean
  notFound: boolean
  onQueryChange: (val: string) => void
  onSelectSuggestion: (item: AutocompleteSuggestion) => void
  onClear: () => void
}

export function AddressSearchBox({
  query,
  suggestions,
  isSearching,
  notFound,
  onQueryChange,
  onSelectSuggestion,
  onClear,
}: AddressSearchBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // mantém texto, mas fecha sugestões
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full z-30">
      {/* Campo de Busca Principal */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-neutral-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar endereço e número"
          className="h-12 w-full rounded-2xl border border-neutral-200/90 bg-white pl-10 pr-10 text-sm font-medium text-neutral-900 shadow-md placeholder:text-neutral-400 focus:border-[#FFB800] focus:outline-none focus:ring-2 focus:ring-[#FFB800]/20 transition-all"
        />
        {isSearching && (
          <div className="absolute right-3.5 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-[#FFB800]" />
          </div>
        )}
        {!isSearching && query.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Lista de Sugestões Flutuante */}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-14 max-h-[300px] overflow-y-auto rounded-2xl border border-neutral-100 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Sugestões em Iacanga/SP
          </div>
          <div className="divide-y divide-neutral-100">
            {suggestions.map((item) => {
              const streetTitle = item.address?.road || item.display_name.split(",")[0]
              return (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => onSelectSuggestion(item)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#FFB800] group-hover:bg-[#FFB800] group-hover:text-neutral-900 transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {streetTitle}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {item.display_name}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 group-hover:text-neutral-600 transition-colors" />
                </button>
              )
            })}
          </div>
          <div className="px-3 pt-2 pb-1 text-right text-[10px] text-neutral-400">
            powered by OpenStreetMap
          </div>
        </div>
      )}

      {/* Estado: Endereço não encontrado */}
      {!isSearching && notFound && query.trim().length >= 3 && (
        <div className="absolute left-0 right-0 top-14 rounded-2xl border border-neutral-100 bg-white p-4 shadow-xl text-center animate-in fade-in zoom-in-95">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-[#FFB800] mb-2">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-neutral-900">
            Não encontramos esse endereço
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Verifique o que você digitou e tente de novo. Ou posicione o pino diretamente no mapa.
          </p>
        </div>
      )}
    </div>
  )
}
