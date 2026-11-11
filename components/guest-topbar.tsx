"use client"

import React from "react"
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface GuestTopbarProps {
  onOpenAuth?: () => void
}

export function GuestTopbar({ onOpenAuth }: GuestTopbarProps) {
  const { user, loading, openAuthModal } = useAuth()

  // Se já estiver logado ou carregando o estado inicial, não renderiza
  if (loading || user) {
    return null
  }

  const handleAction = () => {
    if (onOpenAuth) {
      onOpenAuth()
    } else {
      openAuthModal()
    }
  }

  return (
    <aside
      aria-label="Aviso para clientes convidados"
      className="w-full bg-[#1F1B16] text-[#F7F5F0] border-b border-[#2E2820] py-2 px-3 sm:px-4 text-xs font-semibold relative z-30 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Lado Esquerdo: Mensagem com ícone */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E3A008]/20 text-[#E3A008] flex items-center justify-center">
            <Sparkles className="h-3 w-3 animate-pulse" />
          </span>
          <p className="truncate text-[11px] sm:text-xs text-[#E8E2D9]">
            <strong className="text-white font-bold">Ganhe cupons exclusivos</strong> e acompanhe seu pedido em tempo real.
          </p>
        </div>

        {/* Lado Direito: Botão CTA Instantâneo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 bg-[#E3A008] hover:bg-[#C1440E] active:scale-95 text-white text-[11px] sm:text-xs font-black rounded-full shadow-sm transition-all duration-150 cursor-pointer"
          >
            <span>Entrar / Cadastrar</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  )
}
