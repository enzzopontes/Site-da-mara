"use client"

import { useRouter } from "next/navigation"
import { X, ShoppingBag, LogIn, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter()

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <ResponsiveModalContent
        showCloseButton={true}
        showHandle={true}
        className="p-0 border-none sm:border sm:border-gray-100 bg-white flex flex-col sm:max-w-md sm:rounded-[32px] rounded-t-[32px] overflow-hidden"
      >
        <div className="p-8 pt-4 sm:pt-10 text-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20" />
            <div className="relative flex items-center justify-center h-full bg-yellow-50 rounded-full">
              <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-500 animate-bounce" />
            </div>
          </div>

          <ResponsiveModalTitle className="text-2xl sm:text-3xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
            Para continuar sua compra, você deve se cadastrar ou entrar!
          </ResponsiveModalTitle>

          <ResponsiveModalDescription className="text-gray-500 mb-8 text-base font-medium">
            Crie sua conta ou entre para finalizar seu pedido e saborear a melhor batata da cidade.
          </ResponsiveModalDescription>

          <div className="space-y-4 pb-4 sm:pb-0">
            <Button
              onClick={() => {
                onClose()
                router.push("/login")
              }}
              data-vaul-no-drag
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
              data-vaul-no-drag
              className="w-full h-16 border-2 border-gray-100 hover:border-yellow-200 hover:bg-yellow-50 text-gray-700 font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <UserPlus className="h-6 w-6 text-yellow-500" />
              CRIAR CONTA GRÁTIS
            </Button>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
