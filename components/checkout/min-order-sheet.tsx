"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, Plus, X } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"

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

  const missingValue = Math.max(0, minOrderValue - currentSubtotal)
  const minFormatted = `R$ ${minOrderValue.toFixed(2).replace(".", ",")}`
  const missingFormatted = `R$ ${missingValue.toFixed(2).replace(".", ",")}`

  const handleAddMore = () => {
    onClose()
    router.push("/cardapio")
  }

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <ResponsiveModalContent
        showCloseButton={false}
        showHandle={true}
        className="p-6 sm:p-6 bg-white flex flex-col sm:max-w-md sm:rounded-3xl rounded-t-[28px] space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#E3A008] flex items-center justify-center shrink-0">
            <AlertCircle className="w-7 h-7" />
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            data-vaul-no-drag
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <ResponsiveModalTitle className="text-xl font-black text-[#1F1B16]">
            Valor mínimo do pedido
          </ResponsiveModalTitle>
          <ResponsiveModalDescription className="text-sm text-[#6B6157] leading-relaxed">
            O pedido mínimo para entrega é de <strong className="text-[#1F1B16]">{minFormatted}</strong> (sem incluir a taxa de entrega).
          </ResponsiveModalDescription>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mt-2">
            <span className="text-xs text-[#9C9188]">Faltam apenas </span>
            <span className="text-sm font-black text-[#C1440E]">{missingFormatted}</span>
            <span className="text-xs text-[#9C9188]"> para atingir o valor mínimo.</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleAddMore}
            data-vaul-no-drag
            className="w-full h-12 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar mais itens
          </button>
          <button
            onClick={onClose}
            data-vaul-no-drag
            className="w-full h-11 bg-transparent text-[#6B6157] hover:text-[#1F1B16] font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Ok, entendi
          </button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
