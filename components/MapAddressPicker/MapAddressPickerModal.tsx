"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
  MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import {
  AddressComponents,
  AddressCoordinates,
  AddressPayload,
  MapAddressPickerProps,
} from "@/types/address";
import { CenterPin } from "./CenterPin";

const DEFAULT_COORDINATES: AddressCoordinates = {
  lat: -23.55052,
  lng: -46.633308, // São Paulo, SP
};

// Subcomponente interno para gerenciar a integração com a instância do mapa Google
interface MapControllerProps {
  currentCenter: AddressCoordinates;
  isDragging: boolean;
  isGeocoding: boolean;
  onDragStart: () => void;
  onCameraIdle: (coords: AddressCoordinates) => void;
  onRecenter: () => void;
}

const MapController: React.FC<MapControllerProps> = ({
  currentCenter,
  isDragging,
  isGeocoding,
  onDragStart,
  onCameraIdle,
  onRecenter,
}) => {
  const map = useMap();
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCameraChanged = useCallback(
    (ev: MapCameraChangedEvent) => {
      const center = ev.detail.center;
      if (!center) return;

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }

      idleTimeoutRef.current = setTimeout(() => {
        onCameraIdle({ lat: center.lat, lng: center.lng });
      }, 300);
    },
    [onCameraIdle]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      <Map
        defaultCenter={currentCenter}
        defaultZoom={17}
        gestureHandling="greedy"
        disableDefaultUI={true}
        onDragstart={onDragStart}
        onCameraChanged={handleCameraChanged}
        className="h-full w-full"
      />

      {/* Pino Central Flutuante com Sombra Animada */}
      <CenterPin isDragging={isDragging} />

      {/* Indicador de Carregamento Flutuante */}
      {isGeocoding && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1.5 shadow-md backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="text-xs font-medium text-white">
              Buscando endereço...
            </span>
          </div>
        </div>
      )}

      {/* Botão de Centralização GPS Flutuante */}
      <button
        type="button"
        onClick={onRecenter}
        title="Minha Localização Atual"
        aria-label="Minha Localização Atual"
        className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="7" />
          <line x1="12" y1="1" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="1" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="23" y2="12" />
        </svg>
      </button>
    </div>
  );
};

// Subcomponente para o campo de pesquisa com Google Places Autocomplete
interface PlacesAutocompleteBarProps {
  onPlaceSelect: (coords: AddressCoordinates) => void;
}

const PlacesAutocompleteBar: React.FC<PlacesAutocompleteBarProps> = ({
  onPlaceSelect,
}) => {
  const placesLibrary = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLibrary || !inputRef.current) return;

    const autocomplete = new placesLibrary.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      onPlaceSelect({ lat, lng });
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [placesLibrary, onPlaceSelect]);

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-4 w-4 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar endereço ou CEP..."
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
      />
    </div>
  );
};

export const MapAddressPickerModal: React.FC<MapAddressPickerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  defaultCenter = DEFAULT_COORDINATES,
}) => {
  const [mapCenter, setMapCenter] = useState<AddressCoordinates>(defaultCenter);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  const [formattedAddress, setFormattedAddress] = useState<string>("");
  const [streetNumber, setStreetNumber] = useState<string>("");
  const [complement, setComplement] = useState<string>("");
  const [components, setComponents] = useState<AddressComponents>({
    route: "",
    streetNumber: "",
    neighborhood: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [, startTransition] = useTransition();

  // Obter geolocalização do usuário na montagem com fallback para defaultCenter
  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapCenter(defaultCenter);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: AddressCoordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMapCenter(coords);
      },
      () => {
        setMapCenter(defaultCenter);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [defaultCenter]);

  useEffect(() => {
    if (isOpen) {
      requestCurrentLocation();
    }
  }, [isOpen, requestCurrentLocation]);

  // Função para executar Geocodificação Reversa
  const performReverseGeocode = useCallback((coords: AddressCoordinates) => {
    setIsGeocoding(true);

    if (!geocoderRef.current && typeof google !== "undefined" && google.maps) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    if (!geocoderRef.current) {
      setIsGeocoding(false);
      return;
    }

    geocoderRef.current.geocode(
      { location: { lat: coords.lat, lng: coords.lng } },
      (results, status) => {
        setIsGeocoding(false);
        if (status !== google.maps.GeocoderStatus.OK || !results || !results[0]) {
          return;
        }

        const topResult = results[0];
        setPlaceId(topResult.place_id);
        setFormattedAddress(topResult.formatted_address);

        const newComponents: AddressComponents = {
          route: "",
          streetNumber: "",
          neighborhood: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        };

        for (const comp of topResult.address_components) {
          const types = comp.types;
          if (types.includes("route")) {
            newComponents.route = comp.long_name;
          } else if (types.includes("street_number")) {
            newComponents.streetNumber = comp.long_name;
          } else if (
            types.includes("sublocality_level_1") ||
            types.includes("sublocality")
          ) {
            newComponents.neighborhood = comp.long_name;
          } else if (types.includes("administrative_area_level_2")) {
            newComponents.city = comp.long_name;
          } else if (types.includes("administrative_area_level_1")) {
            newComponents.state = comp.short_name;
          } else if (types.includes("postal_code")) {
            newComponents.postalCode = comp.long_name;
          } else if (types.includes("country")) {
            newComponents.country = comp.long_name;
          }
        }

        startTransition(() => {
          setComponents(newComponents);
          if (newComponents.streetNumber) {
            setStreetNumber(newComponents.streetNumber);
          }
        });
      }
    );
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleCameraIdle = useCallback(
    (coords: AddressCoordinates) => {
      setIsDragging(false);
      setMapCenter(coords);
      performReverseGeocode(coords);
    },
    [performReverseGeocode]
  );

  const handleConfirm = () => {
    if (isDragging || isGeocoding || !streetNumber.trim()) return;

    const payload: AddressPayload = {
      formattedAddress,
      coordinates: mapCenter,
      components: {
        ...components,
        streetNumber: streetNumber.trim(),
      },
      number: streetNumber.trim(),
      complement: complement.trim() || undefined,
      placeId,
    };

    onConfirm(payload);
    onClose();
  };

  if (!isOpen) return null;

  const isConfirmDisabled =
    isDragging || isGeocoding || streetNumber.trim().length === 0;

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity md:items-center md:p-4">
        {/* Modal / Bottom Sheet */}
        <div
          role="dialog"
          aria-modal="true"
          className="flex h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-all md:h-[680px] md:max-w-2xl md:rounded-2xl"
        >
          {/* Header Superior com Busca e Botão Fechar */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 shadow-xs">
            <div className="flex-1">
              <PlacesAutocompleteBar
                onPlaceSelect={(coords) => {
                  setMapCenter(coords);
                  performReverseGeocode(coords);
                }}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              aria-label="Fechar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Área do Mapa */}
          <div className="relative flex-1">
            <MapController
              currentCenter={mapCenter}
              isDragging={isDragging}
              isGeocoding={isGeocoding}
              onDragStart={handleDragStart}
              onCameraIdle={handleCameraIdle}
              onRecenter={requestCurrentLocation}
            />
          </div>

          {/* Painel Inferior de Confirmação e Dados do Endereço */}
          <div className="border-t border-slate-100 bg-white p-4 shadow-lg">
            {/* Endereço Resolvido */}
            <div className="mb-3">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {components.route || "Localização selecionada no mapa"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {[
                      components.neighborhood,
                      components.city,
                      components.state,
                    ]
                      .filter(Boolean)
                      .join(" - ") || "Arraste o mapa para refinar o local"}
                  </p>
                </div>
              </div>
            </div>

            {/* Inputs de Número Obrigatório e Complemento */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label
                  htmlFor="address-number"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Número <span className="text-red-500">* (Obrigatório)</span>
                </label>
                <input
                  id="address-number"
                  type="text"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  placeholder="Ex: 123"
                  className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 ${
                    !streetNumber.trim()
                      ? "border-amber-400 bg-amber-50/50 focus:border-red-500 focus:ring-red-200"
                      : "border-slate-200 bg-white focus:border-slate-400 focus:ring-slate-100"
                  }`}
                  required
                />
                {!streetNumber.trim() && (
                  <p className="mt-1 text-[11px] font-medium text-amber-600">
                    Informe o número para entrega.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="address-complement"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Complemento / Ref.
                </label>
                <input
                  id="address-complement"
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto, Bloco, Casa"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition-all focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* Botão de Confirmação */}
            <button
              type="button"
              disabled={isConfirmDisabled}
              onClick={handleConfirm}
              className={`w-full rounded-xl py-3 text-sm font-semibold shadow-md transition-all ${
                isConfirmDisabled
                  ? "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                  : "bg-red-600 text-white hover:bg-red-700 active:scale-[0.99]"
              }`}
            >
              {isDragging || isGeocoding
                ? "Localizando endereço..."
                : !streetNumber.trim()
                ? "Preencha o número para continuar"
                : "Confirmar Localização"}
            </button>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};
export default MapAddressPickerModal;
