"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
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
  ChevronLeft,
  Search,
  Crosshair,
  Home,
  Briefcase,
  Check,
  MoreVertical,
  Pencil,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { addressesManager, Address } from "@/lib/addresses-manager";
import { appToast } from "@/lib/app-toast";
import { useRouter } from "next/navigation";

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
  lat: -21.8402,
  lng: -49.0058, // Centro de Iacanga - SP
};

const GUEST_STORAGE_KEY = "batata_top_guest_address";

// -------------------------------------------------------------
// Componente do Pino Amarelo Central com Furo (Identico ao App)
// -------------------------------------------------------------
const FloatingCenterPin: React.FC<{ isMoving: boolean }> = ({ isMoving }) => {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full flex flex-col items-center">
      <div
        className={`transition-all duration-200 ease-out will-change-transform ${
          isMoving
            ? "-translate-y-3 scale-105"
            : "translate-y-0 scale-100"
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
          {/* Corpo do Pino (Amarelo vibrante ou cinza durante movimento) */}
          <path
            d="M21 0C9.402 0 0 9.402 0 21C0 34.125 18.375 46.725 20.055 47.775a1.5 1.5 0 001.89 0C23.625 46.725 42 34.125 42 21 42 9.402 32.598 0 21 0Z"
            fill={isMoving ? "#9CA3AF" : "#E59500"}
          />
          {/* Furo central do pino (transparente com anel branco como nas capturas) */}
          <circle cx="21" cy="19" r="6" fill="#FFFFFF" />
          <circle cx="21" cy="19" r="3" fill={isMoving ? "#9CA3AF" : "#E59500"} />
        </svg>
      </div>

      {/* Sombra no chão */}
      <div
        className={`h-2.5 w-6 rounded-full bg-black/40 blur-[1px] transition-all duration-200 ${
          isMoving ? "scale-75 opacity-25" : "scale-100 opacity-60"
        }`}
      />
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponente de Mapa para a Tela de Seleção Interativa
// -------------------------------------------------------------
interface MapSelectorViewProps {
  center: Coords;
  isMoving: boolean;
  onDragStart: () => void;
  onCameraIdle: (coords: Coords) => void;
  onConfirm: () => void;
  isResolving: boolean;
  onBack: () => void;
}

const MapSelectorView: React.FC<MapSelectorViewProps> = ({
  center,
  isMoving,
  onDragStart,
  onCameraIdle,
  onConfirm,
  isResolving,
  onBack,
}) => {
  const map = useMap();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCameraChange = useCallback(
    (ev: MapCameraChangedEvent) => {
      const c = ev.detail.center;
      if (!c) return;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        onCameraIdle({ lat: c.lat, lng: c.lng });
      }, 250);
    },
    [onCameraIdle]
  );

  return (
    <div className="relative flex flex-col h-full w-full bg-[#E5F2E9] overflow-hidden">
      {/* Header do Mapa com cantos inferiores arredondados */}
      <div className="z-30 flex items-center justify-between px-4 py-3 bg-white rounded-b-2xl shadow-sm">
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

      {/* Mapa em Tela Cheia */}
      <div className="relative flex-1 w-full h-full">
        <Map
          defaultCenter={center}
          defaultZoom={17}
          gestureHandling="greedy"
          disableDefaultUI={true}
          onDragstart={onDragStart}
          onCameraChanged={handleCameraChange}
          className="h-full w-full"
        />

        {/* Pino Flutuante */}
        <FloatingCenterPin isMoving={isMoving} />

        {/* Loading de endereço suave */}
        {isResolving && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-1.5 shadow-md backdrop-blur-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E59500]" />
            <span className="text-xs font-semibold text-slate-700">
              Identificando rua...
            </span>
          </div>
        )}
      </div>

      {/* Botão Inferior Flutuante Confirmar Endereço */}
      <div className="absolute bottom-5 inset-x-4 z-30 max-w-md mx-auto">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isResolving}
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
// Componente Principal de Fluxo de Endereço (Identico ao App)
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

  // Estados de navegação: "initial" (Lista/GPS) -> "map" (Pino Uber) -> "details" (Formulário)
  const [step, setStep] = useState<"initial" | "map" | "details">("initial");

  // Localização do GPS e Endereço Detectado em Tempo Real
  const [currentCoords, setCurrentCoords] = useState<Coords>(DEFAULT_IACANGA_COORDS);
  const [gpsAddressText, setGpsAddressText] = useState<string>("");
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(true);

  // Estados do Mapa
  const [mapCoords, setMapCoords] = useState<Coords>(DEFAULT_IACANGA_COORDS);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);

  // Endereço Selecionado/Decodificado
  const [selectedStreet, setSelectedStreet] = useState<string>("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("Iacanga");
  const [selectedState, setSelectedState] = useState<string>("SP");
  const [selectedCep, setSelectedCep] = useState<string>("");

  // Estados da Tela de Detalhes (Formulário)
  const [numero, setNumero] = useState<string>("");
  const [semNumero, setSemNumero] = useState<boolean>(false);
  const [complemento, setComplemento] = useState<string>("");
  const [semComplemento, setSemComplemento] = useState<boolean>(false);
  const [pontoReferencia, setPontoReferencia] = useState<string>("");
  const [labelFavorito, setLabelFavorito] = useState<"Casa" | "Trabalho" | null>("Casa");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Endereços salvos do usuário
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

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
          }
        } catch {
          setSavedAddresses([]);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    loadSavedAddresses();
  }, [loadSavedAddresses]);

  // 2. Geocodificação reversa usando Geocoder do Google
  const reverseGeocode = useCallback(
    (coords: Coords): Promise<{ street: string; neighborhood: string; city: string; state: string; cep: string; formatted: string }> => {
      return new Promise((resolve) => {
        if (!geocoderRef.current && typeof google !== "undefined" && google.maps) {
          geocoderRef.current = new google.maps.Geocoder();
        }

        if (!geocoderRef.current) {
          resolve({
            street: "",
            neighborhood: "",
            city: "Iacanga",
            state: "SP",
            cep: "",
            formatted: "",
          });
          return;
        }

        geocoderRef.current.geocode({ location: coords }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
            const res = results[0];
            let street = "";
            let neighborhood = "";
            let city = "Iacanga";
            let state = "SP";
            let cep = "";

            for (const c of res.address_components) {
              const types = c.types;
              if (types.includes("route")) street = c.long_name;
              else if (types.includes("sublocality_level_1") || types.includes("sublocality")) neighborhood = c.long_name;
              else if (types.includes("administrative_area_level_2")) city = c.long_name;
              else if (types.includes("administrative_area_level_1")) state = c.short_name;
              else if (types.includes("postal_code")) cep = c.long_name;
            }

            resolve({
              street: street || res.formatted_address.split(",")[0],
              neighborhood,
              city,
              state,
              cep,
              formatted: res.formatted_address,
            });
          } else {
            resolve({
              street: "",
              neighborhood: "",
              city: "Iacanga",
              state: "SP",
              cep: "",
              formatted: "",
            });
          }
        });
      });
    },
    []
  );

  // 3. Captura localização do GPS em segundo plano ao abrir a tela
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsDetectingGps(false);
      setGpsAddressText("Localização não disponível no navegador");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentCoords(coords);
        setMapCoords(coords);

        const decoded = await reverseGeocode(coords);
        if (decoded.formatted) {
          setGpsAddressText(decoded.formatted);
        } else {
          setGpsAddressText("Localização atual encontrada");
        }
        setIsDetectingGps(false);
      },
      () => {
        setIsDetectingGps(false);
        setGpsAddressText("Clique para buscar e selecionar no mapa");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, [reverseGeocode]);

  // 4. Ao clicar na linha "Usar localização atual", abre o mapa
  const handleUseCurrentLocation = () => {
    setMapCoords(currentCoords);
    setStep("map");
    // Já decodifica o endereço da coordenada atual
    setIsResolvingAddress(true);
    reverseGeocode(currentCoords).then((data) => {
      setSelectedStreet(data.street);
      setSelectedNeighborhood(data.neighborhood);
      setSelectedCity(data.city);
      setSelectedState(data.state);
      setSelectedCep(data.cep);
      setIsResolvingAddress(false);
    });
  };

  // 5. Parou o mapa -> Decodifica coordenadas
  const handleCameraIdle = useCallback(
    async (coords: Coords) => {
      setIsMapMoving(false);
      setMapCoords(coords);
      setIsResolvingAddress(true);
      const data = await reverseGeocode(coords);
      setSelectedStreet(data.street);
      setSelectedNeighborhood(data.neighborhood);
      setSelectedCity(data.city);
      setSelectedState(data.state);
      setSelectedCep(data.cep);
      setIsResolvingAddress(false);
    },
    [reverseGeocode]
  );

  // 6. Confirma mapa -> Avança para detalhes
  const handleConfirmMap = () => {
    if (isResolvingAddress) return;
    setStep("details");
  };

  // 7. Salva o endereço final (botão "Ver batatas")
  const handleSaveFinalAddress = async () => {
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
      const addressData: Omit<Address, "id"> = {
        user_id: user ? user.id : "guest",
        street: selectedStreet || "Endereço selecionado",
        number: finalNumber,
        complement: finalComplement,
        neighborhood: selectedNeighborhood || "Centro",
        city: selectedCity || "Iacanga",
        state: selectedState || "SP",
        cep: selectedCep || "17150-000",
        is_default: true,
      };

      let saved: Address | null = null;

      if (user) {
        saved = await addressesManager.addAddress(addressData);
      } else {
        saved = {
          id: "guest-default",
          ...addressData,
        };
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(saved));
      }

      window.dispatchEvent(new Event("address-changed"));
      appToast.success("Endereço salvo com sucesso!", `${saved?.street}, ${saved?.number}`);

      if (onSuccess && saved) {
        onSuccess(saved);
      }

      if (onClose) {
        onClose();
      } else {
        router.push(redirectUrl);
      }
    } catch (e) {
      console.error(e);
      appToast.error("Erro ao salvar endereço", "Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Seleção rápida de endereço já salvo da lista
  const handleSelectSaved = (addr: Address) => {
    window.dispatchEvent(new Event("address-changed"));
    appToast.success("Endereço selecionado!", `${addr.street}, ${addr.number}`);
    if (onSuccess) onSuccess(addr);
    if (onClose) onClose();
    else router.push(redirectUrl);
  };

  // Validação para habilitar o botão "Ver batatas"
  const isDetailsValid =
    (semNumero || numero.trim().length > 0) &&
    (semComplemento || complemento.trim().length > 0);

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding"]}>
      <div className={`w-full h-full flex flex-col bg-[#FAF8F5] text-slate-800 ${isModal ? "max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl" : "min-h-screen"}`}>

        {/* ======================================================== */}
        {/* ESTADO 1: LISTA DE ENDEREÇOS E GPS (IDÊNTICO À IMAGEM 3) */}
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
              {/* Campo de Busca de Endereço */}
              <div
                onClick={() => setStep("map")}
                className="flex items-center gap-2.5 px-3.5 py-3 bg-[#F0ECE4]/70 rounded-2xl cursor-pointer hover:bg-[#EAE4DC] transition-colors"
              >
                <Search className="w-4 h-4 text-[#E59500]" />
                <span className="text-xs text-slate-500 font-medium">
                  Buscar endereço e número
                </span>
              </div>

              {/* Botão Usar Localização Atual (com subtítulo dinâmico do GPS) */}
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
                      gpsAddressText || "Clique para abrir o mapa na sua posição"
                    )}
                  </p>
                </div>
              </div>

              {/* Divisor Visual */}
              <div className="pt-2 border-t border-slate-200/60" />

              {/* Lista de Endereços Salvos (Card Dourado Idêntico à Imagem 3) */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3">
                  {savedAddresses.map((addr, idx) => (
                    <div
                      key={addr.id || idx}
                      onClick={() => handleSelectSaved(addr)}
                      className="relative flex items-center justify-between p-4 bg-white border-2 border-[#E59500] rounded-2xl shadow-xs cursor-pointer active:scale-[0.99] transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="p-2 text-slate-700">
                          <Home className="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 leading-tight">
                            Casa
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {addr.street}, {addr.number} - {addr.neighborhood}, {addr.city} - {addr.state}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-3">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#E59500] text-white">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Abre para editar no mapa
                            handleUseCurrentLocation();
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADO 2: MAPA EM TELA CHEIA (IDÊNTICO ÀS IMAGENS 1 E 2) */}
        {/* ======================================================== */}
        {step === "map" && (
          <MapSelectorView
            center={mapCoords}
            isMoving={isMapMoving}
            onDragStart={() => setIsMapMoving(true)}
            onCameraIdle={handleCameraIdle}
            onConfirm={handleConfirmMap}
            isResolving={isResolvingAddress}
            onBack={() => setStep("initial")}
          />
        )}

        {/* ======================================================== */}
        {/* ESTADO 3: FORMULÁRIO DE COMPLEMENTO (IDÊNTICO À IMAGEM 4) */}
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

            <div className="flex-1 overflow-y-auto pb-24">
              {/* Miniatura do Mapa com o Pino Amarelo e Pílula "Ajustar marcador" */}
              <div className="relative h-44 w-full bg-[#E5F2E9] overflow-hidden border-b border-slate-100">
                <Map
                  defaultCenter={mapCoords}
                  defaultZoom={17}
                  gestureHandling="none"
                  disableDefaultUI={true}
                  className="h-full w-full pointer-events-none"
                />

                {/* Pino Central Fixo Amarelo na Miniatura */}
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

                {/* Pílula branca sobreposta "Ajustar marcador" */}
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-full shadow-md hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Ajustar marcador
                </button>
              </div>

              {/* Nome da Rua e Bairro com Lápis de Edição */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {selectedStreet || "Localização selecionada"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedNeighborhood ? `${selectedNeighborhood} - ` : ""}
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

              {/* Campos do Formulário (Número, Complemento, Ponto de Referência) */}
              <div className="p-5 space-y-4">
                {/* Campo Número */}
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

                {/* Campo Complemento */}
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

                {/* Campo Ponto de Referência (Opcional) */}
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

                {/* Seção Favoritar Endereço */}
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

            {/* Botão Inferior Fixo "Ver batatas" */}
            <div className="fixed sm:static bottom-0 inset-x-0 p-4 bg-white border-t border-slate-100 shadow-md">
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
      </div>
    </APIProvider>
  );
};

export default AddressFlow;
