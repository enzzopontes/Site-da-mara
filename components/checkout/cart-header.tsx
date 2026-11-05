"use client"

import { useState } from "react"
import { ChevronLeft, Trash2 } from "lucide-react"

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

      {/* Modal de Confirmação para Limpar Sacola */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-black text-[#1F1B16]">Limpar sacola?</h2>
              <p className="text-xs text-[#6B6157] leading-relaxed">
                Todos os itens e adicionais escolhidos serão removidos da sua sacola.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="h-11 rounded-xl bg-[#F7F5F0] text-[#6B6157] font-bold text-sm hover:bg-[#ECE7E0] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClear}
                className="h-11 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 shadow-sm transition-colors"
              >
                Sim, limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
