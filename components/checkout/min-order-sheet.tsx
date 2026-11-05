"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, Plus, X } from "lucide-react"

interface MinOrderSheetProps {
  isOpen: boolean
  onClose: () => void
  currentSubtotal: number
  minOrderValue?: number
}

export function MinOrderSheet({
  isOpen,
  onClose,
  currentSubtotal,
  minOrderValue = 20.0,
}: MinOrderSheetProps) {
  const router = useRouter()

  if (!isOpen) return null

  const missingValue = Math.max(0, minOrderValue - currentSubtotal)
  const minFormatted = `R$ ${minOrderValue.toFixed(2).replace(".", ",")}`
  const missingFormatted = `R$ ${missingValue.toFixed(2).replace(".", ",")}`

  const handleAddMore = () => {
    onClose()
    router.push("/cardapio")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300">
        {/* Handle bar on mobile */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#E3A008] flex items-center justify-center shrink-0">
            <AlertCircle className="w-7 h-7" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-black text-[#1F1B16]">Valor mínimo do pedido</h2>
          <p className="text-sm text-[#6B6157] leading-relaxed">
            O pedido mínimo para entrega é de <strong className="text-[#1F1B16]">{minFormatted}</strong> (sem incluir a taxa de entrega).
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mt-2">
            <span className="text-xs text-[#9C9188]">Faltam apenas </span>
            <span className="text-sm font-black text-[#C1440E]">{missingFormatted}</span>
            <span className="text-xs text-[#9C9188]"> para atingir o valor mínimo.</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleAddMore}
            className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar mais itens
          </button>
          <button
            onClick={onClose}
            className="w-full h-11 bg-transparent text-[#6B6157] hover:text-[#1F1B16] font-bold text-sm rounded-xl transition-colors"
          >
            Ok, entendi
          </button>
        </div>
      </div>
    </div>
  )
}
