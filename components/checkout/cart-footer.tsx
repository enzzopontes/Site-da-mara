"use client"

import { Loader2 } from "lucide-react"
import { CheckoutStep } from "./cart-header"

interface CartFooterProps {
  step: CheckoutStep
  total: number
  itemCount: number
  deliveryType?: "delivery" | "pickup"
  deliveryFee?: number
  isSubmitting?: boolean
  onContinue: () => void
}

export function CartFooter({
  step,
  total,
  itemCount,
  deliveryType = "delivery",
  deliveryFee = 0,
  isSubmitting = false,
  onContinue,
}: CartFooterProps) {
  const formattedTotal = `R$ ${total.toFixed(2).replace(".", ",")}`
  const isFree = deliveryType === "pickup" || deliveryFee === 0
  const deliveryStatusText = isFree ? "retirada grátis" : "com entrega"

  const getButtonText = () => {
    switch (step) {
      case "itens":
        return "Continuar para Entrega"
      case "entrega":
        return "Ir para Pagamento"
      case "pagamento":
        return "Finalizar Pedido"
    }
  }

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#ECE7E0] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Informações de Total à esquerda */}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] text-[#6B6157] font-medium truncate">
            {step === "itens"
              ? deliveryType === "pickup"
                ? "Total dos itens"
                : "Total estimado"
              : `Total • ${deliveryStatusText}`}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-black text-[#1F1B16] tracking-tight">
              {formattedTotal}
            </span>
            <span className="text-xs text-[#9C9188] font-bold">
              / {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
          </div>
        </div>

        {/* Botão de Ação à direita */}
        <button
          onClick={onContinue}
          disabled={isSubmitting || itemCount === 0}
          className="flex-1 max-w-[240px] h-14 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-black text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando...</span>
            </>
          ) : (
            <span>{getButtonText()}</span>
          )}
        </button>
      </div>
    </footer>
  )
}
