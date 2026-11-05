"use client"

import { useState } from "react"
import {
  MapPin,
  Bike,
  Store,
  Clock,
  ChevronRight,
  Plus,
  Check,
  Search,
  Loader2,
  AlertCircle,
  User,
  Phone,
} from "lucide-react"
import { Address } from "@/lib/addresses-manager"

interface StepEntregaProps {
  deliveryType: "delivery" | "pickup"
  setDeliveryType: (type: "delivery" | "pickup") => void
  isDeliveryEnabled: boolean
  deliveryFee: number
  addresses: Address[]
  selectedAddressId: string
  setSelectedAddressId: (id: string) => void
  useNewAddress: boolean
  setUseNewAddress: (use: boolean) => void
  rua: string
  setRua: (v: string) => void
  numero: string
  setNumero: (v: string) => void
  complemento: string
  setComplemento: (v: string) => void
  bairro: string
  setBairro: (v: string) => void
  cep: string
  handleCepChange: (v: string) => void
  buscandoCep: boolean
  enderecoError: string
  nome: string
  setNome: (v: string) => void
  telefone: string
  handleTelefoneChange: (v: string) => void
  onOpenAddressModal?: () => void
}

export function StepEntrega({
  deliveryType,
  setDeliveryType,
  isDeliveryEnabled,
  deliveryFee,
  addresses,
  selectedAddressId,
  setSelectedAddressId,
  useNewAddress,
  setUseNewAddress,
  rua,
  setRua,
  numero,
  setNumero,
  complemento,
  setComplemento,
  bairro,
  setBairro,
  cep,
  handleCepChange,
  buscandoCep,
  enderecoError,
  nome,
  setNome,
  telefone,
  handleTelefoneChange,
  onOpenAddressModal,
}: StepEntregaProps) {
  const [showAddressPicker, setShowAddressPicker] = useState(false)

  const activeAddress = addresses.find((a) => a.id === selectedAddressId)

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Abas Segmentadas: Delivery vs Retirada */}
      <div className="bg-[#F7F5F0] p-1.5 rounded-2xl border border-[#ECE7E0] grid grid-cols-2 gap-1.5">
        <button
          onClick={() => isDeliveryEnabled && setDeliveryType("delivery")}
          disabled={!isDeliveryEnabled}
          className={`h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            deliveryType === "delivery"
              ? "bg-white text-[#1F1B16] shadow-sm"
              : "text-[#6B6157] hover:text-[#1F1B16]"
          } ${!isDeliveryEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Bike className="w-4 h-4 text-[#E3A008]" />
          <span>Entrega Delivery</span>
        </button>

        <button
          onClick={() => setDeliveryType("pickup")}
          className={`h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            deliveryType === "pickup"
              ? "bg-white text-[#1F1B16] shadow-sm"
              : "text-[#6B6157] hover:text-[#1F1B16]"
          }`}
        >
          <Store className="w-4 h-4 text-[#E3A008]" />
          <span>Retirar no Balcão</span>
        </button>
      </div>

      {/* 2. Conteúdo de Entrega / Retirada */}
      {deliveryType === "delivery" ? (
        <div className="space-y-4">
          {/* Card de Endereço Ativo */}
          {!useNewAddress && activeAddress ? (
            <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#E3A008] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-[#8C827A] uppercase tracking-wider block">
                      Endereço de Entrega
                    </span>
                    <h3 className="text-base font-black text-[#1F1B16]">
                      {activeAddress.street}, {activeAddress.number}
                    </h3>
                    <p className="text-xs text-[#6B6157] mt-0.5">
                      {activeAddress.complement ? `${activeAddress.complement} - ` : ""}
                      {activeAddress.neighborhood}, {activeAddress.city || "Iacanga"} - {activeAddress.state || "SP"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddressPicker(true)}
                  className="text-xs font-bold text-[#E3A008] hover:text-[#C1440E] px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors flex-shrink-0"
                >
                  Trocar
                </button>
              </div>

              {/* Informações de Estimativa e Frete */}
              <div className="pt-3 border-t border-[#F3F0EB] flex items-center justify-between text-xs font-medium text-[#6B6157]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#8C827A]" />
                  <span>Previsão: <strong>40 - 55 min</strong></span>
                </div>
                <div>
                  <span>Taxa: <strong className="text-[#1F1B16]">R$ {deliveryFee.toFixed(2).replace(".", ",")}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            /* Formulário de Novo Endereço Inline */
            <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#1F1B16] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#E3A008]" />
                  Cadastrar Endereço para Entrega
                </h3>
                {addresses.length > 0 && (
                  <button
                    onClick={() => {
                      setUseNewAddress(false)
                      setShowAddressPicker(false)
                    }}
                    className="text-xs font-bold text-[#6B6157] hover:text-[#1F1B16]"
                  >
                    Usar salvo
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* CEP com Busca ViaCEP */}
                <div>
                  <label className="text-xs font-bold text-[#6B6157] mb-1 block">
                    CEP em Iacanga - SP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="17180-000"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      maxLength={9}
                      className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    />
                    {buscandoCep && (
                      <div className="absolute right-3.5 top-3.5 text-[#E3A008]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {enderecoError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-bold text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{enderecoError}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#6B6157] mb-1 block">
                      Rua / Logradouro
                    </label>
                    <input
                      type="text"
                      placeholder="Nome da rua"
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6B6157] mb-1 block">
                      Número
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#6B6157] mb-1 block">
                      Bairro
                    </label>
                    <input
                      type="text"
                      placeholder="Centro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#6B6157] mb-1 block">
                      Complemento (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Apto, Casa..."
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Card de Retirada no Balcão */
        <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#E3A008] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#8C827A] uppercase tracking-wider block">
                Local de Retirada
              </span>
              <h3 className="text-base font-black text-[#1F1B16]">
                Batata Top (Loja Física)
              </h3>
              <p className="text-xs text-[#6B6157] mt-0.5 leading-relaxed">
                Rua Carlos Roberto Crepaldi, 120 - Jardim Alvorada, Iacanga - SP
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F3F0EB] flex items-center justify-between text-xs font-medium text-[#6B6157]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#8C827A]" />
              <span>Tempo de preparo: <strong>15 a 25 min</strong></span>
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-black">
                Grátis (R$ 0,00)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Identificação do Cliente */}
      <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#1F1B16] flex items-center gap-2">
          <User className="w-4 h-4 text-[#E3A008]" />
          Dados para Identificação
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-[#6B6157] mb-1 block">
              Nome Completo
            </label>
            <input
              type="text"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#6B6157] mb-1 block">
              Telefone / WhatsApp (com DDD)
            </label>
            <input
              type="tel"
              placeholder="(14) 99999-9999"
              value={telefone}
              onChange={(e) => handleTelefoneChange(e.target.value)}
              maxLength={15}
              className="w-full h-12 px-4 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
            />
          </div>
        </div>
      </div>

      {/* Modal / Seleção de Endereços Salvos */}
      {showAddressPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#1F1B16]">Selecione um Endereço</h3>
              <button
                onClick={() => setShowAddressPicker(false)}
                className="text-xs font-bold text-[#6B6157] hover:text-[#1F1B16]"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setSelectedAddressId(addr.id)
                    setUseNewAddress(false)
                    setShowAddressPicker(false)
                  }}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedAddressId === addr.id && !useNewAddress
                      ? "border-[#E3A008] bg-amber-50/50 ring-1 ring-[#E3A008]"
                      : "border-[#ECE7E0] bg-[#F7F5F0] hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#1F1B16]">
                      {addr.street}, {addr.number}
                    </span>
                    {selectedAddressId === addr.id && !useNewAddress && (
                      <Check className="w-4 h-4 text-[#E3A008]" />
                    )}
                  </div>
                  <p className="text-xs text-[#6B6157] mt-0.5">
                    {addr.complement ? `${addr.complement} - ` : ""}
                    {addr.neighborhood}, {addr.city}/{addr.state}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setUseNewAddress(true)
                setShowAddressPicker(false)
              }}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-[#E3A008] text-[#E3A008] font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-50/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Endereço
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
