"use client"

import { useState, useEffect, useRef } from "react"
import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export function OfflineDetector({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)
  const [retryStatus, setRetryStatus] = useState<"idle" | "checking" | "still-offline">("idle")
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Verifica status inicial
    setIsOffline(!window.navigator.onLine)

    const handleOnline = () => {
      setIsOffline(false)
      setRetryStatus("idle")
    }
    const handleOffline = () => {
      setIsOffline(true)
      setRetryStatus("idle")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  const handleRetry = async () => {
    if (retryStatus === "checking") return
    setRetryStatus("checking")
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
    try {
      const res = await fetch("/api/feedbacks/public", {
        method: "HEAD",
        cache: "no-store",
      })
      if (res.ok || res.status < 500) {
        setIsOffline(false)
        setRetryStatus("idle")
        return
      }
      throw new Error("Offline check failed")
    } catch {
      setIsOffline(true)
      setRetryStatus("still-offline")
      feedbackTimeoutRef.current = setTimeout(() => {
        setRetryStatus("idle")
      }, 2500)
    }
  }

  return (
    <>
      {isOffline && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-[9999] bg-white border border-yellow-200 rounded-xl shadow-sm px-4 py-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-4 h-4 text-yellow-600" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {retryStatus === "still-offline"
                  ? "Ainda sem conexão. Verifique sua rede e tente novamente."
                  : "Sem conexão com a internet. Verifique sua rede e tente novamente."}
              </p>
            </div>
            <Button
              type="button"
              onClick={handleRetry}
              disabled={retryStatus === "checking"}
              variant="ghost"
              size="sm"
              className="text-yellow-600 font-black hover:bg-yellow-50 flex-shrink-0"
            >
              {retryStatus === "checking" ? "Verificando..." : "Tentar de novo"}
            </Button>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
