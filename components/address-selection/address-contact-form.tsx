"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  MapPin,
  Pencil,
  Home,
  Briefcase,
  User,
  Phone,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addressSelectionSchema,
  AddressSelectionFormData,
  GeocodedAddress,
} from "@/lib/schemas/address-selection-schema"

interface AddressContactFormProps {
  initialAddress: GeocodedAddress
  initialContact?: { fullName: string; phone: string }
  isSubmitting: boolean
  onAdjustMarker: () => void
  onSubmit: (data: AddressSelectionFormData) => void
}

export function AddressContactForm({
  initialAddress,
  initialContact,
  isSubmitting,
  onAdjustMarker,
  onSubmit,
}: AddressContactFormProps) {
  const [selectedLabel, setSelectedLabel] = useState<"casa" | "trabalho" | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<AddressSelectionFormData>({
    resolver: zodResolver(addressSelectionSchema),
    mode: "onChange",
    defaultValues: {
      street: initialAddress.street || initialAddress.formatted || "",
      neighborhood: initialAddress.neighborhood || "",
      city: initialAddress.city || "Iacanga",
      state: initialAddress.state || "SP",
      cep: initialAddress.cep || "17150-000",
      latitude: initialAddress.latitude,
      longitude: initialAddress.longitude,
      formatted: initialAddress.formatted,
      number: "",
      semNumero: false,
      complement: "",
      semComplemento: false,
      reference_point: "",
      label: null,
      fullName: initialContact?.fullName || "",
      phone: initialContact?.phone || "",
    },
  })

  const semNumero = watch("semNumero")
  const semComplemento = watch("semComplemento")
  const numberVal = watch("number") || ""
  const complementVal = watch("complement") || ""
  const referenceVal = watch("reference_point") || ""
  const phoneVal = watch("phone") || ""

  // Máscara dinâmica de telefone BR: (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11)
    let masked = ""
    if (raw.length > 0) masked = `(${raw.slice(0, 2)}`
    if (raw.length > 2) masked += `) ${raw.slice(2, 7)}`
    if (raw.length > 7) masked += `-${raw.slice(7, 11)}`
    setValue("phone", masked, { shouldValidate: true })
  }

  const toggleSemNumero = () => {
    const next = !semNumero
    setValue("semNumero", next, { shouldValidate: true })
    if (next) {
      setValue("number", "S/N", { shouldValidate: true })
    } else {
      setValue("number", "", { shouldValidate: true })
    }
  }

  const toggleSemComplemento = () => {
    const next = !semComplemento
    setValue("semComplemento", next, { shouldValidate: true })
    if (next) {
      setValue("complement", "Sem complemento", { shouldValidate: true })
    } else {
      setValue("complement", "", { shouldValidate: true })
    }
  }

  const handleLabelClick = (label: "casa" | "trabalho") => {
    const next = selectedLabel === label ? null : label
    setSelectedLabel(next)
    setValue("label", next, { shouldValidate: true })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 pb-8 animate-in fade-in"
    >
      {/* Card de Resumo do Endereço com Botão Ajustar Marcador */}
      <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#FFB800]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 leading-tight">
                {initialAddress.street || "Endereço selecionado no mapa"}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {initialAddress.neighborhood ? `${initialAddress.neighborhood} - ` : ""}
                {initialAddress.city}/{initialAddress.state}
                {initialAddress.cep ? ` • CEP ${initialAddress.cep}` : ""}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdjustMarker}
            className="shrink-0 h-8 gap-1.5 rounded-full border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            <Pencil className="h-3.5 w-3.5 text-neutral-500" />
            <span>Ajustar no mapa</span>
          </Button>
        </div>
      </div>

      {/* Seção 1: Complementos do Endereço */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Dados da Entrega
        </h3>

        {/* Bairro (caso não tenha vindo do mapa ou venha vazio) */}
        {!initialAddress.neighborhood && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold text-neutral-700">
                Bairro <span className="text-red-500">*</span>
              </Label>
            </div>
            <Input
              {...register("neighborhood")}
              placeholder="Ex: Centro, Jardim Primavera"
              className="h-11 rounded-xl bg-white border-neutral-200"
            />
            {errors.neighborhood && (
              <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {errors.neighborhood.message}
              </p>
            )}
          </div>
        )}

        {/* Número e Checkbox Sem Número */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-neutral-700">
              Número <span className="text-red-500">*</span>
            </Label>
            <span className="text-[11px] text-neutral-400">
              {numberVal.length}/60
            </span>
          </div>

          <Input
            {...register("number")}
            disabled={semNumero}
            maxLength={60}
            placeholder={semNumero ? "S/N (Sem número)" : "Ex: 123, 45B"}
            className={`h-11 rounded-xl bg-white border-neutral-200 ${
              semNumero ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : ""
            }`}
          />

          <button
            type="button"
            onClick={toggleSemNumero}
            className="flex items-center gap-2 pt-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 cursor-pointer select-none"
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                semNumero
                  ? "bg-[#FFB800] border-[#FFB800] text-neutral-950"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {semNumero && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
            <span>Endereço sem número</span>
          </button>

          {errors.number && !semNumero && (
            <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {errors.number.message}
            </p>
          )}
        </div>

        {/* Complemento e Checkbox Sem Complemento */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-neutral-700">
              Complemento <span className="text-red-500">*</span>
            </Label>
            <span className="text-[11px] text-neutral-400">
              {complementVal.length}/60
            </span>
          </div>

          <Input
            {...register("complement")}
            disabled={semComplemento}
            maxLength={60}
            placeholder={semComplemento ? "Sem complemento" : "Ex: Apto 102, Bloco B, Casa dos fundos"}
            className={`h-11 rounded-xl bg-white border-neutral-200 ${
              semComplemento ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : ""
            }`}
          />

          <button
            type="button"
            onClick={toggleSemComplemento}
            className="flex items-center gap-2 pt-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 cursor-pointer select-none"
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                semComplemento
                  ? "bg-[#FFB800] border-[#FFB800] text-neutral-950"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {semComplemento && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
            <span>Endereço sem complemento</span>
          </button>

          {errors.complement && !semComplemento && (
            <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {errors.complement.message}
            </p>
          )}
        </div>

        {/* Ponto de Referência */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-semibold text-neutral-700">
              Ponto de referência <span className="text-neutral-400 font-normal">(opcional)</span>
            </Label>
            <span className="text-[11px] text-neutral-400">
              {referenceVal.length}/280
            </span>
          </div>

          <Input
            {...register("reference_point")}
            maxLength={280}
            placeholder="Ex: Próximo à padaria central, portão branco"
            className="h-11 rounded-xl bg-white border-neutral-200"
          />
          {errors.reference_point && (
            <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {errors.reference_point.message}
            </p>
          )}
        </div>

        {/* Favoritar Endereço (Pills Casa / Trabalho) */}
        <div className="pt-2">
          <Label className="text-xs font-semibold text-neutral-700 block mb-2">
            Salvar como
          </Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleLabelClick("casa")}
              className={`flex flex-1 items-center justify-center gap-2 h-11 rounded-xl border text-sm font-semibold transition-all ${
                selectedLabel === "casa"
                  ? "border-[#FFB800] bg-amber-50 text-neutral-950 shadow-xs ring-1 ring-[#FFB800]"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Home className={`h-4 w-4 ${selectedLabel === "casa" ? "text-[#FFB800]" : "text-neutral-400"}`} />
              <span>Casa</span>
            </button>

            <button
              type="button"
              onClick={() => handleLabelClick("trabalho")}
              className={`flex flex-1 items-center justify-center gap-2 h-11 rounded-xl border text-sm font-semibold transition-all ${
                selectedLabel === "trabalho"
                  ? "border-[#FFB800] bg-amber-50 text-neutral-950 shadow-xs ring-1 ring-[#FFB800]"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Briefcase className={`h-4 w-4 ${selectedLabel === "trabalho" ? "text-[#FFB800]" : "text-neutral-400"}`} />
              <span>Trabalho</span>
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-neutral-200/80 my-1" />

      {/* Seção 2: Dados de Contato do Usuário */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Dados do Contato
        </h3>

        {/* Nome Completo */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-neutral-400" />
            Nome completo <span className="text-red-500">*</span>
          </Label>
          <Input
            {...register("fullName")}
            placeholder="Ex: Maria da Silva"
            className="h-11 rounded-xl bg-white border-neutral-200"
          />
          {errors.fullName && (
            <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Telefone / WhatsApp */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-neutral-400" />
            Telefone / WhatsApp <span className="text-red-500">*</span>
          </Label>
          <Input
            type="tel"
            value={phoneVal}
            onChange={handlePhoneChange}
            placeholder="(14) 99876-5432"
            maxLength={15}
            className="h-11 rounded-xl bg-white border-neutral-200"
          />
          {errors.phone && (
            <p className="text-xs font-medium text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-3 w-3" />
              {errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* Botão de Submissão Final */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className={`w-full h-13 rounded-2xl font-bold text-base transition-all shadow-lg active:scale-98 ${
            isValid && !isSubmitting
              ? "bg-[#FFB800] text-neutral-950 hover:bg-[#E5A600] shadow-amber-500/20"
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-950" />
              <span>Salvando endereço...</span>
            </div>
          ) : (
            <span>Salvar endereço e continuar</span>
          )}
        </Button>
      </div>
    </form>
  )
}
