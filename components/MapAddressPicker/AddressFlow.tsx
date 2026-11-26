"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  APIProvider,
  Map,
  useMap,
  MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Crosshair,
  Home,
  Briefcase,
  MapPin,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addressesManager, Address } from "@/lib/addresses-manager";
import { mapsService, cleanStreetName, SearchAddressResult } from "@/lib/maps-service";
import { appToast } from "@/lib/app-toast";
import { useRouter } from "next/navigation";
import { OutOfAreaDialog } from "@/components/address-selection/out-of-area-dialog";

export interface AddressFlowProps {
  onClose?: () => void;
  onSuccess?: (address: Address) => void;
  redirectUrl?: string;
  isModal?: boolean;
}

interface Coords {
  lat: number;
  lng: number;
}

const DEFAULT_IACANGA_COORDS: Coords = {
  lat: -21.8928,
  lng: -49.0226, // Centro de Iacanga - SP
};

const GUEST_STORAGE_KEY = "batata_top_guest_address";
const CIDADE_PERMITIDA = "Iacanga";
const UF_PERMITIDA = "SP";
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_CHARS = 3;

type NominatimResult = SearchAddressResult;

function normalizeText(value?: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isWithinDeliveryArea(city?: string | null, state?: string | null): boolean {
  const normCity = normalizeText(city);
  const normState = normalizeText(state);
  return normCity === "iacanga" && (normState === "sp" || normState === "sao paulo");
}

function getAddressLabelText(label?: string | null): string {
  const normalized = normalizeText(label);
  if (normalized === "casa") return "Casa";
  if (normalized === "trabalho") return "Trabalho";
  return "Outro";
}

function renderAddressIcon(label?: string | null) {
  const normalized = normalizeText(label);
  if (normalized === "casa") {
    return <Home className="w-6 h-6 stroke-[1.8]" />;
  }
  if (normalized === "trabalho") {
    return <Briefcase className="w-6 h-6 stroke-[1.8]" />;
  }
  return <MapPin className="w-6 h-6 stroke-[1.8]" />;
}

// -------------------------------------------------------------
// Pino Amarelo com Furo Central (Identico ao App)
// -------------------------------------------------------------
const FloatingCenterPin: React.FC<{ isMoving: boolean }> = ({ isMoving }) => {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full flex flex-col items-center">
      <div
        className={`transition-all duration-180 ease-out will-change-transform ${
          isMoving ? "-translate-y-3.5 scale-105" : "translate-y-0 scale-100"
        }`}
      >
        <svg
          width="42"
          height="48"
          viewBox="0 0 42 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          <path
            d="M21 0C9.402 0 0 9.402 0 21C0 34.125 18.375 46.725 20.055 47.775a1.5 1.5 0 001.89 0C23.625 46.725 42 34.125 42 21 42 9.402 32.598 0 21 0Z"
            fill={isMoving ? "#9CA3AF" : "#E59500"}
          />
          <circle cx="21" cy="19" r="6" fill="#FFFFFF" />
          <circle cx="21" cy="19" r="3" fill={isMoving ? "#9CA3AF" : "#E59500"} />
        </svg>
      </div>

      <div
        className={`h-2.5 w-6 rounded-full bg-black/40 blur-[1px] transition-all duration-180 ${
          isMoving ? "scale-75 opacity-25" : "scale-100 opacity-60"
        }`}
      />
    </div>
  );
};

// -------------------------------------------------------------
// Mapa em Tela Cheia
// -------------------------------------------------------------
interface MapSelectorViewProps {
  center: Coords;
  hasApiKey: boolean;
  isMoving: boolean;
  onDragStart: () => void;
  onCameraIdle: (coords: Coords) => void;
  onConfirm: () => void;
  isResolving: boolean;
  onBack: () => void;
  onLocateMe: () => void;
  isLocatingGps: boolean;
}

const COORD_EPSILON = 0.00005;

const MapSelectorView: React.FC<MapSelectorViewProps> = ({
  center,
  hasApiKey,
  isMoving,
  onDragStart,
  onCameraIdle,
  onConfirm,
  isResolving,
  onBack,
  onLocateMe,
  isLocatingGps,
}) => {
  const map = useMap();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserCenterRef = useRef<Coords | null>(null);
  const [isCameraPending, setIsCameraPending] = useState(false);

  // Limpa timer pendente ao desmontar
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Recentraliza o mapa apenas quando a mudança for programática e > 0.00005 graus
  useEffect(() => {
    if (!map || !center) return;

    const lastUser = lastUserCenterRef.current;
    if (
      lastUser &&
      Math.abs(lastUser.lat - center.lat) <= COORD_EPSILON &&
      Math.abs(lastUser.lng - center.lng) <= COORD_EPSILON
    ) {
      return;
    }

    const currentCenter = map.getCenter();
    if (
      currentCenter &&
      Math.abs(currentCenter.lat() - center.lat) <= COORD_EPSILON &&
      Math.abs(currentCenter.lng() - center.lng) <= COORD_EPSILON
    ) {
      return;
    }

    map.panTo(center);
  }, [map, center]);

  const handleCameraChange = useCallback(
    (ev: MapCameraChangedEvent) => {
      const c = ev.detail.center;
      if (!c) return;
      lastUserCenterRef.current = { lat: c.lat, lng: c.lng };
      setIsCameraPending(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsCameraPending(false);
        onCameraIdle({ lat: c.lat, lng: c.lng });
      }, 200);
    },
    [onCameraIdle]
  );

  return (
    <div className="relative flex flex-col flex-1 h-full w-full bg-[#E5F2E9] overflow-hidden">
      {/* Header do Mapa com cantos inferiores arredondados */}
      <div className="z-30 flex items-center justify-between px-4 py-3.5 bg-white rounded-b-2xl shadow-sm shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-1 text-[#E59500] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          title="Voltar"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h1 className="text-[13px] font-extrabold tracking-wider text-slate-800 uppercase">
          Endereço de entrega
        </h1>
        <div className="w-6" />
      </div>

      {/* Mapa */}
      <div className="relative flex-1 w-full h-full">
        {hasApiKey ? (
          <>
            <Map
              defaultCenter={center}
              defaultZoom={17}
              gestureHandling="greedy"
              disableDefaultUI={true}
              onDragstart={onDragStart}
              onCameraChanged={handleCameraChange}
              className="h-full w-full"
            />
            <FloatingCenterPin isMoving={isMoving} />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#FAF8F5] px-6 pb-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E59500]/15 text-[#E59500]">
              <MapPin className="h-7 w-7" />
            </div>
            <p className="text-sm font-extrabold text-slate-800">
              Mapa indisponível no momento
            </p>
            <p className="mt-1.5 max-w-xs text-xs text-slate-500 leading-relaxed">
              Você ainda pode usar sua localização atual pelo GPS, voltar para buscar o endereço ou confirmar a posição selecionada.
            </p>
          </div>
        )}

        {isResolving && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 shadow-md backdrop-blur-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E59500]" />
            <span className="text-xs font-semibold text-slate-700">
              Identificando rua...
            </span>
          </div>
        )}

        {/* Botão Flutuante de Localização Atual no Mapa (GPS) */}
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocatingGps}
          className="absolute bottom-24 right-4 z-30 w-12 h-12 bg-white text-slate-800 hover:text-[#E59500] active:scale-95 rounded-full shadow-xl border border-slate-200/80 transition-all flex items-center justify-center cursor-pointer group disabled:opacity-75"
          title="Minha localização atual"
          aria-label="Minha localização atual"
        >
          {isLocatingGps ? (
            <Loader2 className="w-6 h-6 text-[#E59500] animate-spin" />
          ) : (
            <Crosshair className="w-6 h-6 text-slate-700 group-hover:text-[#E59500] transition-colors stroke-[2.2]" />
          )}
        </button>
      </div>

      {/* Botão Inferior Flutuante Confirmar Endereço */}
      <div className="absolute bottom-5 inset-x-4 z-30 max-w-md mx-auto">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isResolving || isMoving || isCameraPending}
          className="w-full py-3.5 px-4 bg-[#E59500] hover:bg-[#D48600] active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          {isResolving ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Buscando local...</span>
            </div>
          ) : (
            "Confirmar endereço de entrega"
          )}
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Componente Principal
// -------------------------------------------------------------
export const AddressFlow: React.FC<AddressFlowProps> = ({
  onClose,
  onSuccess,
  redirectUrl = "/cardapio",
  isModal = false,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const [step, setStep] = useState<"initial" | "search" | "map" | "details">("initial");

  // Localização rápida do GPS (sem travar)
  const [currentCoords, setCurrentCoords] = useState<Coords>(DEFAULT_IACANGA_COORDS);
  const [gpsAddressText, setGpsAddressText] = useState<string>("");
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);

  // Estados do Mapa
  const [mapCoords, setMapCoords] = useState<Coords>(DEFAULT_IACANGA_COORDS);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [geocodeFailed, setGeocodeFailed] = useState<boolean>(false);

  // Endereço Decodificado
  const [selectedStreet, setSelectedStreet] = useState<string>("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("Iacanga");
  const [selectedState, setSelectedState] = useState<string>("SP");
  const [selectedCep, setSelectedCep] = useState<string>("");

  // Formulário de Detalhes
  const [needsNeighborhoodInput, setNeedsNeighborhoodInput] = useState<boolean>(false);
  const [bairroInput, setBairroInput] = useState<string>("");
  const [bairroError, setBairroError] = useState<string>("");
  const [numero, setNumero] = useState<string>("");
  const [semNumero, setSemNumero] = useState<boolean>(false);
  const [complemento, setComplemento] = useState<string>("");
  const [semComplemento, setSemComplemento] = useState<boolean>(false);
  const [pontoReferencia, setPontoReferencia] = useState<string>("");
  const [labelFavorito, setLabelFavorito] = useState<"Casa" | "Trabalho" | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Lista de Endereços Salvos
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  // Modal de Ações dos 3 Pontos (Excluir / Editar) e Confirmação de Exclusão
  const [menuAddress, setMenuAddress] = useState<Address | null>(null);
  const [confirmDeleteAddress, setConfirmDeleteAddress] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Dialog de Fora da Área de Entrega
  const [outOfAreaOpen, setOutOfAreaOpen] = useState<boolean>(false);

  // Busca de endereço via Nominatim (Iacanga/SP)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchSuggestions, setSearchSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchNotFound, setSearchNotFound] = useState<boolean>(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const geocodeRequestIdRef = useRef<number>(0);
  const preservedCoordsRef = useRef<Coords | null>(null);
  const hasExplicitCoordsRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  // Desativa Mobile Navbar enquanto o mapa estiver selecionado
  useEffect(() => {
    if (step === "map") {
      document.body.dataset.mapActive = "true";
      document.documentElement.dataset.mapActive = "true";
      window.dispatchEvent(new CustomEvent("map-view-active", { detail: { active: true } }));
    } else {
      delete document.body.dataset.mapActive;
      delete document.documentElement.dataset.mapActive;
      window.dispatchEvent(new CustomEvent("map-view-active", { detail: { active: false } }));
    }

    return () => {
      delete document.body.dataset.mapActive;
      delete document.documentElement.dataset.mapActive;
      window.dispatchEvent(new CustomEvent("map-view-active", { detail: { active: false } }));
    };
  }, [step]);

  // 1. Carrega endereços salvos
  const loadSavedAddresses = useCallback(async () => {
    if (user) {
      const list = await addressesManager.getUserAddresses(user.id);
      setSavedAddresses(list);
    } else {
      const raw = typeof window !== "undefined" ? localStorage.getItem(GUEST_STORAGE_KEY) : null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.street) {
            setSavedAddresses([parsed]);
          } else {
            setSavedAddresses([]);
          }
        } catch {
          setSavedAddresses([]);
        }
      } else {
        setSavedAddresses([]);
      }
    }
  }, [user]);

  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses]);

  // 2. Geocodificador reverso via mapsService (evita chamadas client-side ao google.maps.Geocoder)
  const applyReverseGeocode = useCallback(
    async (coords: Coords, updateGpsText = false) => {
      const reqId = ++geocodeRequestIdRef.current;
      setIsResolvingAddress(true);
      setGeocodeFailed(false);
      try {
        const raw = await mapsService.reverseGeocode(coords.lat, coords.lng);
        if (reqId !== geocodeRequestIdRef.current) return null;
        if (!raw) {
          setSelectedStreet("");
          setSelectedNeighborhood("");
          setSelectedCity("");
          setSelectedState("");
          setSelectedCep("");
          setGeocodeFailed(true);
          if (updateGpsText) {
            setGpsAddressText("Localização encontrada");
          }
          return null;
        }
        const data = {
          street: cleanStreetName(raw.street),
          neighborhood: raw.neighborhood,
          city: raw.city || "",
          state: raw.state || "",
          cep: raw.cep,
          formatted: raw.displayName || `${raw.street}, ${raw.neighborhood}`,
        };
        setSelectedStreet(data.street);
        setSelectedNeighborhood(data.neighborhood);
        setSelectedCity(data.city);
        setSelectedState(data.state);
        setSelectedCep(data.cep);
        setGeocodeFailed(false);
        if (updateGpsText) {
          if (data.formatted) {
            setGpsAddressText(data.formatted);
          } else if (data.city || data.state) {
            setGpsAddressText(`${data.city} - ${data.state}`);
          }
        }
        return data;
      } catch {
        if (reqId !== geocodeRequestIdRef.current) return null;
        setSelectedStreet("");
        setSelectedNeighborhood("");
        setSelectedCity("");
        setSelectedState("");
        setSelectedCep("");
        setGeocodeFailed(true);
        if (updateGpsText) {
          setGpsAddressText("Localização encontrada");
        }
        return null;
      } finally {
        if (reqId === geocodeRequestIdRef.current) {
          setIsResolvingAddress(false);
        }
      }
    },
    []
  );

  // 3. Obtenção de localização precisa via GPS com solicitação explícita se necessário
  const locateUser = useCallback(
    (forcePan = false): Promise<Coords | null> => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        appToast.warning("GPS não suportado", "Seu dispositivo ou navegador não suporta geolocalização.");
        setIsDetectingGps(false);
        return Promise.resolve(null);
      }

      setIsDetectingGps(true);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const coords: Coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            preservedCoordsRef.current = coords;
            hasExplicitCoordsRef.current = true;
            setCurrentCoords(coords);
            setMapCoords(coords);
            setIsDetectingGps(false);

            await applyReverseGeocode(coords, true);

            resolve(coords);
          },
          (error) => {
            setIsDetectingGps(false);
            setIsResolvingAddress(false);

            switch (error.code) {
              case error.PERMISSION_DENIED:
                appToast.warning(
                  "Permissão de GPS necessária",
                  "Libere o acesso à sua localização no navegador para encontrarmos seu endereço automaticamente."
                );
                break;
              case error.TIMEOUT:
                appToast.error(
                  "Tempo de GPS esgotado",
                  "O GPS demorou a responder. Você pode navegar e posicionar o pino no mapa."
                );
                break;
              default:
                appToast.error(
                  "Sinal de GPS indisponível",
                  "Não foi possível obter sua posição exata no momento. Mova o pino no mapa."
                );
                break;
            }
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
          }
        );
      });
    },
    [applyReverseGeocode]
  );

  // Helpers de reset de formulário e busca Nominatim
  const resetNewAddressForm = useCallback(() => {
    setEditingAddressId(null);
    setNeedsNeighborhoodInput(false);
    setBairroInput("");
    setBairroError("");
    setNumero("");
    setSemNumero(false);
    setComplemento("");
    setSemComplemento(false);
    setPontoReferencia("");
    setLabelFavorito(null);
  }, []);

  const clearSearch = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    setSearchQuery("");
    setSearchSuggestions([]);
    setSearchNotFound(false);
    setIsSearching(false);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setSearchNotFound(false);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = text.trim();
    if (trimmed.length < MIN_SEARCH_CHARS) {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      setIsSearching(true);
      try {
        const data = await mapsService.searchAddress(trimmed, controller.signal);
        if (searchAbortRef.current !== controller || controller.signal.aborted) return;

        const filtered = (Array.isArray(data) ? data : []).filter((item) => {
          const city =
            item.address?.city ||
            item.address?.town ||
            item.address?.municipality ||
            item.address?.village ||
            "";
          const state = item.address?.state || "";
          return (
            normalizeText(city) === "iacanga" &&
            (!state || normalizeText(state) === "sp" || normalizeText(state) === "sao paulo")
          );
        });

        setSearchSuggestions(filtered);
        setSearchNotFound(filtered.length === 0);
      } catch (err: any) {
        if (searchAbortRef.current !== controller || controller.signal.aborted) return;
        if (err?.name !== "AbortError") {
          setSearchSuggestions([]);
          setSearchNotFound(true);
        }
      } finally {
        if (searchAbortRef.current === controller && !controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const handleSelectSearchSuggestion = (item: NominatimResult) => {
    const addr = item.address || {};
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const coords: Coords = hasValidCoords ? { lat, lng } : DEFAULT_IACANGA_COORDS;

    const street = cleanStreetName(
      addr.road || addr.pedestrian || item.display_name.split(",")[0] || ""
    );
    const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || "";
    const city = addr.city || addr.town || addr.municipality || addr.village || CIDADE_PERMITIDA;
    const state = addr.state || UF_PERMITIDA;

    geocodeRequestIdRef.current += 1;
    setIsResolvingAddress(false);
    setGeocodeFailed(false);
    preservedCoordsRef.current = coords;
    hasExplicitCoordsRef.current = hasValidCoords;

    resetNewAddressForm();
    setMapCoords(coords);
    setSelectedStreet(street);
    setSelectedNeighborhood(neighborhood);
    setSelectedCity(city);
    setSelectedState(state);
    setSelectedCep(addr.postcode || "");
    if (addr.house_number) {
      setNumero(addr.house_number);
    }

    clearSearch();
    setStep("map");
  };

  const handleOpenMapFromSearch = async () => {
    resetNewAddressForm();
    clearSearch();
    preservedCoordsRef.current = DEFAULT_IACANGA_COORDS;
    hasExplicitCoordsRef.current = true;
    setMapCoords(DEFAULT_IACANGA_COORDS);
    setStep("map");
    await applyReverseGeocode(DEFAULT_IACANGA_COORDS);
  };

  // 4. Clicar em "Usar localização atual": ABRE O MAPA E LOCALIZA COM PRECISÃO
  const handleUseCurrentLocation = async () => {
    resetNewAddressForm();
    setStep("map"); // Abre o mapa imediatamente
    setIsResolvingAddress(true);

    const coords = await locateUser(true);
    if (!coords) {
      preservedCoordsRef.current = currentCoords;
      hasExplicitCoordsRef.current = true;
      setMapCoords(currentCoords);
      await applyReverseGeocode(currentCoords);
    }
  };

  // 5. Câmera do mapa estabilizou (usuário arrastou o mapa)
  const handleCameraIdle = useCallback(
    async (coords: Coords) => {
      setIsMapMoving(false);

      const preserved = preservedCoordsRef.current;
      if (
        preserved &&
        Math.abs(preserved.lat - coords.lat) < 0.0002 &&
        Math.abs(preserved.lng - coords.lng) < 0.0002
      ) {
        preservedCoordsRef.current = null;
        return;
      }
      preservedCoordsRef.current = null;

      hasExplicitCoordsRef.current = true;
      setMapCoords(coords);
      await applyReverseGeocode(coords);
    },
    [applyReverseGeocode]
  );

  // 6. Confirma no mapa -> valida área de entrega e vai para detalhes
  const handleConfirmMap = () => {
    if (isResolvingAddress || isMapMoving) return;
    if (geocodeFailed) {
      appToast.error(
        "Não foi possível identificar o endereço",
        "Mova o pino no mapa ou tente novamente em instantes."
      );
      return;
    }
    if (!isWithinDeliveryArea(selectedCity, selectedState)) {
      setOutOfAreaOpen(true);
      return;
    }

    hasExplicitCoordsRef.current = true;
    const hasNeighborhood = Boolean(
      selectedNeighborhood && selectedNeighborhood.trim().length >= 2
    );
    setNeedsNeighborhoodInput(!hasNeighborhood);
    setBairroInput(hasNeighborhood ? selectedNeighborhood.trim() : "");
    setBairroError("");
    setStep("details");
  };

  const handleCloseOutOfArea = () => {
    setOutOfAreaOpen(false);
    if (step === "details") {
      setStep("map");
    }
  };

  const handleRecenterIacanga = async () => {
    setOutOfAreaOpen(false);
    preservedCoordsRef.current = DEFAULT_IACANGA_COORDS;
    hasExplicitCoordsRef.current = true;
    setMapCoords(DEFAULT_IACANGA_COORDS);
    setStep("map");
    await applyReverseGeocode(DEFAULT_IACANGA_COORDS);
  };

  // 7. Clicar em cima do endereço cadastrado: APENAS SELECIONA! Não abre mapa.
  const handleSelectSavedAddress = async (addr: Address) => {
    if (user) {
      const ok = await addressesManager.setDefaultAddress(user.id, addr.id);
      if (!ok) {
        appToast.error("Erro ao selecionar endereço", "Tente novamente em instantes.");
        return;
      }
    } else {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...addr, is_default: true }));
    }

    window.dispatchEvent(new Event("address-changed"));
    appToast.success("Endereço selecionado!", `${addr.street}, ${addr.number}`);

    if (onSuccess) {
      onSuccess(addr);
    } else if (onClose) {
      onClose();
    } else {
      router.push(redirectUrl);
    }
  };

  // 8. Ação do Menu 3 Pontos: Solicitar confirmação antes de excluir
  const handleRequestDelete = () => {
    if (!menuAddress) return;
    setConfirmDeleteAddress(menuAddress);
    setMenuAddress(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteAddress || isDeleting) return;
    const toDelete = confirmDeleteAddress;
    setIsDeleting(true);
    try {
      if (user) {
        const ok = await addressesManager.deleteAddress(toDelete.id, user.id);
        if (!ok) {
          appToast.error("Erro ao remover endereço.");
          return;
        }
      } else {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }

      setConfirmDeleteAddress(null);
      await loadSavedAddresses();
      window.dispatchEvent(new Event("address-changed"));
      appToast.success("Endereço removido com sucesso.");
    } catch (e) {
      console.error(e);
      appToast.error("Erro ao remover endereço.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 9. Ação do Menu 3 Pontos: Editar
  const handleMenuEdit = () => {
    if (!menuAddress) return;
    const addr = menuAddress;
    setMenuAddress(null);

    // NEW-12 FIX: Preserva ID do endereço em edição, coordenadas, referência e label compatível com addresses_label_check
    setEditingAddressId(addr.id);
    setGeocodeFailed(false);
    setSelectedStreet(addr.street);
    setSelectedNeighborhood(addr.neighborhood);
    setSelectedCity(addr.city);
    setSelectedState(addr.state);
    setSelectedCep(addr.cep);

    const hasNeighborhood = Boolean(addr.neighborhood && addr.neighborhood.trim().length >= 2);
    setNeedsNeighborhoodInput(!hasNeighborhood);
    setBairroInput(hasNeighborhood ? addr.neighborhood.trim() : "");
    setBairroError("");

    if (addr.latitude != null && addr.longitude != null) {
      setMapCoords({ lat: Number(addr.latitude), lng: Number(addr.longitude) });
      hasExplicitCoordsRef.current = true;
    } else {
      setMapCoords(DEFAULT_IACANGA_COORDS);
      hasExplicitCoordsRef.current = false;
    }

    if (addr.number === "S/N") {
      setSemNumero(true);
      setNumero("");
    } else {
      setSemNumero(false);
      setNumero(addr.number || "");
    }

    if (!addr.complement) {
      setSemComplemento(true);
      setComplemento("");
    } else {
      setSemComplemento(false);
      setComplemento(addr.complement);
    }

    setPontoReferencia(addr.reference_point || "");
    const normalizedLabel = String(addr.label || "").toLowerCase();
    setLabelFavorito(
      normalizedLabel === "trabalho" ? "Trabalho" : normalizedLabel === "casa" ? "Casa" : null
    );

    // Abre direto na tela de detalhes
    setStep("details");
  };

  // 10. Salva endereço final
  const handleSaveFinalAddress = async () => {
    if (geocodeFailed || !isWithinDeliveryArea(selectedCity, selectedState)) {
      setOutOfAreaOpen(true);
      return;
    }

    const finalNeighborhood = needsNeighborhoodInput
      ? bairroInput.trim()
      : selectedNeighborhood.trim();

    if (finalNeighborhood.length < 2) {
      setNeedsNeighborhoodInput(true);
      setBairroError("O bairro precisa ter pelo menos 2 caracteres");
      appToast.warning("Bairro obrigatório", "Informe o bairro com pelo menos 2 caracteres.");
      return;
    }

    const finalNumber = semNumero ? "S/N" : numero.trim();
    const finalComplement = semComplemento ? "" : complemento.trim();

    if (!semNumero && !numero.trim()) {
      appToast.warning("Número obrigatório", "Preencha o número ou marque 'Endereço sem número'.");
      return;
    }

    if (!semComplemento && !complemento.trim()) {
      appToast.warning("Complemento obrigatório", "Preencha o complemento ou marque 'Endereço sem complemento'.");
      return;
    }

    setIsSaving(true);
    try {
      const dbLabel: "casa" | "trabalho" | null =
        labelFavorito === "Casa" ? "casa" : labelFavorito === "Trabalho" ? "trabalho" : null;

      const addressData: Omit<Address, "id"> = {
        user_id: user ? user.id : "guest",
        street: selectedStreet || "Endereço selecionado",
        number: finalNumber,
        complement: finalComplement,
        neighborhood: finalNeighborhood,
        city: CIDADE_PERMITIDA,
        state: UF_PERMITIDA,
        cep: selectedCep || "17180-000",
        is_default: true,
        label: dbLabel,
        reference_point: pontoReferencia.trim() || null,
        latitude: hasExplicitCoordsRef.current ? (mapCoords?.lat ?? null) : null,
        longitude: hasExplicitCoordsRef.current ? (mapCoords?.lng ?? null) : null,
      };

      let saved: Address | null = null;
      if (user) {
        if (editingAddressId) {
          saved = await addressesManager.updateAddress(editingAddressId, addressData);
        } else {
          saved = await addressesManager.addAddress(addressData);
        }
      } else {
        saved = { id: "guest-default", ...addressData };
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(saved));
      }

      if (!saved) {
        throw new Error("Não foi possível persistir o endereço.");
      }

      setEditingAddressId(null);
      window.dispatchEvent(new Event("address-changed"));
      appToast.success("Endereço salvo com sucesso!", `${saved.street}, ${saved.number}`);

      if (onSuccess && saved) {
        onSuccess(saved);
      } else if (onClose) {
        onClose();
      } else {
        router.push(redirectUrl);
      }
    } catch (e) {
      console.error(e);
      appToast.error("Erro ao salvar endereço.");
    } finally {
      setIsSaving(false);
    }
  };

  const isDetailsValid =
    (!needsNeighborhoodInput || bairroInput.trim().length >= 2) &&
    (semNumero || numero.trim().length > 0) &&
    (semComplemento || complemento.trim().length > 0);

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      <div className={`relative w-full h-full flex flex-col bg-[#FAF8F5] text-slate-800 ${isModal ? "max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl" : step === "map" ? "h-dvh overflow-hidden" : "min-h-screen"}`}>

        {/* ======================================================== */}
        {/* ESTADO 1: LISTA DE ENDEREÇOS E GPS                       */}
        {/* ======================================================== */}
        {step === "initial" && (
          <div className="flex flex-col h-full flex-1">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose || (() => router.back())}
                className="p-1 text-[#E59500] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                title="Voltar"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h1 className="text-[13px] font-extrabold tracking-wider text-slate-800 uppercase">
                Endereço de entrega
              </h1>
              <div className="w-6" />
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Campo de Busca */}
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  setStep("search");
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-[#F0ECE4]/70 rounded-2xl cursor-pointer hover:bg-[#EAE4DC] transition-colors text-left"
              >
                <Search className="w-4 h-4 text-[#E59500] shrink-0" />
                <span className="text-xs text-slate-500 font-medium">
                  Buscar endereço e número
                </span>
              </button>

              {/* Botão Usar Localização Atual (com subtítulo instantâneo do GPS) */}
              <div
                onClick={handleUseCurrentLocation}
                className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/80 active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div className="mt-0.5 p-1 rounded-full text-slate-700 group-hover:text-[#E59500] transition-colors">
                  <Crosshair className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 leading-snug">
                    Usar localização atual
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed truncate mt-0.5">
                    {isDetectingGps ? (
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin text-[#E59500]" />
                        Obtendo sua localização atual...
                      </span>
                    ) : (
                      gpsAddressText || "Iacanga - SP"
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60" />

              {/* Cards de Endereços Salvos (Borda Dourada e Check apenas quando is_default === true) */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3">
                  {savedAddresses.map((addr, idx) => {
                    const isDefault = addr.is_default === true;
                    const labelText = getAddressLabelText(addr.label);
                    const extraLine = [addr.complement, addr.reference_point]
                      .filter(Boolean)
                      .join(" - ");

                    return (
                      <div
                        key={addr.id || idx}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`relative flex items-center justify-between p-4 bg-white rounded-2xl shadow-xs cursor-pointer active:scale-[0.99] transition-all ${
                          isDefault
                            ? "border-2 border-[#E59500]"
                            : "border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="p-2 text-slate-700 shrink-0">
                            {renderAddressIcon(addr.label)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                              {labelText}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {addr.street}, {addr.number} - {addr.neighborhood}, {addr.city} - {addr.state}
                            </p>
                            {extraLine && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {extraLine}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-3 shrink-0">
                          {isDefault && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#E59500] text-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                          {/* Botão dos 3 Pontos - Abre o Modal de Excluir / Editar */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // NÃO seleciona o endereço!
                              setMenuAddress(addr);
                            }}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Opções do endereço"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* BOTTOM SHEET DOS 3 PONTOS (EXCLUIR / EDITAR / CANCELAR)   */}
            {/* ======================================================== */}
            {menuAddress && (
              <div
                data-nested-dialog="true"
                onClick={() => setMenuAddress(null)}
                className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full sm:max-w-md bg-white rounded-t-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
                >
                  {/* Handle cinza no topo */}
                  <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

                  {/* Nome do endereço */}
                  <h3 className="text-base font-extrabold text-center text-slate-900 mb-5">
                    {getAddressLabelText(menuAddress.label)}
                  </h3>

                  {/* Botões Lado a Lado: Excluir e Editar */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={handleRequestDelete}
                      className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-2xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-[0.98] transition-all cursor-pointer text-slate-800 font-semibold text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMenuEdit}
                      className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer text-slate-800 font-semibold text-sm"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Editar</span>
                    </button>
                  </div>

                  {/* Botão Cancelar Dourado */}
                  <button
                    type="button"
                    onClick={() => setMenuAddress(null)}
                    className="w-full py-2.5 text-center text-[#E59500] font-bold text-sm hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                         */}
            {/* ======================================================== */}
            {confirmDeleteAddress && (
              <div
                role="dialog"
                aria-modal="true"
                data-nested-dialog="true"
                aria-labelledby="confirm-delete-address-title"
                onClick={() => !isDeleting && setConfirmDeleteAddress(null)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <h3
                    id="confirm-delete-address-title"
                    className="text-base font-extrabold text-slate-900"
                  >
                    Excluir endereço?
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    Tem certeza que deseja remover{" "}
                    <span className="font-semibold text-slate-700">
                      {confirmDeleteAddress.street}, {confirmDeleteAddress.number}
                    </span>
                    ? Essa ação não pode ser desfeita.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDeleteAddress(null)}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDelete}
                      className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Excluir"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADO 1.5: BUSCA DE ENDEREÇO VIA NOMINATIM (IACANGA/SP) */}
        {/* ======================================================== */}
        {step === "search" && (
          <div className="flex flex-col h-full flex-1 bg-white">
            <div className="px-4 pt-4 pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F0ECE4]/80 rounded-2xl border border-transparent focus-within:border-[#E59500] transition-colors">
                <button
                  type="button"
                  onClick={() => {
                    clearSearch();
                    setStep("initial");
                  }}
                  className="p-0.5 text-[#E59500] hover:opacity-80 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Voltar"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar endereço e número"
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    aria-label="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-right mt-1.5 pr-1">
                powered by OpenStreetMap • Iacanga/SP
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isSearching && (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-[#E59500]" />
                  <span className="text-xs font-medium">Buscando endereços em Iacanga...</span>
                </div>
              )}

              {!isSearching && searchSuggestions.length > 0 && (
                <div className="divide-y divide-slate-100">
                  {searchSuggestions.map((item) => (
                    <button
                      key={String(item.place_id)}
                      type="button"
                      onClick={() => handleSelectSearchSuggestion(item)}
                      className="w-full flex items-center gap-3 py-3 px-2 hover:bg-[#FAF8F5] rounded-xl text-left transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-[#E59500] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {item.address?.road || item.display_name.split(",")[0]}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {item.display_name}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                  <div className="pt-4 text-center">
                    <button
                      type="button"
                      onClick={handleOpenMapFromSearch}
                      className="text-sm font-bold text-[#E59500] hover:underline cursor-pointer"
                    >
                      Buscar pelo mapa
                    </button>
                  </div>
                </div>
              )}

              {!isSearching && searchNotFound && (
                <div className="py-10 px-4 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">
                    Não encontramos esse endereço
                  </p>
                  <p className="text-xs text-slate-500">
                    Verifique o que você digitou e tente de novo. Ou busque pelo mapa.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenMapFromSearch}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#E59500] hover:underline cursor-pointer"
                  >
                    Buscar pelo mapa
                  </button>
                </div>
              )}

              {!isSearching && !searchNotFound && searchSuggestions.length === 0 && (
                <div className="py-10 px-4 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    Digite pelo menos {MIN_SEARCH_CHARS} caracteres para buscar em Iacanga/SP.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenMapFromSearch}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#E59500] hover:underline cursor-pointer"
                  >
                    Buscar pelo mapa
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADO 2: MAPA EM TELA CHEIA                             */}
        {/* ======================================================== */}
        {step === "map" && (
          <MapSelectorView
            center={mapCoords}
            hasApiKey={Boolean(apiKey)}
            isMoving={isMapMoving}
            onDragStart={() => {
              preservedCoordsRef.current = null;
              setIsMapMoving(true);
            }}
            onCameraIdle={handleCameraIdle}
            onConfirm={handleConfirmMap}
            isResolving={isResolvingAddress}
            onBack={() => setStep("initial")}
            onLocateMe={() => locateUser(true)}
            isLocatingGps={isDetectingGps}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 3: FORMULÁRIO DE COMPLEMENTO                      */}
        {/* ======================================================== */}
        {step === "details" && (
          <div className="flex flex-col h-full flex-1 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setStep("map")}
                className="p-1 text-[#E59500] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                title="Voltar ao mapa"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <h1 className="text-[13px] font-extrabold tracking-wider text-slate-800 uppercase">
                Endereço de entrega
              </h1>
              <div className="w-6" />
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
              {/* Miniatura do Mapa com Ajustar Marcador */}
              <div className="relative h-44 w-full bg-[#E5F2E9] overflow-hidden border-b border-slate-100">
                {apiKey && (
                  <Map
                    defaultCenter={mapCoords}
                    defaultZoom={17}
                    gestureHandling="none"
                    disableDefaultUI={true}
                    className="h-full w-full pointer-events-none"
                  />
                )}

                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
                  <svg width="34" height="40" viewBox="0 0 42 48" fill="none">
                    <path
                      d="M21 0C9.402 0 0 9.402 0 21C0 34.125 18.375 46.725 20.055 47.775a1.5 1.5 0 001.89 0C23.625 46.725 42 34.125 42 21 42 9.402 32.598 0 21 0Z"
                      fill="#E59500"
                    />
                    <circle cx="21" cy="19" r="6" fill="#FFFFFF" />
                    <circle cx="21" cy="19" r="3" fill="#E59500" />
                  </svg>
                  <div className="h-2 w-5 rounded-full bg-black/40 blur-[1px]" />
                </div>

                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-full shadow-md hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Ajustar marcador
                </button>
              </div>

              {/* Rua e Bairro */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {selectedStreet || "Localização selecionada"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(needsNeighborhoodInput ? bairroInput.trim() : selectedNeighborhood)
                      ? `${needsNeighborhoodInput ? bairroInput.trim() : selectedNeighborhood} - `
                      : ""}
                    {selectedCity}/{selectedState}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Editar localização"
                >
                  <Pencil className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* Campos */}
              <div className="p-5 space-y-4">
                {/* Bairro obrigatório quando reverse geocode não retornou bairro */}
                {needsNeighborhoodInput && (
                  <div>
                    <input
                      type="text"
                      value={bairroInput}
                      maxLength={60}
                      onChange={(e) => {
                        setBairroInput(e.target.value);
                        if (bairroError) setBairroError("");
                      }}
                      placeholder="Bairro *"
                      className={`w-full px-3.5 py-3 text-sm text-slate-800 rounded-xl border bg-white transition-colors focus:outline-none ${
                        bairroError
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-200 focus:border-[#E59500]"
                      }`}
                    />
                    <div className="flex items-center justify-between mt-1 px-1">
                      <span className="text-xs text-red-500">
                        {bairroError}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {bairroInput.length}/60
                      </span>
                    </div>
                  </div>
                )}

                {/* Número */}
                <div>
                  <input
                    type="text"
                    value={numero}
                    disabled={semNumero}
                    maxLength={60}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Número *"
                    className={`w-full px-3.5 py-3 text-sm text-slate-800 rounded-xl border transition-colors focus:outline-none ${
                      semNumero
                        ? "bg-slate-100 border-slate-200 text-slate-400"
                        : "bg-white border-slate-200 focus:border-[#E59500]"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1 px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={semNumero}
                        onChange={(e) => {
                          setSemNumero(e.target.checked);
                          if (e.target.checked) setNumero("");
                        }}
                        className="w-4 h-4 rounded text-[#E59500] border-slate-300 focus:ring-[#E59500]"
                      />
                      <span className="text-xs text-slate-600">
                        Endereço sem número
                      </span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {numero.length}/60
                    </span>
                  </div>
                </div>

                {/* Complemento */}
                <div>
                  <input
                    type="text"
                    value={complemento}
                    disabled={semComplemento}
                    maxLength={60}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Complemento *"
                    className={`w-full px-3.5 py-3 text-sm text-slate-800 rounded-xl border transition-colors focus:outline-none ${
                      semComplemento
                        ? "bg-slate-100 border-slate-200 text-slate-400"
                        : "bg-white border-slate-200 focus:border-[#E59500]"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1 px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={semComplemento}
                        onChange={(e) => {
                          setSemComplemento(e.target.checked);
                          if (e.target.checked) setComplemento("");
                        }}
                        className="w-4 h-4 rounded text-[#E59500] border-slate-300 focus:ring-[#E59500]"
                      />
                      <span className="text-xs text-slate-600">
                        Endereço sem complemento
                      </span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {complemento.length}/60
                    </span>
                  </div>
                </div>

                {/* Referência */}
                <div>
                  <input
                    type="text"
                    value={pontoReferencia}
                    maxLength={280}
                    onChange={(e) => setPontoReferencia(e.target.value)}
                    placeholder="Ponto de referência (opcional)"
                    className="w-full px-3.5 py-3 text-sm text-slate-800 rounded-xl border border-slate-200 bg-white transition-colors focus:border-[#E59500] focus:outline-none"
                  />
                  <div className="flex justify-end mt-1 px-1">
                    <span className="text-[11px] text-slate-400">
                      {pontoReferencia.length}/280
                    </span>
                  </div>
                </div>

                {/* Favoritar */}
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-800 mb-2.5">
                    Favoritar endereço
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setLabelFavorito(labelFavorito === "Casa" ? null : "Casa")
                      }
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        labelFavorito === "Casa"
                          ? "bg-[#E59500] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Home className="w-3.5 h-3.5 stroke-[2.2]" />
                      Casa
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setLabelFavorito(
                          labelFavorito === "Trabalho" ? null : "Trabalho"
                        )
                      }
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        labelFavorito === "Trabalho"
                          ? "bg-[#E59500] text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 stroke-[2.2]" />
                      Trabalho
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Ver batatas */}
            <div className="sticky bottom-0 inset-x-0 p-4 bg-white border-t border-slate-100 shadow-md shrink-0">
              <button
                type="button"
                disabled={!isDetailsValid || isSaving}
                onClick={handleSaveFinalAddress}
                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-sm flex items-center justify-center cursor-pointer ${
                  isDetailsValid && !isSaving
                    ? "bg-[#E59500] text-white hover:bg-[#D48600] active:scale-[0.99]"
                    : "bg-[#F3EFE8] text-[#B0AAA2] cursor-not-allowed shadow-none"
                }`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Salvando endereço...</span>
                  </div>
                ) : (
                  "Ver batatas"
                )}
              </button>
            </div>
          </div>
        )}

        <OutOfAreaDialog
          isOpen={outOfAreaOpen}
          onClose={handleCloseOutOfArea}
          onRecenterIacanga={handleRecenterIacanga}
        />
      </div>
    </APIProvider>
  );
};

export default AddressFlow;
