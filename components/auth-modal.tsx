"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, ShoppingBag, LogIn, UserPlus, ShieldCheck, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
    } else {
      const timer = setTimeout(() => setMounted(false), 300)
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!mounted && !isOpen) return null

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-all duration-300 ${
      isOpen ? "bg-black/60 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0 pointer-events-none"
    }`}>
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 transform ${
        isOpen ? "translate-y-0 opacity-100" : "translate-y-full sm:translate-y-10 opacity-0"
      } relative z-10`}>
        
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />

        <button 
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10 hidden sm:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          aria-label="Fechar janela de autenticação"
        >
          <X className="h-6 w-6 text-gray-500" aria-hidden="true" />
        </button>

        <div className="p-8 pt-6 sm:pt-12 text-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20" />
            <div className="relative flex items-center justify-center h-full bg-yellow-50 rounded-full">
              <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-500 animate-bounce" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
            Para continuar sua compra, você deve se cadastrar ou entrar!
          </h2>
          
          <p className="text-gray-500 mb-8 text-base font-medium">
            Crie sua conta ou entre para finalizar seu pedido e saborear a melhor batata da cidade.
          </p>

          <div className="space-y-4 pb-4 sm:pb-0">
            <Button 
              onClick={() => {
                onClose()
                router.push("/login")
              }}
              className="w-full h-16 bg-yellow-500 hover:bg-yellow-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-yellow-100 flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <LogIn className="h-6 w-6" />
              ENTRAR AGORA
            </Button>

            <Button 
              onClick={() => {
                onClose()
                router.push("/cadastro")
              }}
              variant="outline"
              className="w-full h-16 border-2 border-gray-100 hover:border-yellow-200 hover:bg-yellow-50 text-gray-700 font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <UserPlus className="h-6 w-6 text-yellow-500" />
              CRIAR CONTA GRÁTIS
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
