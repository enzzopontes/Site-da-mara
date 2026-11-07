"use client"

import { Clock, Power, Truck, DollarSign, Calendar, Save, RotateCcw, AlertCircle, CheckCircle2, Settings2 } from "lucide-react"
import { useEffect, useState } from "react"
import { storeStatusManager, StoreStatus } from "@/lib/store-status-manager"
import { appToast } from "@/lib/app-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface BusinessHoursProps {
  showToggle?: boolean // Quando true, exibe a interface administrativa completa no painel
}

export function BusinessHours({ showToggle = false }: BusinessHoursProps) {
  const [currentTime, setCurrentTime] = useState<string>("")
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [openTimeInput, setOpenTimeInput] = useState<string>("10:00")
  const [closeTimeInput, setCloseTimeInput] = useState<string>("22:00")
  const [autoScheduleInput, setAutoScheduleInput] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false)

  const updateStatus = async () => {
    const s = await storeStatusManager.getStatus()
    setStatus(s)
    if (s.openTime) setOpenTimeInput(s.openTime)
    if (s.closeTime) setCloseTimeInput(s.closeTime)
    if (s.autoSchedule !== undefined) setAutoScheduleInput(s.autoSchedule)
  }

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    }

    updateTime()
    updateStatus()

    const timeInterval = setInterval(updateTime, 30000)
    const statusUpdateInterval = setInterval(updateStatus, 5000)

    // Escuta mudanças no status da loja (disparadas no navegador)
    const handleStatusChange = () => updateStatus()
    window.addEventListener("store-status-changed", handleStatusChange)

    return () => {
      clearInterval(timeInterval)
      clearInterval(statusUpdateInterval)
      window.removeEventListener("store-status-changed", handleStatusChange)
    }
  }, [])

  const handleToggleStoreManual = async () => {
    const newOpenState = await storeStatusManager.toggleStoreStatus()
    await updateStatus()
    appToast.info(newOpenState ? "Loja Aberta Manualmente" : "Loja Fechada Manualmente", `Sobreposição manual ativa. O status retornará ao agendamento automático no próximo ciclo (${newOpenState ? status?.closeTime || "22:00" : status?.openTime || "10:00"}).`)
  }

  const handleResetToAuto = async () => {
    await storeStatusManager.resetToAutoSchedule()
    await updateStatus()
    appToast.success("Modo Automático Restaurado", "A loja voltou a seguir estritamente o horário programado de funcionamento.")
  }

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await storeStatusManager.updateSchedule(openTimeInput, closeTimeInput, autoScheduleInput)
      await updateStatus()
      setIsScheduleModalOpen(false)
      appToast.success("Horários Salvos com Sucesso!", `Abertura programada: ${openTimeInput} | Fechamento programado: ${closeTimeInput}`)
    } catch (err) {
      appToast.error("Erro ao salvar horários", "Não foi possível persistir os novos horários no banco.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleDelivery = async () => {
    await storeStatusManager.toggleDeliveryStatus()
    await updateStatus()
  }

  const handleToggleDeliveryFee = async () => {
    await storeStatusManager.toggleDeliveryFeeStatus()
    await updateStatus()
  }

  const isOpen = status?.isOpen ?? true
  const isDeliveryEnabled = status?.isDeliveryEnabled ?? true
  const isDeliveryFeeEnabled = status?.isDeliveryFeeEnabled ?? true
  const deliveryFee = status?.deliveryFee ?? 3.0
  const waitTime = { min: status?.waitTimeMin ?? 15, max: status?.waitTimeMax ?? 22 }
  const isManualOverride = status?.manualOverride ?? false
  const autoSchedule = status?.autoSchedule ?? true
  const openTime = status?.openTime || "10:00"
  const closeTime = status?.closeTime || "22:00"

  // Se for apenas visualização simples (ex: cabeçalhos ou rodapés não-admin)
  if (!showToggle) {
    return (
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span className="text-gray-600 font-medium">Horário: {currentTime}</span>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {isOpen ? "Aberto" : "Fechado"}
        </span>

        {isOpen && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-bold">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Espera: {waitTime.min}-{waitTime.max} min
            </span>
          </div>
        )}
      </div>
    )
  }

  // Visualização Administrativa no Painel (Compacta e sem poluição visual)
  return (
    <>
      <div className="space-y-4">
        {/* Linha 1: Informações de Status e Modo */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
              <Clock className="h-3.5 w-3.5 text-yellow-500" />
              <span>Iacanga-SP: {currentTime}</span>
            </div>

            <span
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wide shadow-xs ${
                isOpen
                  ? "bg-emerald-500 text-white shadow-emerald-100"
                  : "bg-red-500 text-white shadow-red-100"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOpen ? "bg-emerald-200" : "bg-red-200"}`} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              {isOpen ? "LOJA ABERTA" : "LOJA FECHADA"}
            </span>

            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                isManualOverride
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {isManualOverride ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Sobreposição Manual Ativa (retorna no próximo ciclo)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Modo Automático ({openTime} às {closeTime})</span>
                </>
              )}
            </span>

            {isOpen && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-100/70 text-yellow-800 text-xs font-bold">
                <Clock className="h-3.5 w-3.5 text-yellow-600" />
                <span>Fila: {waitTime.min}-{waitTime.max} min</span>
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Ações Administrativas (Inclui botão para abrir Modal de Horários) */}
        <div className="flex items-center gap-2.5 flex-wrap pt-1">
          <Button
            onClick={() => setIsScheduleModalOpen(true)}
            variant="outline"
            size="sm"
            className="rounded-xl border-yellow-300 bg-yellow-50/80 hover:bg-yellow-100 text-yellow-800 font-bold text-xs h-9 gap-1.5 shadow-xs transition-all"
          >
            <Settings2 className="h-3.5 w-3.5 text-yellow-600" />
            Configurar Horários ({openTime} - {closeTime})
          </Button>

          {isManualOverride && (
            <Button
              onClick={handleResetToAuto}
              variant="outline"
              size="sm"
              className="rounded-xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs h-9 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
              Voltar ao Automático
            </Button>
          )}

          <Button
            onClick={handleToggleStoreManual}
            size="sm"
            className={`rounded-xl font-black text-xs h-9 gap-1.5 shadow-xs transition-transform active:scale-95 ${
              isOpen
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {isOpen ? "Forçar Fechar Loja" : "Forçar Abrir Loja"}
          </Button>

          <Button
            onClick={handleToggleDelivery}
            variant="outline"
            size="sm"
            className={`rounded-xl text-xs font-bold h-9 gap-1.5 transition-colors ${
              isDeliveryEnabled
                ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            {isDeliveryEnabled ? "Pausar Entregas" : "Ativar Entregas"}
          </Button>

          <Button
            onClick={handleToggleDeliveryFee}
            variant="outline"
            size="sm"
            className={`rounded-xl text-xs font-bold h-9 gap-1.5 transition-colors ${
              isDeliveryFeeEnabled
                ? "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            {isDeliveryFeeEnabled ? `Taxa Ativa (R$ ${deliveryFee.toFixed(2)})` : "Taxa Desativada"}
          </Button>
        </div>
      </div>

      {/* Modal de Configuração de Horários */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-yellow-100 shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 shadow-xs">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-gray-900">
                  Horários de Funcionamento
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-medium">
                  Defina os horários para abertura e fechamento automático da loja.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveSchedule} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Horário de Abertura:
                </label>
                <input
                  type="time"
                  value={openTimeInput}
                  onChange={(e) => setOpenTimeInput(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-hidden text-sm font-bold text-gray-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Horário de Fechamento:
                </label>
                <input
                  type="time"
                  value={closeTimeInput}
                  onChange={(e) => setCloseTimeInput(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-hidden text-sm font-bold text-gray-900 transition-all"
                />
              </div>
            </div>

            <div className="p-3.5 bg-yellow-50/70 border border-yellow-200/70 rounded-2xl">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScheduleInput}
                  onChange={(e) => setAutoScheduleInput(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 border-gray-300 focus:ring-yellow-400"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900">Ativar ciclo automático</p>
                  <p className="text-[11px] text-gray-500">
                    Abre e fecha a loja no Supabase no horário programado sem precisar de ninguém online.
                  </p>
                </div>
              </label>
            </div>

            <div className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              💡 <strong>Sobreposição manual:</strong> caso você force abrir ou fechar a loja manualmente pelo painel, a loja respeitará sua decisão até o próximo horário programado ({openTimeInput} ou {closeTimeInput}) ser atingido, quando voltará a seguir o ciclo normalmente.
            </div>

            <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-xl font-bold text-xs h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-xl text-xs h-10 px-5 gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Salvando..." : "Salvar Horários"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
