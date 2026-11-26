"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import { WifiOff } from "lucide-react"

export function OfflineScreen() {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-4 text-center">
      <div className="mb-8">
        <Image
          src="/brand/logo.png"
          alt="batata top"
          width={64}
          height={64}
          className="mx-auto mb-12"
        />
        
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Ilustração estilo iFood (Gato com tomada) */}
          <div className="absolute inset-0 bg-yellow-50 rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center h-full">
            <WifiOff className="w-32 h-32 text-yellow-500 opacity-50" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-4">
          Parece que você está sem conexão
        </h1>
        
        <p className="text-gray-500 max-w-xs mx-auto mb-12">
          Por favor, verifique sua internet e tente outra vez
        </p>

        <Button 
          onClick={handleRetry}
          variant="ghost"
          className="text-yellow-600 font-black hover:bg-yellow-50 text-lg"
        >
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}
