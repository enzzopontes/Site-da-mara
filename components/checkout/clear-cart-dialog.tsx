"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { Trash2 } from "lucide-react"

interface ClearCartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting?: boolean
}

export function ClearCartDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: ClearCartDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        {/* Backdrop suave com blur e fade-in */}
        <AlertDialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Container responsivo: Bottom Sheet no Mobile e Modal Centralizado no Desktop */}
        <AlertDialogPrimitive.Content
          className="fixed bottom-0 sm:bottom-auto sm:top-1/2 left-0 sm:left-1/2 -translate-x-0 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#ECE7E0] outline-hidden transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom sm:data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom sm:data-[state=open]:zoom-in-95"
        >
          {/* Indicador de puxar (Drag Handle) no Mobile */}
          <div className="w-12 h-1.5 bg-[#E6E1D8] rounded-full mx-auto mb-4 sm:hidden" />

          {/* Cabeçalho com Ícone Estilizado da Lixeira */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-xs">
              <Trash2 className="w-7 h-7 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <AlertDialogPrimitive.Title className="text-lg sm:text-xl font-black text-[#1F1B16] tracking-tight">
                Deseja esvaziar sua sacola?
              </AlertDialogPrimitive.Title>

              <AlertDialogPrimitive.Description className="text-xs sm:text-sm text-[#6B6157] leading-relaxed max-w-xs mx-auto">
                Todos os itens e cupons aplicados serão removidos da sua sacola.
              </AlertDialogPrimitive.Description>
            </div>
          </div>

          {/* Ações (Botoes de Cancelar e Esvaziar) */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                type="button"
                disabled={isSubmitting}
                className="h-12 rounded-2xl border border-[#ECE7E0] bg-white text-[#6B6157] font-bold text-sm hover:bg-[#F7F5F0] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </AlertDialogPrimitive.Cancel>

            <AlertDialogPrimitive.Action asChild>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault()
                  onOpenChange(false)
                  onConfirm()
                }}
                className="h-12 rounded-2xl bg-[#EA1D2C] hover:bg-[#D41724] text-white font-black text-sm shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? "Esvaziando..." : "Esvaziar sacola"}
              </button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
