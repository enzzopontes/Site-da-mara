"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { storeStatusManager } from "@/lib/store-status-manager"

export function StoreStatusBadge() {
  const [mounted, setMounted] = useState(false)
  const [waitTime, setWaitTime] = useState({ min: 30, max: 45 })
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    
    const updateStatus = async () => {
      try {
        const status = await storeStatusManager.getStatus()
        setWaitTime({ 
          min: status.waitTimeMin, 
          max: status.waitTimeMax 
        })
        setIsOpen(status.isOpen)
      } catch (error) {
        console.error("Erro ao atualizar status no badge:", error)
      } finally {
        setLoading(false)
      }
    }

    updateStatus()
    window.addEventListener("store-status-changed", updateStatus)
    const interval = setInterval(updateStatus, 10000)

    return () => {
      window.removeEventListener("store-status-changed", updateStatus)
      clearInterval(interval)
    }
  }, [])

  if (!mounted || loading) {
    return <div className="h-5 w-24 animate-pulse bg-gray-100 rounded-full" />
  }

  return (
    <div className="flex items-center gap-4 text-[13px] font-bold">
      <div className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${isOpen ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className={isOpen ? "text-green-600" : "text-red-600"}>
          {isOpen ? "Aberto" : "Fechado"}
        </span>
      </div>

      {/* Tempo de espera movido para o Header principal para melhor visual */}
    </div>
  )
}
