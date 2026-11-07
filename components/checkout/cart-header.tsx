"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { ClearCartDialog } from "@/components/checkout/clear-cart-dialog"

export type CheckoutStep = "itens" | "entrega" | "pagamento"

interface CartHeaderProps {
  step: CheckoutStep
  onBack: () => void
  onClear: () => void
  canClear?: boolean
}

export function CartHeader({ step, onBack, onClear, canClear = true }: CartHeaderProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const progressPercent = step === "itens" ? "33.3%" : step === "entrega" ? "66.6%" : "100%"

  const getStepTitle = () => {
    switch (step) {
      case "itens":
        return "Etapa 1 de 3: Sacola"
      case "entrega":
        return "Etapa 2 de 3: Entrega"
      case "pagamento":
        return "Etapa 3 de 3: Pagamento"
    }
  }

  const handleConfirmClear = () => {
    setShowClearConfirm(false)
    onClear()
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-[#ECE7E0] shadow-xs">
        {/* Barra de Progresso Horizontal Amarela */}
        <div className="w-full bg-[#F3F0EB] h-1.5 overflow-hidden">
          <div
            className="bg-[#E3A008] h-full transition-all duration-300 ease-out"
            style={{ width: progressPercent }}
          />
        </div>

        {/* Barra de Ações Superior */}
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#F7F5F0] hover:bg-[#ECE7E0] text-[#1F1B16] flex items-center justify-center transition-colors active:scale-95"
            aria-label="Voltar etapa anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="text-sm font-bold text-[#1F1B16] tracking-tight text-center">
            {getStepTitle()}
          </h1>

          {step === "itens" && canClear ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs sm:text-sm font-bold text-[#C1440E] hover:text-[#9c3609] px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Limpar
            </button>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
      </header>

      {/* Modal de Confirmação para Limpar Sacola (Radix Alert Dialog estilo iFood) */}
      <ClearCartDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleConfirmClear}
      />
    </>
  )
}
